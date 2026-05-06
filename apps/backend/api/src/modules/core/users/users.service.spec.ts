import { RolesEnum } from '@hsm/common/enums';
import {
  UserEntity,
  UserIntegrationEntity,
  UserRoleEntity,
} from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RolesService } from '../../security/roles/roles.service';
import { UsersService } from './users.service';

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

const userRepo = {
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};
const userIntegrationRepo = { findOne: jest.fn() };
const userRoleRepo = { find: jest.fn() };
const rolesService = { findRoleDomains: jest.fn() };

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

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
});
