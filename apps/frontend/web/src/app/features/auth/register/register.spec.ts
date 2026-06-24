import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, Router } from '@angular/router';

import { environment } from '../../../../environments/environment';
import type {
  SuccessResponse,
  Tokens,
  UserProfile,
} from '../../../core/api/response';
import { Register } from './register';

const base = environment.apiBaseUrl;

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

const profile: UserProfile = {
  id: 'u1',
  username: 'jdoe',
  email: 'jdoe@x.com',
  firstName: 'Jane',
  firstLastName: 'Doe',
  roles: ['auditor'],
  iat: 1,
  exp: 2,
};

const validForm = {
  firstName: 'Jane',
  firstLastName: 'Doe',
  username: 'jdoe',
  email: 'jdoe@x.com',
  password: 'sup3rsecret',
};

describe('Register component', () => {
  let httpMock: HttpTestingController;
  let router: Router;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimationsAsync(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('posts a non-privileged role and navigates in on success', () => {
    const fixture = TestBed.createComponent(Register);
    const cmp = fixture.componentInstance as unknown as {
      form: { setValue: (v: unknown) => void };
      submit: () => void;
    };
    fixture.detectChanges();

    cmp.form.setValue(validForm);
    cmp.submit();

    const signup = httpMock.expectOne(`${base}/auth/signup`);
    // The console never lets a self-registrant pick a privileged role.
    expect(signup.request.body.roles).toEqual(['auditor']);
    signup.flush(wrap<Tokens>({ access_token: 'AT', refresh_token: 'RT' }));
    httpMock.expectOne(`${base}/auth/profile`).flush(wrap(profile));

    expect(navigateSpy).toHaveBeenCalledWith('/');
  });

  it('surfaces the ApiError and does not navigate when signup fails', () => {
    const fixture = TestBed.createComponent(Register);
    const cmp = fixture.componentInstance as unknown as {
      form: { setValue: (v: unknown) => void };
      submit: () => void;
      errorMessage: () => string | null;
    };
    fixture.detectChanges();

    cmp.form.setValue(validForm);
    cmp.submit();

    httpMock.expectOne(`${base}/auth/signup`).flush(
      {
        metadata: {},
        issue: { code: 'USER_ALREADY_EXISTS', message: 'Username taken' },
      },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(cmp.errorMessage()).toBe('Username taken');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('does not submit an invalid form', () => {
    const fixture = TestBed.createComponent(Register);
    const cmp = fixture.componentInstance as unknown as { submit: () => void };
    fixture.detectChanges();

    // Form starts empty (all required) — submit must not fire a request.
    cmp.submit();
    httpMock.expectNone(`${base}/auth/signup`);
  });
});
