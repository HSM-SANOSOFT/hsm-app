import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsString,
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
