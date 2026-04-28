import {
  ApiProperty,
  ApiPropertyOptional,
  ApiSchema,
  OmitType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { FilterDto, SortDto } from './common-request.dto';

@ApiSchema({ name: 'Metadata.Extra.Pagination' })
export class PaginationDto {
  @ApiProperty({ description: 'Page number', example: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  @Type(() => Number)
  page!: number;

  @ApiProperty({ description: 'Page size', example: 10 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  @Type(() => Number)
  pageSize!: number;

  @ApiProperty({ description: 'Total items', example: 100 })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  @Type(() => Number)
  totalItems!: number;

  @ApiProperty({ description: 'Total pages', example: 10 })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  @Type(() => Number)
  totalPages!: number;
}

@ApiSchema({ name: 'Unsuccess Response.Issue' })
export class IssueDto {
  @ApiProperty({
    description: 'Short, human-readable description of the error(s)',
    examples: [
      'Invalid credentials provided.',
      ['email must be an email', 'password must be at least 8 characters'],
    ],
    oneOf: [
      { type: 'string', example: 'Invalid credentials provided.' },
      {
        type: 'array',
        items: { type: 'string' },
        example: ['email must be an email', 'password too short'],
      },
    ],
  })

  @IsOptional()
  @ValidateIf(o => typeof o.message === 'string')
  @IsString()
  @ValidateIf(o => Array.isArray(o.message))
  @IsArray()
  message?: string | string[];

  @ApiPropertyOptional({
    description: 'Human-readable error message',
    example: 'Invalid credentials provided.',
  })
  @IsString()
  error?: string;

  @ApiPropertyOptional({
    description: 'Optional machine-readable error code or identifier',
    example: 'AUTH_INVALID_CREDENTIALS',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    description:
      'Detailed technical message, stack trace, or cause (for debugging)',
    example: 'Password hash comparison failed.',
  })
  @IsOptional()
  @IsString()
  detail?: string;

  @ApiPropertyOptional({
    description: 'Field or parameter that caused the error (if applicable)',
    example: 'email',
  })
  @IsOptional()
  @ValidateIf(o => typeof o.message === 'string')
  @IsString()
  @ValidateIf(o => Array.isArray(o.message))
  @IsArray()
  field?: string | string[];
}

@ApiSchema({ name: 'Metadata.Extra' })
export class MetadataExtraDto {
  @ApiPropertyOptional({
    description: 'Pagination information',
    type: () => PaginationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaginationDto)
  pagination?: PaginationDto;

  @ApiPropertyOptional({
    description: 'Sorting information for the response data',
    type: () => SortDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SortDto)
  sort?: SortDto;

  @ApiPropertyOptional({
    description: 'Filters applied to the data query',
    type: () => FilterDto,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterDto)
  filters?: FilterDto[];
}

@ApiSchema({ name: 'Metadata' })
export class MetadataDto {
  @ApiProperty({
    description: 'Whether the request was successful',
    examples: {
      success: true,
      unauthorized: false,
      forbidden: false,
      notFound: false,
      internalError: false,
    },
  })
  @IsBoolean()
  success!: boolean;

  @ApiProperty({
    description: 'HTTP status code',
    examples: {
      success: 200,
      unauthorized: 401,
      forbidden: 403,
      notFound: 404,
      internalError: 500,
    },
    minimum: 100,
    maximum: 599,
  })
  @IsInt()
  @Min(100)
  @Max(599)
  statusCode!: number;

  @ApiProperty({
    description: 'UTC timestamp (ISO 8601)',
    example: '2025-11-10T16:32:00.000Z',
  })
  @IsISO8601()
  timestamp!: string;

  @ApiProperty({
    description: 'Original request path',
    example: '/v1/example/resource',
  })
  @IsString()
  path!: string;

  @ApiProperty({
    description: 'Human-readable short message',
    examples: {
      success: 'Request processed successfully.',
      unauthorized: 'You are not authorized to perform this action.',
      forbidden: 'Access denied. You do not have sufficient permissions.',
      notFound: 'The requested resource was not found.',
      internalError: 'An unexpected server error occurred.',
    },
  })
  @IsString()
  message!: string;

  @ApiPropertyOptional({
    description: 'API version of the response contract',
    example: 'v1',
  })
  @IsOptional()
  @IsString()
  apiVersion?: string;

  @ApiPropertyOptional({
    description:
      'Extra metadata for the response like pagination, sorting, etc.',
    type: () => MetadataExtraDto,
  })
  extra?: MetadataExtraDto;
}

@ApiSchema({ name: 'Metadata without extra information' })
export class MetadataWithoutExtra extends OmitType(MetadataDto, [
  'extra',
] as const) {}

@ApiSchema({ name: 'Success Response' })
export class SuccessResponseDto<T> {
  @ApiProperty({
    description:
      'Metadata of the response (pagination, sorting, filters, etc.)',
    type: () => MetadataDto,
  })
  @ValidateNested()
  @Type(() => MetadataDto)
  metadata: MetadataDto;

  @ApiProperty({
    description: 'Payload of the response',
  })
  data!: T;
}

@ApiSchema({ name: 'Unsuccess Response' })
export class UnsuccessResponseDto {
  @ApiPropertyOptional({
    description: 'Metadata of the unsuccess response',
    type: () => MetadataDto,
  })
  @ValidateNested()
  @Type(() => MetadataDto)
  metadata: MetadataDto;

  @ApiProperty({
    description: 'Error details describing why the request failed',
    type: () => IssueDto,
  })
  @ValidateNested()
  @Type(() => IssueDto)
  issue!: IssueDto;
}
