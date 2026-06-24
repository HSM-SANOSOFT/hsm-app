import type { Routes } from '@angular/router';
import { RolesEnum } from '@hsm/common/enums';

import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

/**
 * Application routes.
 *
 * - `/login` is public.
 * - The default route is auth-guarded (redirects to `/login` when anonymous).
 * - `/admin` is additionally role-guarded (`RolesEnum.System.Admin`); a
 *   non-admin is bounced to `/`.
 *
 * U9 layers the real shell/layout and lazy feature routes on top of this; the
 * `home`/`admin` placeholders here exist so U8's guards have routes to gate.
 */
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then(m => m.Login),
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: [RolesEnum.System.Admin] },
    loadComponent: () =>
      import('./features/admin/admin-home').then(m => m.AdminHome),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/home/home').then(m => m.Home),
  },
  { path: '**', redirectTo: '' },
];
