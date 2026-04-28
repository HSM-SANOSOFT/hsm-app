import {
  CreateTemplatePayloadDto,
  GetTemplateRequestDto,
  ParseTemplatePayloadDto,
  ParseTemplateResponseDto,
  TemplateResponseDto,
  UpdateTemplatePayloadDto,
} from '@hsm/common/dtos';
import { TemplateParseTriggerEnum } from '@hsm/common/enums';
import type { ISignedUser } from '@hsm/common/interfaces';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiDocumentation } from '../../../decorator';
import { Roles } from '../../security/roles/roles.decorator';
import { TemplatesService } from './templates.service';

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @ApiDocumentation(TemplateResponseDto)
  @Roles()
  @Get(':identifier')
  getTemplate(@Param() params: GetTemplateRequestDto) {
    return this.templatesService.findByIdentifier(params.identifier, {
      withChildren: true,
      withBase: true,
    });
  }

  @ApiDocumentation(TemplateResponseDto)
  @Roles()
  @Post()
  addTemplate(@Body() payload: CreateTemplatePayloadDto) {
    return this.templatesService.create(payload);
  }

  @ApiDocumentation(TemplateResponseDto)
  @Roles()
  @Put(':id')
  updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdateTemplatePayloadDto,
  ) {
    return this.templatesService.update(id, payload);
  }

  @ApiDocumentation()
  @Roles()
  @Delete(':id')
  async deleteTemplate(@Param('id', ParseUUIDPipe) id: string) {
    await this.templatesService.delete(id);
    return { id };
  }

  @ApiDocumentation(ParseTemplateResponseDto)
  @Roles()
  @Post('parse')
  parseTemplate(
    @Body() payload: ParseTemplatePayloadDto,
    @Req() req: Request & { user?: ISignedUser },
  ) {
    return this.templatesService.parse({
      identifier: payload.identifier,
      data: payload.data,
      context: {
        userId: req.user?.id ?? null,
        triggeredBy: TemplateParseTriggerEnum.Http,
      },
    });
  }
}
