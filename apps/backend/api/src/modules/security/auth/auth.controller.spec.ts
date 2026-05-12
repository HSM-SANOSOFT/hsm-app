import type { SignupPayloadDto } from '@hsm/common/dtos';
import { RolesEnum } from '@hsm/common/enums';
import type { IRefreshUser, ISignedUser } from '@hsm/common/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
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
};

const makeReq = (overrides: Partial<Request> = {}): Request =>
  ({ headers: {}, user: undefined, ...overrides }) as unknown as Request;

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signup', () => {
    it('delegates to authService.signup and returns tokens', async () => {
      const dto: SignupPayloadDto = {
        username: 'jdoe',
        password: 'pw',
        email: 'jdoe@test.com',
        firstName: 'John',
        firstLastName: 'Doe',
        roles: [RolesEnum.System.Admin],
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
});
