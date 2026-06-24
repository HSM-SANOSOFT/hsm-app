import { RolesEnum } from '@hsm/common/enums';
import type { IUnsignedUser } from '@hsm/common/interfaces';
import { envs } from '@hsm/config';
import {
  RefreshTokenUserEntity,
  RefreshTokenUserIntegrationEntity,
} from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import {
  BadRequestException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../core/users/users.service';
import { AuthService } from './auth.service';

jest.mock('@hsm/config', () => ({
  envs: {
    ENVIRONMENT: 'test',
    JWT_AT_SECRET: 'test-at-secret-32-chars-padding!!',
    JWT_RT_SECRET: 'test-rt-secret-32-chars-padding!!',
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-value'),
  compare: jest.fn().mockResolvedValue(true),
}));

const mockUser: IUnsignedUser = {
  id: 'user-uuid',
  username: 'jdoe',
  email: 'jdoe@test.com',
  firstName: 'John',
  firstLastName: 'Doe',
  roles: [RolesEnum.System.Admin],
  onboardingCompletedAt: null,
};

const mockManager = {
  save: jest.fn(),
  update: jest.fn(),
};
const mockQueryRunner = {
  connect: jest.fn().mockResolvedValue(undefined),
  startTransaction: jest.fn().mockResolvedValue(undefined),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  rollbackTransaction: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
  manager: mockManager,
};
const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
};

const refreshTokenUserRepo = { findOne: jest.fn(), update: jest.fn() };
const refreshTokenUserIntegrationRepo = {
  findOne: jest.fn(),
  update: jest.fn(),
};
const mockUsersService = {
  findOneByUsername: jest.fn(),
  createUser: jest.fn(),
  createUserIntegration: jest.fn(),
};
const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('signed-token'),
  verifyAsync: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Explicitly reset bcrypt mocks — clearAllMocks clears call counts but not
    // mockResolvedValue implementations, so override values from previous tests persist.
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-value');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    mockQueryRunner.connect.mockResolvedValue(undefined);
    mockQueryRunner.startTransaction.mockResolvedValue(undefined);
    mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
    mockQueryRunner.rollbackTransaction.mockResolvedValue(undefined);
    mockQueryRunner.release.mockResolvedValue(undefined);
    mockManager.save.mockResolvedValue({});
    mockManager.update.mockResolvedValue({ affected: 1 });
    mockJwtService.signAsync.mockResolvedValue('signed-token');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        {
          provide: getRepositoryToken(
            RefreshTokenUserEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: refreshTokenUserRepo,
        },
        {
          provide: getRepositoryToken(
            RefreshTokenUserIntegrationEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: refreshTokenUserIntegrationRepo,
        },
        {
          provide: getDataSourceToken(DatabasesEnum.HsmDbPostgres),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hashData', () => {
    it('calls bcrypt.hash and returns result', async () => {
      const result = await service.hashData('secret');
      expect(bcrypt.hash).toHaveBeenCalledWith('secret', 10);
      expect(result).toBe('hashed-value');
    });
  });

  describe('generateTokens', () => {
    it('signs AT (15m) and RT (1d) for regular user', async () => {
      const result = await service.generateTokens(mockUser);
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: mockUser.id }),
        expect.objectContaining({ expiresIn: '15m' }),
      );
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: mockUser.id }),
        expect.objectContaining({ expiresIn: '1d' }),
      );
      expect(result).toEqual({
        access_token: 'signed-token',
        refresh_token: 'signed-token',
      });
    });

    it('signs AT (1d) and RT (30d) for integration user', async () => {
      const integrationUser = {
        id: 'int-uuid',
        name: 'Bot',
        roles: [RolesEnum.System.Integration],
      };
      await service.generateTokens(integrationUser);
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'int-uuid' }),
        expect.objectContaining({ expiresIn: '1d' }),
      );
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'int-uuid' }),
        expect.objectContaining({ expiresIn: '30d' }),
      );
    });
  });

  describe('validateUser', () => {
    it('returns unsigned user on valid credentials', async () => {
      mockUsersService.findOneByUsername.mockResolvedValue({
        ...mockUser,
        password: 'hashed-pw',
        roles: [{ role: RolesEnum.System.Admin }],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('jdoe', 'plain-pw');
      expect(result).toMatchObject({ id: 'user-uuid', username: 'jdoe' });
    });

    it('serializes a completed onboarding Date to an ISO string', async () => {
      const completedAt = new Date('2026-06-24T10:00:00.000Z');
      mockUsersService.findOneByUsername.mockResolvedValue({
        ...mockUser,
        password: 'hashed-pw',
        roles: [{ role: RolesEnum.System.Admin }],
        onboardingCompletedAt: completedAt,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('jdoe', 'plain-pw');
      expect(result.onboardingCompletedAt).toBe('2026-06-24T10:00:00.000Z');
    });

    it('maps a null/absent onboarding timestamp to null (pending)', async () => {
      mockUsersService.findOneByUsername.mockResolvedValue({
        ...mockUser,
        password: 'hashed-pw',
        roles: [{ role: RolesEnum.System.Admin }],
        onboardingCompletedAt: null,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('jdoe', 'plain-pw');
      expect(result.onboardingCompletedAt).toBeNull();
    });

    it('throws UnauthorizedException on wrong password', async () => {
      mockUsersService.findOneByUsername.mockResolvedValue({
        ...mockUser,
        password: 'hashed-pw',
        roles: [],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser('jdoe', 'wrong'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('validateRefreshToken', () => {
    const refreshUser = {
      ...mockUser,
      refreshToken: 'plain-rt',
      iat: 0,
      exp: 9999999999,
    };

    it('throws UnauthorizedException when no active refresh token in DB', async () => {
      refreshTokenUserRepo.findOne.mockResolvedValue(null);
      await expect(
        service.validateRefreshToken(refreshUser),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when refresh token hash mismatch', async () => {
      refreshTokenUserRepo.findOne.mockResolvedValue({
        refreshToken: 'hashed-old-rt',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.validateRefreshToken(refreshUser),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns user data on valid refresh token', async () => {
      refreshTokenUserRepo.findOne.mockResolvedValue({
        refreshToken: 'hashed-rt',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const result = await service.validateRefreshToken(refreshUser);
      expect(result).toMatchObject({ id: 'user-uuid', username: 'jdoe' });
    });

    it('uses integration repo when user has Integration role', async () => {
      const integrationRefreshUser = {
        id: 'int-uuid',
        name: 'Bot',
        roles: [RolesEnum.System.Integration],
        refreshToken: 'plain-rt',
        iat: 0,
        exp: 9999999999,
      };
      refreshTokenUserIntegrationRepo.findOne.mockResolvedValue({
        refreshToken: 'hashed-rt',
      });
      const result = await service.validateRefreshToken(integrationRefreshUser);
      expect(refreshTokenUserIntegrationRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user: { id: 'int-uuid' }, isActive: true },
        }),
      );
      expect(result).toMatchObject({ id: 'int-uuid', name: 'Bot' });
    });
  });

  describe('login', () => {
    it('returns tokens and stores hashed refresh token', async () => {
      const result = await service.login(mockUser);
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(mockManager.save).toHaveBeenCalled();
      expect(result).toEqual({
        access_token: 'signed-token',
        refresh_token: 'signed-token',
      });
    });
  });

  describe('signup', () => {
    it('creates an active patient, generates tokens, commits transaction', async () => {
      mockUsersService.createUser.mockResolvedValue({
        ...mockUser,
        id: 'user-uuid',
        roles: [{ role: RolesEnum.Patient.Patient }],
        onboardingCompletedAt: new Date('2026-06-24T10:00:00.000Z'),
      });

      const dto = {
        username: 'jdoe',
        password: 'plain-pw',
        email: 'jdoe@test.com',
        firstName: 'John',
        firstLastName: 'Doe',
      } as never;

      const result = await service.signup(dto);

      // Force-assigned Patient role + created complete (onboarding override).
      expect(mockUsersService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ roles: [RolesEnum.Patient.Patient] }),
        expect.anything(),
        expect.objectContaining({ onboardingCompletedAt: expect.any(Date) }),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      // The token carries the Patient role and the onboarding timestamp.
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: [RolesEnum.Patient.Patient],
          onboardingCompletedAt: '2026-06-24T10:00:00.000Z',
        }),
        expect.anything(),
      );
      expect(result).toEqual({
        access_token: 'signed-token',
        refresh_token: 'signed-token',
      });
    });

    it.each([
      ['admin', RolesEnum.System.Admin],
      ['developer', RolesEnum.System.Developer],
      ['auditor', RolesEnum.System.Auditor],
      ['family', RolesEnum.Patient.Family],
    ])('ignores a client-supplied %s role and still provisions a Patient', async (_label, role) => {
      mockUsersService.createUser.mockResolvedValue({
        ...mockUser,
        id: 'user-uuid',
        onboardingCompletedAt: new Date('2026-06-24T10:00:00.000Z'),
      });

      await service.signup({
        username: 'jdoe',
        password: 'plain-pw',
        email: 'jdoe@test.com',
        firstName: 'John',
        firstLastName: 'Doe',
        roles: [role],
      } as never);

      // The elevated role never reaches createUser — Patient is forced.
      expect(mockUsersService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ roles: [RolesEnum.Patient.Patient] }),
        expect.anything(),
        expect.anything(),
      );
      const [createArg] = mockUsersService.createUser.mock.calls[0];
      expect(createArg.roles).not.toContain(role);
    });

    it('rolls back transaction on error', async () => {
      mockUsersService.createUser.mockRejectedValue(new Error('DB error'));

      await expect(service.signup({ roles: [] } as never)).rejects.toThrow(
        'DB error',
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('throws UnauthorizedException when no token provided', async () => {
      await expect(service.logout(undefined)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when token cannot be verified', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('invalid'));
      await expect(service.logout('bad-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws BadRequestException when already logged out (no active RT)', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        id: 'user-uuid',
        roles: [],
      });
      refreshTokenUserRepo.update.mockResolvedValue({ affected: 0 });
      await expect(service.logout('valid-token')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('deactivates refresh token on valid logout', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        id: 'user-uuid',
        roles: [],
      });
      refreshTokenUserRepo.update.mockResolvedValue({ affected: 1 });
      await expect(service.logout('valid-token')).resolves.toBeUndefined();
      expect(refreshTokenUserRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ user: { id: 'user-uuid' }, isActive: true }),
        { isActive: false },
      );
    });

    it('succeeds when AT secret fails but RT secret succeeds', async () => {
      mockJwtService.verifyAsync
        .mockRejectedValueOnce(new Error('expired'))
        .mockResolvedValueOnce({ id: 'user-uuid', roles: [] });
      refreshTokenUserRepo.update.mockResolvedValue({ affected: 1 });
      await expect(service.logout('rt-token')).resolves.toBeUndefined();
      expect(refreshTokenUserRepo.update).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    const refreshUser = {
      ...mockUser,
      refreshToken: 'plain-rt',
      iat: 0,
      exp: 9999999999,
    };

    it('validates RT, generates new tokens, rotates refresh token', async () => {
      refreshTokenUserRepo.findOne.mockResolvedValue({
        refreshToken: 'hashed-rt',
      });

      const result = await service.refresh(refreshUser);

      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        access_token: 'signed-token',
        refresh_token: 'signed-token',
      });
      // Old RT deactivated, new RT stored
      expect(mockManager.update).toHaveBeenCalledWith(
        RefreshTokenUserEntity,
        expect.objectContaining({ user: { id: 'user-uuid' }, isActive: true }),
        { isActive: false },
      );
      expect(mockManager.save).toHaveBeenCalledWith(
        RefreshTokenUserEntity,
        expect.objectContaining({ user: { id: 'user-uuid' }, isActive: true }),
      );
    });

    it('propagates UnauthorizedException when refresh token is invalid', async () => {
      refreshTokenUserRepo.findOne.mockResolvedValue(null);
      await expect(service.refresh(refreshUser)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('logoutIntegration', () => {
    it('deactivates integration RT on valid token', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        id: 'int-uuid',
        name: 'Bot',
        roles: [RolesEnum.System.Integration],
        iat: 0,
        exp: 9999,
      });
      refreshTokenUserIntegrationRepo.update.mockResolvedValue({ affected: 1 });

      await expect(
        service.logoutIntegration('valid-int-token'),
      ).resolves.toBeUndefined();
      expect(refreshTokenUserIntegrationRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ user: { id: 'int-uuid' }, isActive: true }),
        { isActive: false },
      );
    });

    it('throws UnauthorizedException when token carries non-Integration role', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        id: 'user-uuid',
        roles: [RolesEnum.System.Admin],
        iat: 0,
        exp: 9999,
      });
      await expect(
        service.logoutIntegration('regular-user-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when both secrets fail', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('invalid'));
      await expect(
        service.logoutIntegration('garbage-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws BadRequestException when integration RT already deactivated', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        id: 'int-uuid',
        roles: [RolesEnum.System.Integration],
        iat: 0,
        exp: 9999,
      });
      refreshTokenUserIntegrationRepo.update.mockResolvedValue({ affected: 0 });
      await expect(
        service.logoutIntegration('valid-int-token'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('signupIntegration', () => {
    it('creates integration user and returns tokens', async () => {
      mockUsersService.createUserIntegration.mockResolvedValue({
        id: 'int-uuid',
        name: 'Bot',
      });

      const result = await service.signupIntegration({ name: 'Bot' } as never);

      expect(mockUsersService.createUserIntegration).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toEqual({
        access_token: 'signed-token',
        refresh_token: 'signed-token',
      });
    });
  });

  describe('generatePin', () => {
    it('resolves without throwing (implementation pending)', async () => {
      await expect(
        service.generatePin(
          { purpose: 'test', target: 'test@test.com' } as never,
          '127.0.0.1',
        ),
      ).resolves.not.toThrow();
    });
  });

  describe('validatePin', () => {
    it('resolves without throwing (implementation pending)', async () => {
      await expect(
        service.validatePin({
          purpose: 'test',
          target: 'test@test.com',
          code: 123456,
        } as never),
      ).resolves.not.toThrow();
    });
  });

  describe('onModuleInit', () => {
    let loggerLogSpy: jest.SpyInstance;

    beforeEach(() => {
      loggerLogSpy = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation(() => undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('is a no-op when ENVIRONMENT is not dev', async () => {
      Object.assign(envs, { ENVIRONMENT: 'test' });

      await service.onModuleInit();

      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
      expect(loggerLogSpy).not.toHaveBeenCalled();
    });

    describe('when ENVIRONMENT is dev', () => {
      beforeEach(() => {
        Object.assign(envs, { ENVIRONMENT: 'dev' });
      });

      afterEach(() => {
        Object.assign(envs, { ENVIRONMENT: 'test' });
      });

      it('signs AT and RT with 30d expiry using dev payload', async () => {
        await service.onModuleInit();

        expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
        const calls = mockJwtService.signAsync.mock.calls;
        expect(calls[0][0]).toMatchObject({
          sub: 'dev',
          username: 'dev',
          email: 'dev@localhost',
          roles: [RolesEnum.System.Developer],
        });
        expect(calls[0][1]).toMatchObject({ expiresIn: '30d' });
        expect(calls[1][1]).toMatchObject({ expiresIn: '30d' });
      });

      it('logs DEV_AT and DEV_RT via NestJS Logger', async () => {
        mockJwtService.signAsync
          .mockResolvedValueOnce('mock-at')
          .mockResolvedValueOnce('mock-rt');

        await service.onModuleInit();

        expect(loggerLogSpy).toHaveBeenCalledWith('DEV_AT=mock-at');
        expect(loggerLogSpy).toHaveBeenCalledWith('DEV_RT=mock-rt');
      });
    });
  });
});
