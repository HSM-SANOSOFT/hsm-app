import { RolesEnum } from '@hsm/common/enums';
import type { RolesType } from '@hsm/common/types';
import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const ROLE_VALUES = Object.values(RolesEnum).flatMap(
  Object.values,
) as readonly string[];

@ApiSchema({ name: 'Update Own Profile Payload' })
export class UpdateOwnProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    required: false,
    description: 'Nuevo nombre de usuario para el perfil propio',
  })
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    required: false,
    description: 'Nuevo correo electrónico para el perfil propio',
  })
  email?: string;
}

@ApiSchema({ name: 'Change Password Payload' })
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    required: true,
    description: 'Contraseña actual del usuario, verificada antes del cambio',
  })
  currentPassword!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    required: true,
    description: 'Nueva contraseña que reemplazará a la actual',
  })
  newPassword!: string;
}

@ApiSchema({ name: 'Change User Role Payload' })
export class ChangeUserRoleDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(ROLE_VALUES)
  @ApiProperty({
    required: true,
    enum: ROLE_VALUES,
    description: 'Nuevo rol a asignar al usuario destino',
  })
  role!: RolesType;
}

@ApiSchema({ name: 'List Users Query' })
export class ListUsersQueryDto {
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
