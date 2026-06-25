import { TestBed } from '@angular/core/testing';
import {
  type ActivatedRouteSnapshot,
  Router,
  type RouterStateSnapshot,
  type UrlTree,
} from '@angular/router';

import { AuthService } from './auth.service';
import { roleHomeGuard } from './role-home.guard';

function fakeState(url: string): RouterStateSnapshot {
  return { url } as RouterStateSnapshot;
}

const fakeRoute = {} as ActivatedRouteSnapshot;

interface AuthStub {
  isPatient: () => boolean;
}

describe('roleHomeGuard', () => {
  let router: Router;

  function configure(stub: AuthStub): void {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: stub as unknown as AuthService },
      ],
    });
    router = TestBed.inject(Router);
  }

  function invoke(): UrlTree {
    return TestBed.runInInjectionContext(
      () => roleHomeGuard(fakeRoute, fakeState('/')) as UrlTree,
    );
  }

  it('sends a patient to /patient (UrlTree)', () => {
    configure({ isPatient: () => true });
    expect(router.serializeUrl(invoke())).toBe('/patient');
  });

  it('sends a staff member to /workspace (UrlTree)', () => {
    configure({ isPatient: () => false });
    expect(router.serializeUrl(invoke())).toBe('/workspace');
  });
});
