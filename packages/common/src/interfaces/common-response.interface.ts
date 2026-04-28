import { SuccessResponseDto, UnsuccessResponseDto } from '@hsm/common/dtos';

type MetadataOf<T> = NonNullable<SuccessResponseDto<T>['metadata']>;

export type ISuccessResponse<T> = Pick<SuccessResponseDto<T>, 'data'> & {
  metadata?: Pick<MetadataOf<T>, 'extra'>;
};

type Issue = Pick<UnsuccessResponseDto, 'issue'>;
export type IUnsuccessResponse = Issue;
