import {
  EmailRecipientStatusEnum,
  EmailSuppressionReasonEnum,
  EmailWebhookEventTypeEnum,
} from '@hsm/common/enums';
import {
  EmailRecipientEntity,
  EmailSuppressionEntity,
  EmailWebhookEventEntity,
} from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import { QueueEnum } from '@hsm/queue';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { EmailWebhookService } from './email-webhook.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeEvent = (
  overrides: Partial<EmailWebhookEventEntity> = {},
): EmailWebhookEventEntity =>
  ({
    id: 'evt-001',
    provider: 'mandrill',
    eventType: EmailWebhookEventTypeEnum.DELIVERED,
    rawPayload: {},
    recipientEmail: 'ada@example.com',
    messageId: 'msg-123',
    recipient: undefined,
    processedAt: undefined,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  }) as EmailWebhookEventEntity;

const makeRecipient = (
  overrides: Partial<EmailRecipientEntity> = {},
): EmailRecipientEntity =>
  ({
    id: 'r-001',
    toEmail: 'ada@example.com',
    status: EmailRecipientStatusEnum.SENT,
    ...overrides,
  }) as EmailRecipientEntity;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EmailWebhookService', () => {
  let service: EmailWebhookService;

  let webhookEventRepo: { findOne: jest.Mock };
  let recipientRepo: { findOne: jest.Mock };
  let suppressionRepo: Record<string, jest.Mock>;
  let mockManager: {
    update: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };
  let comsQueue: { add: jest.Mock };

  beforeEach(async () => {
    // Build a chainable query builder mock for orIgnore upsert
    const mockExecute = jest.fn().mockResolvedValue(undefined);
    const mockOrIgnore = jest.fn().mockReturnValue({ execute: mockExecute });
    const mockValues = jest
      .fn()
      .mockReturnValue({ orIgnore: mockOrIgnore });
    const mockInto = jest.fn().mockReturnValue({ values: mockValues });
    const mockInsert = jest.fn().mockReturnValue({ into: mockInto });

    mockManager = {
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue({ insert: mockInsert }),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb: (m: typeof mockManager) => Promise<void>) => {
        await cb(mockManager);
      }),
    };

    webhookEventRepo = { findOne: jest.fn() };
    recipientRepo = { findOne: jest.fn() };
    suppressionRepo = {};
    comsQueue = { add: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailWebhookService,
        {
          provide: getRepositoryToken(
            EmailWebhookEventEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: webhookEventRepo,
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
            EmailSuppressionEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: suppressionRepo,
        },
        {
          provide: getDataSourceToken(DatabasesEnum.HsmDbPostgres),
          useValue: dataSource,
        },
        {
          provide: getQueueToken(QueueEnum.Coms),
          useValue: comsQueue,
        },
      ],
    }).compile();

    service = module.get<EmailWebhookService>(EmailWebhookService);
  });

  // -------------------------------------------------------------------------
  // Happy path: DELIVERED
  // -------------------------------------------------------------------------
  describe('processWebhookEvent — DELIVERED event', () => {
    it('updates recipient to DELIVERED, links event to recipient, and marks processedAt', async () => {
      const event = makeEvent({ eventType: EmailWebhookEventTypeEnum.DELIVERED });
      const recipient = makeRecipient();
      webhookEventRepo.findOne.mockResolvedValue(event);
      recipientRepo.findOne.mockResolvedValue(recipient);

      await service.processWebhookEvent('evt-001');

      // Recipient status updated to DELIVERED
      expect(mockManager.update).toHaveBeenCalledWith(
        EmailRecipientEntity,
        'r-001',
        { status: EmailRecipientStatusEnum.DELIVERED },
      );

      // Event linked to recipient
      expect(mockManager.update).toHaveBeenCalledWith(
        EmailWebhookEventEntity,
        'evt-001',
        { recipient: { id: 'r-001' } },
      );

      // processedAt set
      expect(mockManager.update).toHaveBeenCalledWith(
        EmailWebhookEventEntity,
        'evt-001',
        expect.objectContaining({ processedAt: expect.any(Date) }),
      );

      // No suppression upsert
      expect(mockManager.createQueryBuilder).not.toHaveBeenCalled();

      // No alert enqueued for DELIVERED
      expect(comsQueue.add).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // BOUNCED_HARD — suppression + alert
  // -------------------------------------------------------------------------
  describe('processWebhookEvent — BOUNCED_HARD event', () => {
    it('updates recipient to BOUNCED_HARD, upserts suppression row with HARD_BOUNCE reason, enqueues alert', async () => {
      const event = makeEvent({
        eventType: EmailWebhookEventTypeEnum.BOUNCED_HARD,
      });
      const recipient = makeRecipient();
      webhookEventRepo.findOne.mockResolvedValue(event);
      recipientRepo.findOne.mockResolvedValue(recipient);

      await service.processWebhookEvent('evt-001');

      // Recipient status updated
      expect(mockManager.update).toHaveBeenCalledWith(
        EmailRecipientEntity,
        'r-001',
        { status: EmailRecipientStatusEnum.BOUNCED_HARD },
      );

      // Suppression upsert triggered
      expect(mockManager.createQueryBuilder).toHaveBeenCalled();
      const insertChain = mockManager.createQueryBuilder().insert().into(EmailSuppressionEntity);
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'ada@example.com',
          reason: EmailSuppressionReasonEnum.HARD_BOUNCE,
          sourceWebhookEvent: { id: 'evt-001' },
        }),
      );

      // Alert enqueued
      expect(comsQueue.add).toHaveBeenCalledWith(
        'send-alert',
        expect.objectContaining({
          type: 'email-bounce',
          eventId: 'evt-001',
          recipientEmail: 'ada@example.com',
          eventType: EmailWebhookEventTypeEnum.BOUNCED_HARD,
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // SPAM — suppression with SPAM_COMPLAINT + alert
  // -------------------------------------------------------------------------
  describe('processWebhookEvent — SPAM event', () => {
    it('updates recipient to SPAM, upserts suppression with SPAM_COMPLAINT, enqueues alert', async () => {
      const event = makeEvent({ eventType: EmailWebhookEventTypeEnum.SPAM });
      const recipient = makeRecipient();
      webhookEventRepo.findOne.mockResolvedValue(event);
      recipientRepo.findOne.mockResolvedValue(recipient);

      await service.processWebhookEvent('evt-001');

      // Recipient status
      expect(mockManager.update).toHaveBeenCalledWith(
        EmailRecipientEntity,
        'r-001',
        { status: EmailRecipientStatusEnum.SPAM },
      );

      // Suppression upsert with SPAM_COMPLAINT
      expect(mockManager.createQueryBuilder).toHaveBeenCalled();
      const insertChain = mockManager.createQueryBuilder().insert().into(EmailSuppressionEntity);
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'ada@example.com',
          reason: EmailSuppressionReasonEnum.SPAM_COMPLAINT,
        }),
      );

      // Alert enqueued
      expect(comsQueue.add).toHaveBeenCalledWith(
        'send-alert',
        expect.objectContaining({
          eventType: EmailWebhookEventTypeEnum.SPAM,
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // BOUNCED_SOFT — status update + alert, no suppression
  // -------------------------------------------------------------------------
  describe('processWebhookEvent — BOUNCED_SOFT event', () => {
    it('updates recipient to BOUNCED_SOFT, enqueues alert, no suppression row', async () => {
      const event = makeEvent({
        eventType: EmailWebhookEventTypeEnum.BOUNCED_SOFT,
      });
      const recipient = makeRecipient();
      webhookEventRepo.findOne.mockResolvedValue(event);
      recipientRepo.findOne.mockResolvedValue(recipient);

      await service.processWebhookEvent('evt-001');

      expect(mockManager.update).toHaveBeenCalledWith(
        EmailRecipientEntity,
        'r-001',
        { status: EmailRecipientStatusEnum.BOUNCED_SOFT },
      );

      // No suppression upsert for soft bounce
      expect(mockManager.createQueryBuilder).not.toHaveBeenCalled();

      // Alert still enqueued
      expect(comsQueue.add).toHaveBeenCalledWith(
        'send-alert',
        expect.objectContaining({
          eventType: EmailWebhookEventTypeEnum.BOUNCED_SOFT,
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // OPEN event — no status update, no suppression, no alert
  // -------------------------------------------------------------------------
  describe('processWebhookEvent — OPEN event', () => {
    it('sets processedAt but does not update recipient status, suppression, or alert', async () => {
      const event = makeEvent({ eventType: EmailWebhookEventTypeEnum.OPEN });
      const recipient = makeRecipient();
      webhookEventRepo.findOne.mockResolvedValue(event);
      recipientRepo.findOne.mockResolvedValue(recipient);

      await service.processWebhookEvent('evt-001');

      // No recipient status update (null mapped status)
      expect(mockManager.update).not.toHaveBeenCalledWith(
        EmailRecipientEntity,
        expect.anything(),
        expect.anything(),
      );

      // Event still linked to recipient
      expect(mockManager.update).toHaveBeenCalledWith(
        EmailWebhookEventEntity,
        'evt-001',
        { recipient: { id: 'r-001' } },
      );

      // processedAt still set
      expect(mockManager.update).toHaveBeenCalledWith(
        EmailWebhookEventEntity,
        'evt-001',
        expect.objectContaining({ processedAt: expect.any(Date) }),
      );

      // No suppression
      expect(mockManager.createQueryBuilder).not.toHaveBeenCalled();

      // No alert
      expect(comsQueue.add).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Event not found
  // -------------------------------------------------------------------------
  describe('processWebhookEvent — event not found', () => {
    it('logs an error and returns without throwing', async () => {
      webhookEventRepo.findOne.mockResolvedValue(null);

      await expect(
        service.processWebhookEvent('evt-missing'),
      ).resolves.toBeUndefined();

      // No DB writes attempted
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(comsQueue.add).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Already processed (idempotency)
  // -------------------------------------------------------------------------
  describe('processWebhookEvent — already processed', () => {
    it('logs a warning and skips processing without throwing', async () => {
      const event = makeEvent({ processedAt: new Date('2026-01-02') });
      webhookEventRepo.findOne.mockResolvedValue(event);

      await expect(
        service.processWebhookEvent('evt-001'),
      ).resolves.toBeUndefined();

      // No DB writes or alerts
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(comsQueue.add).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // No matching recipient
  // -------------------------------------------------------------------------
  describe('processWebhookEvent — no matching recipient', () => {
    it('logs a warning, still marks processedAt, and does not crash', async () => {
      const event = makeEvent({ eventType: EmailWebhookEventTypeEnum.DELIVERED });
      webhookEventRepo.findOne.mockResolvedValue(event);
      recipientRepo.findOne.mockResolvedValue(null);

      await expect(
        service.processWebhookEvent('evt-001'),
      ).resolves.toBeUndefined();

      // Transaction still ran
      expect(dataSource.transaction).toHaveBeenCalled();

      // No recipient update
      expect(mockManager.update).not.toHaveBeenCalledWith(
        EmailRecipientEntity,
        expect.anything(),
        expect.anything(),
      );

      // processedAt still stamped
      expect(mockManager.update).toHaveBeenCalledWith(
        EmailWebhookEventEntity,
        'evt-001',
        expect.objectContaining({ processedAt: expect.any(Date) }),
      );
    });
  });
});
