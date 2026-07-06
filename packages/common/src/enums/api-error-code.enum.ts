/**
 * Stable, machine-readable error codes carried on the error envelope
 * (`issue.code`). The frontend maps these to localized copy — the codes
 * themselves are locale-independent and MUST stay stable, so never rename a
 * value without updating the frontend `apiMessage` map in lockstep.
 */
export enum ApiErrorCode {
  // generic (status-mapped fallbacks)
  Unauthorized = 'COMMON.UNAUTHORIZED',
  Forbidden = 'COMMON.FORBIDDEN',
  NotFound = 'COMMON.NOT_FOUND',
  Validation = 'COMMON.VALIDATION',
  Internal = 'COMMON.INTERNAL',
  // auth domain
  InvalidCredentials = 'AUTH.INVALID_CREDENTIALS',
}
