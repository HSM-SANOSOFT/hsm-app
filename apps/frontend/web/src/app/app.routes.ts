import type { Routes } from '@angular/router';
import { RolesEnum } from '@hsm/common/enums';

import { authGuard } from './core/auth/auth.guard';
import { pendingOnboardingGuard } from './core/auth/pending-onboarding.guard';
import { adminGuard } from './core/auth/role.guard';
import { roleHomeGuard } from './core/auth/role-home.guard';

/**
 * Application routes.
 *
 * Shape (U9 — multi-module shell, KTD8):
 *
 * ```text
 * login                         public, no shell
 * '' (Shell, authGuard)         authenticated chrome (nav + outlet)
 * ├── '' (roleHomeGuard)        role-resolved home: patient -> /patient,
 * │                             staff -> /workspace
 * ├── patient                   patient landing placeholder (R17)
 * ├── workspace                 staff home (greeting + quick links)
 * ├── settings                  personal settings (any user); /profile -> here
 * ├── templates                 authenticated (R12–R17, U13/U14)
 * ├── documents                 authenticated (R18–R20, U15)
 * └── system-admin (adminGuard) admin console; /admin/* redirects here
 *     ├── users    (adminGuard)
 *     └── settings (adminGuard)
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
      // The one front door: a guard-only index that always redirects to the
      // role-resolved home (patient -> /patient, staff -> /workspace).
      {
        path: '',
        pathMatch: 'full',
        canActivate: [roleHomeGuard],
        children: [],
      },
      {
        path: 'patient',
        loadComponent: () =>
          import('./features/patient/patient').then(m => m.Patient),
      },
      {
        path: 'workspace',
        loadComponent: () =>
          import('./features/workspace/workspace').then(m => m.Workspace),
      },
      // Personal Settings — the self-service account page, identical for every
      // user including admins (no admin section, origin R15). Re-homed from the
      // old /profile, which now redirects here.
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/profile/profile').then(m => m.Profile),
      },
      { path: 'profile', pathMatch: 'full', redirectTo: 'settings' },
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
      // System Admin console — the only place admin lives now, reached from the
      // profile-card popover (admins only). adminGuard sits on the parent AND
      // each child (defense-in-depth): a child must never become reachable if it
      // is ever re-nested or the parent guard is dropped.
      {
        path: 'system-admin',
        canActivate: [adminGuard],
        data: { roles: [RolesEnum.System.Admin] },
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
      // Back-compat redirects for the pre-redesign admin paths, so bookmarks and
      // the login `returnUrl` round-trip keep resolving (origin R16).
      { path: 'admin', pathMatch: 'full', redirectTo: 'system-admin' },
      { path: 'admin/users', redirectTo: 'system-admin/users' },
      { path: 'admin/settings', redirectTo: 'system-admin/settings' },
    ],
  },
  { path: '**', redirectTo: '' },
];
