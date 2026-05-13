//import { ValidateEmailTemplateData } from '@hsm/common/validators';

import { ApiProperty, ApiSchema, PartialType } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { EmailBatchStatusEnum, EmailRecipientStatusEnum } from '../enums';
import { DocumentsPayloadDto } from './docs.dto';

@ApiSchema({ name: 'Send Email Payload' })
export class SendEmailPayloadDto extends PartialType(DocumentsPayloadDto) {
  @IsOptional()
  @IsEmail()
  @ApiProperty({
    description: 'correo electrónico del remitente (from)',
    required: false,
    example: 'no-reply@hospitalsm.org',
  })
  fromEmail: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'nombre del remitente (from name)',
    required: false,
    example: 'Name Name',
  })
  fromName: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  @ApiProperty({
    description: 'correos electrónicos de los destinatarios',
    required: true,
    example: ['user1@example.com', 'user2@example.com'],
  })
  toEmails: string[];

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'plantilla de correo electrónico a utilizar',
    required: true,
    example: 'password_reset',
  })
  emailTemplate: string;

  @IsObject()
  //@ValidateEmailTemplateData()
  @ApiProperty({
    description: 'data para la plantilla (merge vars)',
    required: false,
    example: { userName: 'Raul', pin: '123456' },
  })
  data: unknown;
}

// ---------------------------------------------------------------------------
// Job DTOs
// ---------------------------------------------------------------------------

@ApiSchema({ name: 'Send Email Job' })
export class SendEmailJobDto {
  @ApiProperty({ description: 'ID of the email batch to process' })
  batchId: string;

  @ApiProperty({
    description: 'Optional recipient ID when re-sending a single recipient',
    required: false,
  })
  recipientId?: string;
}

// ---------------------------------------------------------------------------
// Response DTOs
// ---------------------------------------------------------------------------

@ApiSchema({ name: 'Email Batch Response' })
export class EmailBatchResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  templateId: string;

  @ApiProperty({ required: false })
  fromEmail?: string;

  @ApiProperty({ required: false })
  fromName?: string;

  @ApiProperty()
  data: object;

  @ApiProperty({ required: false, type: [Object] })
  documentIds?: object[];

  @ApiProperty({ required: false })
  jobId?: string;

  @ApiProperty({ enum: EmailBatchStatusEnum })
  overallStatus: EmailBatchStatusEnum;

  @ApiProperty({ required: false })
  createdBy?: string;

  @ApiProperty()
  createdAt: Date;
}

@ApiSchema({ name: 'Email Recipient Response' })
export class EmailRecipientResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  toEmail: string;

  @ApiProperty({ required: false })
  messageId?: string;

  @ApiProperty({ enum: EmailRecipientStatusEnum })
  status: EmailRecipientStatusEnum;

  @ApiProperty({ required: false })
  sentAt?: Date;

  @ApiProperty({ required: false })
  errorMessage?: string;
}

@ApiSchema({ name: 'Resend Response' })
export class ResendResponseDto {
  @ApiProperty()
  jobId: string;
}

// ---------------------------------------------------------------------------
// Query DTOs
// ---------------------------------------------------------------------------

@ApiSchema({ name: 'List Email Batches Query' })
export class ListEmailBatchesQueryDto {
  @IsOptional()
  @IsUUID()
  @ApiProperty({ required: false, description: 'Filter by template ID' })
  templateId?: string;

  @IsOptional()
  @IsEnum(EmailBatchStatusEnum)
  @ApiProperty({
    required: false,
    enum: EmailBatchStatusEnum,
    description: 'Filter by overall status',
  })
  overallStatus?: EmailBatchStatusEnum;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false, description: 'Filter by creator user ID' })
  createdBy?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({ required: false, description: 'Filter from date (ISO 8601)' })
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({ required: false, description: 'Filter to date (ISO 8601)' })
  toDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @ApiProperty({ required: false, default: 1 })
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @ApiProperty({ required: false, default: 20 })
  limit?: number = 20;
}

@ApiSchema({ name: 'List Email Recipients Query' })
export class ListEmailRecipientsQueryDto {
  @IsOptional()
  @IsUUID()
  @ApiProperty({ required: false, description: 'Filter by batch ID' })
  batchId?: string;

  @IsOptional()
  @IsEmail()
  @ApiProperty({ required: false, description: 'Filter by recipient email' })
  toEmail?: string;

  @IsOptional()
  @IsEnum(EmailRecipientStatusEnum)
  @ApiProperty({
    required: false,
    enum: EmailRecipientStatusEnum,
    description: 'Filter by status',
  })
  status?: EmailRecipientStatusEnum;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @ApiProperty({ required: false, default: 1 })
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @ApiProperty({ required: false, default: 20 })
  limit?: number = 20;
}
