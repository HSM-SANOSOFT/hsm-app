import { GenerateDocumentJobPayloadDto } from '@hsm/common/dtos';
import { DocumentFormatsEnum, DocumentStatusEnum } from '@hsm/common/enums';
import { TemplateNotActiveError } from '@hsm/common/errors';
import {
  DocumentLinkEntity,
  DocumentStorageObjectEntity,
  DocumentsEntity,
  DocumentsGeneratedEntity,
  DocumentsVersionEntity,
} from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import { QueueEnum, QueueWorkerHost } from '@hsm/queue';

const DOCS_BUCKET = 'hsm-docs';

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
    // Tracked outside try so catch block can delete the S3 object if the DB transaction fails
    let uploadedKey: string | undefined;
    let uploadedBucket: string | undefined;
    try {
      await this.docsRepo.update(data.documentId, {
        status: DocumentStatusEnum.PROCESSING,
      });

      const template = await this.templatesService.findByIdentifier(
        data.templateIdentifier,
        { withChildren: true },
      );

      if (!template.isActive) {
        throw new TemplateNotActiveError(data.templateIdentifier);
      }

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
        const parsedDef = JSON.parse(html);
        if (!parsedDef || !Array.isArray(parsedDef.sheets)) {
          throw new Error(
            `XLSX template '${data.templateIdentifier}' rendered invalid workbook definition — expected { sheets: [...] }`,
          );
        }
        buffer = await this.excelService.generate(parsedDef);
        contentType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `${docMeta.documentCode}-${timestamp}.xlsx`;
      } else {
        throw new Error(`Unsupported document format: ${docMeta.format}`);
      }

      // Folder derived from documentCode (e.g. HCU-013-A → hcu-013-a) to group by form type
      const outputFolder = docMeta.documentCode.toLowerCase();
      const uploadResult = await this.s3Service.uploadFiles({
        payload: [
          {
            bucket: DOCS_BUCKET,
            files: [
              {
                folderName: outputFolder,
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
      uploadedKey = key;
      uploadedBucket = DOCS_BUCKET;

      await this.docsRepo.manager.transaction(async manager => {
        // MAX query runs inside the transaction with a pessimistic lock to prevent
        // concurrent jobs for the same document racing to the same nextVersion.
        const raw = await manager
          .createQueryBuilder(DocumentsVersionEntity, 'v')
          .setLock('pessimistic_write')
          .select('COALESCE(MAX(v.version), 0)', 'max')
          .where('v.documentId = :id', { id: data.documentId })
          .getRawOne<{ max: string }>();
        // getRawOne returns PostgreSQL aggregates as strings — coerce explicitly.
        const nextVersion = Number(raw?.max ?? 0) + 1;

        const version = manager.create(DocumentsVersionEntity, {
          version: nextVersion,
          filename,
          mimeType: contentType,
          size: buffer.length,
          document: { id: data.documentId },
        });
        await manager.save(DocumentsVersionEntity, version);

        const storage = manager.create(DocumentStorageObjectEntity, {
          id: fileId,
          path: key,
          bucket: DOCS_BUCKET,
        });
        storage.version = version;
        await manager.save(DocumentStorageObjectEntity, storage);

        const generated = manager.create(DocumentsGeneratedEntity, {
          templateName: template.name,
          data: data.data,
        });
        generated.version = version;
        await manager.save(DocumentsGeneratedEntity, generated);

        // Link document to an entity if provided
        if (data.entityId && data.entityType) {
          const link = manager.create(DocumentLinkEntity, {
            document: { id: data.documentId },
            entityId: data.entityId,
            entityType: data.entityType,
          });
          await manager.save(DocumentLinkEntity, link);
          await manager.update(DocumentsEntity, data.documentId, {
            entityId: data.entityId,
            entityType: data.entityType,
          });
        }
      });

      await this.docsRepo.update(data.documentId, {
        status: DocumentStatusEnum.COMPLETED,
      });
    } catch (err) {
      // Clean up orphaned S3 object if upload succeeded but DB transaction failed
      if (uploadedKey && uploadedBucket) {
        try {
          await this.s3Service.deleteFiles({
            documents: [
              {
                bucket: uploadedBucket,
                files: [{ folderName: '', fileInfo: { fileId: uploadedKey } }],
              },
            ],
          });
        } catch (cleanupErr) {
          this.logger.error(
            `Failed to clean up orphaned S3 object key="${uploadedKey}"`,
            cleanupErr instanceof Error ? cleanupErr.stack : String(cleanupErr),
          );
        }
      }

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
