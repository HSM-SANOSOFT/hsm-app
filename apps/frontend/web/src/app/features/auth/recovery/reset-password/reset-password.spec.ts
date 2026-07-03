import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, provideRouter } from '@angular/router';

import { environment } from '../../../../../environments/environment';
import type {
  MessageResponse,
  SuccessResponse,
} from '../../../../core/api/response';
import { ResetPassword } from './reset-password';

const base = environment.apiBaseUrl;

function wrap<T>(data: T): SuccessResponse<T> {
  return {
    data,
    metadata: {
      success: true,
      statusCode: 200,
      timestamp: '2026-06-25T00:00:00.000Z',
      path: '/v1/auth',
      message: 'OK',
    },
  };
}

interface Cmp {
  token: string | null;
  form: { setValue: (v: unknown) => void; invalid: boolean };
  submit: () => void;
  succeeded: () => boolean;
  invalidToken: () => boolean;
}

/** Builds the TestBed with a mocked `ActivatedRoute.snapshot.fragment`. */
function setup(fragment: string | null): {
  httpMock: HttpTestingController;
  create: () => {
    fixture: ReturnType<typeof TestBed.createComponent>;
    cmp: Cmp;
  };
} {
  TestBed.configureTestingModule({
    imports: [ResetPassword],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideAnimationsAsync(),
      { provide: ActivatedRoute, useValue: { snapshot: { fragment } } },
    ],
  });
  const httpMock = TestBed.inject(HttpTestingController);
  return {
    httpMock,
    create: () => {
      const fixture = TestBed.createComponent(ResetPassword);
      const cmp = fixture.componentInstance as unknown as Cmp;
      fixture.detectChanges();
      return { fixture, cmp };
    },
  };
}

const goodPw = { newPassword: 'sup3rsecret', confirmPassword: 'sup3rsecret' };

describe('ResetPassword component', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('with no token fragment renders the missing-token error and not the form', () => {
    const { create } = setup(null);
    const { fixture, cmp } = create();

    expect(cmp.token).toBeNull();
    const html = fixture.nativeElement as HTMLElement;
    // No password form is shown.
    expect(html.querySelector('p-password')).toBeNull();
    expect((html.textContent ?? '').toLowerCase()).toContain('no es válido');
    expect(
      html.querySelector(
        '[routerLink="/forgot-password"], a[href="/forgot-password"]',
      ),
    ).toBeTruthy();
  });

  it('with a token renders the form and validates min length + confirm match', () => {
    const { httpMock, create } = setup('token=abc');
    const { cmp } = create();

    expect(cmp.token).toBe('abc');

    // Too short -> invalid, no request.
    cmp.form.setValue({ newPassword: 'short', confirmPassword: 'short' });
    cmp.submit();
    httpMock.expectNone(`${base}/auth/password/reset`);

    // Mismatch -> invalid, no request.
    cmp.form.setValue({
      newPassword: 'sup3rsecret',
      confirmPassword: 'different1',
    });
    cmp.submit();
    httpMock.expectNone(`${base}/auth/password/reset`);
  });

  it('a successful POST shows the success state', () => {
    const { httpMock, create } = setup('token=abc');
    const { cmp } = create();

    cmp.form.setValue(goodPw);
    cmp.submit();

    const req = httpMock.expectOne(`${base}/auth/password/reset`);
    expect(req.request.body).toEqual({
      token: 'abc',
      newPassword: 'sup3rsecret',
    });
    req.flush(wrap<MessageResponse>({ message: 'Password updated.' }));

    expect(cmp.succeeded()).toBe(true);
    expect(cmp.invalidToken()).toBe(false);
  });

  it('an ApiError(400) shows the invalid/expired state', () => {
    const { httpMock, create } = setup('token=abc');
    const { cmp } = create();

    cmp.form.setValue(goodPw);
    cmp.submit();

    httpMock.expectOne(`${base}/auth/password/reset`).flush(
      {
        metadata: {},
        issue: { code: 'AUTH_INVALID_TOKEN', message: 'bad token' },
      },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(cmp.invalidToken()).toBe(true);
    expect(cmp.succeeded()).toBe(false);
  });
});
