import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import type { SuccessResponse, Tokens } from '../api/response';
import { provideTranslocoTestingModule } from '../i18n/transloco-testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { TokenStorage } from './token-storage';

const base = environment.apiBaseUrl;

function tokensBody(at: string, rt: string): SuccessResponse<Tokens> {
  return {
    data: { access_token: at, refresh_token: rt },
    metadata: {
      success: true,
      statusCode: 200,
      timestamp: '2026-06-24T00:00:00.000Z',
      path: '/v1/auth/refresh',
      message: 'OK',
    },
  };
}

describe('authInterceptor (single in-flight refresh)', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokenStorage: TokenStorage;
  let auth: AuthService;
  let navigateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    navigateSpy = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      providers: [
        ...provideTranslocoTestingModule(),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: navigateSpy } },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorage);
    auth = TestBed.inject(AuthService);

    tokenStorage.save({ access_token: 'AT_OLD', refresh_token: 'RT_OLD' });
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('attaches the access token to outgoing requests', () => {
    http.get(`${base}/widgets`).subscribe();

    const req = httpMock.expectOne(`${base}/widgets`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer AT_OLD');
    req.flush({});
  });

  it('does not attach a token to the login call', () => {
    http.post(`${base}/auth/login`, {}).subscribe();

    const req = httpMock.expectOne(`${base}/auth/login`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('refreshes once on a 401 and retries the request with the new AT', () => {
    let result: unknown;
    http.get(`${base}/widgets`).subscribe(r => {
      result = r;
    });

    // First attempt -> 401.
    const first = httpMock.expectOne(`${base}/widgets`);
    expect(first.request.headers.get('Authorization')).toBe('Bearer AT_OLD');
    first.flush(
      { metadata: {}, issue: {} },
      { status: 401, statusText: 'Unauthorized' },
    );

    // Exactly one refresh, carrying the REFRESH token.
    const refresh = httpMock.expectOne(`${base}/auth/refresh`);
    expect(refresh.request.method).toBe('GET');
    expect(refresh.request.headers.get('Authorization')).toBe('Bearer RT_OLD');
    refresh.flush(tokensBody('AT_NEW', 'RT_NEW'));

    // Retry carries the NEW token.
    const retry = httpMock.expectOne(`${base}/widgets`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer AT_NEW');
    retry.flush({ ok: true });

    expect(result).toEqual({ ok: true });
    expect(tokenStorage.getAccessToken()).toBe('AT_NEW');
    expect(tokenStorage.getRefreshToken()).toBe('RT_NEW');
  });

  it(
    'collapses MULTIPLE concurrent 401s into a SINGLE refresh and ' +
      'retries all queued requests once the new AT arrives',
    () => {
      const results: unknown[] = [];
      http.get(`${base}/a`).subscribe(r => results.push(r));
      http.get(`${base}/b`).subscribe(r => results.push(r));
      http.get(`${base}/c`).subscribe(r => results.push(r));

      // All three fail with 401.
      const reqA = httpMock.expectOne(`${base}/a`);
      const reqB = httpMock.expectOne(`${base}/b`);
      const reqC = httpMock.expectOne(`${base}/c`);
      const unauthorized = {
        body: { metadata: {}, issue: {} },
        opts: { status: 401, statusText: 'Unauthorized' },
      };
      reqA.flush(unauthorized.body, unauthorized.opts);
      reqB.flush(unauthorized.body, unauthorized.opts);
      reqC.flush(unauthorized.body, unauthorized.opts);

      // EXACTLY ONE refresh hits the controller (no stampede).
      const refresh = httpMock.expectOne(`${base}/auth/refresh`);
      expect(refresh.request.headers.get('Authorization')).toBe(
        'Bearer RT_OLD',
      );
      refresh.flush(tokensBody('AT_NEW', 'RT_NEW'));

      // All three retry with the new token.
      const retryA = httpMock.expectOne(`${base}/a`);
      const retryB = httpMock.expectOne(`${base}/b`);
      const retryC = httpMock.expectOne(`${base}/c`);
      for (const r of [retryA, retryB, retryC]) {
        expect(r.request.headers.get('Authorization')).toBe('Bearer AT_NEW');
      }
      retryA.flush({ id: 'a' });
      retryB.flush({ id: 'b' });
      retryC.flush({ id: 'c' });

      expect(results).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    },
  );

  it('clears tokens and redirects to /login when the refresh fails', () => {
    const lostSpy = vi.spyOn(auth, 'onSessionLost');
    let caught: unknown;

    http.get(`${base}/widgets`).subscribe({
      error: (err: unknown) => {
        caught = err;
      },
    });

    httpMock
      .expectOne(`${base}/widgets`)
      .flush(
        { metadata: {}, issue: {} },
        { status: 401, statusText: 'Unauthorized' },
      );

    // Refresh itself returns 401 -> dead RT.
    httpMock
      .expectOne(`${base}/auth/refresh`)
      .flush(
        { metadata: {}, issue: {} },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(caught).toBeDefined();
    expect(lostSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });
});
