import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

import { ApiError } from '../../../../core/api/api-error';
import { RecoveryService } from '../recovery.service';

/**
 * "Recover username" screen — for users who remember their email but not the
 * username the backend authenticates on.
 *
 * Posts the email to `POST /v1/auth/username/recover` via
 * {@link RecoveryService} and then shows the same deliberately **non-committal**
 * confirmation as the password-reset request: the backend always returns a
 * generic 200, so the screen never reveals whether an account exists. A 429 is
 * surfaced as a gentle "try again later".
 */
@Component({
  selector: 'app-recover-username',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    InputTextModule,
    ButtonModule,
    MessageModule,
  ],
  templateUrl: './recover-username.html',
  styleUrl: '../../auth.css',
})
export class RecoverUsername {
  private readonly fb = inject(FormBuilder);
  private readonly recovery = inject(RecoveryService);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);
  protected readonly rateLimited = signal(false);

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.rateLimited.set(false);

    const { email } = this.form.getRawValue();

    this.recovery.recoverUsername(email).subscribe({
      next: () => {
        this.submitting.set(false);
        this.sent.set(true);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        if (err instanceof ApiError && err.status === 429) {
          this.rateLimited.set(true);
          return;
        }
        // Everything else collapses to the generic confirmation — no leak.
        this.sent.set(true);
      },
    });
  }
}
