import {
  DocumentsPayloadDto,
  UploadDocumentPayloadDto,
} from '@hsm/common/dtos';
import {
  Body,
  Controller,
  Delete,
  Logger,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiDocumentation } from '../../../decorator';
import { DocsService } from '../../core/docs/docs.service';
import { Roles } from '../../security/roles/roles.decorator';

@Controller('docs')
export class DocsController {
  private readonly logger = new Logger(DocsController.name);
  constructor(private readonly docsService: DocsService) {}
  //TODO: Add endpoint creation, updating, deleting, fetching documents

  @ApiDocumentation()
  @Roles()
  @Post('url')
  async getDocumentsUrl(
    @Body() payload: DocumentsPayloadDto,
    @Query('contentDisposition') contentDisposition?: string,
    @Query('expiresInSeconds') expiresInSeconds?: number,
  ) {
    this.logger.debug(
      `Generating document URLs for ${JSON.stringify(payload)}`,
    );
    const opts = {
      contentDisposition,
      expiresInSeconds: expiresInSeconds,
    };
    return await this.docsService.getDocumentsUrl(payload, opts);
  }

  @ApiDocumentation()
  @Roles()
  @Post('create')
  async createDocuments() {
    // Implementation for creating a document
  }

  @ApiDocumentation()
  @Roles()
  @Post('upload')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadDocuments(
    @Body() body: UploadDocumentPayloadDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    const toLog = {
      payload: body.payload.map(p => p),
      files: files.map(f => ({ name: f.originalname, type: f.mimetype })),
    };
    this.logger.debug(`Uploading documents ${JSON.stringify(toLog)}`);
    return await this.docsService.uploadDocuments(body, files);
  }

  @ApiDocumentation()
  @Roles()
  @Delete()
  async deleteDocuments(
    @Body() payload: Array<{
      bucket: string;
      files: Array<{
        foldername: string;
        fileId: string;
      }>;
    }>,
  ) {
    // Implementation for deleting a document
  }
}
