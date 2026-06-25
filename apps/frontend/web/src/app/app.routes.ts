import type { Routes } from '@angular/router';
import { RolesEnum } from '@hsm/common/enums';

import { authGuard } from './core/auth/auth.guard';
import { pendingOnboardingGuard } from './core/auth/pending-onboarding.guard';
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
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register').then(m => m.Register),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/recovery/request-reset/request-reset').then(
        m => m.RequestReset,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/recovery/reset-password/reset-password').then(
        m => m.ResetPassword,
      ),
  },
  {
    path: 'recover-username',
    loadComponent: () =>
      import('./features/auth/recovery/recover-username/recover-username').then(
        m => m.RecoverUsername,
      ),
  },
  {
    // Forced first-login onboarding — a focused full-page flow, OUTSIDE the
    // shell. `authGuard` ensures a profile is loaded; the component itself
    // bounces a non-pending (already-completed) user back to `/`.
    path: 'onboarding',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/onboarding/onboarding').then(m => m.Onboarding),
  },
  {
    path: '',
    // `authGuard` first (anonymous -> /login), then `pendingOnboardingGuard`
    // (pending authenticated staff -> /onboarding). Order matters.
    canActivate: [authGuard, pendingOnboardingGuard],
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
