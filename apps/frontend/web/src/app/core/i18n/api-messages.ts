import { ApiErrorCode } from '@hsm/common/enums';
import type { TranslocoService } from '@jsverse/transloco';

/**
 * Maps a stable backend {@link ApiErrorCode} (carried on `issue.code`) to
 * localized, user-facing copy. The codes are locale-free and stable; the copy
 * here is what the user actually reads. Unknown codes fall back to a generic
 * message so a new server code never surfaces a raw identifier to the user.
 *
 * Takes the {@link TranslocoService} as a param (rather than injecting it
 * itself) so this stays a plain, easily-testable function — the caller (an
 * injectable/component) is the one with an injection context.
 */
export function apiMessage(transloco: TranslocoService, code: string): string {
  switch (code) {
    case ApiErrorCode.InvalidCredentials:
      return transloco.translate('api.error.invalidCredentials');
    case ApiErrorCode.Unauthorized:
      return transloco.translate('api.error.unauthorized');
    case ApiErrorCode.Forbidden:
      return transloco.translate('api.error.forbidden');
    case ApiErrorCode.NotFound:
      return transloco.translate('api.error.notFound');
    case ApiErrorCode.Conflict:
      return transloco.translate('api.error.conflict');
    case ApiErrorCode.TooManyRequests:
      return transloco.translate('api.error.tooManyRequests');
    case ApiErrorCode.Validation:
      return transloco.translate('api.error.validation');
    default:
      return transloco.translate('api.error.unexpected');
  }
}

/**
 * Maps a class-validator constraint key (carried on `issue.errors[].constraints`)
 * to localized copy. Unknown keys fall back to a generic invalid-value message.
 */
export function validationMessage(
  transloco: TranslocoService,
  constraintKey: string,
): string {
  switch (constraintKey) {
    case 'isNotEmpty':
      return transloco.translate('api.validation.required');
    case 'isEmail':
      return transloco.translate('api.validation.email');
    case 'minLength':
      return transloco.translate('api.validation.minLength');
    case 'maxLength':
      return transloco.translate('api.validation.maxLength');
    default:
      return transloco.translate('api.validation.invalid');
  }
}
