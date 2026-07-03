import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

import { ApiError } from '../../../../core/api/api-error';
import { LanguageSwitcher } from '../../../../layout/language-switcher/language-switcher';
import { RecoveryService } from '../recovery.service';

/**
 * "Forgot password" screen — the first step of the "Trouble signing in?" flow.
 *
 * Posts the email to `POST /v1/auth/password/forgot` via {@link RecoveryService}
 * and then shows a deliberately **non-committal** confirmation regardless of
 * the result: the backend always returns a generic 200 (even for unknown
 * accounts), so revealing success/failure here would leak account existence.
 * The only differentiated outcome is a 429 (rate limit), surfaced as a gentle
 * "try again later" — still without confirming any account.
 */
@Component({
  selector: 'app-request-reset',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    InputTextModule,
    ButtonModule,
    MessageModule,
    LanguageSwitcher,
  ],
  templateUrl: './request-reset.html',
  styleUrl: '../../auth.css',
})
export class RequestReset {
  private readonly fb = inject(FormBuilder);
  private readonly recovery = inject(RecoveryService);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly submitting = signal(false);
  /** Once true, the form is swapped for the non-committal confirmation. */
  protected readonly sent = signal(false);
  /** Gentle, non-revealing notice shown when the request is rate-limited. */
  protected readonly rateLimited = signal(false);

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.rateLimited.set(false);

    const { email } = this.form.getRawValue();

    this.recovery.forgotPassword(email).subscribe({
      next: () => {
        this.submitting.set(false);
        this.sent.set(true);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        // A 429 is the one case worth flagging — still without confirming the
        // account. Every other error collapses into the same generic
        // confirmation so the screen never reveals whether the email exists.
        if (err instanceof ApiError && err.status === 429) {
          this.rateLimited.set(true);
          return;
        }
        this.sent.set(true);
      },
    });
  }
}
