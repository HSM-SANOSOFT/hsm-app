import {
  CreateTemplatePayloadDto,
  GetTemplateRequestDto,
  ParseTemplatePayloadDto,
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
} from '@nestjs/common';
import { ApiDocumentation } from '../../../decorator';
import { Roles } from '../../security/roles/roles.decorator';
import { TemplatesService } from './templates.service';

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

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
}
