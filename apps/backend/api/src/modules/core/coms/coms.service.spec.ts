import { QueueEnum } from '@hsm/queue';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { ComsService } from './coms.service';

const comsQueue = { add: jest.fn() };

describe('ComsService', () => {
  let service: ComsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComsService,
        { provide: getQueueToken(QueueEnum.Coms), useValue: comsQueue },
      ],
    }).compile();

    service = module.get<ComsService>(ComsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it('enqueues a send-email job and returns a string with the job id', async () => {
      comsQueue.add.mockResolvedValue({ id: 'job-123' });
      const payload = { templateIdentifier: 'welcome', data: {} } as never;

      const result = await service.sendEmail(payload);

      expect(comsQueue.add).toHaveBeenCalledWith('send-email', payload);
      expect(result).toContain('job-123');
    });
  });

  describe('resendEmail', () => {
    it('resolves without throwing (implementation pending)', async () => {
      await expect(service.resendEmail()).resolves.toBeUndefined();
    });
  });

  describe('sendSms', () => {
    it('resolves without throwing (implementation pending)', async () => {
      await expect(service.sendSms()).resolves.toBeUndefined();
    });
  });
});
