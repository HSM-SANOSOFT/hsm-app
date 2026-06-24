import { EmailWebhookEventTypeEnum } from '@hsm/common/enums';
import { EmailWebhookEventEntity } from '@hsm/database/entities';
import { SettingsAccessorService } from '@hsm/database/settings';
import { DatabasesEnum } from '@hsm/database/sources';
import { QueueEnum } from '@hsm/queue';
import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ComsWebhookService } from './coms-webhook.service';
import { EmailWebhookAdapterFactory } from './email-webhook-adapter.factory';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

const mockAdapter = {
  verify: jest.fn(),
  normalize: jest.fn(),
};

const mockAdapterFactory = {
  getAdapter: jest.fn(),
};

const mockWebhookEventRepo = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockComsQueue = {
  add: jest.fn(),
};

// Live-config accessor (U4): signing keys now come from the store via this
// accessor instead of the boot-frozen env helper.
const mockSettingsAccessor = {
  getWebhookSigningKeys: jest.fn(),
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROVIDER = 'mandrill';

const buildRawBody = (payload: unknown) =>
  Buffer.from(JSON.stringify(payload), 'utf-8');

const HEADERS: Record<string, string> = {
  'x-mandrill-signature': 'valid-sig',
};

const NORMALIZED_EVENT = {
  eventType: EmailWebhookEventTypeEnum.BOUNCED_HARD,
  recipientEmail: 'user@example.com',
  providerMessageId: 'abc123',
  timestamp: new Date(),
  rawPayload: {},
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('ComsWebhookService', () => {
  let service: ComsWebhookService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset the signing keys mock back to the default (mandrill: 'test-key')
    mockSettingsAccessor.getWebhookSigningKeys.mockResolvedValue({
      mandrill: 'test-key',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComsWebhookService,
        {
          provide: EmailWebhookAdapterFactory,
          useValue: mockAdapterFactory,
        },
        {
          provide: getRepositoryToken(
            EmailWebhookEventEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: mockWebhookEventRepo,
        },
        {
          provide: getQueueToken(QueueEnum.Coms),
          useValue: mockComsQueue,
        },
        {
          provide: SettingsAccessorService,
          useValue: mockSettingsAccessor,
        },
      ],
    }).compile();

    service = module.get<ComsWebhookService>(ComsWebhookService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  describe('receiveWebhook — happy path', () => {
    it('verifies signature, persists events, enqueues jobs, returns received count', async () => {
      const rawPayload = [
        {
          event: 'hard_bounce',
          ts: 1715000000,
          msg: { email: 'user@example.com', _id: 'abc123' },
        },
      ];
      const rawBody = buildRawBody(rawPayload);
      const savedEntity = { id: 'evt-uuid-1' };

      mockAdapterFactory.getAdapter.mockReturnValue(mockAdapter);
      mockAdapter.verify.mockReturnValue(true);
      mockAdapter.normalize.mockReturnValue([NORMALIZED_EVENT]);
      mockWebhookEventRepo.create.mockReturnValue({ provider: PROVIDER });
      mockWebhookEventRepo.save.mockResolvedValue(savedEntity);
      mockComsQueue.add.mockResolvedValue({ id: 'job-1' });

      const result = await service.receiveWebhook(PROVIDER, HEADERS, rawBody);

      expect(mockAdapterFactory.getAdapter).toHaveBeenCalledWith(PROVIDER);
      expect(mockAdapter.verify).toHaveBeenCalledWith(
        HEADERS,
        rawBody,
        'test-key',
      );
      expect(mockAdapter.normalize).toHaveBeenCalled();
      expect(mockWebhookEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: PROVIDER,
          eventType: NORMALIZED_EVENT.eventType,
          recipientEmail: NORMALIZED_EVENT.recipientEmail,
          messageId: NORMALIZED_EVENT.providerMessageId,
        }),
      );
      expect(mockWebhookEventRepo.save).toHaveBeenCalledTimes(1);
      expect(mockComsQueue.add).toHaveBeenCalledWith(
        'process-webhook-event',
        { webhookEventId: 'evt-uuid-1' },
        expect.objectContaining({ attempts: 5 }),
      );
      expect(result).toEqual({ received: 1 });
    });

    it('persists and enqueues N jobs when normalize returns N events', async () => {
      const rawBody = buildRawBody([{}, {}]);
      const events = [
        NORMALIZED_EVENT,
        { ...NORMALIZED_EVENT, recipientEmail: 'b@example.com' },
      ];

      mockAdapterFactory.getAdapter.mockReturnValue(mockAdapter);
      mockAdapter.verify.mockReturnValue(true);
      mockAdapter.normalize.mockReturnValue(events);
      mockWebhookEventRepo.create.mockImplementation((_data: unknown) => ({}));
      mockWebhookEventRepo.save
        .mockResolvedValueOnce({ id: 'evt-1' })
        .mockResolvedValueOnce({ id: 'evt-2' });
      mockComsQueue.add.mockResolvedValue({ id: 'job-x' });

      const result = await service.receiveWebhook(PROVIDER, HEADERS, rawBody);

      expect(mockWebhookEventRepo.save).toHaveBeenCalledTimes(2);
      expect(mockComsQueue.add).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ received: 2 });
    });
  });

  // -------------------------------------------------------------------------
  // Unknown provider
  // -------------------------------------------------------------------------

  describe('receiveWebhook — unknown provider', () => {
    it('returns { received: 0 } without throwing when provider is not registered', async () => {
      mockAdapterFactory.getAdapter.mockReturnValue(undefined);

      const result = await service.receiveWebhook(
        'unknown-provider',
        HEADERS,
        Buffer.alloc(0),
      );

      expect(result).toEqual({ received: 0 });
      expect(mockWebhookEventRepo.save).not.toHaveBeenCalled();
      expect(mockComsQueue.add).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Missing signing key
  // -------------------------------------------------------------------------

  describe('receiveWebhook — missing signing key', () => {
    it('throws BadRequestException when no signing key is configured for provider', async () => {
      // Override to return a map without any provider key
      mockSettingsAccessor.getWebhookSigningKeys.mockResolvedValueOnce({});

      mockAdapterFactory.getAdapter.mockReturnValue(mockAdapter);

      await expect(
        service.receiveWebhook(PROVIDER, HEADERS, buildRawBody({})),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(mockAdapter.verify).not.toHaveBeenCalled();
      expect(mockWebhookEventRepo.save).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Invalid signature
  // -------------------------------------------------------------------------

  describe('receiveWebhook — invalid signature', () => {
    it('throws UnauthorizedException and performs no DB writes when signature is invalid', async () => {
      mockAdapterFactory.getAdapter.mockReturnValue(mockAdapter);
      mockAdapter.verify.mockReturnValue(false);

      await expect(
        service.receiveWebhook(PROVIDER, HEADERS, buildRawBody({})),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(mockWebhookEventRepo.save).not.toHaveBeenCalled();
      expect(mockComsQueue.add).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Empty events
  // -------------------------------------------------------------------------

  describe('receiveWebhook — empty events from normalize', () => {
    it('returns { received: 0 } and does not write to DB when normalize returns []', async () => {
      mockAdapterFactory.getAdapter.mockReturnValue(mockAdapter);
      mockAdapter.verify.mockReturnValue(true);
      mockAdapter.normalize.mockReturnValue([]);

      const result = await service.receiveWebhook(
        PROVIDER,
        HEADERS,
        buildRawBody([]),
      );

      expect(result).toEqual({ received: 0 });
      expect(mockWebhookEventRepo.save).not.toHaveBeenCalled();
      expect(mockComsQueue.add).not.toHaveBeenCalled();
    });
  });
});
