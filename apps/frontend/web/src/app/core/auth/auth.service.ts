import { computed, Injectable, inject, signal } from '@angular/core';
import { RolesEnum } from '@hsm/common/enums';
import { catchError, map, type Observable, of, switchMap, tap } from 'rxjs';

import { ApiClient } from '../api/api-client';
import type {
  LoginPayload,
  OnboardingPayload,
  SignupPayload,
  Tokens,
  UserProfile,
} from '../api/response';
import { TokenStorage } from './token-storage';

/** Backend auth endpoints (relative to the `/v1` base URL). */
export const AUTH_LOGIN_PATH = '/auth/login';
export const AUTH_SIGNUP_PATH = '/auth/signup';
export const AUTH_REFRESH_PATH = '/auth/refresh';
export const AUTH_PROFILE_PATH = '/auth/profile';
export const AUTH_LOGOUT_PATH = '/auth/logout';
export const AUTH_ONBOARDING_PATH = '/auth/onboarding';

/**
 * Holds authentication state and orchestrates login / logout / profile load.
 *
 * State is modelled with signals:
 * - {@link currentUser} — the signed-in profile, or `null` when anonymous.
 * - {@link isAuthenticated} — `computed` from `currentUser`.
 * - {@link isAdmin} — `computed`; true iff the profile's roles include
 *   `RolesEnum.System.Admin` (the string `'admin'`).
 *
 * The refresh interceptor (`auth.interceptor.ts`) performs the transparent
 * access-token refresh; on a dead refresh token it calls {@link onSessionLost}
 * to clear state. Token persistence lives in {@link TokenStorage}.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClient);
  private readonly tokenStorage = inject(TokenStorage);

  private readonly currentUserSignal = signal<UserProfile | null>(null);

  /** The signed-in user profile, or `null` when not authenticated. */
  readonly currentUser = this.currentUserSignal.asReadonly();

  /** True when a user profile is loaded. */
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);

  /** True iff the current user's roles include `RolesEnum.System.Admin`. */
  readonly isAdmin = computed(() => this.hasRole(RolesEnum.System.Admin));

  /**
   * True iff a profile is loaded AND it is still pending first-login onboarding
   * (`onboardingCompletedAt == null`). Anonymous users are false (no profile);
   * patients and the seeded admin are created complete, so they are false too.
   * The pending-onboarding guard reads this to force staff to `/onboarding`.
   */
  readonly needsOnboarding = computed(() => {
    const user = this.currentUserSignal();
    return user !== null && user.onboardingCompletedAt == null;
  });

  /** True iff the current user's roles include the given role value. */
  hasRole(role: string): boolean {
    return this.currentUserSignal()?.roles?.includes(role) ?? false;
  }

  /** True iff the current user holds at least one of the given roles. */
  hasAnyRole(roles: readonly string[]): boolean {
    const userRoles = this.currentUserSignal()?.roles;
    if (!userRoles) {
      return false;
    }
    return roles.some(role => userRoles.includes(role));
  }

  /** True when an access token is persisted (even if no profile loaded yet). */
  hasToken(): boolean {
    return this.tokenStorage.getAccessToken() !== null;
  }

  /**
   * Authenticates with username + password, stores the returned token pair,
   * then loads the profile. Emits the profile on success; errors with the
   * `ApiError` thrown by {@link ApiClient} (e.g. invalid credentials).
   */
  login(payload: LoginPayload): Observable<UserProfile> {
    return this.api.post<Tokens>(AUTH_LOGIN_PATH, payload).pipe(
      tap(tokens => this.tokenStorage.save(tokens)),
      // After storing tokens, load the profile and emit it.
      switchMap(() => this.loadProfile()),
    );
  }

  /**
   * Self-registers via `POST /v1/auth/signup`, which returns a token pair on
   * success (the backend rejects privileged roles). Stores the tokens and loads
   * the profile — same shape as {@link login}, so the new user lands
   * authenticated. Errors with the `ApiError` thrown by {@link ApiClient}
   * (e.g. a duplicate username).
   */
  register(payload: SignupPayload): Observable<UserProfile> {
    return this.api.post<Tokens>(AUTH_SIGNUP_PATH, payload).pipe(
      tap(tokens => this.tokenStorage.save(tokens)),
      switchMap(() => this.loadProfile()),
    );
  }

  /**
   * Completes first-login onboarding for a pending staff member via
   * `POST /v1/auth/onboarding` (sets a new password + required contact info).
   * The backend returns a REISSUED token pair so the cleared pending flag is
   * reflected: store the new tokens, then reload the profile — mirroring
   * {@link login}. After this emits, {@link needsOnboarding} is false (the
   * reloaded profile carries a non-null `onboardingCompletedAt`). Errors with
   * the `ApiError` thrown by {@link ApiClient} (e.g. a 400 for a confirm-email
   * mismatch or a too-short password).
   */
  completeOnboarding(payload: OnboardingPayload): Observable<UserProfile> {
    return this.api.post<Tokens>(AUTH_ONBOARDING_PATH, payload).pipe(
      tap(tokens => this.tokenStorage.save(tokens)),
      switchMap(() => this.loadProfile()),
    );
  }

  /**
   * Fetches `GET /v1/auth/profile` with the access token and stores it as the
   * current user. Used after login and on app init (token rehydration).
   */
  loadProfile(): Observable<UserProfile> {
    return this.api
      .get<UserProfile>(AUTH_PROFILE_PATH)
      .pipe(tap(profile => this.currentUserSignal.set(profile)));
  }

  /**
   * Restores the session on app start: if an access token is persisted, load
   * the profile. A failure (dead token) clears state and resolves to `null`.
   */
  restoreSession(): Observable<UserProfile | null> {
    if (!this.hasToken()) {
      return of(null);
    }
    return this.loadProfile().pipe(
      catchError(() => {
        this.onSessionLost();
        return of(null);
      }),
    );
  }

  /**
   * Logs out: best-effort calls `GET /v1/auth/logout`, then clears tokens and
   * resets auth state regardless of the call's outcome.
   */
  logout(): Observable<void> {
    return this.api.get<void>(AUTH_LOGOUT_PATH).pipe(
      catchError(() => of(undefined)),
      tap(() => this.onSessionLost()),
      map(() => undefined),
    );
  }

  /** Clears tokens and resets auth state. Called on logout / dead refresh. */
  onSessionLost(): void {
    this.tokenStorage.clear();
    this.currentUserSignal.set(null);
  }
}
