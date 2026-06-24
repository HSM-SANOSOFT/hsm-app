import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { ApiClient } from '../../core/api/api-client';
import { ApiError } from '../../core/api/api-error';
import type { UserProfile } from '../../core/api/response';
import { AuthService } from '../../core/auth/auth.service';
import type {
  ChangePasswordPayload,
  UpdateOwnProfilePayload,
} from './profile.types';

/** Self-service user endpoints (relative to the `/v1` base URL). */
export const USER_ME_PATH = '/user/me';
export const USER_ME_PASSWORD_PATH = '/user/me/password';

/**
 * User self-service screen (U10, R5/R6, AE4).
 *
 * Two independent reactive forms:
 *  1. Profile — `firstName` + `email`, prefilled from
 *     {@link AuthService.currentUser}; `PATCH /v1/user/me`. After success the
 *     AuthService profile is reloaded (`loadProfile()` re-fetches
 *     `GET /v1/auth/profile` and updates the `currentUser` signal) so the shell
 *     chrome reflects the change.
 *  2. Password — `currentPassword` + `newPassword` + `confirmPassword`;
 *     `POST /v1/user/me/password`. A wrong current password surfaces inline as
 *     the thrown {@link ApiError}.
 *
 * There is deliberately NO role control on this screen and no role field in any
 * payload — role is immutable from self-service (R6 / AE4).
 */
@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessageModule,
  ],
  templateUrl: './profile.html',
})
export class Profile {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);

  /** The signed-in user, exposed for prefill/labels in the template. */
  protected readonly currentUser = this.auth.currentUser;

  protected readonly profileForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  protected readonly profileSubmitting = signal(false);
  protected readonly profileError = signal<string | null>(null);
  protected readonly profileSuccess = signal(false);

  protected readonly passwordSubmitting = signal(false);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly passwordSuccess = signal(false);

  /** True when the password / confirm-password fields do not match. */
  protected readonly passwordMismatch = computed(() => {
    const { newPassword, confirmPassword } = this.passwordForm.getRawValue();
    return newPassword !== confirmPassword;
  });

  constructor() {
    this.prefillFromCurrentUser(this.currentUser());
  }

  /** Seeds the profile form from the signed-in user, when available. */
  private prefillFromCurrentUser(user: UserProfile | null): void {
    if (!user) {
      return;
    }
    this.profileForm.patchValue({
      firstName: user.firstName ?? '',
      email: user.email ?? '',
    });
  }

  protected saveProfile(): void {
    if (this.profileForm.invalid || this.profileSubmitting()) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.profileSubmitting.set(true);
    this.profileError.set(null);
    this.profileSuccess.set(false);

    // Name/email only — NO role field is ever sent (R6 / AE4).
    const payload: UpdateOwnProfilePayload = this.profileForm.getRawValue();

    this.api.patch<UserProfile>(USER_ME_PATH, payload).subscribe({
      next: () => {
        // Refresh the AuthService profile so the shell reflects the change.
        this.auth.loadProfile().subscribe({
          next: () => {
            this.profileSubmitting.set(false);
            this.profileSuccess.set(true);
          },
          error: () => {
            // The update itself succeeded; surface success even if the
            // background profile reload fails.
            this.profileSubmitting.set(false);
            this.profileSuccess.set(true);
          },
        });
      },
      error: (err: unknown) => {
        this.profileSubmitting.set(false);
        this.profileError.set(
          err instanceof ApiError
            ? err.message
            : 'Could not update your profile. Please try again.',
        );
      },
    });
  }

  protected changePassword(): void {
    if (
      this.passwordForm.invalid ||
      this.passwordMismatch() ||
      this.passwordSubmitting()
    ) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.passwordSubmitting.set(true);
    this.passwordError.set(null);
    this.passwordSuccess.set(false);

    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    const payload: ChangePasswordPayload = { currentPassword, newPassword };

    this.api.post<void>(USER_ME_PASSWORD_PATH, payload).subscribe({
      next: () => {
        this.passwordSubmitting.set(false);
        this.passwordSuccess.set(true);
        this.passwordForm.reset();
      },
      error: (err: unknown) => {
        this.passwordSubmitting.set(false);
        this.passwordError.set(
          err instanceof ApiError
            ? err.message
            : 'Could not change your password. Please try again.',
        );
      },
    });
  }
}
