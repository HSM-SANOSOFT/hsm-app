import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { PinPurposeEnum, RolesEnum } from '../enums';
import { ITokens } from '../interfaces';
import { RolesType } from '../types';
import {
  CreateUserIntegrationPayloadDto,
  CreateUserPayloadDto,
} from './user.dto';

@ApiSchema({ name: 'Login Payload' })
export class LoginPayloadDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ required: true })
  username: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ required: true })
  password: string;
}

@ApiSchema({ name: 'Logout Integration Token Payload' })
export class LogoutIntegrationTokenPayloadDto {
  @ApiProperty({ required: true, description: 'Either Token is required' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

@ApiSchema({ name: 'Logout Payload' })
export class LogoutPayloadDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ required: true })
  id: string;
}

@ApiSchema({ name: 'PIN Generation Payload' })
export class PinGenerationPayloadDto {
  @IsNotEmpty()
  @IsEnum(PinPurposeEnum)
  @ApiProperty({
    description: 'Tipo de PIN a generar',
    required: true,
    enum: PinPurposeEnum,
    examples: [
      PinPurposeEnum.EMAIL_VERIFICATION,
      PinPurposeEnum.PASSWORD_RESET,
    ],
  })
  purpose: PinPurposeEnum;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Identificador único (email, userId, phone, etc)',
    required: true,
    examples: ['example@example.com', '0996000937'],
  })
  target: string;
}

@ApiSchema({ name: 'PIN Validation Payload' })
export class PinValidationPayloadDto extends PinGenerationPayloadDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'Código PIN a validar', required: true })
  code: number;
}

@ApiSchema({ name: 'Signed User Profile' })
export class SignedUserProfileDto {
  @ApiProperty({ description: 'Unique user identifier' })
  id!: string;

  @ApiProperty({ description: 'Username', example: 'raul123' })
  username!: string;

  @ApiProperty({ description: 'Email address', example: 'raul@example.com' })
  email!: string;

  @ApiProperty({ description: 'First name', example: 'Raul' })
  firstName!: string;

  @ApiProperty({ description: 'First last name', example: 'Santamaria' })
  firstLastName!: string;

  @ApiProperty({
    description: 'Assigned roles',
    isArray: true,
    enum: RolesEnum,
    example: [RolesEnum.System.Admin],
  })
  roles!: RolesType[];

  @ApiProperty({
    description:
      'ISO timestamp of onboarding completion, or null while the account is ' +
      'pending first-login onboarding (admin-created staff).',
    nullable: true,
    example: '2026-06-24T10:00:00.000Z',
  })
  onboardingCompletedAt!: string | null;

  @ApiProperty({
    description: 'Issued-at timestamp (JWT)',
    example: 1731500000,
  })
  iat!: number;

  @ApiProperty({
    description: 'Expiration timestamp (JWT)',
    example: 1731503600,
  })
  exp!: number;
}

@ApiSchema({ name: 'Signed Integration User Profile' })
export class SignedIntegrationProfileDto {
  @ApiProperty({ description: 'Unique integration identifier' })
  id!: string;

  @ApiProperty({
    description: 'Integration name',
    example: 'SCHEDULING_SERVICE',
  })
  name!: string;

  @ApiProperty({
    description: 'Assigned roles',
    isArray: true,
    enum: RolesEnum,
    example: [RolesEnum.System.Integration],
  })
  roles!: RolesType[];

  @ApiProperty({
    description: 'Issued-at timestamp (JWT)',
    example: 1731500000,
  })
  iat!: number;

  @ApiProperty({
    description: 'Expiration timestamp (JWT)',
    example: 1731503600,
  })
  exp!: number;
}
@ApiSchema({ name: 'Sign up Integration User Payload' })
export class SignupIntegrationTokenPayloadDto extends CreateUserIntegrationPayloadDto {}

@ApiSchema({ name: 'Sign Up User Payload' })
export class SignupPayloadDto extends CreateUserPayloadDto {}
@ApiSchema({ name: 'Access and Refresh Token' })
export class TokensDto implements ITokens {
  @ApiProperty({ description: 'Authorization token', type: 'string' })
  access_token: string;

  @ApiProperty({ description: 'Authorization token', type: 'string' })
  refresh_token: string;
}
