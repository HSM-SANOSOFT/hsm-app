import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';

import { toErrorMessage } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';

/**
 * Login screen. Posts USERNAME + password to `POST /v1/auth/login` via
 * {@link AuthService}, surfaces an {@link ApiError} inline on failure, and on
 * success navigates to the `returnUrl` query param (or `/`).
 *
 * Backend authenticates on USERNAME (not email) — the field is labelled and
 * named accordingly.
 */
@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessageModule,
  ],
  templateUrl: './login.html',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        const returnUrl =
          this.router.parseUrl(this.router.url).queryParams['returnUrl'] ?? '/';
        void this.router.navigateByUrl(returnUrl);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(
          toErrorMessage(err, 'Login failed. Please try again.'),
        );
      },
    });
  }
}
