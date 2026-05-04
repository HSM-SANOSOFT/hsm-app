import {
  CreateTemplatePayloadDto,
  GetTemplateRequestDto,
  ParseTemplatePayloadDto,
  TemplateResponseDto,
  UpdateTemplatePayloadDto,
  ValidateTemplateResponseDto,
} from '@hsm/common/dtos';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
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

  @ApiDocumentation(ValidateTemplateResponseDto)
  @Roles()
  @Post('validate')
  validateTemplate(@Body() payload: ParseTemplatePayloadDto) {
    return this.templatesService.validate({
      identifier: payload.identifier,
      data: payload.data,
    });
  }
}
