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
import { Login } from './login';

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
  username: 'raul',
  email: 'r@x.com',
  firstName: 'Raul',
  firstLastName: 'S',
  roles: [],
  iat: 1,
  exp: 2,
};

describe('Login component', () => {
  let httpMock: HttpTestingController;
  let router: Router;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Login],
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

  it('valid login navigates away on success', () => {
    const fixture = TestBed.createComponent(Login);
    const cmp = fixture.componentInstance as unknown as {
      form: { setValue: (v: unknown) => void };
      submit: () => void;
    };
    fixture.detectChanges();

    cmp.form.setValue({ username: 'raul', password: 'pw' });
    cmp.submit();

    httpMock
      .expectOne(`${base}/auth/login`)
      .flush(wrap<Tokens>({ access_token: 'AT', refresh_token: 'RT' }));
    httpMock.expectOne(`${base}/auth/profile`).flush(wrap(profile));

    expect(navigateSpy).toHaveBeenCalled();
  });

  it('surfaces the ApiError and does not navigate on invalid creds', () => {
    const fixture = TestBed.createComponent(Login);
    const cmp = fixture.componentInstance as unknown as {
      form: { setValue: (v: unknown) => void };
      submit: () => void;
      errorMessage: () => string | null;
    };
    fixture.detectChanges();

    cmp.form.setValue({ username: 'x', password: 'y' });
    cmp.submit();

    httpMock.expectOne(`${base}/auth/login`).flush(
      {
        metadata: {},
        issue: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Bad creds' },
      },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(cmp.errorMessage()).toBe('Bad creds');
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
