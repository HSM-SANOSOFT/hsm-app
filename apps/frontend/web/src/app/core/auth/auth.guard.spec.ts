import { TestBed } from '@angular/core/testing';
import {
  type ActivatedRouteSnapshot,
  Router,
  type RouterStateSnapshot,
  type UrlTree,
} from '@angular/router';
import { RolesEnum } from '@hsm/common/enums';
import { provideTranslocoTestingModule } from '../i18n/transloco-testing';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { adminGuard, roleGuard } from './role.guard';

function fakeState(url: string): RouterStateSnapshot {
  return { url } as RouterStateSnapshot;
}

function fakeRoute(roles?: string[]): ActivatedRouteSnapshot {
  return {
    data: roles ? { roles } : {},
  } as unknown as ActivatedRouteSnapshot;
}

interface AuthStub {
  isAuthenticated: () => boolean;
  hasRole?: (role: string) => boolean;
  hasAnyRole?: (roles: readonly string[]) => boolean;
}

describe('auth guards', () => {
  let router: Router;

  function configure(stub: AuthStub): void {
    TestBed.configureTestingModule({
      providers: [
        ...provideTranslocoTestingModule(),
        { provide: AuthService, useValue: stub as unknown as AuthService },
      ],
    });
    router = TestBed.inject(Router);
  }

  function invokeGuard(
    guard: typeof authGuard,
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): boolean | UrlTree {
    return TestBed.runInInjectionContext(
      () => guard(route, state) as boolean | UrlTree,
    );
  }

  it('authGuard allows an authenticated user', () => {
    configure({ isAuthenticated: () => true });
    const result = invokeGuard(authGuard, fakeRoute(), fakeState('/home'));
    expect(result).toBe(true);
  });

  it('authGuard redirects an anonymous user to /login with returnUrl', () => {
    configure({ isAuthenticated: () => false });
    const result = invokeGuard(
      authGuard,
      fakeRoute(),
      fakeState('/admin'),
    ) as UrlTree;
    expect(router.serializeUrl(result)).toBe('/login?returnUrl=%2Fadmin');
  });

  it('roleGuard allows a user holding the required role', () => {
    configure({
      isAuthenticated: () => true,
      hasAnyRole: (roles: readonly string[]) =>
        roles.includes(RolesEnum.System.Admin),
    });
    const result = invokeGuard(
      roleGuard,
      fakeRoute([RolesEnum.System.Admin]),
      fakeState('/admin'),
    );
    expect(result).toBe(true);
  });

  it('roleGuard sends a non-admin to / (blocked)', () => {
    configure({
      isAuthenticated: () => true,
      hasAnyRole: () => false,
    });
    const result = invokeGuard(
      roleGuard,
      fakeRoute([RolesEnum.System.Admin]),
      fakeState('/admin'),
    ) as UrlTree;
    expect(router.serializeUrl(result)).toBe('/');
  });

  it('adminGuard sends a non-admin to / (blocked)', () => {
    configure({
      isAuthenticated: () => true,
      hasAnyRole: () => false,
    });
    const result = invokeGuard(
      adminGuard,
      fakeRoute(),
      fakeState('/admin'),
    ) as UrlTree;
    expect(router.serializeUrl(result)).toBe('/');
  });

  it('adminGuard allows an admin', () => {
    configure({
      isAuthenticated: () => true,
      hasAnyRole: (roles: readonly string[]) =>
        roles.includes(RolesEnum.System.Admin),
    });
    const result = invokeGuard(adminGuard, fakeRoute(), fakeState('/admin'));
    expect(result).toBe(true);
  });
});
