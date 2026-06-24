import {
  ListEmailBatchesQueryDto,
  ListEmailRecipientsQueryDto,
  SendEmailPayloadDto,
} from '@hsm/common/dtos';
import {
  EmailBatchStatusEnum,
  EmailRecipientStatusEnum,
} from '@hsm/common/enums';
import { EmailBatchEntity, EmailRecipientEntity } from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import { QueueEnum } from '@hsm/queue';
import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { TemplatesService } from '../templates/templates.service';
import { ComsService } from './coms.service';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

const mockBatchRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findAndCount: jest.fn(),
  findOneOrFail: jest.fn(),
  update: jest.fn(),
};

const mockRecipientRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findAndCount: jest.fn(),
  findOneOrFail: jest.fn(),
};

const mockComsQueue = {
  add: jest.fn(),
};

// DataSource transaction mock — executes the callback immediately with a mock manager
const mockManager = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn(async (cb: (manager: typeof mockManager) => unknown) =>
    cb(mockManager),
  ),
};

const mockTemplatesService = {
  findByIdentifier: jest.fn(),
};

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

describe('ComsService', () => {
  let service: ComsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComsService,
        {
          provide: getRepositoryToken(
            EmailBatchEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: mockBatchRepo,
        },
        {
          provide: getRepositoryToken(
            EmailRecipientEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: mockRecipientRepo,
        },
        {
          provide: getQueueToken(QueueEnum.Coms),
          useValue: mockComsQueue,
        },
        {
          provide: getDataSourceToken(DatabasesEnum.HsmDbPostgres),
          useValue: mockDataSource,
        },
        {
          provide: TemplatesService,
          useValue: mockTemplatesService,
        },
      ],
    }).compile();

    service = module.get<ComsService>(ComsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // sendEmail
  // -------------------------------------------------------------------------

  describe('sendEmail', () => {
    const validTemplate = {
      template: {
        id: 'tmpl-uuid',
        schema: { name: 'string' },
      },
    };

    const validPayload: SendEmailPayloadDto = {
      toEmails: ['user@example.com'],
      emailTemplate: 'welcome',
      data: { name: 'Alice' },
      fromEmail: undefined as unknown as string,
      fromName: undefined as unknown as string,
    };

    const savedBatch = {
      id: 'batch-uuid',
      templateId: 'tmpl-uuid',
      overallStatus: EmailBatchStatusEnum.PENDING,
    };

    beforeEach(() => {
      mockTemplatesService.findByIdentifier.mockResolvedValue(validTemplate);
      // manager.create returns a draft; manager.save returns the persisted entity
      mockManager.create.mockImplementation(
        (_entity: unknown, data: unknown) => ({ ...(data as object) }),
      );
      mockManager.save.mockResolvedValue(savedBatch);
      mockComsQueue.add.mockResolvedValue({ id: 'job-123' });
      mockBatchRepo.update.mockResolvedValue(undefined);
    });

    it('happy path — resolves template, validates data, saves batch+recipients, enqueues job', async () => {
      const result = await service.sendEmail(validPayload, 'user-id');

      expect(mockTemplatesService.findByIdentifier).toHaveBeenCalledWith(
        'welcome',
      );
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockComsQueue.add).toHaveBeenCalledWith(
        'send-email',
        { batchId: 'batch-uuid' },
        expect.objectContaining({ attempts: 5 }),
      );
      expect(mockBatchRepo.update).toHaveBeenCalledWith('batch-uuid', {
        jobId: 'job-123',
      });
      expect(result).toEqual({ batchId: 'batch-uuid', jobId: 'job-123' });
    });

    it('creates a recipient for each toEmail address', async () => {
      const payloadMulti: SendEmailPayloadDto = {
        ...validPayload,
        toEmails: ['a@example.com', 'b@example.com'],
      };

      await service.sendEmail(payloadMulti, 'user-id');

      const saveCalls = mockManager.save.mock.calls;
      // First save is the batch itself, subsequent ones are recipients
      const recipientSaves = saveCalls.filter(
        ([entity]: [unknown]) => entity === EmailRecipientEntity,
      );
      expect(recipientSaves).toHaveLength(2);
    });

    it('throws BadRequestException when data fails schema validation', async () => {
      const badPayload: SendEmailPayloadDto = {
        ...validPayload,
        data: { name: 123 }, // number is not a string
      };

      await expect(service.sendEmail(badPayload)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      // No DB writes should happen
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('propagates TemplateNotFoundError when template does not exist', async () => {
      const error = new Error('Template not found');
      mockTemplatesService.findByIdentifier.mockRejectedValueOnce(error);

      await expect(service.sendEmail(validPayload)).rejects.toThrow(
        'Template not found',
      );
    });
  });

  // -------------------------------------------------------------------------
  // resendBatch
  // -------------------------------------------------------------------------

  describe('resendBatch', () => {
    it('happy path — finds batch, enqueues job, updates jobId+status, returns jobId', async () => {
      mockBatchRepo.findOneOrFail.mockResolvedValue({ id: 'batch-uuid' });
      mockComsQueue.add.mockResolvedValue({ id: 'job-456' });
      mockBatchRepo.update.mockResolvedValue(undefined);

      const result = await service.resendBatch('batch-uuid');

      expect(mockBatchRepo.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 'batch-uuid' },
      });
      expect(mockComsQueue.add).toHaveBeenCalledWith(
        'send-email',
        { batchId: 'batch-uuid' },
        expect.objectContaining({ attempts: 5 }),
      );
      expect(mockBatchRepo.update).toHaveBeenCalledWith('batch-uuid', {
        jobId: 'job-456',
        overallStatus: EmailBatchStatusEnum.PENDING,
      });
      expect(result).toEqual({ jobId: 'job-456' });
    });

    it('propagates EntityNotFoundError when batch does not exist', async () => {
      const error = new Error('Entity not found');
      mockBatchRepo.findOneOrFail.mockRejectedValueOnce(error);

      await expect(service.resendBatch('missing-id')).rejects.toThrow(
        'Entity not found',
      );
    });
  });

  // -------------------------------------------------------------------------
  // resendRecipient
  // -------------------------------------------------------------------------

  describe('resendRecipient', () => {
    it('happy path — finds recipient with batch relation, enqueues job, returns jobId', async () => {
      const mockRecipient = {
        id: 'recip-uuid',
        batch: { id: 'batch-uuid' },
        status: EmailRecipientStatusEnum.FAILED,
      };
      mockRecipientRepo.findOneOrFail.mockResolvedValue(mockRecipient);
      mockComsQueue.add.mockResolvedValue({ id: 'job-789' });

      const result = await service.resendRecipient('recip-uuid');

      expect(mockRecipientRepo.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 'recip-uuid' },
        relations: { batch: true },
      });
      expect(mockComsQueue.add).toHaveBeenCalledWith(
        'send-email',
        { batchId: 'batch-uuid', recipientId: 'recip-uuid' },
        expect.objectContaining({ attempts: 5 }),
      );
      expect(result).toEqual({ jobId: 'job-789' });
    });
  });

  // -------------------------------------------------------------------------
  // listBatches
  // -------------------------------------------------------------------------

  describe('listBatches', () => {
    it('calls findAndCount with correct pagination and returns shaped result', async () => {
      const batches = [{ id: 'b1' }, { id: 'b2' }];
      mockBatchRepo.findAndCount.mockResolvedValue([batches, 2]);

      const query: ListEmailBatchesQueryDto = { page: 2, limit: 10 };
      const result = await service.listBatches(query);

      expect(mockBatchRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(result).toEqual({ data: batches, total: 2, page: 2, limit: 10 });
    });

    it('applies templateId, overallStatus, createdBy filters when provided', async () => {
      mockBatchRepo.findAndCount.mockResolvedValue([[], 0]);

      const query: ListEmailBatchesQueryDto = {
        templateId: 'tmpl-uuid',
        overallStatus: EmailBatchStatusEnum.SENT,
        createdBy: 'user-id',
      };
      await service.listBatches(query);

      expect(mockBatchRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            templateId: 'tmpl-uuid',
            overallStatus: EmailBatchStatusEnum.SENT,
            createdBy: 'user-id',
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // getBatch
  // -------------------------------------------------------------------------

  describe('getBatch', () => {
    it('loads batch with recipients relation', async () => {
      const batch = { id: 'b-uuid', recipients: [] };
      mockBatchRepo.findOneOrFail.mockResolvedValue(batch);

      const result = await service.getBatch('b-uuid');

      expect(mockBatchRepo.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 'b-uuid' },
        relations: { recipients: true },
      });
      expect(result).toBe(batch);
    });
  });

  // -------------------------------------------------------------------------
  // listRecipients
  // -------------------------------------------------------------------------

  describe('listRecipients', () => {
    it('calls findAndCount with batchId and pagination filters', async () => {
      const recipients = [{ id: 'r1' }];
      mockRecipientRepo.findAndCount.mockResolvedValue([recipients, 1]);

      const query: ListEmailRecipientsQueryDto = {
        batchId: 'b-uuid',
        page: 1,
        limit: 20,
      };
      const result = await service.listRecipients(query);

      expect(mockRecipientRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ batch: { id: 'b-uuid' } }),
          skip: 0,
          take: 20,
        }),
      );
      expect(result).toEqual({
        data: recipients,
        total: 1,
        page: 1,
        limit: 20,
      });
    });
  });

  // -------------------------------------------------------------------------
  // getRecipient
  // -------------------------------------------------------------------------

  describe('getRecipient', () => {
    it('returns the recipient entity', async () => {
      const recipient = { id: 'r-uuid', toEmail: 'x@example.com' };
      mockRecipientRepo.findOneOrFail.mockResolvedValue(recipient);

      const result = await service.getRecipient('r-uuid');

      expect(mockRecipientRepo.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 'r-uuid' },
      });
      expect(result).toBe(recipient);
    });
  });
});
