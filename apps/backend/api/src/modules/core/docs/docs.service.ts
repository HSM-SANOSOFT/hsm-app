import {
  DocumentsPayloadDto,
  GenerateDocumentJobPayloadDto,
  GenerateDocumentRequestDto,
  S3FileUploadPayloadDto,
  UploadDocumentPayloadDto,
} from '@hsm/common/dtos';
import {
  DocumentSourceEnum,
  DocumentStatusEnum,
  DocumentTypeEnum,
} from '@hsm/common/enums';
import { DocumentsEntity } from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import { QueueEnum } from '@hsm/queue';
import { S3Service } from '@hsm/storage/s3/s3.service';
import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';

const DEFAULT_BUCKET = 'hsm-docs';
const DEFAULT_FOLDER = 'generated';

@Injectable()
export class DocsService {
  constructor(
    private readonly s3Service: S3Service,
    @InjectQueue(QueueEnum.Document) private readonly docsQueue: Queue,
    @InjectRepository(DocumentsEntity, DatabasesEnum.HsmDbPostgres)
    private readonly docs: Repository<DocumentsEntity>,
  ) {}

  async generateDocument(dto: GenerateDocumentRequestDto) {
    const outputBucket = dto.outputBucket ?? DEFAULT_BUCKET;
    const outputFolder = dto.outputFolder ?? DEFAULT_FOLDER;

    const doc = this.docs.create({
      title: dto.title,
      description: dto.description,
      type: DocumentTypeEnum.GENERATED,
      status: DocumentStatusEnum.PENDING,
      source: DocumentSourceEnum.TEMPLATE,
    });
    await this.docs.save(doc);

    const jobPayload: GenerateDocumentJobPayloadDto = {
      documentId: doc.id,
      templateIdentifier: dto.templateIdentifier,
      data: dto.data,
      outputBucket,
      outputFolder,
    };

    const job = await this.docsQueue.add('generate-document', jobPayload);
    return { documentId: doc.id, jobId: job.id };
  }

  async getDocument(id: string) {
    const doc = await this.docs.findOne({
      where: { id },
      relations: { versions: { storage: true } },
    });
    if (!doc) throw new NotFoundException(`Document '${id}' not found`);
    return doc;
  }

  async getDocumentUrl(id: string) {
    const doc = await this.getDocument(id);

    const latestVersion = doc.versions
      ?.slice()
      .sort((a, b) => b.version - a.version)[0];

    if (!latestVersion?.storage) {
      throw new NotFoundException(
        `No generated file found for document '${id}'`,
      );
    }

    const { folderName, fileId } = this.splitStoragePath(
      latestVersion.storage.path,
    );

    const payload: DocumentsPayloadDto = {
      documents: [
        {
          bucket: latestVersion.storage.bucket,
          files: [{ folderName, fileInfo: { fileId } }],
        },
      ],
    };

    const result = await this.s3Service.generatePresignedUrls(payload, {
      contentDisposition: 'inline',
    });

    const url = result[0]?.files?.[0]?.url;
    if (!url) {
      throw new InternalServerErrorException(
        `Presigned URL not returned for document '${id}'`,
      );
    }

    return { url };
  }

  async deleteDocument(id: string) {
    const doc = await this.docs.findOne({
      where: { id },
      relations: { versions: { storage: true } },
    });
    if (!doc) throw new NotFoundException(`Document '${id}' not found`);

    await this.docs.softDelete(id);

    const storageEntries = doc.versions
      ?.filter((v): v is typeof v & { storage: NonNullable<typeof v.storage> } => v.storage != null)
      .map(v => this.splitStoragePath(v.storage.path, v.storage.bucket));

    if (storageEntries && storageEntries.length > 0) {
      const bucketGroups = storageEntries.reduce(
        (acc, entry) => {
          acc[entry.bucket!] = acc[entry.bucket!] ?? [];
          acc[entry.bucket!].push({
            folderName: entry.folderName,
            fileInfo: { fileId: entry.fileId },
          });
          return acc;
        },
        {} as Record<
          string,
          Array<{ folderName: string; fileInfo: { fileId: string } }>
        >,
      );

      const payload: DocumentsPayloadDto = {
        documents: Object.entries(bucketGroups).map(([bucket, files]) => ({
          bucket,
          files,
        })),
      };
      await this.s3Service.deleteFiles(payload);
    }

    return { deleted: true };
  }

  async getDocumentsUrl(
    payload: DocumentsPayloadDto,
    opts?: { contentDisposition?: string; expiresInSeconds?: number },
  ) {
    return await this.s3Service.generatePresignedUrls(payload, opts);
  }

  async createDocuments() {
    // Implementation for creating documents
  }

  async deleteDocuments(payload: DocumentsPayloadDto) {
    return await this.s3Service.deleteFiles(payload);
  }

  async uploadDocuments(
    payload: UploadDocumentPayloadDto,
    files: Array<Express.Multer.File>,
  ) {
    const fileQueues = new Map<string, Express.Multer.File[]>();
    for (const f of files) {
      const key = (f.originalname ?? '').trim();
      if (!key) continue;

      const fileQueue = fileQueues.get(key) ?? [];
      fileQueue.push(f);
      fileQueues.set(key, fileQueue);
    }

    const data: S3FileUploadPayloadDto = {
      payload: payload.payload.map(item => ({
        bucket: item.bucket,
        files: item.files.map(meta => {
          const queue = fileQueues.get(meta.fileInfo.fileName);
          const match = queue?.shift();

          if (!match) {
            throw new InternalServerErrorException(
              `No uploaded file matched payload filename="${meta.fileInfo.fileName}" (bucket="${item.bucket}")`,
            );
          }

          if (queue && queue.length === 0) {
            fileQueues.delete(meta.fileInfo.fileName);
          }

          return {
            folderName: meta.folderName,
            fileInfo: {
              ...meta.fileInfo,
              fileBuffer: match.buffer,
              contentType: match.mimetype,
            },
          };
        }),
      })),
    };
    if (fileQueues.size > 0) {
      const extras = Array.from(fileQueues.keys());
      throw new InternalServerErrorException(
        `Uploaded files not referenced in payload: ${extras.join(', ')}`,
      );
    }
    return await this.s3Service.uploadFiles(data);
  }

  /** Decomposes an S3 storage path (e.g. "generated/uuid") into folderName and fileId. */
  private splitStoragePath(
    path: string,
    bucket?: string,
  ): { folderName: string; fileId: string; bucket?: string } {
    const parts = path.split('/');
    const fileId = parts[parts.length - 1];
    const folderName = parts.slice(0, -1).join('/');
    return { folderName, fileId, bucket };
  }
}
