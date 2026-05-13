import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { DocumentStatusEnum, DocumentTypeEnum } from '@hsm/common/enums';

type Ctor<T> = new () => T;

function fileDtoFactory<TFileInfo>(FileInfoClass: Ctor<TFileInfo>) {
  class FileDto {
    @IsNotEmpty()
    @IsString()
    folderName: string;

    @IsNotEmpty()
    @IsObject()
    @ValidateNested()
    @Type(() => FileInfoClass)
    fileInfo: TFileInfo;
  }
  return FileDto;
}

export function documentDtoFactory<TFileInfo>(FileInfoClass: Ctor<TFileInfo>) {
  const FileDto = fileDtoFactory(FileInfoClass);
  class DocumentDto {
    @IsNotEmpty()
    @IsString()
    bucket: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => FileDto)
    files: InstanceType<typeof FileDto>[];
  }
  return DocumentDto;
}

class FileInfoDto {
  @IsNotEmpty()
  @IsString()
  fileId: string;
}

class DocumentDto extends documentDtoFactory(FileInfoDto) {}

export class DocumentsPayloadDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents: DocumentDto[];
}

class FileInfoUploadDto {
  @IsNotEmpty()
  @IsString()
  fileName: string;
}

class UploadDocument extends documentDtoFactory(FileInfoUploadDto) {}

export class UploadDocumentPayloadDto {
  @Transform(
    ({ value }) => {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return plainToInstance(UploadDocument, parsed);
    },
    { toClassOnly: true },
  )
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UploadDocument)
  payload: UploadDocument[];
}

export class GenerateDocumentJobPayloadDto {
  @IsUUID()
  documentId: string;

  @IsNotEmpty()
  @IsString()
  templateIdentifier: string;

  @IsObject()
  data: Record<string, unknown>;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  entityType?: string;
}

@ApiSchema({ name: 'Generate Document Request' })
export class GenerateDocumentRequestDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'UUID o nombre de la plantilla DOCS a usar',
    example: 'hcu_001_admision',
  })
  templateIdentifier: string;

  @IsObject()
  @ApiProperty({
    description: 'Datos para sustituir en la plantilla',
    example: { patientName: 'Ada Lovelace', date: '2026-05-04' },
  })
  data: Record<string, unknown>;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Título del documento generado' })
  title: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false, description: 'Descripción opcional' })
  description?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'ID of the entity this document belongs to', required: false })
  entityId?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Type of the entity this document belongs to', required: false })
  entityType?: string;
}

@ApiSchema({ name: 'List Documents Query' })
export class ListDocumentsQueryDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  entityId?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  entityType?: string;

  @IsOptional()
  @IsEnum(DocumentTypeEnum)
  @ApiProperty({ required: false, enum: DocumentTypeEnum })
  type?: DocumentTypeEnum;

  @IsOptional()
  @IsEnum(DocumentStatusEnum)
  @ApiProperty({ required: false, enum: DocumentStatusEnum })
  status?: DocumentStatusEnum;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @ApiProperty({ required: false, default: 1 })
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @ApiProperty({ required: false, default: 20 })
  limit?: number = 20;
}
