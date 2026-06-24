import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RolesEnum } from '@hsm/common/enums';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';

import { toErrorMessage } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';

/**
 * Self-registration screen. Posts to `POST /v1/auth/signup` via
 * {@link AuthService.register}, which returns a token pair and logs the new
 * user straight in. On success it navigates to the app root.
 *
 * This is an internal staff console, so self-registrants are always created
 * with the non-privileged {@link RolesEnum.System.Auditor} role — the backend
 * additionally rejects any attempt to self-assign `admin`/`developer`. New
 * admins are still minted from Admin → Users, never here.
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

    this.auth
      .register({
        ...this.form.getRawValue(),
        roles: [RolesEnum.System.Auditor],
      })
      .subscribe({
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
