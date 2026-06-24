import { RolesEnum } from '@hsm/common/enums';
import {
  UserEntity,
  UserIntegrationEntity,
  UserRoleEntity,
} from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { RolesService } from '../../security/roles/roles.service';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-value'),
  compare: jest.fn().mockResolvedValue(true),
}));

const mockUser: Partial<UserEntity> = {
  id: 'user-uuid',
  username: 'jdoe',
  email: 'jdoe@test.com',
  firstName: 'John',
  firstLastName: 'Doe',
  password: 'hashed-pw',
};

const mockRole: Partial<UserRoleEntity> = {
  id: 'role-uuid',
  role: RolesEnum.System.Admin,
  domain: 'System',
};

const mockIntegrationUser: Partial<UserIntegrationEntity> = {
  id: 'integration-uuid',
  name: 'TestIntegration',
};

const mockManager = {
  save: jest.fn(),
  delete: jest.fn(),
};
const mockQueryRunner = {
  connect: jest.fn().mockResolvedValue(undefined),
  startTransaction: jest.fn().mockResolvedValue(undefined),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  rollbackTransaction: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
  manager: mockManager,
};
const userRepo = {
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  manager: {
    connection: {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    },
  },
};
const userIntegrationRepo = { findOne: jest.fn() };
const userRoleRepo = { find: jest.fn() };
const rolesService = { findRoleDomains: jest.fn() };

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-value');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    mockManager.save.mockResolvedValue({});
    mockManager.delete.mockResolvedValue({ affected: 1 });
    mockQueryRunner.connect.mockResolvedValue(undefined);
    mockQueryRunner.startTransaction.mockResolvedValue(undefined);
    mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
    mockQueryRunner.rollbackTransaction.mockResolvedValue(undefined);
    mockQueryRunner.release.mockResolvedValue(undefined);
    userRepo.manager.connection.createQueryRunner.mockReturnValue(
      mockQueryRunner,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(UserEntity, DatabasesEnum.HsmDbPostgres),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(
            UserIntegrationEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: userIntegrationRepo,
        },
        {
          provide: getRepositoryToken(
            UserRoleEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: userRoleRepo,
        },
        { provide: RolesService, useValue: rolesService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findOneByUsername', () => {
    it('returns user with roles attached', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      userRoleRepo.find.mockResolvedValue([mockRole]);

      const result = await service.findOneByUsername('jdoe');

      expect(result).toMatchObject({ ...mockUser, roles: [mockRole] });
      expect(userRoleRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { user: { username: 'jdoe' } } }),
      );
    });

    it('throws NotFoundException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.findOneByUsername('ghost')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findOneById', () => {
    it('returns regular user when integration=false', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      const result = await service.findOneById('user-uuid', false);
      expect(result).toBe(mockUser);
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'user-uuid' },
      });
    });

    it('returns integration user when integration=true', async () => {
      userIntegrationRepo.findOne.mockResolvedValue(mockIntegrationUser);
      const result = await service.findOneById('integration-uuid', true);
      expect(result).toBe(mockIntegrationUser);
      expect(userIntegrationRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'integration-uuid' },
      });
    });

    it('throws NotFoundException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(
        service.findOneById('missing-id', false),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('createUser', () => {
    it('saves user and roles via queryRunner', async () => {
      const managerSave = jest
        .fn()
        .mockResolvedValueOnce({ ...mockUser, id: 'user-uuid' })
        .mockResolvedValue({});
      const queryRunner = { manager: { save: managerSave } } as never;
      rolesService.findRoleDomains.mockReturnValue([
        { role: RolesEnum.System.Admin, domain: 'System' },
      ]);

      const dto = {
        username: 'jdoe',
        password: 'hashed-pw',
        email: 'jdoe@test.com',
        firstName: 'John',
        firstLastName: 'Doe',
        roles: [RolesEnum.System.Admin],
      } as never;

      const result = await service.createUser(dto, queryRunner);

      expect(managerSave).toHaveBeenCalledWith(
        UserEntity,
        expect.objectContaining({ username: 'jdoe' }),
      );
      expect(managerSave).toHaveBeenCalledWith(
        UserRoleEntity,
        expect.objectContaining({ role: RolesEnum.System.Admin }),
      );
      expect(result).toMatchObject({ id: 'user-uuid' });
    });
  });

  describe('createUserIntegration', () => {
    it('saves integration user via queryRunner', async () => {
      const managerSave = jest.fn().mockResolvedValue(mockIntegrationUser);
      const queryRunner = { manager: { save: managerSave } } as never;

      const result = await service.createUserIntegration(
        { name: 'TestIntegration' } as never,
        queryRunner,
      );

      expect(managerSave).toHaveBeenCalledWith(UserIntegrationEntity, {
        name: 'TestIntegration',
      });
      expect(result).toBe(mockIntegrationUser);
    });
  });

  describe('updateUser', () => {
    it('returns updated user when found', async () => {
      userRepo.update.mockResolvedValue({ affected: 1 });
      userRepo.findOne.mockResolvedValue({ ...mockUser, firstName: 'Jane' });

      const result = await service.updateUser({
        id: 'user-uuid',
        firstName: 'Jane',
      } as never);

      expect(result).toMatchObject({ firstName: 'Jane' });
    });

    it('returns null when no rows affected', async () => {
      userRepo.update.mockResolvedValue({ affected: 0 });
      const result = await service.updateUser({ id: 'missing-id' } as never);
      expect(result).toBeNull();
    });

    it('returns null when findOne returns null after update', async () => {
      userRepo.update.mockResolvedValue({ affected: 1 });
      userRepo.findOne.mockResolvedValue(null);
      const result = await service.updateUser({ id: 'user-uuid' } as never);
      expect(result).toBeNull();
    });
  });

  describe('deleteUser', () => {
    it('calls repository delete with user id', async () => {
      userRepo.delete.mockResolvedValue({ affected: 1 });
      await service.deleteUser({ id: 'user-uuid' } as never);
      expect(userRepo.delete).toHaveBeenCalledWith('user-uuid');
    });
  });

  describe('findAll', () => {
    it('returns data plus pagination metadata under metadata.extra.pagination', async () => {
      userRepo.findAndCount.mockResolvedValue([[mockUser], 25]);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(userRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(result.data).toEqual([mockUser]);
      expect(result.metadata?.extra?.pagination).toEqual({
        page: 2,
        pageSize: 10,
        totalItems: 25,
        totalPages: 3,
      });
    });

    it('defaults to page 1 / limit 20 when omitted', async () => {
      userRepo.findAndCount.mockResolvedValue([[], 0]);
      const result = await service.findAll({});
      expect(userRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
      expect(result.metadata?.extra?.pagination).toMatchObject({
        page: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
      });
    });
  });

  describe('findUserById', () => {
    it('returns the user with roles when found', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, roles: [mockRole] });
      const result = await service.findUserById('user-uuid');
      expect(result).toMatchObject({ id: 'user-uuid' });
      expect(userRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-uuid' },
          relations: { roles: true },
        }),
      );
    });

    it('throws NotFoundException for an unknown id', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.findUserById('ghost')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateOwnProfile (R6)', () => {
    it('updates only firstName/email and never role', async () => {
      userRepo.update.mockResolvedValue({ affected: 1 });
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        firstName: 'Jane',
        email: 'jane@test.com',
      });

      await service.updateOwnProfile('user-uuid', {
        firstName: 'Jane',
        email: 'jane@test.com',
        // a stray role would never reach here; assert the persisted shape
        role: RolesEnum.System.Admin,
      } as never);

      expect(userRepo.update).toHaveBeenCalledWith('user-uuid', {
        firstName: 'Jane',
        email: 'jane@test.com',
      });
      // the update payload contains no `role` key
      const persisted = userRepo.update.mock.calls[0][1];
      expect(persisted).not.toHaveProperty('role');
    });

    it('skips the repository update when nothing changes', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      await service.updateOwnProfile('user-uuid', {});
      expect(userRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('changeOwnPassword', () => {
    it('rejects a wrong current password with Unauthorized', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changeOwnPassword('user-uuid', {
          currentPassword: 'wrong',
          newPassword: 'new-pass',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(userRepo.update).not.toHaveBeenCalled();
    });

    it('hashes and persists the new password when the current one matches', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed');

      await service.changeOwnPassword('user-uuid', {
        currentPassword: 'old-pass',
        newPassword: 'new-pass',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'old-pass',
        mockUser.password,
      );
      expect(userRepo.update).toHaveBeenCalledWith('user-uuid', {
        password: 'new-hashed',
      });
    });

    it('throws NotFound for an unknown user', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(
        service.changeOwnPassword('ghost', {
          currentPassword: 'x',
          newPassword: 'y',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('changeUserRole', () => {
    it('replaces role rows in a transaction and returns the refreshed user', async () => {
      rolesService.findRoleDomains.mockReturnValue([
        { role: RolesEnum.System.Auditor, domain: 'System' },
      ]);
      userRepo.findOne
        .mockResolvedValueOnce(mockUser) // existence check
        .mockResolvedValueOnce({
          ...mockUser,
          roles: [{ role: RolesEnum.System.Auditor, domain: 'System' }],
        }); // findUserById refresh

      const result = await service.changeUserRole(
        'user-uuid',
        RolesEnum.System.Auditor,
      );

      expect(mockManager.delete).toHaveBeenCalledWith(UserRoleEntity, {
        user: { id: 'user-uuid' },
      });
      expect(mockManager.save).toHaveBeenCalledWith(
        UserRoleEntity,
        expect.objectContaining({ role: RolesEnum.System.Auditor }),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.roles?.[0]).toMatchObject({
        role: RolesEnum.System.Auditor,
      });
    });

    it('throws NotFound when the target user does not exist', async () => {
      rolesService.findRoleDomains.mockReturnValue([
        { role: RolesEnum.System.Auditor, domain: 'System' },
      ]);
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.changeUserRole('ghost', RolesEnum.System.Auditor),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('rolls back the transaction on a save failure', async () => {
      rolesService.findRoleDomains.mockReturnValue([
        { role: RolesEnum.System.Auditor, domain: 'System' },
      ]);
      userRepo.findOne.mockResolvedValue(mockUser);
      mockManager.save.mockRejectedValueOnce(new Error('db down'));

      await expect(
        service.changeUserRole('user-uuid', RolesEnum.System.Auditor),
      ).rejects.toThrow('db down');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });
});
