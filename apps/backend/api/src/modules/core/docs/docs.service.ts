import {
  DocumentsPayloadDto,
  GenerateDocumentJobPayloadDto,
  GenerateDocumentRequestDto,
  ListDocumentsQueryDto,
  S3FileUploadPayloadDto,
  UploadDocumentPayloadDto,
} from '@hsm/common/dtos';
import {
  DocumentSourceEnum,
  DocumentStatusEnum,
  DocumentTypeEnum,
} from '@hsm/common/enums';
import { buildPaginationMeta } from '@hsm/common/utils';
import {
  DocumentLinkEntity,
  DocumentStorageObjectEntity,
  DocumentsEntity,
  DocumentsVersionEntity,
} from '@hsm/database/entities';
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

@Injectable()
export class DocsService {
  constructor(
    private readonly s3Service: S3Service,
    @InjectQueue(QueueEnum.Document) private readonly docsQueue: Queue,
    @InjectRepository(DocumentsEntity, DatabasesEnum.HsmDbPostgres)
    private readonly docs: Repository<DocumentsEntity>,
    @InjectRepository(DocumentsVersionEntity, DatabasesEnum.HsmDbPostgres)
    private readonly versions: Repository<DocumentsVersionEntity>,
    @InjectRepository(DocumentStorageObjectEntity, DatabasesEnum.HsmDbPostgres)
    private readonly storageRepo: Repository<DocumentStorageObjectEntity>,
    @InjectRepository(DocumentLinkEntity, DatabasesEnum.HsmDbPostgres)
    private readonly linkRepo: Repository<DocumentLinkEntity>,
  ) {}

  async listDocuments(query: ListDocumentsQueryDto, userId: string) {
    const { entityId, entityType, type, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const qb = this.docs
      .createQueryBuilder('doc')
      .where('doc.createdBy = :userId', { userId })
      .andWhere('doc.deletedAt IS NULL');

    if (entityId && entityType) {
      qb.andWhere('doc.entityId = :entityId AND doc.entityType = :entityType', {
        entityId,
        entityType,
      });
    }
    if (type) qb.andWhere('doc.type = :type', { type });
    if (status) qb.andWhere('doc.status = :status', { status });

    qb.skip(skip).take(limit).orderBy('doc.createdAt', 'DESC');

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      metadata: buildPaginationMeta({
        page,
        pageSize: limit,
        totalItems: total,
      }),
    };
  }

  async generateDocument(dto: GenerateDocumentRequestDto, userId?: string) {
    const doc = this.docs.create({
      title: dto.title,
      description: dto.description,
      type: DocumentTypeEnum.GENERATED,
      status: DocumentStatusEnum.PENDING,
      source: DocumentSourceEnum.TEMPLATE,
      createdBy: userId,
    });
    await this.docs.save(doc);

    const jobPayload: GenerateDocumentJobPayloadDto = {
      documentId: doc.id,
      templateIdentifier: dto.templateIdentifier,
      data: dto.data,
      entityId: dto.entityId,
      entityType: dto.entityType,
    };

    const job = await this.docsQueue.add('generate-document', jobPayload);
    return { documentId: doc.id, jobId: job.id };
  }

  async getDocument(id: string, userId?: string) {
    const where: Record<string, unknown> = { id };
    if (userId) where.createdBy = userId;
    const doc = await this.docs.findOne({
      where,
      relations: { versions: { storage: true } },
    });
    if (!doc) throw new NotFoundException(`Document '${id}' not found`);
    return doc;
  }

  async getDocumentUrl(id: string, userId?: string) {
    const doc = await this.getDocument(id, userId);

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

  async deleteDocument(id: string, userId?: string) {
    const where: Record<string, unknown> = { id };
    if (userId) where.createdBy = userId;
    const doc = await this.docs.findOne({
      where,
      relations: { versions: { storage: true } },
    });
    if (!doc) throw new NotFoundException(`Document '${id}' not found`);

    await this.docs.softDelete(id);

    const storageEntries = doc.versions
      ?.filter(
        (v): v is typeof v & { storage: NonNullable<typeof v.storage> } =>
          v.storage != null,
      )
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
    userId?: string,
  ) {
    // Build a map from originalname → file queue for matching
    const fileQueues = new Map<string, Express.Multer.File[]>();
    for (const f of files) {
      const key = (f.originalname ?? '').trim();
      if (!key) continue;

      const fileQueue = fileQueues.get(key) ?? [];
      fileQueue.push(f);
      fileQueues.set(key, fileQueue);
    }

    // Also keep a map of filename → original file for mimeType/size lookup after upload
    const fileByName = new Map<string, Express.Multer.File>();
    for (const f of files) {
      const key = (f.originalname ?? '').trim();
      if (key && !fileByName.has(key)) {
        fileByName.set(key, f);
      }
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

    const s3Result = await this.s3Service.uploadFiles(data);

    // Persist the rows for every uploaded file in ONE transaction so a mid-loop
    // failure can't leave a half-written document graph (doc without its
    // version/storage, or some files persisted and others not). The S3 objects
    // are already uploaded above; this guarantees DB consistency.
    const createdDocIds: string[] = [];
    await this.docs.manager.transaction(async manager => {
      for (const bucket of s3Result) {
        for (const file of bucket.files) {
          const originalFile = fileByName.get(file.filename ?? '');

          const doc = this.docs.create({
            title: file.filename ?? file.fileId,
            type: DocumentTypeEnum.UPLOADED,
            status: DocumentStatusEnum.COMPLETED,
            source: DocumentSourceEnum.MANUAL,
            createdBy: userId,
          });
          await manager.save(doc);

          const version = this.versions.create({
            version: 1,
            filename: file.filename,
            mimeType: originalFile?.mimetype,
            size: originalFile?.size,
            document: doc,
          });
          await manager.save(version);

          const storage = this.storageRepo.create({
            id: file.fileId,
            path: file.key,
            bucket: bucket.bucket,
          });
          storage.version = version;
          await manager.save(storage);

          if (payload.entityId && payload.entityType) {
            const link = this.linkRepo.create({
              document: doc,
              entityId: payload.entityId,
              entityType: payload.entityType,
            });
            await manager.save(link);
          }

          createdDocIds.push(doc.id);
        }
      }
    });

    return { s3Result, documentIds: createdDocIds };
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
