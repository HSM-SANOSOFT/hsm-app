import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/**
 * Forces a pending staff member through first-login onboarding before any
 * authenticated feature route.
 *
 * When `AuthService.needsOnboarding()` is true (the loaded profile still has
 * `onboardingCompletedAt == null`), this redirects to `/onboarding`; otherwise
 * it allows activation. It assumes a profile is already loaded, so it sits
 * AFTER `authGuard` on the shell route (`[authGuard, pendingOnboardingGuard]`):
 * an unauthenticated user is bounced to `/login` by `authGuard` first, and a
 * pending authenticated user is bounced here. UX only — the real enforcement is
 * the server-side onboarding guard (U4).
 */
export const pendingOnboardingGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.needsOnboarding()) {
    return router.parseUrl('/onboarding');
  }

  return true;
};
