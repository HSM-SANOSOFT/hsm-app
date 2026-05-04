import { GenerateDocumentRequestDto } from '@hsm/common/dtos';
import { DocumentStatusEnum } from '@hsm/common/enums';
import { DocumentsEntity } from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import { QueueEnum } from '@hsm/queue';
import { S3Service } from '@hsm/storage/s3/s3.service';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { DocsService } from './docs.service';

const mockStorage: Partial<DocumentStorageObjectEntity> = {
  id: 'file-uuid',
  path: 'generated/file-uuid',
  bucket: 'hsm-docs',
};

const mockVersion: Partial<DocumentsVersionEntity> = {
  id: 'version-uuid',
  version: 1,
  filename: 'HCU-001-ts.pdf',
  mimeType: 'application/pdf',
  storage: mockStorage as DocumentStorageObjectEntity,
};

const mockDocument: Partial<DocumentsEntity> = {
  id: 'doc-uuid',
  title: 'Test Doc',
  status: DocumentStatusEnum.COMPLETED,
  versions: [mockVersion as DocumentsVersionEntity],
};

const mockDocsRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  softDelete: jest.fn().mockResolvedValue(undefined),
};

const mockDocsQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-id' }),
};

const mockS3Service = {
  generatePresignedUrls: jest
    .fn()
    .mockResolvedValue([{ files: [{ url: 'https://s3.example.com/file' }] }]),
  deleteFiles: jest.fn().mockResolvedValue([]),
};

describe('DocsService', () => {
  let service: DocsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDocsRepo.create.mockImplementation((data: Partial<DocumentsEntity>) => ({
      ...data,
    }));
    mockDocsRepo.save.mockImplementation(async (entity: DocumentsEntity) => {
      entity.id = 'doc-uuid';
      return entity;
    });
    mockDocsRepo.findOne.mockResolvedValue(mockDocument);
    mockDocsRepo.softDelete.mockResolvedValue(undefined);
    mockDocsQueue.add.mockResolvedValue({ id: 'job-id' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocsService,
        { provide: S3Service, useValue: mockS3Service },
        {
          provide: getQueueToken(QueueEnum.Document),
          useValue: mockDocsQueue,
        },
        {
          provide: getRepositoryToken(DocumentsEntity, DatabasesEnum.HsmDbPostgres),
          useValue: mockDocsRepo,
        },
      ],
    }).compile();

    service = module.get<DocsService>(DocsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateDocument', () => {
    const dto: GenerateDocumentRequestDto = {
      templateIdentifier: 'hcu_001',
      data: { patientName: 'Ada' },
      title: 'HCU-001 Admision',
    };

    it('creates a PENDING DocumentsEntity and enqueues a job', async () => {
      const result = await service.generateDocument(dto);

      expect(mockDocsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: DocumentStatusEnum.PENDING }),
      );
      expect(mockDocsQueue.add).toHaveBeenCalledWith(
        'generate-document',
        expect.objectContaining({
          documentId: 'doc-uuid',
          templateIdentifier: 'hcu_001',
        }),
      );
      expect(result).toEqual({ documentId: 'doc-uuid', jobId: 'job-id' });
    });

    it('job payload only contains documentId, templateIdentifier, and data', async () => {
      await service.generateDocument(dto);
      const [, payload] = mockDocsQueue.add.mock.calls[0];
      expect(payload).not.toHaveProperty('outputBucket');
      expect(payload).not.toHaveProperty('outputFolder');
      expect(payload).toMatchObject({
        documentId: 'doc-uuid',
        templateIdentifier: 'hcu_001',
        data: { patientName: 'Ada' },
      });
    });
  });

  describe('getDocument', () => {
    it('returns the document with version relations', async () => {
      const result = await service.getDocument('doc-uuid');
      expect(result).toEqual(mockDocument);
      expect(mockDocsRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'doc-uuid' } }),
      );
    });

    it('throws NotFoundException when document not found', async () => {
      mockDocsRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.getDocument('missing-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getDocumentUrl', () => {
    it('returns a presigned URL for the latest version', async () => {
      const result = await service.getDocumentUrl('doc-uuid');
      expect(mockS3Service.generatePresignedUrls).toHaveBeenCalled();
      expect(result).toEqual({ url: 'https://s3.example.com/file' });
    });

    it('throws NotFoundException when no storage found', async () => {
      mockDocsRepo.findOne.mockResolvedValueOnce({
        ...mockDocument,
        versions: [{ version: 1, storage: null }],
      });
      await expect(service.getDocumentUrl('doc-uuid')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('deleteDocument', () => {
    it('soft-deletes the entity and deletes S3 objects', async () => {
      await service.deleteDocument('doc-uuid');
      expect(mockDocsRepo.softDelete).toHaveBeenCalledWith('doc-uuid');
      expect(mockS3Service.deleteFiles).toHaveBeenCalled();
    });

    it('throws NotFoundException when document not found', async () => {
      mockDocsRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.deleteDocument('missing-id'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns { deleted: true } on success', async () => {
      const result = await service.deleteDocument('doc-uuid');
      expect(result).toEqual({ deleted: true });
    });
  });
});
