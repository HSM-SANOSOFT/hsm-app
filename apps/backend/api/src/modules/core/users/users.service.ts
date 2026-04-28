import {
  CreateUserIntegrationPayloadDto,
  CreateUserPayloadDto,
  DeleteUserPayloadDto,
  UpdateUserPayloadDto,
} from '@hsm/common/dtos';
import {
  UserEntity,
  UserIntegrationEntity,
  UserRoleEntity,
} from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
}
