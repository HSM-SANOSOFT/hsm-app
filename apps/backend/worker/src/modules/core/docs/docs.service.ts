import { DocumentsPayloadDto } from '@hsm/common/dtos';
import { S3Service } from '@hsm/storage/s3/s3.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DocsService {
  constructor(private readonly s3Service: S3Service) {}

  getDocumentsStreams(payload: DocumentsPayloadDto) {
    return this.s3Service.getFilesStreams(payload);
  }
}
