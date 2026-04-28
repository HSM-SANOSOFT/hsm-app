import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { FilterEnum, SortEnum } from '../enums';

@ApiSchema({ name: 'Metadata.Extra.Filter' })
export class FilterDto {
  @ApiProperty({
    description: 'Field name on which the filter is applied',
    example: 'role',
  })
  @IsString()
  @IsNotEmpty()
  field!: string;

  @ApiProperty({
    description: 'Conditional operator for the filter',
    enum: FilterEnum,
    example: FilterEnum.EQUAL,
  })
  @IsString()
  @IsEnum(FilterEnum)
  conditional!: string;

  @ApiProperty({
    description: 'Value used in the filter condition',
    example: 'doctor',
  })
  @IsString()
  @IsNotEmpty()
  value!: string;
}

@ApiSchema({ name: 'Metadata.Extra.Sort' })
export class SortDto {
  @ApiProperty({
    description: 'Field by which the data is sorted',
    example: 'createdAt',
  })
  @IsString()
  @IsNotEmpty()
  field!: string;

  @ApiProperty({
    description: 'Sorting order',
    enum: SortEnum,
    example: 'desc',
  })
  @IsEnum(SortEnum)
  order!: SortEnum;
}
