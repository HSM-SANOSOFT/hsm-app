import type { Metadata } from './metadata';
import type { Pagination } from './pagination';

export interface SuccessResponse<T> {
  meta: Metadata;
  pagination?: Pagination;
  data: T;
}
