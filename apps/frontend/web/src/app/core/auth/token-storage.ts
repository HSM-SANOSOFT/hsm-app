import { Injectable } from '@angular/core';
// `Tokens` mirrors `@hsm/common`'s `ITokens` (access_token / refresh_token).
// We can't import `ITokens` directly: its source file
// (`security-auth.interface.ts`) value-imports `@hsm/database` entities, which
// don't resolve under the Angular browser build. See `../api/response.ts`.
import type { Tokens } from '../api/response';

/**
 * Persistence keys for the access (AT) and refresh (RT) tokens.
 */
const ACCESS_TOKEN_KEY = 'hsm.access_token';
const REFRESH_TOKEN_KEY = 'hsm.refresh_token';

/**
 * Abstraction over access-token + refresh-token persistence.
 *
 * Backing store: `localStorage`. For an internal back-office console the
 * tokens should survive a full browser/tab restart (so an operator is not
 * forced to re-authenticate every time the tab is reopened), which rules out
 * `sessionStorage` (scoped to a single tab session). The refresh interceptor
 * (U8) builds on the getters/`save` exposed here.
 *
 * The token shape (`Tokens`) mirrors `@hsm/common`'s `ITokens` (`access_token`
 * / `refresh_token`).
 */
@Injectable({ providedIn: 'root' })
export class TokenStorage {
  /** Returns the stored access token, or `null` when none is persisted. */
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /** Returns the stored refresh token, or `null` when none is persisted. */
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /** Persists both tokens from a `Tokens` pair (e.g. a login response). */
  save(tokens: Tokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  }

  /** Persists only the access token (e.g. after a refresh). */
  setAccessToken(accessToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }

  /** Clears both tokens — call on logout. */
  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}
