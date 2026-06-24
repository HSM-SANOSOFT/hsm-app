import {
  ChangePasswordDto,
  CreateUserIntegrationPayloadDto,
  CreateUserPayloadDto,
  DeleteUserPayloadDto,
  ListUsersQueryDto,
  UpdateOwnProfileDto,
  UpdateUserPayloadDto,
} from '@hsm/common/dtos';
import type { ISuccessResponse } from '@hsm/common/interfaces';
import type { RolesType } from '@hsm/common/types';
import {
  UserEntity,
  UserIntegrationEntity,
  UserRoleEntity,
} from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
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
  ): Promise<UserEntity> {
    const { roles, ...userData } = user;
    const roleDomains = this.rolesService.findRoleDomains(roles);
    const newUser = await queryRunner.manager.save(UserEntity, userData);
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
