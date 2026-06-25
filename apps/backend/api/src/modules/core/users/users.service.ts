import {
  ChangePasswordDto,
  CreateStaffPayloadDto,
  CreateUserIntegrationPayloadDto,
  CreateUserPayloadDto,
  DeleteUserPayloadDto,
  ListUsersQueryDto,
  UpdateOwnProfileDto,
  UpdateUserPayloadDto,
} from '@hsm/common/dtos';
import { RolesEnum } from '@hsm/common/enums';
import type { ISuccessResponse } from '@hsm/common/interfaces';
import type { RolesType } from '@hsm/common/types';
import {
  UserEntity,
  UserIntegrationEntity,
  UserRoleEntity,
} from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
// Import the enum from its leaf module, not the '@hsm/queue' barrel: the barrel
// pulls in queue.module.ts, which reads `envs` at import time and breaks specs
// that mock @hsm/config with a lazy getter (e.g. admin-seed.service.spec).
import { QueueEnum } from '@hsm/queue/queue.enum';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Queue } from 'bullmq';
import type { QueryRunner } from 'typeorm';
import { Repository } from 'typeorm';
import { RolesService } from '../../security/roles/roles.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @InjectRepository(UserEntity, DatabasesEnum.HsmDbPostgres)
    private UserRepository: Repository<UserEntity>,
    @InjectRepository(UserIntegrationEntity, DatabasesEnum.HsmDbPostgres)
    private UserIntegrationRepository: Repository<UserIntegrationEntity>,
    @InjectRepository(UserRoleEntity, DatabasesEnum.HsmDbPostgres)
    private UserRoleRepository: Repository<UserRoleEntity>,
    private readonly rolesService: RolesService,
    @InjectQueue(QueueEnum.Coms)
    private readonly comsQueue: Queue,
  ) {}

  async findOneByUsername(username: string): Promise<UserEntity> {
    const user = await this.UserRepository.findOne({ where: { username } });
    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }
    const userRoles = await this.UserRoleRepository.find({
      where: { user: { username: user.username } },
    });

    Object.assign(user, { roles: userRoles });
    return user;
  }

  async findOneById(
    id: string,
    integration: boolean,
  ): Promise<UserEntity | UserIntegrationEntity> {
    let user: UserEntity | UserIntegrationEntity | null;
    if (integration) {
      user = await this.UserIntegrationRepository.findOne({ where: { id } });
    } else {
      user = await this.UserRepository.findOne({ where: { id } });
    }

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    this.logger.debug(user);
    return user;
  }

  async createUser(
    user: CreateUserPayloadDto,
    queryRunner: QueryRunner,
    overrides?: Partial<Pick<UserEntity, 'onboardingCompletedAt'>>,
  ): Promise<UserEntity> {
    const { roles, ...userData } = user;
    const roleDomains = this.rolesService.findRoleDomains(roles);
    const newUser = await queryRunner.manager.save(UserEntity, {
      ...userData,
      ...overrides,
    });
    await Promise.all(
      roleDomains.map(({ role, domain }) =>
        queryRunner.manager.save(UserRoleEntity, {
          user: newUser,
          role,
          domain,
        }),
      ),
    );
    return newUser;
  }

  async createUserIntegration(
    user: CreateUserIntegrationPayloadDto,
    queryRunner: QueryRunner,
  ): Promise<UserIntegrationEntity> {
    return await queryRunner.manager.save(UserIntegrationEntity, user);
  }

  /**
   * Admin-only: provision a STAFF account flagged pending onboarding. The temp
   * password is hashed, the account is created with `onboardingCompletedAt =
   * null` (forced first-login onboarding), and the plaintext temp password is
   * emailed to the staff member AFTER the account commits — it is never returned
   * in the response (and the request interceptor logs method/URL only, no body).
   * Patient-facing roles are rejected: this path is for staff only.
   */
  async createStaffUser(
    dto: CreateStaffPayloadDto,
  ): Promise<Omit<UserEntity, 'password'>> {
    const patientRoles = Object.values(RolesEnum.Patient) as string[];
    if (patientRoles.includes(dto.role)) {
      throw new BadRequestException(
        'This endpoint provisions staff accounts only; patient/family roles are not allowed',
      );
    }

    const { tempPassword, role, ...profile } = dto;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const queryRunner =
      this.UserRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let created: UserEntity;
    try {
      created = await this.createUser(
        { ...profile, password: hashedPassword, roles: [role] },
        queryRunner,
        // Pending first-login onboarding until the staff member completes it.
        { onboardingCompletedAt: null },
      );
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    await this.comsQueue.add(
      'send-transactional-email',
      {
        toEmail: created.email,
        subject: 'Your staff account is ready',
        html: this.buildStaffWelcomeHtml(
          created.firstName,
          dto.username,
          tempPassword,
        ),
      },
      { attempts: 5, backoff: { type: 'exponential', delay: 5000 } },
    );

    const { password: _password, ...safe } = created;
    return safe;
  }

  private buildStaffWelcomeHtml(
    firstName: string,
    username: string,
    tempPassword: string,
  ): string {
    return [
      '<div style="font-family: Arial, sans-serif; color: #11304F;">',
      `<h2 style="color: #0E4D98;">Welcome, ${firstName}</h2>`,
      '<p>An account has been created for you. Sign in with these temporary',
      ' credentials and you will be asked to set your own password and complete',
      ' your profile on first login.</p>',
      `<p><strong>Username:</strong> ${username}<br/>`,
      `<strong>Temporary password:</strong> ${tempPassword}</p>`,
      '<p>For your security, please sign in and complete onboarding soon.</p>',
      '</div>',
    ].join('');
  }

  async updateUser(user: UpdateUserPayloadDto): Promise<UserEntity | null> {
    const { id } = user;
    const response = await this.UserRepository.update(id, user);
    if (!response.affected) {
      return null;
    }
    const updatedUser = await this.UserRepository.findOne({ where: { id } });
    if (!updatedUser) {
      return null;
    }
    return updatedUser;
  }

  async deleteUser(user: DeleteUserPayloadDto): Promise<void> {
    await this.UserRepository.delete(user.id);
  }

  /**
   * Returns a paginated list of users with their roles attached.
   * The result is shaped as an `ISuccessResponse` so the global
   * `ResponseInterceptor` exposes pagination via `metadata.extra.pagination`.
   */
  async findAll(
    query: ListUsersQueryDto,
  ): Promise<ISuccessResponse<UserEntity[]>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, totalItems] = await this.UserRepository.findAndCount({
      relations: { roles: true },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;

    return {
      data,
      metadata: {
        extra: {
          pagination: {
            page,
            pageSize: limit,
            totalItems,
            totalPages,
          },
        },
      },
    };
  }

  /**
   * Returns a single user (with roles) by id, or throws 404 if absent.
   * Distinct from `findOneById` which is used for the auth flow.
   */
  async findUserById(id: string): Promise<UserEntity> {
    const user = await this.UserRepository.findOne({
      where: { id },
      relations: { roles: true },
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  /**
   * Self-service profile update. Only `firstName` and `email` may change —
   * role and any other field are not reachable through this path (R6).
   */
  async updateOwnProfile(
    id: string,
    profile: UpdateOwnProfileDto,
  ): Promise<UserEntity> {
    const updates: Partial<Pick<UserEntity, 'firstName' | 'email'>> = {};
    if (profile.firstName !== undefined) updates.firstName = profile.firstName;
    if (profile.email !== undefined) updates.email = profile.email;

    if (Object.keys(updates).length > 0) {
      await this.UserRepository.update(id, updates);
    }

    return await this.findUserById(id);
  }

  /**
   * Self-service password change. Verifies the supplied current password with
   * bcrypt before persisting the new (hashed) one.
   */
  async changeOwnPassword(
    id: string,
    payload: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.UserRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const currentValid = await bcrypt.compare(
      payload.currentPassword,
      user.password,
    );
    if (!currentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashed = await bcrypt.hash(payload.newPassword, 10);
    await this.UserRepository.update(id, { password: hashed });
  }

  /**
   * Completes first-login onboarding for a pending user: sets the new (already
   * hashed) password and phone, marks the email verified, and clears the pending
   * flag (`onboardingCompletedAt = now`) — in a single atomic UPDATE so the
   * account never lands half-onboarded. Rejects an already-completed account.
   * Returns
   * the refreshed user (with roles) so the caller can reissue a token reflecting
   * the cleared flag.
   */
  async completeOnboarding(
    id: string,
    fields: { hashedPassword: string; phoneNumber: string },
  ): Promise<UserEntity> {
    const user = await this.findUserById(id);
    if (user.onboardingCompletedAt != null) {
      throw new BadRequestException('Onboarding already completed');
    }

    await this.UserRepository.update(id, {
      password: fields.hashedPassword,
      phoneNumber: fields.phoneNumber,
      emailVerified: true,
      onboardingCompletedAt: new Date(),
    });

    return await this.findUserById(id);
  }

  /**
   * Admin-only role change. Replaces the target user's role rows in the
   * `UserRoleEntity` junction within a single transaction.
   */
  async changeUserRole(id: string, role: RolesType): Promise<UserEntity> {
    const roleDomains = this.rolesService.findRoleDomains([role]);
    if (roleDomains.length === 0) {
      throw new BadRequestException(`Unknown role '${role}'`);
    }

    await this.findUserById(id);

    const queryRunner =
      this.UserRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.delete(UserRoleEntity, { user: { id } });
      await Promise.all(
        roleDomains.map(({ role: r, domain }) =>
          queryRunner.manager.save(UserRoleEntity, {
            user: { id },
            role: r,
            domain,
          }),
        ),
      );
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return await this.findUserById(id);
  }
}
