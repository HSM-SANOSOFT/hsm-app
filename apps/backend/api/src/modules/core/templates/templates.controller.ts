import {
  CreateTemplatePayloadDto,
  DraftRenderPayloadDto,
  DraftRenderResponseDto,
  GetTemplateRequestDto,
  ListTemplatesQueryDto,
  ParseTemplatePayloadDto,
  TemplateDetailDto,
  TemplateWithBaseResponseDto,
  UpdateTemplatePayloadDto,
  ValidateTemplateResponseDto,
} from '@hsm/common/dtos';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiDocumentation } from '../../../decorator';
import { Roles } from '../../security/roles/roles.decorator';
import { TemplatesService } from './templates.service';

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @ApiDocumentation(TemplateDetailDto)
  @Roles()
  @Get()
  listTemplates(@Query() query: ListTemplatesQueryDto) {
    return this.templatesService.findAll({ category: query.category });
  }

  @ApiDocumentation(TemplateWithBaseResponseDto, {
    additionalErrors: [HttpStatus.NOT_FOUND],
  })
  @Roles()
  @Get(':identifier')
  getTemplate(@Param() params: GetTemplateRequestDto) {
    return this.templatesService.findByIdentifier(params.identifier, {
      withChildren: true,
      withBase: true,
    });
  }

  @ApiDocumentation(TemplateWithBaseResponseDto, {
    additionalErrors: [HttpStatus.NOT_FOUND],
  })
  @Roles()
  @Post()
  addTemplate(@Body() payload: CreateTemplatePayloadDto) {
    return this.templatesService.create(payload);
  }

  @ApiDocumentation(TemplateWithBaseResponseDto, {
    additionalErrors: [HttpStatus.NOT_FOUND],
  })
  @Roles()
  @Put(':id')
  updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdateTemplatePayloadDto,
  ) {
    return this.templatesService.update(id, payload);
  }

  @ApiDocumentation(undefined, { additionalErrors: [HttpStatus.NOT_FOUND] })
  @Roles()
  @Delete(':id')
  async deleteTemplate(@Param('id', ParseUUIDPipe) id: string) {
    await this.templatesService.delete(id);
    return { id };
  }

  @ApiDocumentation(ValidateTemplateResponseDto, {
    additionalErrors: [HttpStatus.NOT_FOUND],
  })
  @Roles()
  @Post('validate')
  validateTemplate(@Body() payload: ParseTemplatePayloadDto) {
    return this.templatesService.validate({
      identifier: payload.identifier,
      data: payload.data,
    });
  }

  @ApiDocumentation(DraftRenderResponseDto, {
    additionalErrors: [HttpStatus.NOT_FOUND, HttpStatus.BAD_REQUEST],
  })
  @Roles()
  @Post('draft-render')
  draftRender(@Body() payload: DraftRenderPayloadDto) {
    return this.templatesService.draftRender(payload);
  }
}
