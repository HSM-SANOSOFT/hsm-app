import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/**
 * Resolves the authenticated "home" by role — the one front door of the app.
 *
 * Wired as the shell's index child (`{ path: '', canActivate: [roleHomeGuard] }`)
 * it always returns a `UrlTree`, so the empty path never renders a component:
 * - patients (roles entirely within {patient, family}) → `/patient`;
 * - staff (any role outside that set, incl. admin) → `/workspace`.
 *
 * It sits below the shell's `authGuard` + `pendingOnboardingGuard`, so by the
 * time it runs a profile is loaded and onboarding is complete. An anonymous
 * user can never reach it (authGuard bounces them to `/login`); as a defensive
 * default a non-staff, non-patient state also falls through to `/workspace`.
 */
export const roleHomeGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return router.parseUrl(auth.isPatient() ? '/patient' : '/workspace');
};
