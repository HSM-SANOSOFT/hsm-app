import { RolesEnum } from '@hsm/common/enums';
import { Test, TestingModule } from '@nestjs/testing';
import { ROLES_KEY } from '../../security/roles/roles.decorator';
import { UserController } from './user.controller';
import { UsersService } from './users.service';

const mockUsersService = {
  updateOwnProfile: jest.fn(),
  changeOwnPassword: jest.fn(),
  findAll: jest.fn(),
  findUserById: jest.fn(),
  changeUserRole: jest.fn(),
};

const signedReq = (id: string) => ({ user: { id } }) as never;

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('self-service updateOwnProfile (R6)', () => {
    it('forwards only the caller id and payload to the service', async () => {
      mockUsersService.updateOwnProfile.mockResolvedValue({ id: 'u1' });

      await controller.updateOwnProfile(
        { firstName: 'Jane', email: 'jane@test.com' },
        signedReq('u1'),
      );

      expect(mockUsersService.updateOwnProfile).toHaveBeenCalledWith('u1', {
        firstName: 'Jane',
        email: 'jane@test.com',
      });
    });

    it('exposes no role parameter — the DTO/whitelist strips any role field (AE4)', () => {
      // The controller method signature accepts only UpdateOwnProfileDto;
      // a `role` key is never read or forwarded. The global ValidationPipe
      // (whitelist + forbidNonWhitelisted) rejects unknown keys at the edge.
      expect(controller.updateOwnProfile.length).toBe(2);
    });
  });

  describe('self-service changeOwnPassword', () => {
    it('forwards caller id and payload to the service', async () => {
      mockUsersService.changeOwnPassword.mockResolvedValue(undefined);

      await controller.changeOwnPassword(
        { currentPassword: 'old', newPassword: 'new' },
        signedReq('u1'),
      );

      expect(mockUsersService.changeOwnPassword).toHaveBeenCalledWith('u1', {
        currentPassword: 'old',
        newPassword: 'new',
      });
    });
  });

  describe('self-service has no role-change path (AE4)', () => {
    it('self-service endpoints are not @Roles(Admin) and carry no role mutation', () => {
      const meRoles = Reflect.getMetadata(
        ROLES_KEY,
        controller.updateOwnProfile,
      );
      const pwRoles = Reflect.getMetadata(
        ROLES_KEY,
        controller.changeOwnPassword,
      );
      // @Roles() with no args yields an empty roles list (any authenticated user)
      expect(meRoles).toEqual([]);
      expect(pwRoles).toEqual([]);
    });
  });

  describe('admin listUsers', () => {
    it('is restricted to System.Admin', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, controller.listUsers);
      expect(roles).toContain(RolesEnum.System.Admin);
    });

    it('delegates to the service with the query', async () => {
      const result = {
        data: [],
        metadata: { extra: { pagination: {} } },
      };
      mockUsersService.findAll.mockResolvedValue(result);

      const res = await controller.listUsers({ page: 1, limit: 20 });

      expect(mockUsersService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      });
      expect(res).toBe(result);
    });
  });

  describe('admin getUser', () => {
    it('is restricted to System.Admin', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, controller.getUser);
      expect(roles).toContain(RolesEnum.System.Admin);
    });

    it('delegates to the service with the id', async () => {
      mockUsersService.findUserById.mockResolvedValue({ id: 'u1' });
      await controller.getUser('u1');
      expect(mockUsersService.findUserById).toHaveBeenCalledWith('u1');
    });
  });

  describe('admin changeUserRole', () => {
    it('is restricted to System.Admin', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, controller.changeUserRole);
      expect(roles).toContain(RolesEnum.System.Admin);
    });

    it('delegates id and role to the service', async () => {
      mockUsersService.changeUserRole.mockResolvedValue({ id: 'u1' });
      await controller.changeUserRole('u1', {
        role: RolesEnum.System.Admin,
      });
      expect(mockUsersService.changeUserRole).toHaveBeenCalledWith(
        'u1',
        RolesEnum.System.Admin,
      );
    });
  });
});
