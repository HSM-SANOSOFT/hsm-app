import { RolesSystemEnum } from '@hsm/common/enums';
import { envs } from '@hsm/config';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import { AuthDevService } from './auth-dev.service';

jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

jest.mock('@hsm/config', () => ({
  envs: {
    ENVIRONMENT: 'test',
    JWT_AT_SECRET: 'test-at-secret-32-chars-padding!!',
    JWT_RT_SECRET: 'test-rt-secret-32-chars-padding!!',
  },
}));

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('test-token'),
};

describe('AuthDevService', () => {
  let service: AuthDevService;
  let loggerLogSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockJwtService.signAsync.mockResolvedValue('test-token');
    loggerLogSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthDevService,
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthDevService>(AuthDevService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('is a no-op when ENVIRONMENT is not dev', async () => {
      (envs as { ENVIRONMENT: string }).ENVIRONMENT = 'test';

      await service.onModuleInit();

      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    describe('when ENVIRONMENT is dev', () => {
      beforeEach(() => {
        (envs as { ENVIRONMENT: string }).ENVIRONMENT = 'dev';
      });

      afterEach(() => {
        (envs as { ENVIRONMENT: string }).ENVIRONMENT = 'test';
      });

      it('signs AT and RT with 30d expiry using correct payload', async () => {
        await service.onModuleInit();

        expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
        const calls = mockJwtService.signAsync.mock.calls;
        expect(calls[0][0]).toMatchObject({
          sub: 'dev',
          username: 'dev',
          email: 'dev@localhost',
          firstName: 'Dev',
          firstLastName: 'User',
          roles: [RolesSystemEnum.Developer],
        });
        expect(calls[0][1]).toMatchObject({ expiresIn: '30d' });
        expect(calls[1][1]).toMatchObject({ expiresIn: '30d' });
      });

      it('writes at_token and rt_token to .vscode/settings.local.json', async () => {
        mockJwtService.signAsync
          .mockResolvedValueOnce('mock-at')
          .mockResolvedValueOnce('mock-rt');

        await service.onModuleInit();

        expect(fs.mkdirSync).toHaveBeenCalledWith(
          expect.stringContaining('.vscode'),
          { recursive: true },
        );
        expect(fs.writeFileSync).toHaveBeenCalledWith(
          expect.stringContaining('settings.local.json'),
          JSON.stringify({ at_token: 'mock-at', rt_token: 'mock-rt' }, null, 2),
        );
      });

      it('logs token values via NestJS Logger when stdout is a TTY', async () => {
        const originalIsTTY = process.stdout.isTTY;
        Object.defineProperty(process.stdout, 'isTTY', {
          value: true,
          configurable: true,
        });

        await service.onModuleInit();

        const tokenLogs = loggerLogSpy.mock.calls.filter(
          call =>
            String(call[0]).startsWith('DEV_AT=') ||
            String(call[0]).startsWith('DEV_RT='),
        );
        expect(tokenLogs.length).toBe(2);

        Object.defineProperty(process.stdout, 'isTTY', {
          value: originalIsTTY,
          configurable: true,
        });
      });

      it('does not log token values when stdout is not a TTY', async () => {
        const originalIsTTY = process.stdout.isTTY;
        Object.defineProperty(process.stdout, 'isTTY', {
          value: false,
          configurable: true,
        });

        await service.onModuleInit();

        const tokenLogs = loggerLogSpy.mock.calls.filter(
          call =>
            String(call[0]).startsWith('DEV_AT=') ||
            String(call[0]).startsWith('DEV_RT='),
        );
        expect(tokenLogs).toHaveLength(0);

        Object.defineProperty(process.stdout, 'isTTY', {
          value: originalIsTTY,
          configurable: true,
        });
      });
    });
  });
});
