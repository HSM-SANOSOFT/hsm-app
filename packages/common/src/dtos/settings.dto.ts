import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { SettingsCategoryEnum } from '../enums/settings.enum';

@ApiSchema({ name: 'Get Settings Query' })
export class GetSettingsQueryDto {
  @IsNotEmpty()
  @IsEnum(SettingsCategoryEnum)
  @ApiProperty({
    description:
      'Categoría de configuración a consultar: EMAIL, WEBHOOK, STORAGE o APP_BEHAVIOR',
    enum: SettingsCategoryEnum,
    example: SettingsCategoryEnum.EMAIL,
  })
  category: SettingsCategoryEnum;
}

@ApiSchema({ name: 'Setting Item' })
export class SettingItemDto {
  @ApiProperty({
    description: 'Clave única de la configuración',
    example: 'SMTP_ADDRESS',
  })
  key: string;

  @ApiProperty({
    description: 'Categoría a la que pertenece la configuración',
    enum: SettingsCategoryEnum,
    example: SettingsCategoryEnum.EMAIL,
  })
  category: SettingsCategoryEnum;

  @ApiProperty({
    description:
      'Valor de la configuración. Para valores secretos se devuelve un marcador enmascarado, nunca el valor real.',
    nullable: true,
    example: 'smtp.hsm.org',
  })
  value: string | null;

  @ApiProperty({
    description: 'Indica si el valor es secreto (enmascarado en lectura)',
    example: false,
  })
  isSecret: boolean;

  @ApiProperty({
    description:
      'Solo para secretos: indica si existe un valor almacenado o sembrado por entorno',
    example: true,
  })
  isSet: boolean;
}

@ApiSchema({ name: 'Get Settings Response' })
export class GetSettingsResponseDto {
  @ApiProperty({
    description: 'Categoría consultada',
    enum: SettingsCategoryEnum,
    example: SettingsCategoryEnum.EMAIL,
  })
  category: SettingsCategoryEnum;

  @ApiProperty({
    description: 'Configuraciones de la categoría',
    type: [SettingItemDto],
  })
  settings: SettingItemDto[];
}

@ApiSchema({ name: 'Update Setting Item' })
export class UpdateSettingItemDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Clave de la configuración a actualizar',
    example: 'SMTP_ADDRESS',
  })
  key: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description:
      'Nuevo valor. Para secretos, un valor vacío deja el valor almacenado sin cambios.',
    required: false,
    nullable: true,
    example: 'smtp.hsm.org',
  })
  value?: string | null;
}

@ApiSchema({ name: 'Update Settings Payload' })
export class UpdateSettingsPayloadDto {
  @IsEnum(SettingsCategoryEnum)
  @ApiProperty({
    description: 'Categoría de las configuraciones a actualizar',
    enum: SettingsCategoryEnum,
    example: SettingsCategoryEnum.EMAIL,
  })
  category: SettingsCategoryEnum;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => UpdateSettingItemDto)
  @ApiProperty({
    description: 'Lista de configuraciones a actualizar',
    type: [UpdateSettingItemDto],
  })
  settings: UpdateSettingItemDto[];
}
