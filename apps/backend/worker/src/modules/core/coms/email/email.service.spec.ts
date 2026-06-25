import { SendEmailJobDto } from '@hsm/common/dtos';
import {
  DocumentStatusEnum,
  EmailBatchStatusEnum,
  EmailRecipientStatusEnum,
} from '@hsm/common/enums';
import {
  DocumentsEntity,
  EmailBatchEntity,
  EmailRecipientEntity,
} from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DocsService } from '../../docs/docs.service';
import { TemplatesService } from '../../templates/templates.service';
import { EmailService } from './email.service';
import { SmtpTransportProvider } from './smtp-transport.provider';

const makeParseEmailResult = (overrides = {}) => ({
  subject: 'Hello Ada',
  html: '<p>Welcome Ada</p>',
  templateId: 'tmpl-id',
  ...overrides,
});

const makeRecipient = (
  overrides: Partial<EmailRecipientEntity> = {},
): EmailRecipientEntity =>
  ({
    id: 'r-001',
    toEmail: 'ada@example.com',
    status: EmailRecipientStatusEnum.PENDING,
    sentAt: null,
    errorMessage: null,
    messageId: null,
    ...overrides,
  }) as EmailRecipientEntity;

const makeBatch = (
  overrides: Partial<EmailBatchEntity> = {},
): EmailBatchEntity =>
  ({
    id: 'batch-001',
    templateId: 'tmpl-id',
    data: { userName: 'Ada' },
    documentIds: null,
    fromEmail: 'no-reply@hsm.org',
    fromName: null,
    overallStatus: EmailBatchStatusEnum.PENDING,
    providerMessageId: null,
    recipients: [makeRecipient()],
    ...overrides,
  }) as EmailBatchEntity;

const makePayload = (
  overrides: Partial<SendEmailJobDto> = {},
): SendEmailJobDto => ({
  batchId: 'batch-001',
  ...overrides,
});

describe('EmailService', () => {
  let service: EmailService;
  let templatesService: { parseEmail: jest.Mock };
  let docsService: { getDocumentsStreams: jest.Mock };
  let smtpClient: { sendMail: jest.Mock };
  let batchRepo: {
    findOne: jest.Mock;
    update: jest.Mock;
  };
  let recipientRepo: {
    update: jest.Mock;
    find: jest.Mock;
  };
  let docsRepo: { findOne: jest.Mock; find: jest.Mock };

  beforeEach(async () => {
    templatesService = {
      parseEmail: jest.fn().mockResolvedValue(makeParseEmailResult()),
    };
    docsService = { getDocumentsStreams: jest.fn() };
    smtpClient = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'msg-1' }),
    };
    const smtpTransport = {
      getTransporter: jest.fn().mockResolvedValue(smtpClient),
    };
    batchRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };
    recipientRepo = {
      update: jest.fn().mockResolvedValue(undefined),
      find: jest.fn(),
    };
    docsRepo = { findOne: jest.fn(), find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: TemplatesService, useValue: templatesService },
        { provide: DocsService, useValue: docsService },
        { provide: SmtpTransportProvider, useValue: smtpTransport },
        {
          provide: getRepositoryToken(
            EmailBatchEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: batchRepo,
        },
        {
          provide: getRepositoryToken(
            EmailRecipientEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: recipientRepo,
        },
        {
          provide: getRepositoryToken(
            DocumentsEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: docsRepo,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  describe('sendEmail – happy path (batch with 2 PENDING recipients, no docs)', () => {
    it('marks batch PROCESSING, sends email to both recipients, then updates both SENT and batch SENT', async () => {
      const recipient1 = makeRecipient({
        id: 'r-001',
        toEmail: 'ada@example.com',
      });
      const recipient2 = makeRecipient({
        id: 'r-002',
        toEmail: 'bob@example.com',
      });
      const batch = makeBatch({ recipients: [recipient1, recipient2] });

      batchRepo.findOne.mockResolvedValue(batch);
      recipientRepo.find.mockResolvedValue([
        { ...recipient1, status: EmailRecipientStatusEnum.SENT },
        { ...recipient2, status: EmailRecipientStatusEnum.SENT },
      ]);

      await service.sendEmail(makePayload());

      // Mark PROCESSING first
      expect(batchRepo.update).toHaveBeenCalledWith('batch-001', {
        overallStatus: EmailBatchStatusEnum.PROCESSING,
      });

      // Template parsed
      expect(templatesService.parseEmail).toHaveBeenCalledWith('tmpl-id', {
        userName: 'Ada',
      });

      // SMTP called with both recipients
      expect(smtpClient.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'no-reply@hsm.org',
          to: ['ada@example.com', 'bob@example.com'],
          subject: 'Hello Ada',
          html: '<p>Welcome Ada</p>',
          attachments: [],
        }),
      );

      // Both recipients updated SENT in a single bulk UPDATE
      expect(recipientRepo.update).toHaveBeenCalledWith(
        { id: expect.objectContaining({ _value: ['r-001', 'r-002'] }) },
        expect.objectContaining({ status: EmailRecipientStatusEnum.SENT }),
      );

      // Batch updated to SENT with messageId
      expect(batchRepo.update).toHaveBeenCalledWith('batch-001', {
        overallStatus: EmailBatchStatusEnum.SENT,
        providerMessageId: 'msg-1',
      });
    });
  });

  describe('sendEmail – resend single recipient (recipientId set)', () => {
    it('targets only the specified recipient, not all PENDING recipients', async () => {
      const recipient1 = makeRecipient({
        id: 'r-001',
        toEmail: 'ada@example.com',
        status: EmailRecipientStatusEnum.SENT,
      });
      const recipient2 = makeRecipient({
        id: 'r-002',
        toEmail: 'bob@example.com',
        status: EmailRecipientStatusEnum.PENDING,
      });
      const batch = makeBatch({ recipients: [recipient1, recipient2] });

      batchRepo.findOne.mockResolvedValue(batch);
      recipientRepo.find.mockResolvedValue([
        { ...recipient1 },
        { ...recipient2, status: EmailRecipientStatusEnum.SENT },
      ]);

      await service.sendEmail(makePayload({ recipientId: 'r-001' }));

      expect(smtpClient.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['ada@example.com'],
        }),
      );
      // Only r-001 is targeted by the bulk UPDATE (r-002 is not in the id set)
      expect(recipientRepo.update).toHaveBeenCalledWith(
        { id: expect.objectContaining({ _value: ['r-001'] }) },
        expect.objectContaining({ status: EmailRecipientStatusEnum.SENT }),
      );
    });
  });

  describe('sendEmail – SENT recipient in batch not re-sent', () => {
    it('filters out SENT recipients when no recipientId is given', async () => {
      const pendingRecipient = makeRecipient({
        id: 'r-001',
        toEmail: 'ada@example.com',
        status: EmailRecipientStatusEnum.PENDING,
      });
      const sentRecipient = makeRecipient({
        id: 'r-002',
        toEmail: 'already-sent@example.com',
        status: EmailRecipientStatusEnum.SENT,
      });
      const batch = makeBatch({
        recipients: [pendingRecipient, sentRecipient],
      });

      batchRepo.findOne.mockResolvedValue(batch);
      recipientRepo.find.mockResolvedValue([
        { ...pendingRecipient, status: EmailRecipientStatusEnum.SENT },
        { ...sentRecipient },
      ]);

      await service.sendEmail(makePayload());

      expect(smtpClient.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['ada@example.com'],
        }),
      );
      // SENT recipient should not be re-updated
      expect(recipientRepo.update).not.toHaveBeenCalledWith(
        'r-002',
        expect.anything(),
      );
    });
  });

  describe('sendEmail – SMTP failure', () => {
    it('updates recipients to FAILED, recomputes batch status, and rethrows', async () => {
      const recipient = makeRecipient({ id: 'r-001' });
      const batch = makeBatch({ recipients: [recipient] });

      batchRepo.findOne.mockResolvedValue(batch);
      smtpClient.sendMail.mockRejectedValue(new Error('SMTP timeout'));
      recipientRepo.find.mockResolvedValue([
        { ...recipient, status: EmailRecipientStatusEnum.FAILED },
      ]);

      await expect(service.sendEmail(makePayload())).rejects.toThrow(
        'SMTP timeout',
      );

      expect(recipientRepo.update).toHaveBeenCalledWith(
        { id: expect.objectContaining({ _value: ['r-001'] }) },
        {
          status: EmailRecipientStatusEnum.FAILED,
          errorMessage: 'SMTP timeout',
        },
      );

      // Batch recomputed to FAILED (all recipients failed)
      expect(batchRepo.update).toHaveBeenCalledWith('batch-001', {
        overallStatus: EmailBatchStatusEnum.FAILED,
      });
    });
  });

  describe('resolveDocumentAttachments – PENDING document throws', () => {
    it('throws a descriptive error when document is not COMPLETED', async () => {
      const pendingDoc = {
        id: 'doc-001',
        title: 'Report',
        status: DocumentStatusEnum.PENDING,
        versions: [],
      } as unknown as DocumentsEntity;

      const batch = makeBatch({ documentIds: ['doc-001'] });
      batchRepo.findOne.mockResolvedValue(batch);
      docsRepo.find.mockResolvedValue([pendingDoc]);

      await expect(service.sendEmail(makePayload())).rejects.toThrow(
        `Document doc-001 is not ready (status: ${DocumentStatusEnum.PENDING})`,
      );

      expect(smtpClient.sendMail).not.toHaveBeenCalled();
    });
  });
});
