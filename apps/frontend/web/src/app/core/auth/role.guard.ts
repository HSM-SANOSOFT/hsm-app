import { inject } from '@angular/core';
import {
  type ActivatedRouteSnapshot,
  type CanActivateFn,
  Router,
  type RouterStateSnapshot,
} from '@angular/router';
import { RolesEnum } from '@hsm/common/enums';

import { AuthService } from './auth.service';

/**
 * Data-driven role gate. Reads `route.data.roles` (a string array of role
 * values, e.g. `['admin']`) and allows activation only when the signed-in user
 * holds at least one of them.
 *
 * Usage:
 * ```ts
 * { path: 'admin', canActivate: [authGuard, roleGuard],
 *   data: { roles: [RolesEnum.System.Admin] }, ... }
 * ```
 *
 * Unauthenticated users go to `/login`; authenticated-but-unauthorized users
 * are redirected to the app root (`/`) rather than shown a route they can't
 * use. A route with no `data.roles` is treated as unrestricted.
 */
export const roleGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  const required = (route.data?.['roles'] as string[] | undefined) ?? [];
  if (required.length === 0 || auth.hasAnyRole(required)) {
    return true;
  }

  return router.createUrlTree(['/']);
};

/**
 * Convenience guard equivalent to `roleGuard` with
 * `data: { roles: [RolesEnum.System.Admin] }`. Use when a route is simply
 * admin-only and you'd rather not repeat the `data` block.
 */
export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  if (auth.hasRole(RolesEnum.System.Admin)) {
    return true;
  }

  return router.createUrlTree(['/']);
};
