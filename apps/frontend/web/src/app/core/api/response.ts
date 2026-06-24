/**
 * Frontend-local mirrors of the backend response-envelope wire shapes.
 *
 * The canonical definitions live in `@hsm/common`
 * (`packages/common/src/dtos/common-response.dto.ts`:
 * `SuccessResponseDto`, `UnsuccessResponseDto`, `MetadataDto`,
 * `MetadataExtraDto`, `PaginationDto`, `IssueDto`) and
 * `packages/common/src/interfaces/security-auth.interface.ts` (`ITokens`).
 *
 * We deliberately re-declare them here as plain interfaces rather than
 * importing the `@hsm/common` classes. Those classes are NestJS server
 * artifacts: they carry `@nestjs/swagger` / `class-validator` decorators and
 * (for `ITokens`'s host file) value-imports of `@hsm/database` entities and
 * Node `Buffer`. Pulling them through the Angular browser build fails to
 * type-check (unresolvable `tslib` decorator helpers, `@hsm/database`, Node
 * globals). These interfaces mirror the over-the-wire JSON exactly — the field
 * names are 1:1 with the source DTOs — so the typed client stays faithful to
 * the contract without dragging server-only code into the bundle.
 *
 * Keep these in lockstep with the `@hsm/common` source if the envelope changes.
 */

/** Mirror of `@hsm/common` `PaginationDto`. */
export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/** Mirror of `@hsm/common` `MetadataExtraDto` (only the fields we read). */
export interface MetadataExtra {
  pagination?: Pagination;
}

/** Mirror of `@hsm/common` `MetadataDto`. */
export interface ResponseMetadata {
  success: boolean;
  statusCode: number;
  timestamp: string;
  path: string;
  message: string;
  apiVersion?: string;
  extra?: MetadataExtra;
}

/** Mirror of `@hsm/common` `SuccessResponseDto<T>`. */
export interface SuccessResponse<T> {
  metadata: ResponseMetadata;
  data: T;
}

/** Mirror of `@hsm/common` `IssueDto`. */
export interface Issue {
  message?: string | string[];
  error?: string;
  code?: string;
  detail?: string;
  field?: string | string[];
}

/** Mirror of `@hsm/common` `UnsuccessResponseDto`. */
export interface UnsuccessResponse {
  metadata: ResponseMetadata;
  issue: Issue;
}

/** Mirror of `@hsm/common` `ITokens`. */
export interface Tokens {
  access_token: string;
  refresh_token: string;
}
