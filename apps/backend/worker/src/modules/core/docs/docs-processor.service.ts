import {
  DocumentFormatsEnum,
  DocumentStatusEnum,
} from '@hsm/common/enums';
import { GenerateDocumentJobPayloadDto } from '@hsm/common/dtos';
import {
  DocumentsEntity,
  DocumentsGeneratedEntity,
  DocumentStorageObjectEntity,
  DocumentsVersionEntity,
} from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import { QueueEnum, QueueWorkerHost } from '@hsm/queue';
import { S3Service } from '@hsm/storage/s3/s3.service';
import { Processor } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { TemplatesService } from '../templates/templates.service';
import { ExcelGenerationService } from './generation/excel-generation.service';
import { GenerationService } from './generation/generation.service';

@Injectable()
@Processor(QueueEnum.Document)
export class DocsProcessorService extends QueueWorkerHost {
  private readonly logger = new Logger(DocsProcessorService.name);

  constructor(
    private readonly templatesService: TemplatesService,
    private readonly generationService: GenerationService,
    private readonly excelService: ExcelGenerationService,
    private readonly s3Service: S3Service,
    @InjectRepository(DocumentsEntity, DatabasesEnum.HsmDbPostgres)
    private readonly docsRepo: Repository<DocumentsEntity>,
  ) {
    super();
  }

  protected async handle(job: Job) {
    switch (job.name) {
      case 'generate-document': {
        const payload = job.data as GenerateDocumentJobPayloadDto;
        return await this.processGenerateDocument(payload);
      }
      default:
        throw new Error(`Unknown document job: ${job.name}`);
    }
  }

  private async processGenerateDocument(
    data: GenerateDocumentJobPayloadDto,
  ): Promise<void> {
    try {
      await this.docsRepo.update(data.documentId, {
        status: DocumentStatusEnum.PROCESSING,
      });

      const template = await this.templatesService.findByIdentifier(
        data.templateIdentifier,
        { withChildren: true },
      );

      const docMeta = template.doc;
      if (!docMeta) {
        throw new Error(
          `Template '${data.templateIdentifier}' is not a DOCS category template`,
        );
      }

      const { html } = await this.templatesService.parse({
        identifier: data.templateIdentifier,
        data: data.data,
      });

      let buffer: Buffer;
      let contentType: string;
      const timestamp = Date.now();
      let filename: string;

      if (docMeta.format === DocumentFormatsEnum.PDF) {
        buffer = await this.generationService.generatePDF(html);
        contentType = 'application/pdf';
        filename = `${docMeta.documentCode}-${timestamp}.pdf`;
      } else if (docMeta.format === DocumentFormatsEnum.EXCEL) {
        const workbookDef = JSON.parse(html);
        buffer = await this.excelService.generate(workbookDef);
        contentType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `${docMeta.documentCode}-${timestamp}.xlsx`;
      } else {
        throw new Error(`Unsupported document format: ${docMeta.format}`);
      }

      const uploadResult = await this.s3Service.uploadFiles({
        payload: [
          {
            bucket: data.outputBucket,
            files: [
              {
                folderName: data.outputFolder,
                fileInfo: {
                  fileName: filename,
                  fileBuffer: buffer,
                  contentType,
                },
              },
            ],
          },
        ],
      });

      const { fileId, key } = uploadResult[0].files[0];

      await this.docsRepo.manager.transaction(async manager => {
        const version = manager.create(DocumentsVersionEntity, {
          version: 1,
          filename,
          mimeType: contentType,
          size: buffer.length,
          document: { id: data.documentId },
        });
        await manager.save(DocumentsVersionEntity, version);

        const storage = manager.create(DocumentStorageObjectEntity, {
          id: fileId,
          path: key,
          bucket: data.outputBucket,
        });
        storage.version = version;
        await manager.save(DocumentStorageObjectEntity, storage);

        const generated = manager.create(DocumentsGeneratedEntity, {
          templateName: template.name,
          data: data.data,
        });
        generated.version = version;
        await manager.save(DocumentsGeneratedEntity, generated);
      });

      await this.docsRepo.update(data.documentId, {
        status: DocumentStatusEnum.COMPLETED,
      });
    } catch (err) {
      // Secondary failure (e.g. DB down) must not mask the original error
      try {
        await this.docsRepo.update(data.documentId, {
          status: DocumentStatusEnum.FAILED,
        });
      } catch (updateErr) {
        this.logger.error(
          `Failed to mark document ${data.documentId} as FAILED`,
          updateErr instanceof Error ? updateErr.stack : String(updateErr),
        );
      }
      throw err;
    }
  }
}
