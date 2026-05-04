import { SendEmailPayloadDto } from '@hsm/common/dtos';
import { TemplateNotFoundError } from '@hsm/common/errors';
import {
  TemplateParseLogEntity,
  TemplatesEntity,
} from '@hsm/database/entities/modules/core/template';
import { DatabasesEnum } from '@hsm/database/sources';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DocsService } from '../../docs/docs.service';
import { TemplatesService } from '../../templates/templates.service';
import { EmailService } from './email.service';

const makeParseEmailResult = (overrides = {}) => ({
  subject: 'Hello Ada',
  html: '<p>Welcome Ada</p>',
  templateId: 'tmpl-id',
  ...overrides,
});

const makePayload = (
  overrides: Partial<SendEmailPayloadDto> = {},
): SendEmailPayloadDto =>
  ({
    emailTemplate: 'welcome',
    data: { userName: 'Ada' },
    toEmails: ['ada@example.com'],
    fromEmail: 'no-reply@hsm.org',
    ...overrides,
  }) as SendEmailPayloadDto;

describe('EmailService', () => {
  let service: EmailService;
  let templatesService: { parseEmail: jest.Mock };
  let docsService: { getDocumentsStreams: jest.Mock };
  let smtpClient: { sendMail: jest.Mock };

  beforeEach(async () => {
    templatesService = {
      parseEmail: jest.fn().mockResolvedValue(makeParseEmailResult()),
    };
    docsService = { getDocumentsStreams: jest.fn() };
    smtpClient = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'msg-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: TemplatesService, useValue: templatesService },
        { provide: DocsService, useValue: docsService },
        { provide: 'SMTP_CLIENT', useValue: smtpClient },
        {
          provide: getRepositoryToken(
            TemplatesEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(
            TemplateParseLogEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: { save: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  describe('sendEmail – happy path', () => {
    it('parses template and sends rendered subject + html', async () => {
      await service.sendEmail(makePayload());

      expect(templatesService.parseEmail).toHaveBeenCalledWith('welcome', {
        userName: 'Ada',
      });
      expect(smtpClient.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Hello Ada',
          html: '<p>Welcome Ada</p>',
          to: ['ada@example.com'],
        }),
      );
    });

    it('sends with empty attachments when documents absent', async () => {
      await service.sendEmail(makePayload({ documents: undefined }));

      expect(docsService.getDocumentsStreams).not.toHaveBeenCalled();
      expect(smtpClient.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ attachments: [] }),
      );
    });
  });

  describe('sendEmail – error paths', () => {
    it('propagates TemplateNotFoundError so BullMQ can retry', async () => {
      templatesService.parseEmail.mockRejectedValue(
        new TemplateNotFoundError('welcome'),
      );

      await expect(
        service.sendEmail(makePayload({ emailTemplate: 'welcome', data: {} })),
      ).rejects.toBeInstanceOf(TemplateNotFoundError);

      expect(smtpClient.sendMail).not.toHaveBeenCalled();
    });

    it('propagates smtp error when sendMail fails', async () => {
      smtpClient.sendMail.mockRejectedValue(new Error('SMTP timeout'));

      await expect(service.sendEmail(makePayload())).rejects.toThrow(
        'SMTP timeout',
      );
    });
  });
});
