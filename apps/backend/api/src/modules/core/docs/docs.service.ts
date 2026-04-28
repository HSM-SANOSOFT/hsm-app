import {
  DocumentsPayloadDto,
  S3FileUploadPayloadDto,
  UploadDocumentPayloadDto,
} from '@hsm/common/dtos';
import { S3Service } from '@hsm/storage/s3/s3.service';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class DocsService {
  constructor(private readonly s3Service: S3Service) {}

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
}
