import {
  ListEmailBatchesQueryDto,
  ListEmailRecipientsQueryDto,
  SendEmailPayloadDto,
} from '@hsm/common/dtos';
import { EmailBatchStatusEnum } from '@hsm/common/enums';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { ComsController } from './coms.controller';
import { ComsService } from './coms.service';

const mockComsService = {
  sendEmail: jest.fn(),
  listBatches: jest.fn(),
  getBatch: jest.fn(),
  resendBatch: jest.fn(),
  listRecipients: jest.fn(),
  getRecipient: jest.fn(),
  resendRecipient: jest.fn(),
  sendSms: jest.fn(),
};

describe('ComsController', () => {
  let controller: ComsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComsController],
      providers: [{ provide: ComsService, useValue: mockComsService }],
    }).compile();

    controller = module.get<ComsController>(ComsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendEmail', () => {
    it('delegates payload + userId to comsService.sendEmail', async () => {
      const payload: SendEmailPayloadDto = {
        toEmails: ['a@example.com'],
        emailTemplate: 'welcome',
        data: {},
        fromEmail: undefined as unknown as string,
        fromName: undefined as unknown as string,
      };
      const req = { user: { id: 'user-uuid' } } as unknown as Request;
      mockComsService.sendEmail.mockResolvedValue({
        batchId: 'b-uuid',
        jobId: 'j-123',
      });

      const result = await controller.sendEmail(payload, req);

      expect(mockComsService.sendEmail).toHaveBeenCalledWith(
        payload,
        'user-uuid',
      );
      expect(result).toEqual({ batchId: 'b-uuid', jobId: 'j-123' });
    });
  });

  describe('listBatches', () => {
    it('delegates query to comsService.listBatches', async () => {
      const query: ListEmailBatchesQueryDto = { page: 1, limit: 10 };
      mockComsService.listBatches.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      const result = await controller.listBatches(query);

      expect(mockComsService.listBatches).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 10 });
    });
  });

  describe('getBatch', () => {
    it('delegates id to comsService.getBatch', async () => {
      mockComsService.getBatch.mockResolvedValue({ id: 'b-uuid' });

      const result = await controller.getBatch('b-uuid');

      expect(mockComsService.getBatch).toHaveBeenCalledWith('b-uuid');
      expect(result).toEqual({ id: 'b-uuid' });
    });
  });

  describe('resendBatch', () => {
    it('delegates id to comsService.resendBatch', async () => {
      mockComsService.resendBatch.mockResolvedValue({ jobId: 'j-456' });

      const result = await controller.resendBatch('b-uuid');

      expect(mockComsService.resendBatch).toHaveBeenCalledWith('b-uuid');
      expect(result).toEqual({ jobId: 'j-456' });
    });
  });

  describe('listRecipients', () => {
    it('delegates query to comsService.listRecipients', async () => {
      const query: ListEmailRecipientsQueryDto = {
        batchId: 'b-uuid',
        page: 1,
        limit: 20,
      };
      mockComsService.listRecipients.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      await controller.listRecipients(query);

      expect(mockComsService.listRecipients).toHaveBeenCalledWith(query);
    });
  });

  describe('getRecipient', () => {
    it('delegates id to comsService.getRecipient', async () => {
      mockComsService.getRecipient.mockResolvedValue({ id: 'r-uuid' });

      const result = await controller.getRecipient('r-uuid');

      expect(mockComsService.getRecipient).toHaveBeenCalledWith('r-uuid');
      expect(result).toEqual({ id: 'r-uuid' });
    });
  });

  describe('resendRecipient', () => {
    it('delegates id to comsService.resendRecipient', async () => {
      mockComsService.resendRecipient.mockResolvedValue({ jobId: 'j-789' });

      const result = await controller.resendRecipient('r-uuid');

      expect(mockComsService.resendRecipient).toHaveBeenCalledWith('r-uuid');
      expect(result).toEqual({ jobId: 'j-789' });
    });
  });

  describe('sendSms', () => {
    it('delegates to comsService.sendSms', async () => {
      mockComsService.sendSms.mockResolvedValue(undefined);

      await controller.sendSms();

      expect(mockComsService.sendSms).toHaveBeenCalled();
    });
  });

  describe('listBatches with overallStatus filter', () => {
    it('passes overallStatus filter to service', async () => {
      const query: ListEmailBatchesQueryDto = {
        overallStatus: EmailBatchStatusEnum.SENT,
        page: 1,
        limit: 5,
      };
      mockComsService.listBatches.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 5,
      });

      await controller.listBatches(query);

      expect(mockComsService.listBatches).toHaveBeenCalledWith(
        expect.objectContaining({ overallStatus: EmailBatchStatusEnum.SENT }),
      );
    });
  });
});
