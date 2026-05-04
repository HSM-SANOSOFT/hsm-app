import {
  DocumentCodesEnum,
  DocumentFormatsEnum,
  DocumentOrientationsEnum,
  DocumentSizesEnum,
  DocumentStatusEnum,
} from '@hsm/common/enums';
import { GenerateDocumentJobPayloadDto } from '@hsm/common/dtos';
import {
  TemplateNotFoundError,
  TemplateSchemaValidationError,
} from '@hsm/common/errors';
import { DatabasesEnum } from '@hsm/database/sources';
import {
  DocumentsEntity,
  DocumentsGeneratedEntity,
  DocumentStorageObjectEntity,
  DocumentsVersionEntity,
} from '@hsm/database/entities';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from '@hsm/queue';
import { S3Service } from '@hsm/storage/s3/s3.service';
import { ExcelGenerationService } from './generation/excel-generation.service';
import { GenerationService } from './generation/generation.service';
import { DocsProcessorService } from './docs-processor.service';
import { TemplatesService } from '../templates/templates.service';

const FAKE_PDF = Buffer.from('%PDF-1.4 fake');
const FAKE_XLSX = Buffer.from('fake-xlsx');

const mockTemplateEntity = {
  id: 'tmpl-uuid',
  name: 'hcu_001',
  doc: {
    format: DocumentFormatsEnum.PDF,
    documentCode: DocumentCodesEnum.HCU_001,
    size: DocumentSizesEnum.A4,
    orientation: DocumentOrientationsEnum.PORTRAIT,
  },
};

const mockTemplateEntityXlsx = {
  id: 'tmpl-xlsx-uuid',
  name: 'hcu_report',
  doc: {
    format: DocumentFormatsEnum.EXCEL,
    documentCode: DocumentCodesEnum.HCU_054,
    size: DocumentSizesEnum.A4,
    orientation: DocumentOrientationsEnum.LANDSCAPE,
  },
};

const mockManager = {
  create: jest.fn((_Entity: unknown, data: unknown) => ({ ...data })),
  save: jest.fn().mockResolvedValue({}),
};

const mockDocsRepo = {
  update: jest.fn().mockResolvedValue(undefined),
  manager: {
    transaction: jest.fn((cb: (em: typeof mockManager) => Promise<void>) =>
      cb(mockManager),
    ),
  },
};

const mockTemplatesService = {
  findByIdentifier: jest.fn().mockResolvedValue(mockTemplateEntity),
  parse: jest
    .fn()
    .mockResolvedValue({ html: '<html>test</html>', templateId: 'tmpl-uuid' }),
};

const mockGenerationService = {
  generatePDF: jest.fn().mockResolvedValue(FAKE_PDF),
};

const mockExcelService = {
  generate: jest.fn().mockResolvedValue(FAKE_XLSX),
};

const mockS3Service = {
  uploadFiles: jest.fn().mockResolvedValue([
    {
      bucket: 'hsm-docs',
      files: [{ fileId: 'file-uuid', filename: 'HCU-001-ts.pdf', key: 'generated/file-uuid' }],
    },
  ]),
};

describe('DocsProcessorService', () => {
  let service: DocsProcessorService;

  const basePayload: GenerateDocumentJobPayloadDto = {
    documentId: 'doc-uuid',
    templateIdentifier: 'hcu_001',
    data: { patientName: 'Ada' },
    outputBucket: 'hsm-docs',
    outputFolder: 'generated',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDocsRepo.update.mockResolvedValue(undefined);
    mockManager.save.mockResolvedValue({});
    mockTemplatesService.findByIdentifier.mockResolvedValue(mockTemplateEntity);
    mockTemplatesService.parse.mockResolvedValue({
      html: '<html>test</html>',
      templateId: 'tmpl-uuid',
    });
    mockGenerationService.generatePDF.mockResolvedValue(FAKE_PDF);
    mockExcelService.generate.mockResolvedValue(FAKE_XLSX);
    mockS3Service.uploadFiles.mockResolvedValue([
      {
        bucket: 'hsm-docs',
        files: [{ fileId: 'file-uuid', filename: 'HCU-001-ts.pdf', key: 'generated/file-uuid' }],
      },
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocsProcessorService,
        { provide: TemplatesService, useValue: mockTemplatesService },
        { provide: GenerationService, useValue: mockGenerationService },
        { provide: ExcelGenerationService, useValue: mockExcelService },
        { provide: S3Service, useValue: mockS3Service },
        { provide: QueueService, useValue: { workerActive: jest.fn(), workerCompleted: jest.fn(), workerFailed: jest.fn() } },
        {
          provide: getRepositoryToken(DocumentsEntity, DatabasesEnum.HsmDbPostgres),
          useValue: mockDocsRepo,
        },
      ],
    }).compile();

    service = module.get<DocsProcessorService>(DocsProcessorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handle', () => {
    it('throws for unknown job name without touching entities', async () => {
      await expect(
        (service as any).handle({ name: 'unknown-job', data: {} }),
      ).rejects.toThrow('Unknown document job: unknown-job');
      expect(mockDocsRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('processGenerateDocument — PDF path', () => {
    it('sets status PROCESSING then COMPLETED on success', async () => {
      await (service as any).handle({ name: 'generate-document', data: basePayload });

      expect(mockDocsRepo.update).toHaveBeenCalledWith('doc-uuid', {
        status: DocumentStatusEnum.PROCESSING,
      });
      expect(mockDocsRepo.update).toHaveBeenLastCalledWith('doc-uuid', {
        status: DocumentStatusEnum.COMPLETED,
      });
    });

    it('calls generatePDF with the parsed HTML', async () => {
      await (service as any).handle({ name: 'generate-document', data: basePayload });
      expect(mockGenerationService.generatePDF).toHaveBeenCalledWith('<html>test</html>');
    });

    it('uploads to S3 with correct bucket, folder and contentType', async () => {
      await (service as any).handle({ name: 'generate-document', data: basePayload });
      const callArg = mockS3Service.uploadFiles.mock.calls[0][0];
      expect(callArg.payload[0].bucket).toBe('hsm-docs');
      expect(callArg.payload[0].files[0].folderName).toBe('generated');
      expect(callArg.payload[0].files[0].fileInfo.contentType).toBe('application/pdf');
    });

    it('persists entities within the transaction', async () => {
      await (service as any).handle({ name: 'generate-document', data: basePayload });
      expect(mockDocsRepo.manager.transaction).toHaveBeenCalled();
      expect(mockManager.save).toHaveBeenCalledTimes(3);
    });
  });

  describe('processGenerateDocument — XLSX path', () => {
    const xlsxDefinition = JSON.stringify({
      sheets: [{ name: 'Sheet1', columns: [{ header: 'A', key: 'a' }], rows: [] }],
    });

    beforeEach(() => {
      mockTemplatesService.findByIdentifier.mockResolvedValue(mockTemplateEntityXlsx);
      mockTemplatesService.parse.mockResolvedValue({
        html: xlsxDefinition,
        templateId: 'tmpl-xlsx-uuid',
      });
    });

    it('sets status PROCESSING then COMPLETED', async () => {
      await (service as any).handle({ name: 'generate-document', data: basePayload });
      expect(mockDocsRepo.update).toHaveBeenLastCalledWith('doc-uuid', {
        status: DocumentStatusEnum.COMPLETED,
      });
    });

    it('calls excelService.generate with the parsed workbook definition', async () => {
      await (service as any).handle({ name: 'generate-document', data: basePayload });
      expect(mockExcelService.generate).toHaveBeenCalled();
    });

    it('uploads with XLSX contentType', async () => {
      await (service as any).handle({ name: 'generate-document', data: basePayload });
      const callArg = mockS3Service.uploadFiles.mock.calls[0][0];
      expect(callArg.payload[0].files[0].fileInfo.contentType).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    });
  });

  describe('error paths — status set to FAILED and error re-thrown', () => {
    it('template not found', async () => {
      mockTemplatesService.findByIdentifier.mockRejectedValue(
        new TemplateNotFoundError('hcu_001'),
      );
      await expect(
        (service as any).handle({ name: 'generate-document', data: basePayload }),
      ).rejects.toBeInstanceOf(TemplateNotFoundError);
      expect(mockDocsRepo.update).toHaveBeenLastCalledWith('doc-uuid', {
        status: DocumentStatusEnum.FAILED,
      });
    });

    it('schema validation failure', async () => {
      mockTemplatesService.parse.mockRejectedValue(
        new TemplateSchemaValidationError([
          { path: 'patientName', expected: 'string', received: 'undefined' },
        ]),
      );
      await expect(
        (service as any).handle({ name: 'generate-document', data: basePayload }),
      ).rejects.toBeInstanceOf(TemplateSchemaValidationError);
      expect(mockDocsRepo.update).toHaveBeenLastCalledWith('doc-uuid', {
        status: DocumentStatusEnum.FAILED,
      });
    });

    it('S3 upload failure', async () => {
      mockS3Service.uploadFiles.mockRejectedValue(new Error('S3 error'));
      await expect(
        (service as any).handle({ name: 'generate-document', data: basePayload }),
      ).rejects.toThrow('S3 error');
      expect(mockDocsRepo.update).toHaveBeenLastCalledWith('doc-uuid', {
        status: DocumentStatusEnum.FAILED,
      });
    });

    it('invalid JSON for XLSX template output — SyntaxError caught and status FAILED', async () => {
      mockTemplatesService.findByIdentifier.mockResolvedValue(mockTemplateEntityXlsx);
      mockTemplatesService.parse.mockResolvedValue({
        html: 'not-valid-json',
        templateId: 'tmpl-xlsx-uuid',
      });
      await expect(
        (service as any).handle({ name: 'generate-document', data: basePayload }),
      ).rejects.toThrow(SyntaxError);
      expect(mockDocsRepo.update).toHaveBeenLastCalledWith('doc-uuid', {
        status: DocumentStatusEnum.FAILED,
      });
    });
  });
});
