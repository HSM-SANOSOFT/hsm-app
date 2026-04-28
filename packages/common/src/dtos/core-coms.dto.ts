//import { ValidateEmailTemplateData } from '@hsm/common/validators';

import { ApiProperty, ApiSchema, PartialType } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { DocumentsPayloadDto } from './core-docs.dto';

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
