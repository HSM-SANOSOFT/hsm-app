import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
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
});
