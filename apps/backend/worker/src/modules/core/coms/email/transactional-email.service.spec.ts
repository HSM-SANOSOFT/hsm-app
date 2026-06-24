import { SettingsAccessorService } from '@hsm/database/settings';
import { Test, TestingModule } from '@nestjs/testing';
import { SmtpTransportProvider } from './smtp-transport.provider';
import { TransactionalEmailService } from './transactional-email.service';

describe('TransactionalEmailService', () => {
  let service: TransactionalEmailService;
  const sendMail = jest.fn();
  const mockSmtpTransport = {
    getTransporter: jest.fn().mockResolvedValue({ sendMail }),
  };
  const mockSettingsAccessor = {
    getCategoryValues: jest
      .fn()
      .mockResolvedValue({ SMTP_USERNAME: 'noreply@hsm.test' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionalEmailService,
        { provide: SmtpTransportProvider, useValue: mockSmtpTransport },
        { provide: SettingsAccessorService, useValue: mockSettingsAccessor },
      ],
    }).compile();
    service = module.get<TransactionalEmailService>(TransactionalEmailService);
  });

  it('sends the email through the SMTP transport using the settings from-address', async () => {
    await service.send({
      toEmail: 'user@test.com',
      subject: 'Reset your password',
      html: '<p>link</p>',
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith({
      from: 'noreply@hsm.test',
      to: 'user@test.com',
      subject: 'Reset your password',
      html: '<p>link</p>',
      text: undefined,
    });
  });

  it('propagates send failures so BullMQ retries', async () => {
    sendMail.mockRejectedValueOnce(new Error('smtp down'));
    await expect(
      service.send({
        toEmail: 'user@test.com',
        subject: 'x',
        html: '<p>x</p>',
      }),
    ).rejects.toThrow('smtp down');
  });
});
