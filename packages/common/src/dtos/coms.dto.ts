import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  EmailBatchStatusEnum,
  EmailRecipientStatusEnum,
} from '../enums/coms.enum';

@ApiSchema({ name: 'Send Email Payload' })
export class SendEmailPayloadDto {
  @IsOptional()
  @IsEmail()
  @ApiProperty({
    description: 'correo electrónico del remitente (from)',
    required: false,
    example: 'no-reply@hospitalsm.org',
  })
  fromEmail?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'nombre del remitente (from name)',
    required: false,
    example: 'Name Name',
  })
  fromName?: string;

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
  @ApiProperty({
    description: 'data para la plantilla (merge vars)',
    required: false,
    example: { userName: 'Raul', pin: '123456' },
  })
  data: unknown;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ApiProperty({
    required: false,
    description: 'Document IDs to attach',
    example: ['a1b2c3d4-e5f6-7890-abcd-ef1234567890'],
  })
  documentIds?: string[];
}

export class SendEmailJobDto {
  @IsUUID()
  batchId: string;

  @IsOptional()
  @IsUUID()
  recipientId?: string;
}

/**
 * A one-off transactional email (account-recovery: password reset / username
 * recovery). Unlike the batch path, nothing is persisted — the worker sends it
 * directly via the SMTP transport. Carries the already-rendered subject/body so
 * the worker never needs the (sensitive, never-stored) plaintext reset link
 * beyond this in-flight job.
 */
export class SendTransactionalEmailJobDto {
  @IsEmail()
  toEmail: string;

  @IsString()
  subject: string;

  @IsString()
  html: string;

  @IsOptional()
  @IsString()
  text?: string;
}

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
  data: unknown;

  @ApiProperty({ required: false })
  documentIds?: string[];

  @ApiProperty({ required: false })
  jobId?: string;

  @ApiProperty()
  overallStatus: string;

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
  batchId: string;

  @ApiProperty()
  toEmail: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ required: false })
  sentAt?: Date;

  @ApiProperty({ required: false })
  errorMessage?: string;
}

@ApiSchema({ name: 'List Email Batches Query' })
export class ListEmailBatchesQueryDto {
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @IsEnum(EmailBatchStatusEnum)
  overallStatus?: string;

  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

@ApiSchema({ name: 'List Email Recipients Query' })
export class ListEmailRecipientsQueryDto {
  @IsOptional()
  @IsUUID()
  batchId?: string;

  @IsOptional()
  @IsEmail()
  toEmail?: string;

  @IsOptional()
  @IsEnum(EmailRecipientStatusEnum)
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

@ApiSchema({ name: 'Resend Response' })
export class ResendResponseDto {
  @ApiProperty()
  jobId: string;
}
