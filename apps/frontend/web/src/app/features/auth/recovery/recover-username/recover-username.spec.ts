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
import { provideTranslocoTestingModule } from '../../../../core/i18n/transloco-testing';
import { RecoverUsername } from './recover-username';

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
}

describe('RecoverUsername component', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RecoverUsername],
      providers: [
        ...provideTranslocoTestingModule(),
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
    const fixture = TestBed.createComponent(RecoverUsername);
    const cmp = fixture.componentInstance as unknown as Cmp;
    fixture.detectChanges();

    cmp.form.setValue({ email: 'jane@x.com' });
    cmp.submit();

    const req = httpMock.expectOne(`${base}/auth/username/recover`);
    expect(req.request.body).toEqual({ email: 'jane@x.com' });
    req.flush(wrap<MessageResponse>({ message: 'If an account exists…' }));

    expect(cmp.sent()).toBe(true);
    fixture.detectChanges();
    const text = (
      (fixture.nativeElement as HTMLElement).textContent ?? ''
    ).toLowerCase();
    expect(text).toContain('si existe una cuenta');
  });

  it('does not submit an invalid email', () => {
    const fixture = TestBed.createComponent(RecoverUsername);
    const cmp = fixture.componentInstance as unknown as Cmp;
    fixture.detectChanges();

    cmp.form.setValue({ email: 'nope' });
    cmp.submit();
    httpMock.expectNone(`${base}/auth/username/recover`);
    expect(cmp.sent()).toBe(false);
  });
});
