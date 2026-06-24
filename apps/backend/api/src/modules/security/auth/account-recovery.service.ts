import { createHash, randomBytes } from 'node:crypto';
import { SendTransactionalEmailJobDto } from '@hsm/common/dtos';
import { envs } from '@hsm/config';
import { PasswordResetTokenEntity, UserEntity } from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import { QueueEnum } from '@hsm/queue';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Queue } from 'bullmq';
import { DataSource, IsNull, MoreThan, Repository } from 'typeorm';

/** Reset tokens expire after this many milliseconds (1 hour). */
const TOKEN_TTL_MS = 60 * 60 * 1000;
/** Max reset requests per account within the rolling 1-hour window. */
const MAX_REQUESTS_PER_HOUR = 5;
/** BullMQ delivery options for recovery emails — retry with backoff. */
const EMAIL_JOB_OPTS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 5000 },
};

/**
 * Email-based account recovery: password reset (token link) and username
 * recovery. Security properties (KTD4):
 *  - Tokens are 256-bit (`randomBytes(32)`), stored only as an unsalted SHA-256
 *    hash (high entropy → no rainbow-table risk; deterministic so it is
 *    lookup-able, which bcrypt would not be), expire in 1h, and are single-use.
 *  - The plaintext reset link is NEVER persisted or logged.
 *  - `forgotPassword` / `recoverUsername` return nothing observable whether or
 *    not the account exists (non-enumerating). The ONLY non-generic outcome is
 *    the per-account rate limit (429), an accepted enumeration trade-off.
 *  - The reset link carries the token in the URL FRAGMENT (out of Referer/logs).
 */
@Injectable()
export class AccountRecoveryService {
  private readonly logger = new Logger(AccountRecoveryService.name);

  constructor(
    @InjectRepository(UserEntity, DatabasesEnum.HsmDbPostgres)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(PasswordResetTokenEntity, DatabasesEnum.HsmDbPostgres)
    private readonly tokenRepository: Repository<PasswordResetTokenEntity>,
    @InjectQueue(QueueEnum.Coms)
    private readonly comsQueue: Queue,
    @InjectDataSource(DatabasesEnum.HsmDbPostgres)
    private readonly dataSource: DataSource,
  ) {}

  /** SHA-256 hash of a token's plaintext (deterministic, lookup-able). */
  private hashToken(plaintext: string): string {
    return createHash('sha256').update(plaintext).digest('hex');
  }

  /** A fresh 256-bit token and its at-rest hash. */
  private generateToken(): { plaintext: string; tokenHash: string } {
    const plaintext = randomBytes(32).toString('hex');
    return { plaintext, tokenHash: this.hashToken(plaintext) };
  }

  /** Finds an active (not soft-deleted) user by email, or null. */
  private async findActiveUserByEmail(
    email: string,
  ): Promise<UserEntity | null> {
    return await this.userRepository.findOne({
      where: { email, isActive: true },
    });
  }

  /**
   * Begins a password reset. Silent no-op for unknown accounts; the only
   * surfaced failure is the per-account rate limit (429).
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.findActiveUserByEmail(email);
    if (!user) return; // Non-enumerating: do nothing observable.

    const since = new Date(Date.now() - TOKEN_TTL_MS);
    const recentCount = await this.tokenRepository.count({
      where: { user: { id: user.id }, createdAt: MoreThan(since) },
    });
    if (recentCount >= MAX_REQUESTS_PER_HOUR) {
      throw new HttpException(
        'Too Many Requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const { plaintext, tokenHash } = this.generateToken();
    await this.tokenRepository.save(
      this.tokenRepository.create({
        user: { id: user.id } as UserEntity,
        tokenHash,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
        usedAt: null,
      }),
    );

    // Token rides in the URL FRAGMENT so it never reaches Referer or server logs.
    const resetLink = `${envs.APP_BASE_URL}/reset-password#token=${plaintext}`;
    const job: SendTransactionalEmailJobDto = {
      toEmail: user.email,
      subject: 'Reset your password',
      html: this.buildResetEmailHtml(resetLink),
    };
    // NEVER log the plaintext token or the reset link.
    await this.comsQueue.add('send-transactional-email', job, EMAIL_JOB_OPTS);
    this.logger.log(`Password reset email enqueued for user ${user.id}`);
  }

  /**
   * Consumes a reset token and sets a new password. Invalid, expired, or
   * already-used tokens all fail with the SAME generic message.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const tokenRow = await this.tokenRepository.findOne({
      where: { tokenHash },
      relations: { user: true },
    });

    const invalid = (): never => {
      throw new BadRequestException('Invalid or expired reset token');
    };

    if (!tokenRow) invalid();
    if (tokenRow!.usedAt != null) invalid();
    if (tokenRow!.expiresAt.getTime() < Date.now()) invalid();

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Apply the password change and consume the token atomically — a reset must
    // not half-apply.
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // Consume the token FIRST, conditionally on it still being unused. This is
      // the real single-use enforcement: if two requests race with the same
      // valid token, only one update affects a row — the loser changes nothing
      // and is rejected, so a token can never set two different passwords.
      const consumed = await queryRunner.manager.update(
        PasswordResetTokenEntity,
        { id: tokenRow!.id, usedAt: IsNull() },
        { usedAt: new Date() },
      );
      if (!consumed.affected) {
        throw new BadRequestException('Invalid or expired reset token');
      }
      await queryRunner.manager.update(
        UserEntity,
        { id: tokenRow!.user.id },
        { password: hashedPassword },
      );
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
    this.logger.log(`Password reset completed for user ${tokenRow!.user.id}`);
  }

  /**
   * Emails the username for the account owning `email`. Silent no-op for unknown
   * accounts (non-enumerating).
   */
  async recoverUsername(email: string): Promise<void> {
    const user = await this.findActiveUserByEmail(email);
    if (!user) return; // Non-enumerating: do nothing observable.

    const job: SendTransactionalEmailJobDto = {
      toEmail: email,
      subject: 'Your username',
      html: this.buildUsernameEmailHtml(user.username),
    };
    await this.comsQueue.add('send-transactional-email', job, EMAIL_JOB_OPTS);
    this.logger.log(`Username recovery email enqueued for user ${user.id}`);
  }

  private buildResetEmailHtml(resetLink: string): string {
    return [
      '<div style="font-family: Arial, sans-serif; color: #11304F;">',
      '<h2 style="color: #0E4D98;">Reset your password</h2>',
      '<p>We received a request to reset your password. Click the button',
      ' below to choose a new one.</p>',
      `<p><a href="${resetLink}" style="display:inline-block;padding:12px 20px;`,
      'background:#0E4D98;color:#FFFFFF;text-decoration:none;border-radius:6px;">',
      'Reset password</a></p>',
      '<p>This link expires in 1 hour and can be used once.</p>',
      "<p>If you didn't request this, you can safely ignore this email — your",
      ' password will not change.</p>',
      '</div>',
    ].join('');
  }

  private buildUsernameEmailHtml(username: string): string {
    return [
      '<div style="font-family: Arial, sans-serif; color: #11304F;">',
      '<h2 style="color: #0E4D98;">Your username</h2>',
      '<p>You requested a reminder of your username. It is:</p>',
      `<p style="font-size:18px;font-weight:bold;">${username}</p>`,
      "<p>If you didn't request this, you can safely ignore this email.</p>",
      '</div>',
    ].join('');
  }
}
