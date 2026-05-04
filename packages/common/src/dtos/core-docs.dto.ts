import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

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
}
