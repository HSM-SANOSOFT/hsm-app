import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RolesEnum } from '@hsm/common/enums';

import { environment } from '../../../environments/environment';
import type { SuccessResponse, Tokens, UserProfile } from '../api/response';
import { AuthService } from './auth.service';
import { TokenStorage } from './token-storage';

const base = environment.apiBaseUrl;

function profile(
  roles: string[],
  onboardingCompletedAt: string | null = '2026-01-01T00:00:00.000Z',
): UserProfile {
  return {
    id: 'u1',
    username: 'raul',
    email: 'raul@example.com',
    firstName: 'Raul',
    firstLastName: 'Santamaria',
    roles,
    onboardingCompletedAt,
    iat: 1,
    exp: 2,
  };
}

function wrap<T>(data: T): SuccessResponse<T> {
  return {
    data,
    metadata: {
      success: true,
      statusCode: 200,
      timestamp: '2026-06-24T00:00:00.000Z',
      path: '/v1/auth',
      message: 'OK',
    },
  };
}

describe('AuthService', () => {
  let auth: AuthService;
  let httpMock: HttpTestingController;
  let tokenStorage: TokenStorage;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorage);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('valid login stores tokens and transitions to authenticated state', () => {
    let emitted: UserProfile | undefined;
    auth.login({ username: 'raul', password: 'pw' }).subscribe(p => {
      emitted = p;
    });

    const loginReq = httpMock.expectOne(`${base}/auth/login`);
    expect(loginReq.request.method).toBe('POST');
    expect(loginReq.request.body).toEqual({
      username: 'raul',
      password: 'pw',
    });
    loginReq.flush(wrap<Tokens>({ access_token: 'AT', refresh_token: 'RT' }));

    // Profile load follows the token store.
    const profileReq = httpMock.expectOne(`${base}/auth/profile`);
    profileReq.flush(wrap(profile([RolesEnum.System.Admin])));

    expect(tokenStorage.getAccessToken()).toBe('AT');
    expect(tokenStorage.getRefreshToken()).toBe('RT');
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.isAdmin()).toBe(true);
    expect(emitted?.username).toBe('raul');
  });

  it('invalid credentials surface the ApiError without authenticating', () => {
    let error: unknown;
    auth.login({ username: 'x', password: 'y' }).subscribe({
      error: (e: unknown) => {
        error = e;
      },
    });

    httpMock.expectOne(`${base}/auth/login`).flush(
      {
        metadata: {},
        issue: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Bad creds' },
      },
      { status: 401, statusText: 'Unauthorized' },
    );

    // No profile call is made.
    httpMock.expectNone(`${base}/auth/profile`);
    expect(error).toBeDefined();
    expect(auth.isAuthenticated()).toBe(false);
    expect(tokenStorage.getAccessToken()).toBeNull();
  });

  it('derives isAdmin from RolesEnum.System.Admin', () => {
    auth.loadProfile().subscribe();
    httpMock
      .expectOne(`${base}/auth/profile`)
      .flush(wrap(profile([RolesEnum.System.Developer])));

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.isAdmin()).toBe(false);
    expect(auth.hasRole(RolesEnum.System.Developer)).toBe(true);
    expect(auth.hasAnyRole([RolesEnum.System.Admin])).toBe(false);
  });

  it('restoreSession loads the profile when a token is persisted', () => {
    tokenStorage.save({ access_token: 'AT', refresh_token: 'RT' });

    auth.restoreSession().subscribe();
    httpMock
      .expectOne(`${base}/auth/profile`)
      .flush(wrap(profile([RolesEnum.System.Admin])));

    expect(auth.isAdmin()).toBe(true);
  });

  it('restoreSession clears state when the persisted token is dead', () => {
    tokenStorage.save({ access_token: 'AT', refresh_token: 'RT' });

    let value: UserProfile | null | undefined;
    auth.restoreSession().subscribe(v => {
      value = v;
    });
    httpMock
      .expectOne(`${base}/auth/profile`)
      .flush(
        { metadata: {}, issue: {} },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(value).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
    expect(tokenStorage.getAccessToken()).toBeNull();
  });

  it('restoreSession resolves to null with no persisted token', () => {
    let value: UserProfile | null | undefined = profile([]);
    auth.restoreSession().subscribe(v => {
      value = v;
    });
    httpMock.expectNone(`${base}/auth/profile`);
    expect(value).toBeNull();
  });

  it('needsOnboarding is false when anonymous', () => {
    expect(auth.needsOnboarding()).toBe(false);
  });

  it('needsOnboarding is true for a pending profile (null timestamp)', () => {
    auth.loadProfile().subscribe();
    httpMock
      .expectOne(`${base}/auth/profile`)
      .flush(wrap(profile([RolesEnum.System.Auditor], null)));

    expect(auth.needsOnboarding()).toBe(true);
  });

  it('needsOnboarding is false for a completed profile (patient/admin)', () => {
    auth.loadProfile().subscribe();
    httpMock
      .expectOne(`${base}/auth/profile`)
      .flush(wrap(profile([RolesEnum.System.Admin])));

    expect(auth.needsOnboarding()).toBe(false);
  });

  it('isStaff/isPatient are both false when anonymous', () => {
    expect(auth.isStaff()).toBe(false);
    expect(auth.isPatient()).toBe(false);
  });

  it('a patient-only profile is a patient, not staff', () => {
    auth.loadProfile().subscribe();
    httpMock
      .expectOne(`${base}/auth/profile`)
      .flush(wrap(profile([RolesEnum.Patient.Patient])));

    expect(auth.isPatient()).toBe(true);
    expect(auth.isStaff()).toBe(false);
  });

  it('a family-only profile is a patient, not staff', () => {
    auth.loadProfile().subscribe();
    httpMock
      .expectOne(`${base}/auth/profile`)
      .flush(wrap(profile([RolesEnum.Patient.Family])));

    expect(auth.isPatient()).toBe(true);
    expect(auth.isStaff()).toBe(false);
  });

  it('an admin profile is staff, not a patient', () => {
    auth.loadProfile().subscribe();
    httpMock
      .expectOne(`${base}/auth/profile`)
      .flush(wrap(profile([RolesEnum.System.Admin])));

    expect(auth.isStaff()).toBe(true);
    expect(auth.isPatient()).toBe(false);
  });

  it('a profile mixing a patient role with a staff role is staff', () => {
    auth.loadProfile().subscribe();
    httpMock
      .expectOne(`${base}/auth/profile`)
      .flush(
        wrap(profile([RolesEnum.Patient.Patient, RolesEnum.Clinical.Doctor])),
      );

    expect(auth.isStaff()).toBe(true);
    expect(auth.isPatient()).toBe(false);
  });

  it('completeOnboarding stores the reissued tokens and reloads the profile', () => {
    let emitted: UserProfile | undefined;
    auth
      .completeOnboarding({
        newPassword: 'sup3rsecret',
        phoneNumber: '+10000000000',
        confirmEmail: 'raul@example.com',
      })
      .subscribe(p => {
        emitted = p;
      });

    const onboardReq = httpMock.expectOne(`${base}/auth/onboarding`);
    expect(onboardReq.request.method).toBe('POST');
    expect(onboardReq.request.body).toEqual({
      newPassword: 'sup3rsecret',
      phoneNumber: '+10000000000',
      confirmEmail: 'raul@example.com',
    });
    onboardReq.flush(
      wrap<Tokens>({ access_token: 'AT2', refresh_token: 'RT2' }),
    );

    // The reloaded profile carries a cleared (non-null) onboarding timestamp.
    httpMock
      .expectOne(`${base}/auth/profile`)
      .flush(wrap(profile([RolesEnum.System.Auditor])));

    expect(tokenStorage.getAccessToken()).toBe('AT2');
    expect(tokenStorage.getRefreshToken()).toBe('RT2');
    expect(auth.needsOnboarding()).toBe(false);
    expect(emitted?.username).toBe('raul');
  });
});
