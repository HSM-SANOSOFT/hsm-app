import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { SuccessResponse, UserProfile } from '../../core/api/response';
import { AuthService } from '../../core/auth/auth.service';
import { provideTranslocoTestingModule } from '../../core/i18n/transloco-testing';
import { Profile } from './profile';

const base = environment.apiBaseUrl;

function wrap<T>(data: T): SuccessResponse<T> {
  return {
    data,
    metadata: {
      success: true,
      statusCode: 200,
      timestamp: '2026-06-24T00:00:00.000Z',
      path: '/v1/user',
      message: 'OK',
    },
  };
}

const profile: UserProfile = {
  id: 'u1',
  username: 'raul',
  email: 'old@x.com',
  firstName: 'Raul',
  firstLastName: 'S',
  roles: ['admin'],
  onboardingCompletedAt: '2026-01-01T00:00:00.000Z',
  iat: 1,
  exp: 2,
};

/** Minimal AuthService double: a `currentUser` signal + a spied reload. */
function makeAuthStub() {
  const currentUser = () => profile;
  const loadProfile = vi.fn(() => of(profile));
  return { currentUser, loadProfile } as unknown as AuthService & {
    loadProfile: ReturnType<typeof vi.fn>;
  };
}

type ProfileCmp = {
  profileForm: { setValue: (v: unknown) => void; getRawValue: () => unknown };
  passwordForm: {
    setValue: (v: unknown) => void;
    getRawValue: () => unknown;
  };
  saveProfile: () => void;
  changePassword: () => void;
  profileSuccess: () => boolean;
  profileError: () => string | null;
  passwordSuccess: () => boolean;
  passwordError: () => string | null;
};

describe('Profile component', () => {
  let httpMock: HttpTestingController;
  let auth: ReturnType<typeof makeAuthStub>;

  beforeEach(() => {
    auth = makeAuthStub();
    TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        ...provideTranslocoTestingModule(),
        { provide: AuthService, useValue: auth },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('prefills the profile form from the current user', () => {
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ProfileCmp;

    expect(cmp.profileForm.getRawValue()).toEqual({
      firstName: 'Raul',
      email: 'old@x.com',
    });
  });

  it('PATCHes /user/me, reflects success, and refreshes AuthService', () => {
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ProfileCmp;

    cmp.profileForm.setValue({ firstName: 'Raul Updated', email: 'new@x.com' });
    cmp.saveProfile();

    const req = httpMock.expectOne(`${base}/user/me`);
    expect(req.request.method).toBe('PATCH');
    // No role field is ever sent (R6 / AE4).
    expect(req.request.body).toEqual({
      firstName: 'Raul Updated',
      email: 'new@x.com',
    });
    expect('role' in (req.request.body as Record<string, unknown>)).toBe(false);

    req.flush(wrap({ ...profile, firstName: 'Raul Updated' }));

    expect(auth.loadProfile).toHaveBeenCalled();
    expect(cmp.profileSuccess()).toBe(true);
    expect(cmp.profileError()).toBeNull();
  });

  it('changes password and surfaces a server rejection on wrong current password', () => {
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ProfileCmp;

    cmp.passwordForm.setValue({
      currentPassword: 'wrong',
      newPassword: 'newpassword1',
      confirmPassword: 'newpassword1',
    });
    cmp.changePassword();

    const req = httpMock.expectOne(`${base}/user/me/password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      currentPassword: 'wrong',
      newPassword: 'newpassword1',
    });

    req.flush(
      {
        metadata: {},
        issue: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Wrong password' },
      },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(cmp.passwordError()).toBe('Wrong password');
    expect(cmp.passwordSuccess()).toBe(false);
  });

  it('does not call the API when the current password is missing', () => {
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ProfileCmp;

    cmp.passwordForm.setValue({
      currentPassword: '',
      newPassword: 'newpassword1',
      confirmPassword: 'newpassword1',
    });
    cmp.changePassword();

    httpMock.expectNone(`${base}/user/me/password`);
    expect(cmp.passwordSuccess()).toBe(false);
  });

  it('renders no role control anywhere on the screen (R6 / AE4)', () => {
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();
    const html: string = fixture.nativeElement.innerHTML.toLowerCase();

    expect(html).not.toContain('role');
    expect(
      fixture.nativeElement.querySelector('[formcontrolname="role"]'),
    ).toBeNull();
    expect(fixture.nativeElement.querySelector('#role')).toBeNull();
    expect(fixture.nativeElement.querySelector('p-select')).toBeNull();
    expect(fixture.nativeElement.querySelector('p-dropdown')).toBeNull();
  });
});
