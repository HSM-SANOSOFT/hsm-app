import type { Route } from '@angular/router';
import { routes } from './app.routes';
import { authGuard } from './core/auth/auth.guard';
import { pendingOnboardingGuard } from './core/auth/pending-onboarding.guard';
import { roleHomeGuard } from './core/auth/role-home.guard';

/** Finds a route by path within a (possibly nested) route tree. */
function findRoute(tree: Route[], path: string): Route | undefined {
  for (const route of tree) {
    if (route.path === path) {
      return route;
    }
    if (route.children) {
      const found = findRoute(route.children, path);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

describe('app.routes', () => {
  it('keeps /login public (no shell, no guards)', () => {
    const login = findRoute(routes, 'login');
    expect(login).toBeDefined();
    expect(login?.canActivate).toBeUndefined();
    expect(login?.loadComponent).toBeDefined();
  });

  it('keeps /register public (no shell, no guards)', () => {
    const register = findRoute(routes, 'register');
    expect(register).toBeDefined();
    expect(register?.canActivate).toBeUndefined();
    expect(register?.loadComponent).toBeDefined();
  });

  it('mounts all authenticated routes inside a single guarded shell', () => {
    const shell = routes.find(r => r.path === '' && r.children);
    expect(shell).toBeDefined();
    // The shell is lazy and guarded by authGuard THEN pendingOnboardingGuard
    // (anonymous -> /login; pending staff -> /onboarding). Order matters.
    expect(shell?.loadComponent).toBeDefined();
    expect(shell?.canActivate).toEqual([authGuard, pendingOnboardingGuard]);
    // Feature children live under it.
    const childPaths = (shell?.children ?? []).map(c => c.path);
    expect(childPaths).toEqual(
      expect.arrayContaining([
        'patient',
        'workspace',
        'settings',
        'templates',
        'documents',
        'system-admin',
      ]),
    );
  });

  it('exposes the role-resolved patient and workspace homes as shell children', () => {
    const shell = routes.find(r => r.path === '' && r.children);
    const patient = findRoute(shell?.children ?? [], 'patient');
    const workspace = findRoute(shell?.children ?? [], 'workspace');
    expect(patient?.loadComponent).toBeDefined();
    expect(workspace?.loadComponent).toBeDefined();
  });

  it('exposes /onboarding outside the shell, auth-guarded only', () => {
    const onboarding = findRoute(routes, 'onboarding');
    expect(onboarding).toBeDefined();
    // Auth-guarded so a profile is loaded, but NOT pending-guarded (that would
    // bounce the very users who need this screen). The component sends a
    // non-pending user away itself.
    expect(onboarding?.canActivate).toEqual([authGuard]);
    expect(onboarding?.loadComponent).toBeDefined();
    // It is a top-level route, not a shell child.
    expect(routes.some(r => r.path === 'onboarding')).toBe(true);
  });

  it('exposes feature routes as lazy loadComponent slots', () => {
    for (const path of ['settings', 'templates', 'documents']) {
      const route = findRoute(routes, path);
      expect(route?.loadComponent).toBeDefined();
    }
  });

  it('lazy-loads a feature component on demand', async () => {
    const settings = findRoute(routes, 'settings');
    // Invoking loadComponent resolves the standalone component class.
    const cmp = await settings?.loadComponent?.();
    expect(cmp).toBeDefined();
  });

  it('nests admin under a guarded system-admin console (parent + each child)', () => {
    // adminGuard on the parent AND each child (defense-in-depth) so a child is
    // never reachable if it is ever re-nested or the parent guard is dropped.
    const systemAdmin = findRoute(routes, 'system-admin');
    expect(systemAdmin?.canActivate).toHaveLength(1);
    const children = systemAdmin?.children ?? [];
    const users = children.find(c => c.path === 'users');
    const settings = children.find(c => c.path === 'settings');
    expect(users?.canActivate).toHaveLength(1);
    expect(settings?.canActivate).toHaveLength(1);
    expect(users?.loadComponent).toBeDefined();
    expect(settings?.loadComponent).toBeDefined();
  });

  it('redirects the pre-redesign admin and profile paths for back-compat', () => {
    const shell = routes.find(r => r.path === '' && r.children);
    const kids = shell?.children ?? [];
    const find = (path: string) => kids.find(c => c.path === path);
    expect(find('profile')?.redirectTo).toBe('settings');
    expect(find('admin')?.redirectTo).toBe('system-admin');
    expect(find('admin/users')?.redirectTo).toBe('system-admin/users');
    expect(find('admin/settings')?.redirectTo).toBe('system-admin/settings');
  });

  it('resolves the index by role via roleHomeGuard and has a wildcard fallback', () => {
    const shell = routes.find(r => r.path === '' && r.children);
    const indexChild = shell?.children?.find(c => c.path === '');
    // The fixed `'' -> profile` redirect is gone: the index is a guard-only
    // child that always redirects to the role-resolved home.
    expect(indexChild?.redirectTo).toBeUndefined();
    expect(indexChild?.canActivate).toEqual([roleHomeGuard]);
    expect(routes.some(r => r.path === '**')).toBe(true);
  });
});
