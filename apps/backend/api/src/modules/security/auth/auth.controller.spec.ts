import type { PublicSignupPayloadDto } from '@hsm/common/dtos';
import { RolesEnum } from '@hsm/common/enums';
import type { IRefreshUser, ISignedUser } from '@hsm/common/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { AccountRecoveryService } from './account-recovery.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockTokens = { access_token: 'at', refresh_token: 'rt' };

const authService = {
  signup: jest.fn().mockResolvedValue(mockTokens),
  login: jest.fn().mockResolvedValue(mockTokens),
  logout: jest.fn().mockResolvedValue(undefined),
  refresh: jest.fn().mockResolvedValue(mockTokens),
  signupIntegration: jest.fn().mockResolvedValue(mockTokens),
  logoutIntegration: jest.fn().mockResolvedValue(undefined),
  generatePin: jest.fn().mockResolvedValue(undefined),
  validatePin: jest.fn().mockResolvedValue(undefined),
  completeOnboarding: jest.fn().mockResolvedValue(mockTokens),
};

const accountRecoveryService = {
  forgotPassword: jest.fn().mockResolvedValue(undefined),
  resetPassword: jest.fn().mockResolvedValue(undefined),
  recoverUsername: jest.fn().mockResolvedValue(undefined),
};

const makeReq = (overrides: Partial<Request> = {}): Request =>
  ({ headers: {}, user: undefined, ...overrides }) as unknown as Request;

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: AccountRecoveryService,
          useValue: accountRecoveryService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signup', () => {
    it('delegates to authService.signup and returns tokens', async () => {
      const dto: PublicSignupPayloadDto = {
        username: 'jdoe',
        password: 'pw',
        email: 'jdoe@test.com',
        firstName: 'John',
        firstLastName: 'Doe',
      } as never;

      const result = await controller.signup(dto);
      expect(authService.signup).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockTokens);
    });
  });

  describe('login', () => {
    it('delegates req.user to authService.login', async () => {
      const signedUser: ISignedUser = {
        id: 'user-uuid',
        username: 'jdoe',
        email: 'jdoe@test.com',
        firstName: 'John',
        firstLastName: 'Doe',
        roles: [RolesEnum.System.Admin],
        iat: 0,
        exp: 9999,
      };
      const req = makeReq({ user: signedUser as never });

      const result = await controller.login(req, {} as never);
      expect(authService.login).toHaveBeenCalledWith(signedUser);
      expect(result).toEqual(mockTokens);
    });
  });

  describe('logout', () => {
    it('extracts Bearer token from Authorization header', async () => {
      const req = makeReq({ headers: { authorization: 'Bearer my-token' } });
      await controller.logout(req);
      expect(authService.logout).toHaveBeenCalledWith('my-token');
    });

    it('passes undefined when no Authorization header', async () => {
      const req = makeReq({ headers: {} });
      await controller.logout(req);
      expect(authService.logout).toHaveBeenCalledWith(undefined);
    });
  });

  describe('refresh', () => {
    it('delegates req.user to authService.refresh', async () => {
      const refreshUser: IRefreshUser = {
        id: 'user-uuid',
        username: 'jdoe',
        email: 'jdoe@test.com',
        firstName: 'John',
        firstLastName: 'Doe',
        roles: [RolesEnum.System.Admin],
        refreshToken: 'rt',
        iat: 0,
        exp: 9999,
      };
      const req = makeReq({ user: refreshUser as never });

      const result = await controller.refresh(req);
      expect(authService.refresh).toHaveBeenCalledWith(refreshUser);
      expect(result).toEqual(mockTokens);
    });
  });

  describe('signupIntegration', () => {
    it('delegates payload to authService.signupIntegration', async () => {
      const dto = { name: 'Bot' } as never;
      const result = await controller.signupIntegration(dto);
      expect(authService.signupIntegration).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockTokens);
    });
  });

  describe('logoutIntegration', () => {
    it('extracts token from payload and delegates', async () => {
      const payload = { token: 'integration-token' } as never;
      await controller.logoutIntegration(payload);
      expect(authService.logoutIntegration).toHaveBeenCalledWith(
        'integration-token',
      );
    });
  });

  describe('profile', () => {
    it('returns req.user', () => {
      const user = { id: 'user-uuid' };
      const req = makeReq({ user: user as never });
      expect(controller.profile(req)).toBe(user);
    });
  });

  describe('completeOnboarding', () => {
    it('delegates the caller id and payload to authService.completeOnboarding', async () => {
      const dto = {
        newPassword: 'New-Passw0rd',
        phoneNumber: '+1 555 0100',
        confirmEmail: 'nurse@example.com',
      } as never;
      const req = makeReq({ user: { id: 'u1' } as never });

      const result = await controller.completeOnboarding(req, dto);

      expect(authService.completeOnboarding).toHaveBeenCalledWith('u1', dto);
      expect(result).toBe(mockTokens);
    });
  });

  describe('generatePin', () => {
    it('delegates payload and IP to authService.generatePin', async () => {
      const dto = { purpose: 'reset', target: 'jdoe@test.com' } as never;
      await controller.generatePin(dto, '127.0.0.1');
      expect(authService.generatePin).toHaveBeenCalledWith(dto, '127.0.0.1');
    });
  });

  describe('validatePin', () => {
    it('delegates payload to authService.validatePin', async () => {
      const dto = {
        purpose: 'reset',
        target: 'jdoe@test.com',
        code: 123456,
      } as never;
      await controller.validatePin(dto);
      expect(authService.validatePin).toHaveBeenCalledWith(dto);
    });
  });

  describe('forgotPassword', () => {
    it('delegates the email and returns the generic, non-enumerating message', async () => {
      const result = await controller.forgotPassword({
        email: 'jdoe@test.com',
      });
      expect(accountRecoveryService.forgotPassword).toHaveBeenCalledWith(
        'jdoe@test.com',
      );
      expect(result).toEqual({
        message: 'If an account exists, we have sent an email.',
      });
    });

    it('returns the SAME generic message even when the service did nothing (account absent)', async () => {
      accountRecoveryService.forgotPassword.mockResolvedValueOnce(undefined);
      const result = await controller.forgotPassword({
        email: 'nobody@test.com',
      });
      // No account-existence signal leaks through the controller response.
      expect(result).toEqual({
        message: 'If an account exists, we have sent an email.',
      });
    });
  });

  describe('resetPassword', () => {
    it('delegates token + newPassword and returns the update confirmation', async () => {
      const result = await controller.resetPassword({
        token: 'tok',
        newPassword: 'NewPassw0rd@',
      });
      expect(accountRecoveryService.resetPassword).toHaveBeenCalledWith(
        'tok',
        'NewPassw0rd@',
      );
      expect(result).toEqual({ message: 'Password updated.' });
    });
  });

  describe('recoverUsername', () => {
    it('delegates the email and returns the generic, non-enumerating message', async () => {
      const result = await controller.recoverUsername({
        email: 'jdoe@test.com',
      });
      expect(accountRecoveryService.recoverUsername).toHaveBeenCalledWith(
        'jdoe@test.com',
      );
      expect(result).toEqual({
        message: 'If an account exists, we have sent an email.',
      });
    });
  });
});
