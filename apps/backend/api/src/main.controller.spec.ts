import { HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { MainController } from './main.controller';
import { MainService } from './main.service';

const healthService = { check: jest.fn().mockResolvedValue({ status: 'ok' }) };
const httpIndicator = { pingCheck: jest.fn() };

describe('MainController', () => {
  let controller: MainController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [MainController],
      providers: [
        MainService,
        { provide: HealthCheckService, useValue: healthService },
        { provide: HttpHealthIndicator, useValue: httpIndicator },
      ],
    }).compile();

    controller = app.get<MainController>(MainController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('returns health check result', async () => {
      const result = await controller.check();
      expect(healthService.check).toHaveBeenCalled();
      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('version', () => {
    const ORIGINAL_ENV = { ...process.env };

    afterEach(() => {
      process.env = { ...ORIGINAL_ENV };
    });

    it('returns only the semantic version (no build/git metadata)', () => {
      process.env.API_VERSION = '1.2.3';
      const result = controller.version();
      expect(result).toEqual({ version: '1.2.3' });
      expect(Object.keys(result)).toEqual(['version']);
    });

    it('falls back to npm_package_version when API_VERSION is unset', () => {
      process.env.API_VERSION = undefined;
      process.env.npm_package_version = '4.5.6';
      expect(controller.version()).toEqual({ version: '4.5.6' });
    });
  });
});
