import { QueueService } from '@hsm/queue';
import { Test, TestingModule } from '@nestjs/testing';
import { ComsService } from './coms.service';
import { EmailService } from './email/email.service';

describe('ComsService', () => {
  let service: ComsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComsService,
        { provide: EmailService, useValue: { sendEmail: jest.fn() } },
        {
          provide: QueueService,
          useValue: {
            workerActive: jest.fn(),
            workerCompleted: jest.fn(),
            workerFailed: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ComsService>(ComsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
