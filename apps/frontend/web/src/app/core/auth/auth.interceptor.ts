import {
  HttpClient,
  type HttpErrorResponse,
  type HttpEvent,
  type HttpHandlerFn,
  type HttpInterceptorFn,
  type HttpRequest,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  filter,
  map,
  type Observable,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import type { SuccessResponse, Tokens } from '../api/response';
import { ConfigService } from '../config/config.service';
import { AuthService } from './auth.service';
import { TokenStorage } from './token-storage';

/**
 * Module-scoped (singleton) refresh coordination state.
 *
 * Because the interceptor is a function, the single-in-flight-refresh state has
 * to live outside any one invocation — at module scope — so every concurrent
 * 401 sees the same `isRefreshing` flag and the same token subject.
 *
 * - `isRefreshing` — guards so only the FIRST 401 fires a refresh.
 * - `refreshSubject` — re-seeded with `null` at the start of each refresh
 *   cycle; concurrent 401s wait (via `filter`) for it to emit the new access
 *   token, then retry. On refresh failure it is errored to release waiters.
 */
let isRefreshing = false;
let refreshSubject = new BehaviorSubject<string | null>(null);

/** Endpoint suffixes that must NOT carry the AT / trigger a refresh loop. */
const LOGIN_SUFFIX = '/auth/login';
const REFRESH_SUFFIX = '/auth/refresh';

function isAuthEndpoint(url: string): boolean {
  return url.endsWith(LOGIN_SUFFIX) || url.endsWith(REFRESH_SUFFIX);
}

function withBearer(
  req: HttpRequest<unknown>,
  token: string,
): HttpRequest<unknown> {
  return req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
}

function isUnauthorized(error: unknown): error is HttpErrorResponse {
  return (error as HttpErrorResponse | null)?.status === 401;
}

/**
 * Minimal client that performs the raw refresh GET. Isolated so the interceptor
 * never depends on `ApiClient` (which would re-enter this interceptor). The
 * `/auth/refresh` suffix is skipped by `isAuthEndpoint`, so there is no
 * recursion. Spyable in tests.
 */
@Injectable({ providedIn: 'root' })
export class AuthRefreshClient {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private get url(): string {
    return `${this.config.apiBaseUrl}${REFRESH_SUFFIX}`;
  }

  refresh(refreshToken: string): Observable<Tokens> {
    return this.http
      .get<SuccessResponse<Tokens>>(this.url, {
        headers: { Authorization: `Bearer ${refreshToken}` },
      })
      .pipe(map(body => body.data));
  }
}

/**
 * Attaches the access token to outgoing requests and performs a single
 * in-flight refresh on 401 (KTD2).
 *
 * Outgoing:
 * - Skips the login/refresh calls (they manage their own Authorization) and
 *   requests sent with no access token persisted.
 * - Otherwise attaches `Authorization: Bearer <AT>`.
 *
 * On 401 (excluding the refresh call itself):
 * - The FIRST 401 sets `isRefreshing`, seeds a fresh `refreshSubject`, and
 *   calls `GET /v1/auth/refresh` with the REFRESH token. On success it stores
 *   the new pair, publishes the new AT to the subject, and retries the request.
 * - CONCURRENT 401s find `isRefreshing` already set and WAIT on the subject —
 *   no second refresh is fired — then retry once the new AT arrives.
 * - On refresh FAILURE (or a 401 from the refresh call), tokens are cleared,
 *   auth state is reset, the user is sent to `/login`, and the queued requests
 *   error out.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // `inject()` is valid here (interceptor runs inside the request's injection
  // context); capture deps so the async refresh path doesn't re-inject later.
  const tokenStorage = inject(TokenStorage);
  const auth = inject(AuthService);
  const router = inject(Router);
  const refreshClient = inject(AuthRefreshClient);

  if (isAuthEndpoint(req.url)) {
    return next(req);
  }

  const accessToken = tokenStorage.getAccessToken();
  const authedReq = accessToken ? withBearer(req, accessToken) : req;

  return next(authedReq).pipe(
    catchError((error: unknown) => {
      if (!isUnauthorized(error) || !accessToken) {
        return throwError(() => error);
      }
      return handle401(req, next, {
        tokenStorage,
        auth,
        router,
        refreshClient,
      });
    }),
  );
};

interface RefreshDeps {
  tokenStorage: TokenStorage;
  auth: AuthService;
  router: Router;
  refreshClient: AuthRefreshClient;
}

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  deps: RefreshDeps,
): Observable<HttpEvent<unknown>> {
  // A concurrent 401 while a refresh is already running: wait for the new AT.
  if (isRefreshing) {
    return refreshSubject.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap(token => next(withBearer(req, token))),
    );
  }

  // First 401: open the refresh cycle.
  isRefreshing = true;
  refreshSubject = new BehaviorSubject<string | null>(null);

  return refreshAccessToken(deps).pipe(
    switchMap(newToken => {
      isRefreshing = false;
      refreshSubject.next(newToken);
      return next(withBearer(req, newToken));
    }),
    catchError((refreshError: unknown) => {
      isRefreshing = false;
      // Release queued waiters with an error, then clear them out.
      refreshSubject.error(refreshError);
      deps.auth.onSessionLost();
      void deps.router.navigate(['/login']);
      return throwError(() => refreshError);
    }),
  );
}

/**
 * Calls `GET /v1/auth/refresh` with the REFRESH token as the bearer (NOT the
 * access token) via {@link AuthRefreshClient}, persists the fresh pair, and
 * returns the new access token.
 */
function refreshAccessToken(deps: RefreshDeps): Observable<string> {
  const refreshToken = deps.tokenStorage.getRefreshToken();
  if (!refreshToken) {
    return throwError(() => new Error('No refresh token available.'));
  }

  return deps.refreshClient.refresh(refreshToken).pipe(
    map(tokens => {
      deps.tokenStorage.save(tokens);
      return tokens.access_token;
    }),
  );
}
