import { TestBed } from '@angular/core/testing';
import {
  type ActivatedRouteSnapshot,
  Router,
  type RouterStateSnapshot,
  type UrlTree,
} from '@angular/router';
import { provideTranslocoTestingModule } from '../i18n/transloco-testing';
import { AuthService } from './auth.service';
import { pendingOnboardingGuard } from './pending-onboarding.guard';

function fakeState(url: string): RouterStateSnapshot {
  return { url } as RouterStateSnapshot;
}

const fakeRoute = {} as ActivatedRouteSnapshot;

interface AuthStub {
  isAdmin: () => boolean;
  needsOnboarding: () => boolean;
}

describe('pendingOnboardingGuard', () => {
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

  function invoke(): boolean | UrlTree {
    return TestBed.runInInjectionContext(
      () =>
        pendingOnboardingGuard(fakeRoute, fakeState('/')) as boolean | UrlTree,
    );
  }

  it('redirects a pending user to /onboarding (UrlTree)', () => {
    configure({ isAdmin: () => false, needsOnboarding: () => true });
    const result = invoke() as UrlTree;
    expect(router.serializeUrl(result)).toBe('/onboarding');
  });

  it('allows a non-pending user', () => {
    configure({ isAdmin: () => false, needsOnboarding: () => false });
    expect(invoke()).toBe(true);
  });

  it('lets an admin straight through without onboarding', () => {
    configure({ isAdmin: () => true, needsOnboarding: () => true });
    expect(invoke()).toBe(true);
  });
});
