import type { Route } from '@angular/router';
import { routes } from './app.routes';
import { authGuard } from './core/auth/auth.guard';
import { pendingOnboardingGuard } from './core/auth/pending-onboarding.guard';

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
      expect.arrayContaining(['profile', 'templates', 'documents', 'admin']),
    );
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
    for (const path of ['profile', 'templates', 'documents']) {
      const route = findRoute(routes, path);
      expect(route?.loadComponent).toBeDefined();
    }
  });

  it('lazy-loads a feature component on demand', async () => {
    const profile = findRoute(routes, 'profile');
    // Invoking loadComponent resolves the standalone component class.
    const cmp = await profile?.loadComponent?.();
    expect(cmp).toBeDefined();
  });

  it('role-gates admin routes without touching the shared auth wiring', () => {
    // KTD8 structural check: admin gating is per-route data + guard, so adding
    // a route never edits the guard implementation.
    const users = findRoute(routes, 'users');
    const settings = findRoute(routes, 'settings');
    expect(users?.canActivate).toHaveLength(1);
    expect(settings?.canActivate).toHaveLength(1);
    expect(users?.loadComponent).toBeDefined();
    expect(settings?.loadComponent).toBeDefined();
  });

  it('defaults to profile and has a wildcard fallback', () => {
    const shell = routes.find(r => r.path === '' && r.children);
    const indexChild = shell?.children?.find(c => c.path === '');
    expect(indexChild?.redirectTo).toBe('profile');
    expect(routes.some(r => r.path === '**')).toBe(true);
  });
});
