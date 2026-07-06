import { ApiErrorCode } from '@hsm/common/enums';

/**
 * Maps a stable backend {@link ApiErrorCode} (carried on `issue.code`) to
 * localized, user-facing copy. The codes are locale-free and stable; the copy
 * here is what the user actually reads. Unknown codes fall back to a generic
 * message so a new server code never surfaces a raw identifier to the user.
 */
export function apiMessage(code: string): string {
  switch (code) {
    case ApiErrorCode.InvalidCredentials:
      return $localize`:@@api.error.invalidCredentials:Usuario o contraseña incorrectos`;
    case ApiErrorCode.Unauthorized:
      return $localize`:@@api.error.unauthorized:Sesión no autorizada`;
    case ApiErrorCode.Forbidden:
      return $localize`:@@api.error.forbidden:No tiene permiso para esta acción`;
    case ApiErrorCode.NotFound:
      return $localize`:@@api.error.notFound:Recurso no encontrado`;
    case ApiErrorCode.Conflict:
      return $localize`:@@api.error.conflict:El registro ya existe o está en conflicto`;
    case ApiErrorCode.TooManyRequests:
      return $localize`:@@api.error.tooManyRequests:Demasiados intentos. Espere un momento e intente de nuevo`;
    case ApiErrorCode.Validation:
      return $localize`:@@api.error.validation:Revise los datos ingresados`;
    default:
      return $localize`:@@api.error.unexpected:Ocurrió un error inesperado`;
  }
}

/**
 * Maps a class-validator constraint key (carried on `issue.errors[].constraints`)
 * to localized copy. Unknown keys fall back to a generic invalid-value message.
 */
export function validationMessage(constraintKey: string): string {
  switch (constraintKey) {
    case 'isNotEmpty':
      return $localize`:@@api.validation.required:Campo obligatorio`;
    case 'isEmail':
      return $localize`:@@api.validation.email:Correo inválido`;
    case 'minLength':
      return $localize`:@@api.validation.minLength:Demasiado corto`;
    case 'maxLength':
      return $localize`:@@api.validation.maxLength:Demasiado largo`;
    default:
      return $localize`:@@api.validation.invalid:Valor inválido`;
  }
}
