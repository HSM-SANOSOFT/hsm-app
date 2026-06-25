import { TestBed } from '@angular/core/testing';
import {
  type ActivatedRouteSnapshot,
  Router,
  type RouterStateSnapshot,
  type UrlTree,
} from '@angular/router';

import { AuthService } from './auth.service';
import { pendingOnboardingGuard } from './pending-onboarding.guard';

function fakeState(url: string): RouterStateSnapshot {
  return { url } as RouterStateSnapshot;
}

const fakeRoute = {} as ActivatedRouteSnapshot;

interface AuthStub {
  needsOnboarding: () => boolean;
}

describe('pendingOnboardingGuard', () => {
  let router: Router;

  function configure(stub: AuthStub): void {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: stub as unknown as AuthService },
      ],
    });
    router = TestBed.inject(Router);
  }

  function invoke(): boolean | UrlTree {
    return TestBed.runInInjectionContext(
      () =>
        pendingOnboardingGuard(fakeRoute, fakeState('/')) as boolean | UrlTree,
    );
  }

  it('redirects a pending user to /onboarding (UrlTree)', () => {
    configure({ needsOnboarding: () => true });
    const result = invoke() as UrlTree;
    expect(router.serializeUrl(result)).toBe('/onboarding');
  });

  it('allows a non-pending user', () => {
    configure({ needsOnboarding: () => false });
    expect(invoke()).toBe(true);
  });
});
