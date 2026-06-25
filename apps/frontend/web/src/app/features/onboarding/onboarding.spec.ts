import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ApiError } from '../../core/api/api-error';
import type { OnboardingPayload, UserProfile } from '../../core/api/response';
import { AuthService } from '../../core/auth/auth.service';
import { Onboarding } from './onboarding';

const pendingProfile: UserProfile = {
  id: 'u1',
  username: 'nurse1',
  email: 'nurse1@hsm.test',
  firstName: 'Nadia',
  firstLastName: 'Reyes',
  roles: ['auditor'],
  onboardingCompletedAt: null,
  iat: 1,
  exp: 2,
};

const validForm = {
  newPassword: 'sup3rsecret',
  confirmPassword: 'sup3rsecret',
  phoneNumber: '+10000000000',
  confirmEmail: 'nurse1@hsm.test',
};

interface Cmp {
  form: { setValue: (v: unknown) => void; invalid: boolean };
  submit: () => void;
  errorMessage: () => string | null;
}

/** Minimal AuthService double exposing the signals + spied methods used. */
function authStub(needsOnboarding: boolean) {
  return {
    currentUser: signal<UserProfile | null>(pendingProfile),
    needsOnboarding: signal(needsOnboarding),
    completeOnboarding: vi.fn(() => of(pendingProfile)),
  };
}

function setup(auth: ReturnType<typeof authStub>): {
  router: Router;
  navigateSpy: ReturnType<typeof vi.spyOn>;
  create: () => Cmp;
} {
  TestBed.configureTestingModule({
    imports: [Onboarding],
    providers: [
      provideRouter([]),
      provideAnimationsAsync(),
      { provide: AuthService, useValue: auth as unknown as AuthService },
    ],
  });
  const router = TestBed.inject(Router);
  const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  return {
    router,
    navigateSpy,
    create: () => {
      const fixture = TestBed.createComponent(Onboarding);
      fixture.detectChanges();
      return fixture.componentInstance as unknown as Cmp;
    },
  };
}

describe('Onboarding component', () => {
  it('does not submit until the form is valid (min-8, confirm match, required fields)', () => {
    const auth = authStub(true);
    const { create } = setup(auth);
    const cmp = create();

    // Too-short password -> invalid, no call.
    cmp.form.setValue({
      ...validForm,
      newPassword: 'short',
      confirmPassword: 'short',
    });
    cmp.submit();
    expect(auth.completeOnboarding).not.toHaveBeenCalled();

    // Mismatched confirm -> invalid, no call.
    cmp.form.setValue({ ...validForm, confirmPassword: 'different1' });
    cmp.submit();
    expect(auth.completeOnboarding).not.toHaveBeenCalled();

    // Missing phone -> invalid, no call.
    cmp.form.setValue({ ...validForm, phoneNumber: '' });
    cmp.submit();
    expect(auth.completeOnboarding).not.toHaveBeenCalled();

    // Malformed email -> invalid, no call.
    cmp.form.setValue({ ...validForm, confirmEmail: 'not-an-email' });
    cmp.submit();
    expect(auth.completeOnboarding).not.toHaveBeenCalled();
  });

  it('submits the right payload and navigates to / on success', () => {
    const auth = authStub(true);
    const { navigateSpy, create } = setup(auth);
    const cmp = create();

    cmp.form.setValue(validForm);
    cmp.submit();

    const expected: OnboardingPayload = {
      newPassword: 'sup3rsecret',
      phoneNumber: '+10000000000',
      confirmEmail: 'nurse1@hsm.test',
    };
    expect(auth.completeOnboarding).toHaveBeenCalledWith(expected);
    expect(navigateSpy).toHaveBeenCalledWith('/');
  });

  it('surfaces an ApiError inline on failure', () => {
    const auth = authStub(true);
    auth.completeOnboarding.mockReturnValue(
      throwError(
        () => new ApiError({ message: 'Email does not match.', status: 400 }),
      ),
    );
    const { create } = setup(auth);
    const cmp = create();

    cmp.form.setValue(validForm);
    cmp.submit();

    expect(cmp.errorMessage()).toBe('Email does not match.');
  });

  it('redirects a non-pending user away from /onboarding', () => {
    const auth = authStub(false);
    const { navigateSpy, create } = setup(auth);
    create();

    expect(navigateSpy).toHaveBeenCalledWith('/');
    expect(auth.completeOnboarding).not.toHaveBeenCalled();
  });
});
