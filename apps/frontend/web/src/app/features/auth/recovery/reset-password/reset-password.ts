import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';

import { ApiError } from '../../../../core/api/api-error';
import { passwordsMatch } from '../../../../core/validators/password.validators';
import { RecoveryService } from '../recovery.service';

/** Reads `token=<value>` out of a URL fragment string. */
function tokenFromFragment(fragment: string | null): string | null {
  if (!fragment) return null;
  const params = new URLSearchParams(fragment);
  const token = params.get('token');
  return token && token.length > 0 ? token : null;
}

/**
 * "Set a new password" screen — the second step of the recovery flow, reached
 * from the reset-email link (`${APP_BASE_URL}/reset-password#token=<plaintext>`).
 *
 * The token arrives in the URL **fragment** (`#token=...`), not a query param,
 * so it is read from `ActivatedRoute.snapshot.fragment` and parsed with
 * `URLSearchParams`. The screen renders four distinct states:
 *
 * - **missing** — no fragment / no `token=`: an error before any form, with a
 *   link back to request a fresh link (the password form is never shown).
 * - **form** — a valid token is present: the new-password form (min 8 chars +
 *   matching confirm, validated client-side before any request).
 * - **success** — the reset succeeded: a confirmation + link to sign in.
 * - **invalid** — the POST threw an `ApiError` (HTTP 400): the link was
 *   invalid, expired, or already used. The message stays generic (the backend
 *   does not distinguish the reason) and offers a fresh request.
 */
@Component({
  selector: 'app-reset-password',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PasswordModule,
    ButtonModule,
    MessageModule,
  ],
  templateUrl: './reset-password.html',
  styleUrl: '../../auth.css',
})
export class ResetPassword {
  private readonly fb = inject(FormBuilder);
  private readonly recovery = inject(RecoveryService);
  private readonly route = inject(ActivatedRoute);

  /** The plaintext token parsed from the URL fragment, or null if absent. */
  protected readonly token = tokenFromFragment(this.route.snapshot.fragment);

  protected readonly form = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected readonly submitting = signal(false);
  protected readonly succeeded = signal(false);
  /** Set when the POST rejects the token (invalid / expired / already used). */
  protected readonly invalidToken = signal(false);

  protected submit(): void {
    if (!this.token || this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.invalidToken.set(false);

    const { newPassword } = this.form.getRawValue();

    this.recovery.resetPassword(this.token, newPassword).subscribe({
      next: () => {
        this.submitting.set(false);
        this.succeeded.set(true);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        // A 400 means the link is invalid/expired/used — the backend keeps the
        // reason generic, so we show one undifferentiated error and point the
        // user at requesting a fresh link.
        if (err instanceof ApiError && err.status === 400) {
          this.invalidToken.set(true);
          return;
        }
        // Any other failure also collapses to the same recoverable error.
        this.invalidToken.set(true);
      },
    });
  }
}
