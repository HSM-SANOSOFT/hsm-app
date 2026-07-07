import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, Router } from '@angular/router';
import type {
  SuccessResponse,
  Tokens,
  UserProfile,
} from '../../../core/api/response';
import {
  provideTestConfig,
  TEST_API_BASE_URL,
} from '../../../core/config/config-testing';
import { provideTranslocoTestingModule } from '../../../core/i18n/transloco-testing';
import { Login } from './login';

const base = TEST_API_BASE_URL;

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
  onboardingCompletedAt: '2026-01-01T00:00:00.000Z',
  iat: 1,
  exp: 2,
};

/** The login loads the API version on init; flush it so http verifies clean. */
function flushVersion(
  httpMock: HttpTestingController,
  version = '1.0.0',
): void {
  httpMock.expectOne(`${base}/health/version`).flush(wrap({ version }));
}

describe('Login component', () => {
  let httpMock: HttpTestingController;
  let router: Router;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideTestConfig(),
        ...provideTranslocoTestingModule(),
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

  it('renders the recovery and register links, no staff-only copy', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    flushVersion(httpMock);

    const html = (fixture.nativeElement as HTMLElement).innerHTML;
    expect(html).toContain('¿Problemas para iniciar sesión?');
    expect(
      fixture.nativeElement.querySelector('[data-testid="register-link"]'),
    ).toBeTruthy();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text.toLowerCase()).not.toContain('staff access only');
    expect(text.toLowerCase()).not.toContain('internal operations');
  });

  it('shows the UI version and the loaded API version in the footer', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    flushVersion(httpMock, '2.5.0');
    fixture.detectChanges();

    const footer = (fixture.nativeElement as HTMLElement).querySelector(
      '.auth-version',
    );
    expect(footer?.textContent).toContain(`UI v${'test'}`);
    expect(footer?.textContent).toContain('API v2.5.0');
  });

  it('valid login navigates away and remembers the username', () => {
    const fixture = TestBed.createComponent(Login);
    const cmp = fixture.componentInstance as unknown as {
      form: { setValue: (v: unknown) => void };
      submit: () => void;
    };
    fixture.detectChanges();
    flushVersion(httpMock);

    cmp.form.setValue({ username: 'raul', password: 'pw' });
    cmp.submit();

    httpMock
      .expectOne(`${base}/auth/login`)
      .flush(wrap<Tokens>({ access_token: 'AT', refresh_token: 'RT' }));
    httpMock.expectOne(`${base}/auth/profile`).flush(wrap(profile));

    expect(navigateSpy).toHaveBeenCalled();
    expect(localStorage.getItem('hsm.lastUsername')).toBe('raul');
  });

  it('surfaces the ApiError and does not navigate on invalid creds', () => {
    const fixture = TestBed.createComponent(Login);
    const cmp = fixture.componentInstance as unknown as {
      form: { setValue: (v: unknown) => void };
      submit: () => void;
      errorMessage: () => string | null;
    };
    fixture.detectChanges();
    flushVersion(httpMock);

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
