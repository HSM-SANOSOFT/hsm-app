import {
  GenerateDocumentRequestDto,
  ListDocumentsQueryDto,
} from '@hsm/common/dtos';
import { DocumentStatusEnum } from '@hsm/common/enums';
import {
  DocumentLinkEntity,
  DocumentStorageObjectEntity,
  DocumentsEntity,
  DocumentsVersionEntity,
} from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import { QueueEnum } from '@hsm/queue';
import { S3Service } from '@hsm/storage/s3/s3.service';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
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
  createQueryBuilder: jest.fn(),
};

const mockVersionsRepo = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockStorageRepo = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockLinkRepo = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockDocsQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-id' }),
};

const mockS3Service = {
  generatePresignedUrls: jest
    .fn()
    .mockResolvedValue([{ files: [{ url: 'https://s3.example.com/file' }] }]),
  deleteFiles: jest.fn().mockResolvedValue([]),
  uploadFiles: jest.fn().mockResolvedValue([
    {
      bucket: 'test-bucket',
      files: [
        { fileId: 'file-uuid', filename: 'doc.pdf', key: 'folder/file-uuid' },
      ],
    },
  ]),
};

describe('DocsService', () => {
  let service: DocsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDocsRepo.create.mockImplementation(
      (data: Partial<DocumentsEntity>) => ({
        ...data,
      }),
    );
    mockDocsRepo.save.mockImplementation((entity: DocumentsEntity) => {
      entity.id = 'doc-uuid';
      return Promise.resolve(entity);
    });
    mockDocsRepo.findOne.mockResolvedValue(mockDocument);
    mockDocsRepo.softDelete.mockResolvedValue(undefined);
    mockDocsQueue.add.mockResolvedValue({ id: 'job-id' });

    mockVersionsRepo.create.mockImplementation(
      (data: Partial<DocumentsVersionEntity>) => ({ ...data }),
    );
    mockVersionsRepo.save.mockImplementation(
      (entity: DocumentsVersionEntity) => {
        entity.id = 'version-uuid';
        return Promise.resolve(entity);
      },
    );

    mockStorageRepo.create.mockImplementation(
      (data: Partial<DocumentStorageObjectEntity>) => ({ ...data }),
    );
    mockStorageRepo.save.mockImplementation(
      async (entity: DocumentStorageObjectEntity) => entity,
    );

    mockLinkRepo.create.mockImplementation(
      (data: Partial<DocumentLinkEntity>) => ({ ...data }),
    );
    mockLinkRepo.save.mockImplementation(
      async (entity: DocumentLinkEntity) => entity,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocsService,
        { provide: S3Service, useValue: mockS3Service },
        {
          provide: getQueueToken(QueueEnum.Document),
          useValue: mockDocsQueue,
        },
        {
          provide: getRepositoryToken(
            DocumentsEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: mockDocsRepo,
        },
        {
          provide: getRepositoryToken(
            DocumentsVersionEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: mockVersionsRepo,
        },
        {
          provide: getRepositoryToken(
            DocumentStorageObjectEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: mockStorageRepo,
        },
        {
          provide: getRepositoryToken(
            DocumentLinkEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: mockLinkRepo,
        },
      ],
    }).compile();

    service = module.get<DocsService>(DocsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listDocuments', () => {
    const mockQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockDocument], 1]),
    };

    beforeEach(() => {
      mockDocsRepo.createQueryBuilder.mockReturnValue(mockQb);
      jest.clearAllMocks();
      mockDocsRepo.createQueryBuilder.mockReturnValue(mockQb);
      mockQb.where.mockReturnThis();
      mockQb.andWhere.mockReturnThis();
      mockQb.skip.mockReturnThis();
      mockQb.take.mockReturnThis();
      mockQb.orderBy.mockReturnThis();
      mockQb.getManyAndCount.mockResolvedValue([[mockDocument], 1]);
    });

    it('returns paginated list scoped to userId', async () => {
      const query: ListDocumentsQueryDto = { page: 1, limit: 10 };
      const result = await service.listDocuments(query, 'user-uuid');

      expect(mockDocsRepo.createQueryBuilder).toHaveBeenCalledWith('doc');
      expect(mockQb.where).toHaveBeenCalledWith('doc.createdBy = :userId', {
        userId: 'user-uuid',
      });
      expect(result).toEqual({
        data: [mockDocument],
        metadata: {
          extra: {
            pagination: {
              page: 1,
              pageSize: 10,
              totalItems: 1,
              totalPages: 1,
            },
          },
        },
      });
    });

    it('applies entityId and entityType filters when both provided', async () => {
      const query: ListDocumentsQueryDto = {
        entityId: 'entity-123',
        entityType: 'PATIENT',
        page: 1,
        limit: 20,
      };
      await service.listDocuments(query, 'user-uuid');

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'doc.entityId = :entityId AND doc.entityType = :entityType',
        { entityId: 'entity-123', entityType: 'PATIENT' },
      );
    });

    it('uses default page=1 limit=20 when not provided', async () => {
      const query: ListDocumentsQueryDto = {};
      const result = await service.listDocuments(query, 'user-uuid');
      expect(result.metadata.extra.pagination.page).toBe(1);
      expect(result.metadata.extra.pagination.pageSize).toBe(20);
    });
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

    it('job payload contains documentId, templateIdentifier, data, and optional entityId/entityType', async () => {
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

    it('includes entityId and entityType in job payload when provided', async () => {
      const dtoWithEntity: GenerateDocumentRequestDto = {
        ...dto,
        entityId: 'entity-abc',
        entityType: 'APPOINTMENT',
      };
      await service.generateDocument(dtoWithEntity);
      const [, payload] = mockDocsQueue.add.mock.calls[0];
      expect(payload).toMatchObject({
        entityId: 'entity-abc',
        entityType: 'APPOINTMENT',
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
      await expect(service.deleteDocument('missing-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns { deleted: true } on success', async () => {
      const result = await service.deleteDocument('doc-uuid');
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('uploadDocuments', () => {
    const makeFile = (
      name: string,
      mimetype = 'application/pdf',
      size = 1024,
    ): Express.Multer.File =>
      ({
        originalname: name,
        mimetype,
        size,
        buffer: Buffer.from('data'),
        fieldname: 'files',
        encoding: '7bit',
        destination: '',
        filename: name,
        path: '',
        stream: null as unknown as never,
      }) as Express.Multer.File;

    const makePayload = (
      fileName: string,
      entityId?: string,
      entityType?: string,
    ) => ({
      payload: [
        {
          bucket: 'test-bucket',
          files: [{ folderName: 'folder', fileInfo: { fileName } }],
        },
      ],
      entityId,
      entityType,
    });

    it('creates DocumentsEntity, DocumentsVersionEntity, and DocumentStorageObjectEntity for each file', async () => {
      const files = [makeFile('doc.pdf')];
      const payload = makePayload('doc.pdf');

      await service.uploadDocuments(payload as never, files, 'user-uuid');

      expect(mockDocsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: 'user-uuid' }),
      );
      expect(mockVersionsRepo.create).toHaveBeenCalled();
      expect(mockStorageRepo.create).toHaveBeenCalled();
    });

    it('creates DocumentLinkEntity when entityId and entityType are provided', async () => {
      const files = [makeFile('doc.pdf')];
      const payload = makePayload('doc.pdf', 'entity-123', 'PATIENT');

      await service.uploadDocuments(payload as never, files, 'user-uuid');

      expect(mockLinkRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: 'entity-123',
          entityType: 'PATIENT',
        }),
      );
      expect(mockLinkRepo.save).toHaveBeenCalled();
    });

    it('does not create DocumentLinkEntity when entityId is absent', async () => {
      const files = [makeFile('doc.pdf')];
      const payload = makePayload('doc.pdf');

      await service.uploadDocuments(payload as never, files, 'user-uuid');

      expect(mockLinkRepo.create).not.toHaveBeenCalled();
      expect(mockLinkRepo.save).not.toHaveBeenCalled();
    });

    it('returns s3Result and documentIds', async () => {
      const files = [makeFile('doc.pdf')];
      const payload = makePayload('doc.pdf');

      const result = await service.uploadDocuments(
        payload as never,
        files,
        'user-uuid',
      );

      expect(result).toHaveProperty('documentIds');
      expect(result).toHaveProperty('s3Result');
      expect(result.documentIds).toHaveLength(1);
    });
  });
});
