import { Test, TestingModule } from '@nestjs/testing';
import { ComsController } from './coms.controller';
import { ComsService } from './coms.service';

const comsService = {
  sendEmail: jest
    .fn()
    .mockResolvedValue('sending email job queued with id job-123'),
  resendEmail: jest.fn().mockResolvedValue(undefined),
  sendSms: jest.fn().mockResolvedValue(undefined),
};

describe('ComsController', () => {
  let controller: ComsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComsController],
      providers: [{ provide: ComsService, useValue: comsService }],
    }).compile();

    controller = module.get<ComsController>(ComsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendEmail', () => {
    it('delegates payload to comsService.sendEmail', async () => {
      const payload = { templateIdentifier: 'welcome', data: {} } as never;
      await controller.sendEmail(payload);
      expect(comsService.sendEmail).toHaveBeenCalledWith(payload);
    });
  });

  describe('resendEmail', () => {
    it('delegates to comsService.resendEmail', async () => {
      await controller.resendEmail();
      expect(comsService.resendEmail).toHaveBeenCalled();
    });
  });

  describe('sendSms', () => {
    it('delegates to comsService.sendSms', async () => {
      await controller.sendSms();
      expect(comsService.sendSms).toHaveBeenCalled();
    });
  });
});
