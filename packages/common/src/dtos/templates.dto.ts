import { ApiProperty, ApiSchema, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  DocumentCodesEnum,
  DocumentFormatsEnum,
  DocumentOrientationsEnum,
  DocumentSizesEnum,
} from '../enums/docs.enum';
import { TemplateCategoriesEnum } from '../enums/templates.enum';
import type { TemplateSchemaIssue } from '../errors/templates.error';

@ApiSchema({ name: 'Get Template Request' })
export class GetTemplateRequestDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description:
      'Identificador de la plantilla: puede ser el UUID o el nombre de la plantilla',
    required: true,
    examples: {
      uuid: { value: '123e4567-e89b-12d3-a456-426614174000' },
      name: { value: 'my_template' },
    },
  })
  identifier: string;
}

@ApiSchema({ name: 'List Templates Query' })
export class ListTemplatesQueryDto {
  @IsOptional()
  @IsEnum(TemplateCategoriesEnum)
  @ApiProperty({
    enum: TemplateCategoriesEnum,
    required: false,
    description:
      'Filtra las plantillas por categoría (p. ej. BASE para el selector ' +
      'de plantilla base, o DOCS para generación de documentos).',
  })
  category?: TemplateCategoriesEnum;
}

@ApiSchema({ name: 'Email Template Fields' })
export class EmailTemplateFieldsDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Asunto del correo', example: 'Bienvenido' })
  subject: string;

  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({ description: 'From email', example: 'no-reply@hsm.org' })
  fromEmail: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'From name', example: 'HSM' })
  fromName: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  @ApiProperty({
    description: 'Direcciones CC por defecto',
    required: false,
    type: [String],
  })
  cc?: string[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  @ApiProperty({
    description: 'Direcciones BCC por defecto',
    required: false,
    type: [String],
  })
  bcc?: string[];

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    description: 'La plantilla incluye archivos adjuntos',
    required: false,
    default: false,
  })
  hasAttachment?: boolean;
}

@ApiSchema({ name: 'Doc Template Fields' })
export class DocTemplateFieldsDto {
  @IsNotEmpty()
  @IsEnum(DocumentCodesEnum)
  @ApiProperty({ enum: DocumentCodesEnum })
  documentCode: DocumentCodesEnum;

  @IsNotEmpty()
  @IsEnum(DocumentFormatsEnum)
  @ApiProperty({ enum: DocumentFormatsEnum })
  format: DocumentFormatsEnum;

  @IsNotEmpty()
  @IsEnum(DocumentSizesEnum)
  @ApiProperty({ enum: DocumentSizesEnum })
  size: DocumentSizesEnum;

  @IsNotEmpty()
  @IsEnum(DocumentOrientationsEnum)
  @ApiProperty({ enum: DocumentOrientationsEnum })
  orientation: DocumentOrientationsEnum;
}

@ApiSchema({ name: 'SMS Template Fields' })
export class SmsTemplateFieldsDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Proveedor SMS', example: 'twilio' })
  provider: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Nombre de la plantilla en el proveedor',
    example: 'appt_reminder',
  })
  templateName: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Número o identificador de origen',
    example: '+15005550006',
  })
  from: string;
}

@ApiSchema({ name: 'Template Detail' })
export class TemplateDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: TemplateCategoriesEnum })
  category: TemplateCategoriesEnum;

  @ApiProperty()
  name: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: Object })
  schema: object;

  @ApiProperty()
  content: string;

  @ApiProperty({ required: false, nullable: true })
  description?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      'Datos específicos del canal (email, doc, sms). Null para plantillas BASE.',
    oneOf: [
      { $ref: '#/components/schemas/Email Template Fields' },
      { $ref: '#/components/schemas/Doc Template Fields' },
      { $ref: '#/components/schemas/SMS Template Fields' },
    ],
  })
  metadata:
    | EmailTemplateFieldsDto
    | DocTemplateFieldsDto
    | SmsTemplateFieldsDto
    | null;
}

@ApiSchema({ name: 'Template With Base Response' })
export class TemplateWithBaseResponseDto {
  @ApiProperty({ type: () => TemplateDetailDto })
  template: TemplateDetailDto;

  @ApiProperty({ type: () => TemplateDetailDto, nullable: true })
  baseTemplate: TemplateDetailDto | null;
}

@ApiSchema({ name: 'Create Template Payload' })
export class CreateTemplatePayloadDto {
  @IsNotEmpty()
  @IsEnum(TemplateCategoriesEnum)
  @ApiProperty({ enum: TemplateCategoriesEnum })
  category: TemplateCategoriesEnum;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Nombre único de la plantilla' })
  name: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  description?: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ required: false, default: true })
  isActive?: boolean;

  @IsObject()
  @ApiProperty({
    description:
      'Mini-schema describiendo el shape de `data` esperado al parsear. ' +
      'Hojas: "string" | "number" | "boolean" | "date" | "any" (sufijo "?" para opcional). ' +
      'Objetos = sub-schema, arrays de un elemento = lista de ese sub-schema.',
    example: {
      patientName: 'string',
      age: 'number',
      address: { street: 'string', city: 'string' },
      diagnoses: ['string'],
    },
  })
  schema: object;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Fuente Handlebars de la plantilla',
    example: '<p>Hola {{patientName}}</p>',
  })
  content: string;

  @ValidateIf(o => o.category !== TemplateCategoriesEnum.BASE)
  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({
    required: false,
    description:
      'UUID de la plantilla BASE (requerido para categorías != BASE)',
  })
  baseTemplateId?: string;

  @ValidateIf(
    o =>
      o.category === TemplateCategoriesEnum.EMAIL_INTERNAL ||
      o.category === TemplateCategoriesEnum.EMAIL_EXTERNAL,
  )
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => EmailTemplateFieldsDto)
  @ApiProperty({
    required: false,
    type: () => EmailTemplateFieldsDto,
    description: 'Requerido para categorías EMAIL_*',
  })
  email?: EmailTemplateFieldsDto;

  @ValidateIf(o => o.category === TemplateCategoriesEnum.DOCS)
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => DocTemplateFieldsDto)
  @ApiProperty({
    required: false,
    type: () => DocTemplateFieldsDto,
    description: 'Requerido para categoría DOCS',
  })
  doc?: DocTemplateFieldsDto;

  @ValidateIf(
    o =>
      o.category === TemplateCategoriesEnum.SMS_INTERNAL ||
      o.category === TemplateCategoriesEnum.SMS_EXTERNAL,
  )
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => SmsTemplateFieldsDto)
  @ApiProperty({
    required: false,
    type: () => SmsTemplateFieldsDto,
    description: 'Requerido para categorías SMS_*',
  })
  sms?: SmsTemplateFieldsDto;
}

@ApiSchema({ name: 'Update Template Payload' })
export class UpdateTemplatePayloadDto extends PartialType(
  CreateTemplatePayloadDto,
) {}

@ApiSchema({ name: 'Parse Template Payload' })
export class ParseTemplatePayloadDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'UUID o nombre de la plantilla a usar',
    example: 'appointment_confirmation',
  })
  identifier: string;

  @IsObject()
  @ApiProperty({
    description: 'Datos para sustituir en la plantilla',
    example: { patientName: 'Ada', age: 36 },
  })
  data: Record<string, unknown>;
}

@ApiSchema({ name: 'Parse Template Response' })
export class ParseTemplateResponseDto {
  @ApiProperty({ description: 'HTML renderizado' })
  html: string;

  @ApiProperty({ description: 'UUID de la plantilla usada' })
  templateId: string;
}

@ApiSchema({ name: 'Draft Render Payload' })
export class DraftRenderPayloadDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Fuente Handlebars del borrador a renderizar',
    example: '<p>Hola {{patientName}}</p>',
  })
  content: string;

  @IsOptional()
  @IsUUID()
  @ApiProperty({
    required: false,
    description:
      'UUID de la plantilla BASE que envuelve el contenido vía {{body}}. ' +
      'Si se omite, el contenido se renderiza tal cual.',
  })
  baseTemplateId?: string;

  @IsOptional()
  @IsObject()
  @ApiProperty({
    required: false,
    description: 'Datos de ejemplo contra los que renderizar el borrador',
    example: { patientName: 'Ada', age: 36 },
  })
  sampleData?: Record<string, unknown>;
}

@ApiSchema({ name: 'Draft Render Response' })
export class DraftRenderResponseDto {
  @ApiProperty({ description: 'HTML compuesto en el servidor' })
  html: string;
}

@ApiSchema({ name: 'Validate Template Response' })
export class ValidateTemplateResponseDto {
  @ApiProperty()
  valid: boolean;

  @ApiProperty({ required: false })
  templateId?: string;

  @ApiProperty({ required: false, type: 'array' })
  issues?: TemplateSchemaIssue[];
}
