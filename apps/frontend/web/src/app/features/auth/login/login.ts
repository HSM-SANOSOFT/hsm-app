import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';

import { toErrorMessage } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { VersionService } from '../../../core/version/version.service';

/** Key under which the last-used username is remembered (no password). */
const LAST_USERNAME_KEY = 'hsm.lastUsername';

/**
 * Hospital sign-in screen — the single front door for patients and staff.
 * Posts USERNAME + password to `POST /v1/auth/login` via {@link AuthService},
 * surfaces an {@link ApiError} inline on failure, and on success navigates to
 * the `returnUrl` query param (or `/`; the role resolver lives behind `/`).
 *
 * Backend authenticates on USERNAME (not email) — the field is labelled and
 * named accordingly. The last-used username is remembered in `localStorage`
 * and prefilled to lower friction; the password is never stored.
 */
@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessageModule,
  ],
  templateUrl: './login.html',
  styleUrl: '../auth.css',
})
export class Login implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly version = inject(VersionService);

  protected readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const remembered = localStorage.getItem(LAST_USERNAME_KEY);
    if (remembered) {
      this.form.controls.username.setValue(remembered);
    }
    this.version.loadApiVersion();
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const { username } = this.form.getRawValue();

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        localStorage.setItem(LAST_USERNAME_KEY, username);
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
