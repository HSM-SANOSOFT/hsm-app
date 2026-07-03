import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';

import { toErrorMessage } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { LanguageSwitcher } from '../../../layout/language-switcher/language-switcher';

/**
 * Patient self-registration screen. Posts to `POST /v1/auth/signup` via
 * {@link AuthService.register}, which returns a token pair and logs the new
 * user straight in. On success it navigates to the app root.
 *
 * Public signup always creates a Patient account: the backend forces the
 * Patient role server-side and ignores any client-supplied role, so the client
 * sends the form values only and never a `roles` field. Staff accounts are
 * provisioned by an admin, never here.
 */
@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessageModule,
    LanguageSwitcher,
  ],
  templateUrl: './register.html',
  styleUrl: '../auth.css',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required]],
    firstLastName: ['', [Validators.required]],
    username: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
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

    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigateByUrl('/');
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(
          toErrorMessage(err, 'Could not create your account. Try again.'),
        );
      },
    });
  }
}
