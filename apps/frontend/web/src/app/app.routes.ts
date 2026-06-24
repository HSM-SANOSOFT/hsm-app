import type { Routes } from '@angular/router';
import { RolesEnum } from '@hsm/common/enums';

import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/role.guard';

/**
 * Application routes.
 *
 * Shape (U9 — multi-module shell, KTD8):
 *
 * ```text
 * login                         public, no shell
 * '' (Shell, authGuard)         authenticated chrome (nav + outlet)
 * ├── '' -> profile             default redirect
 * ├── profile                   any authenticated user (R5/R6, U10)
 * ├── templates                 authenticated (R12–R17, U13/U14)
 * ├── documents                 authenticated (R18–R20, U15)
 * └── admin
 *     ├── users    (adminGuard) R7, U11
 *     └── settings (adminGuard) R8–R11, U12
 * ```
 *
 * Every authenticated route is a **lazy** child of the `Shell` parent, so a new
 * module is a new `loadComponent` entry here plus a `NavItem` in
 * `layout/nav-items.ts` — no change to the shell or the auth guards. The
 * feature components are placeholders today (U10–U15 replace them).
 */
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then(m => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell').then(m => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'profile' },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile').then(m => m.Profile),
      },
      {
        path: 'templates',
        loadComponent: () =>
          import('./features/templates/templates').then(m => m.Templates),
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./features/documents/documents').then(m => m.Documents),
      },
      {
        path: 'admin',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'users' },
          {
            path: 'users',
            canActivate: [adminGuard],
            data: { roles: [RolesEnum.System.Admin] },
            loadComponent: () =>
              import('./features/admin/users/users').then(m => m.AdminUsers),
          },
          {
            path: 'settings',
            canActivate: [adminGuard],
            data: { roles: [RolesEnum.System.Admin] },
            loadComponent: () =>
              import('./features/admin/settings/settings').then(
                m => m.AdminSettings,
              ),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
