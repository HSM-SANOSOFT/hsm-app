import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/**
 * Blocks unauthenticated access to a route.
 *
 * A user is "authenticated" once their profile is loaded
 * (`AuthService.isAuthenticated`). Session rehydration on app start
 * (`restoreSession`) is awaited by the app initializer, so by the time a guard
 * runs the profile is already loaded (or known to be absent).
 *
 * On failure, redirects to `/login`, preserving the attempted URL as a
 * `returnUrl` query param so the login flow can bounce the user back.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
