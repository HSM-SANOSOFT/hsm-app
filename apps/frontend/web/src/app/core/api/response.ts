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

/** Mirror of `@hsm/common` `IssueErrorDto` — a per-field validation failure. */
export interface IssueError {
  field: string;
  constraints: string[];
}

/** Mirror of `@hsm/common` `IssueDto`. */
export interface Issue {
  message?: string | string[];
  error?: string;
  code?: string;
  detail?: string;
  field?: string | string[];
  errors?: IssueError[];
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

/**
 * Mirror of `@hsm/common` `LoginPayloadDto`.
 *
 * The backend authenticates on USERNAME + password (not email).
 */
export interface LoginPayload {
  username: string;
  password: string;
}

/**
 * Mirror of the public-signup fields of `@hsm/common` `SignupPayloadDto`.
 * Public self-registration via `POST /v1/auth/signup` always creates a Patient
 * account: the backend forces the Patient role server-side and ignores any
 * client-supplied role. The client therefore sends no `roles` — the field is
 * optional only for backward-compatibility and should be left unset.
 */
export interface SignupPayload {
  username: string;
  email: string;
  password: string;
  firstName: string;
  firstLastName: string;
  roles?: string[];
}

/**
 * Mirror of `@hsm/common` `ForgotPasswordPayloadDto`.
 * Body for `POST /v1/auth/password/forgot` — request a reset link by email.
 */
export interface ForgotPasswordPayload {
  email: string;
}

/**
 * Mirror of `@hsm/common` `ResetPasswordPayloadDto`.
 * Body for `POST /v1/auth/password/reset` — the plaintext token (delivered in
 * the reset-email link fragment) plus the chosen new password.
 */
export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

/**
 * Mirror of `@hsm/common` `RecoverUsernamePayloadDto`.
 * Body for `POST /v1/auth/username/recover` — recover the username by email.
 */
export interface RecoverUsernamePayload {
  email: string;
}

/**
 * Mirror of the `{ message }` payload returned by the account-recovery
 * endpoints (`@hsm/common` `MessageResponseDto`). The message is intentionally
 * generic for the forgot/recover flows so it never reveals whether an account
 * exists; the client shows its own non-committal copy rather than echoing it.
 */
export interface MessageResponse {
  message: string;
}

/**
 * Mirror of `@hsm/common` `SignedUserProfileDto` (only the fields the console
 * reads). `roles` comes back as a string array of role *values* (e.g.
 * `['admin']`) matching `RolesEnum.*` values from `@hsm/common/enums`.
 *
 * `onboardingCompletedAt` is the DB-authoritative pending-onboarding marker:
 * an ISO timestamp once first-login onboarding is done, or `null` for an
 * admin-created staff account that still has to onboard. Patients and the
 * seeded admin are created complete, so theirs is non-null. Keep this field in
 * lockstep with the backend `SignedUserProfileDto`.
 */
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  firstName: string;
  firstLastName: string;
  roles: string[];
  onboardingCompletedAt: string | null;
  iat: number;
  exp: number;
}

/**
 * Mirror of `@hsm/common` `OnboardingPayloadDto`.
 * Body for `POST /v1/auth/onboarding` — a pending staff member's first-login
 * completion: a new password plus required contact info. `confirmEmail` must
 * equal the account's email (the backend 400s on mismatch); `newPassword` is
 * min-8. The endpoint returns a reissued token pair (`Tokens`).
 */
export interface OnboardingPayload {
  newPassword: string;
  phoneNumber: string;
  confirmEmail: string;
}
