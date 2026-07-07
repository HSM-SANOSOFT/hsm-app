import { SendTransactionalEmailJobDto } from '@hsm/common/dtos';
import { SettingsCategoryEnum } from '@hsm/common/enums';
import { envs } from '@hsm/config/worker';
import { SettingsAccessorService } from '@hsm/database/settings';
import { Injectable, Logger } from '@nestjs/common';
import { SmtpTransportProvider } from './smtp-transport.provider';

/**
 * Sends one-off transactional emails (account-recovery: password reset / username
 * recovery) directly through the live-config SMTP transport.
 *
 * Unlike {@link EmailService} (the batch/template path), this persists NOTHING —
 * the reset link is a single-use secret that must never be stored. The producer
 * (API `AccountRecoveryService`) renders subject/body and hands them off via the
 * `send-transactional-email` queue job; this service just delivers them.
 */
@Injectable()
export class TransactionalEmailService {
  private readonly logger = new Logger(TransactionalEmailService.name);

  constructor(
    private readonly smtpTransport: SmtpTransportProvider,
    private readonly settingsAccessor: SettingsAccessorService,
  ) {}

  async send(payload: SendTransactionalEmailJobDto): Promise<void> {
    const from = await this.resolveFromAddress();
    try {
      const transporter = await this.smtpTransport.getTransporter();
      await transporter.sendMail({
        from,
        to: payload.toEmail,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });
      // Do NOT log the body — recovery emails carry single-use secret links.
      this.logger.log(`Transactional email sent to ${payload.toEmail}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to send transactional email to ${payload.toEmail}: ${message}`,
      );
      throw err; // BullMQ retries.
    }
  }

  /**
   * The sender address. There is no dedicated default-from setting, so the SMTP
   * username (the authenticated mailbox) is the sender — read from the live
   * settings store, falling back to the boot env if the store has no value.
   */
  private async resolveFromAddress(): Promise<string | undefined> {
    const values = await this.settingsAccessor.getCategoryValues(
      SettingsCategoryEnum.EMAIL,
    );
    return values.SMTP_USERNAME ?? envs.SMTP_USERNAME ?? undefined;
  }
}
