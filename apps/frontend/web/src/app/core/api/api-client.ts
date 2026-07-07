import {
  HttpClient,
  HttpErrorResponse,
  type HttpParams,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { catchError, map, type Observable, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiError, issueToMessage } from './api-error';
import type {
  Pagination,
  SuccessResponse,
  UnsuccessResponse,
} from './response';

/** Options accepted by every {@link ApiClient} verb. */
export interface ApiRequestOptions {
  params?: HttpParams | Record<string, string | number | boolean>;
}

/** A list payload plus its pagination metadata. */
export interface PaginatedResult<T> {
  data: T[];
  pagination?: Pagination;
}

/**
 * Thin typed wrapper around Angular's `HttpClient`.
 *
 * - Prefixes every request with `environment.apiBaseUrl`.
 * - On success, unwraps `SuccessResponse.data` so callers receive the inner
 *   payload directly (typed via generics).
 * - {@link getPaginated} additionally surfaces `metadata.extra.pagination`.
 * - On error, normalizes the `UnsuccessResponse` body into an
 *   {@link ApiError} via `catchError` + `throwError`.
 *
 * Stays Observable-based (HttpClient's idiom); component-level signal state is
 * layered on top by callers, not here. The auth/refresh interceptor is added
 * in U8 and plugs in transparently underneath this client.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly transloco = inject(TranslocoService);
  private readonly baseUrl = environment.apiBaseUrl;

  get<T>(path: string, options?: ApiRequestOptions): Observable<T> {
    return this.unwrap(
      this.http.get<SuccessResponse<T>>(this.url(path), {
        params: options?.params,
      }),
    );
  }

  /**
   * GET a list endpoint, returning both the data array and the
   * `metadata.extra.pagination` block.
   */
  getPaginated<T>(
    path: string,
    options?: ApiRequestOptions,
  ): Observable<PaginatedResult<T>> {
    return this.http
      .get<SuccessResponse<T[]>>(this.url(path), {
        params: options?.params,
      })
      .pipe(
        map(body => ({
          data: body.data,
          pagination: body.metadata?.extra?.pagination,
        })),
        catchError(error => this.toApiError(error)),
      );
  }

  post<T>(
    path: string,
    body?: unknown,
    options?: ApiRequestOptions,
  ): Observable<T> {
    return this.unwrap(
      this.http.post<SuccessResponse<T>>(this.url(path), body, {
        params: options?.params,
      }),
    );
  }

  put<T>(
    path: string,
    body?: unknown,
    options?: ApiRequestOptions,
  ): Observable<T> {
    return this.unwrap(
      this.http.put<SuccessResponse<T>>(this.url(path), body, {
        params: options?.params,
      }),
    );
  }

  patch<T>(
    path: string,
    body?: unknown,
    options?: ApiRequestOptions,
  ): Observable<T> {
    return this.unwrap(
      this.http.patch<SuccessResponse<T>>(this.url(path), body, {
        params: options?.params,
      }),
    );
  }

  delete<T>(path: string, options?: ApiRequestOptions): Observable<T> {
    return this.unwrap(
      this.http.delete<SuccessResponse<T>>(this.url(path), {
        params: options?.params,
      }),
    );
  }

  /** Joins the configured base URL with a request path. */
  private url(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${normalized}`;
  }

  /** Maps a `SuccessResponse<T>` stream to its inner `data`. */
  private unwrap<T>(source: Observable<SuccessResponse<T>>): Observable<T> {
    return source.pipe(
      map(body => body.data),
      catchError(error => this.toApiError(error)),
    );
  }

  /** Normalizes any HTTP failure into a thrown {@link ApiError}. */
  private toApiError(error: unknown): Observable<never> {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as Partial<UnsuccessResponse> | null;
      const issue = body?.issue;
      const message = issueToMessage(
        this.transloco,
        issue,
        error.message || 'Request failed.',
      );
      return throwError(
        () =>
          new ApiError({
            message,
            status: error.status,
            code: issue?.code,
            field: issue?.field,
            issue,
          }),
      );
    }

    return throwError(
      () =>
        new ApiError({
          message: 'Unexpected client error.',
          status: 0,
        }),
    );
  }
}
