import {
  DocumentsPayloadDto,
  GenerateDocumentRequestDto,
  ListDocumentsQueryDto,
  UploadDocumentPayloadDto,
} from '@hsm/common/dtos';
import type { ISignedUser } from '@hsm/common/interfaces';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { ApiDocumentation } from '../../../decorator';
import { DocsService } from '../../core/docs/docs.service';
import { Roles } from '../../security/roles/roles.decorator';

@Controller('docs')
export class DocsController {
  private readonly logger = new Logger(DocsController.name);
  constructor(private readonly docsService: DocsService) {}

  @ApiDocumentation()
  @Roles()
  @Get()
  async listDocuments(@Query() query: ListDocumentsQueryDto, @Req() req: Request) {
    return await this.docsService.listDocuments(
      query,
      (req.user as ISignedUser)?.id ?? '',
    );
  }

  @ApiDocumentation(undefined, { additionalErrors: [HttpStatus.NOT_FOUND] })
  @Roles()
  @Get(':id/url')
  async getDocumentUrl(@Param('id') id: string, @Req() req: Request) {
    return await this.docsService.getDocumentUrl(
      id,
      (req.user as ISignedUser)?.id,
    );
  }

  @ApiDocumentation(undefined, { additionalErrors: [HttpStatus.NOT_FOUND] })
  @Roles()
  @Get(':id')
  async getDocument(@Param('id') id: string, @Req() req: Request) {
    return await this.docsService.getDocument(
      id,
      (req.user as ISignedUser)?.id,
    );
  }

  @ApiDocumentation()
  @Roles()
  @Post('generate')
  async generateDocument(
    @Body() dto: GenerateDocumentRequestDto,
    @Req() req: Request,
  ) {
    this.logger.debug(
      `Generating document from template '${dto.templateIdentifier}'`,
    );
    return await this.docsService.generateDocument(
      dto,
      (req.user as ISignedUser)?.id,
    );
  }

  @ApiDocumentation(undefined, { additionalErrors: [HttpStatus.NOT_FOUND] })
  @Roles()
  @Delete(':id')
  async deleteDocument(@Param('id') id: string, @Req() req: Request) {
    return await this.docsService.deleteDocument(
      id,
      (req.user as ISignedUser)?.id,
    );
  }

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
    @Req() req: Request,
  ) {
    const toLog = {
      payload: body.payload.map(p => p),
      files: files.map(f => ({ name: f.originalname, type: f.mimetype })),
    };
    this.logger.debug(`Uploading documents ${JSON.stringify(toLog)}`);
    return await this.docsService.uploadDocuments(
      body,
      files,
      (req.user as ISignedUser)?.id,
    );
  }

  @ApiDocumentation()
  @Roles()
  @Delete()
  async deleteDocuments(
    @Body()
    _payload: Array<{
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
