import { RolesEnum } from '@hsm/common/enums';
import type { RolesType } from '@hsm/common/types';
import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
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

/**
 * Admin-only payload to provision a STAFF account. The new account is flagged
 * pending onboarding and must complete first-login onboarding before reaching
 * any feature. The temporary password is emailed to the staff member — it is
 * never returned in the API response. `role` must be a staff role; the service
 * rejects patient-facing roles (patient/family) on this path.
 */
@ApiSchema({ name: 'Create Staff Payload' })
export class CreateStaffPayloadDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    required: true,
    description: 'Login username for the staff member',
  })
  username!: string;

  @IsEmail()
  @ApiProperty({
    required: true,
    description: 'Email the temporary password is sent to',
  })
  email!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ required: true, description: 'First name' })
  firstName!: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false, description: 'Second / middle name' })
  secondName?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ required: true, description: 'First last name' })
  firstLastName!: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false, description: 'Second last name' })
  secondLastName?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false, description: 'Phone number' })
  phoneNumber?: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(ROLE_VALUES)
  @ApiProperty({
    required: true,
    enum: ROLE_VALUES,
    description:
      'Staff role to assign (patient/family are rejected server-side)',
  })
  role!: RolesType;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @ApiProperty({
    required: true,
    description:
      'Temporary password (min 8 chars), emailed to the staff member; the ' +
      'user replaces it during first-login onboarding.',
  })
  tempPassword!: string;
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
