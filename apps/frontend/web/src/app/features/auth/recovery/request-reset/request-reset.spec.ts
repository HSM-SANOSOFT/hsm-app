import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../../environments/environment';
import type {
  MessageResponse,
  SuccessResponse,
} from '../../../../core/api/response';
import { RequestReset } from './request-reset';

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
  form: { setValue: (v: unknown) => void };
  submit: () => void;
  sent: () => boolean;
  rateLimited: () => boolean;
}

describe('RequestReset component', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RequestReset],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimationsAsync(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('posts the email and shows the generic confirmation', () => {
    const fixture = TestBed.createComponent(RequestReset);
    const cmp = fixture.componentInstance as unknown as Cmp;
    fixture.detectChanges();

    cmp.form.setValue({ email: 'jane@x.com' });
    cmp.submit();

    const req = httpMock.expectOne(`${base}/auth/password/forgot`);
    expect(req.request.body).toEqual({ email: 'jane@x.com' });
    req.flush(wrap<MessageResponse>({ message: 'If an account exists…' }));

    expect(cmp.sent()).toBe(true);
    fixture.detectChanges();
    const text = (
      (fixture.nativeElement as HTMLElement).textContent ?? ''
    ).toLowerCase();
    // Non-committal: never confirms the account exists.
    expect(text).toContain('if an account exists');
  });

  it('does not submit an invalid email', () => {
    const fixture = TestBed.createComponent(RequestReset);
    const cmp = fixture.componentInstance as unknown as Cmp;
    fixture.detectChanges();

    cmp.form.setValue({ email: 'not-an-email' });
    cmp.submit();
    httpMock.expectNone(`${base}/auth/password/forgot`);
    expect(cmp.sent()).toBe(false);
  });

  it('surfaces a 429 as a gentle rate-limit notice without leaking', () => {
    const fixture = TestBed.createComponent(RequestReset);
    const cmp = fixture.componentInstance as unknown as Cmp;
    fixture.detectChanges();

    cmp.form.setValue({ email: 'jane@x.com' });
    cmp.submit();

    httpMock
      .expectOne(`${base}/auth/password/forgot`)
      .flush(
        { metadata: {}, issue: { code: 'RATE_LIMITED', message: 'slow down' } },
        { status: 429, statusText: 'Too Many Requests' },
      );

    expect(cmp.rateLimited()).toBe(true);
    expect(cmp.sent()).toBe(false);
  });
});
