import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';
import type {
  ForgotPasswordPayload,
  MessageResponse,
  RecoverUsernamePayload,
  ResetPasswordPayload,
} from '../../../core/api/response';

/**
 * Thin client for the public account-recovery endpoints shipped in U5. All
 * three are `@Public()` and return a `{ message }` payload (unwrapped from the
 * success envelope by {@link ApiClient}); the forgot/recover responses are
 * always generic, so callers must show their own non-committal confirmation
 * rather than leaking whether an account exists.
 */
@Injectable({ providedIn: 'root' })
export class RecoveryService {
  private readonly api = inject(ApiClient);

  /** `POST /v1/auth/password/forgot` — request a reset link by email. */
  forgotPassword(email: string): Observable<MessageResponse> {
    const payload: ForgotPasswordPayload = { email };
    return this.api.post<MessageResponse>('/auth/password/forgot', payload);
  }

  /** `POST /v1/auth/password/reset` — set a new password using the link token. */
  resetPassword(
    token: string,
    newPassword: string,
  ): Observable<MessageResponse> {
    const payload: ResetPasswordPayload = { token, newPassword };
    return this.api.post<MessageResponse>('/auth/password/reset', payload);
  }

  /** `POST /v1/auth/username/recover` — recover the username by email. */
  recoverUsername(email: string): Observable<MessageResponse> {
    const payload: RecoverUsernamePayload = { email };
    return this.api.post<MessageResponse>('/auth/username/recover', payload);
  }
}
