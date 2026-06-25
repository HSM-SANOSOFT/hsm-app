import {
  afterNextRender,
  Component,
  type ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';

import { toErrorMessage } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { passwordsMatch } from '../../core/validators/password.validators';

/**
 * Forced first-login onboarding for an admin-created staff account.
 *
 * A pending staff member (`onboardingCompletedAt == null`) is redirected here
 * by `pendingOnboardingGuard` and cannot reach any feature until they set a new
 * password and supply required contact info. The form posts to
 * `POST /v1/auth/onboarding` via {@link AuthService.completeOnboarding}, which
 * stores the reissued token pair and reloads the profile (clearing the pending
 * flag); on success we navigate to `/`, where the role resolver (a later unit)
 * sends staff to their workspace.
 *
 * There is deliberately NO cancel/skip path to features — a pending user must
 * complete this. As a belt-and-suspenders complement to the shell guard, if a
 * NON-pending user lands here directly we bounce them to `/`.
 */
@Component({
  selector: 'app-onboarding',
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessageModule,
  ],
  templateUrl: './onboarding.html',
  styleUrls: ['../auth/auth.css', './onboarding.css'],
})
export class Onboarding {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** The account email — `confirmEmail` must match it (backend-enforced). */
  protected readonly accountEmail = this.auth.currentUser()?.email ?? '';

  /**
   * The onboarding heading. Given `tabindex="-1"` and focused after the first
   * render so that when the guard force-redirects a pending user into this
   * screen, keyboard and screen-reader focus lands on the heading rather than
   * being left on whatever the user last interacted with (WCAG 2.4.3 Focus
   * Order — a programmatic context change must move focus sensibly).
   */
  private readonly heading =
    viewChild<ElementRef<HTMLHeadingElement>>('heading');

  protected readonly form = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      phoneNumber: ['', [Validators.required]],
      confirmEmail: ['', [Validators.required, Validators.email]],
    },
    { validators: passwordsMatch },
  );

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    // A completed user has no business here; if they navigate to /onboarding
    // directly, send them back to the app root (the shell guard already keeps
    // pending users in, this keeps non-pending users out).
    if (!this.auth.needsOnboarding()) {
      void this.router.navigateByUrl('/');
      return;
    }

    // Move focus to the heading once the view exists (see `heading` doc).
    afterNextRender(() => {
      this.heading()?.nativeElement.focus();
    });
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const { newPassword, phoneNumber, confirmEmail } = this.form.getRawValue();

    this.auth
      .completeOnboarding({ newPassword, phoneNumber, confirmEmail })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          void this.router.navigateByUrl('/');
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.errorMessage.set(
            toErrorMessage(
              err,
              "We couldn't complete setup. Check your details and try again.",
            ),
          );
        },
      });
  }
}
