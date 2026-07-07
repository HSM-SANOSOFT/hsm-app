import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { provideTranslocoTestingModule } from '../i18n/transloco-testing';
import type { PaginatedResult } from './api-client';
import { ApiClient } from './api-client';
import { ApiError } from './api-error';
import type { SuccessResponse, UnsuccessResponse } from './response';

describe('ApiClient', () => {
  let client: ApiClient;
  let httpMock: HttpTestingController;

  const base = environment.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...provideTranslocoTestingModule(),
        provideHttpClient(withFetch()),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(ApiClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('unwraps SuccessResponse.data for the caller', () => {
    const success: SuccessResponse<{ id: number; name: string }> = {
      data: { id: 1, name: 'Ada' },
      metadata: {
        success: true,
        statusCode: 200,
        timestamp: '2026-06-24T00:00:00.000Z',
        path: '/v1/users/1',
        message: 'Request processed successfully.',
      },
    };

    let received: { id: number; name: string } | undefined;
    client.get<{ id: number; name: string }>('/users/1').subscribe(data => {
      received = data;
    });

    const req = httpMock.expectOne(`${base}/users/1`);
    expect(req.request.method).toBe('GET');
    req.flush(success);

    expect(received).toEqual({ id: 1, name: 'Ada' });
  });

  it('exposes metadata.extra.pagination for paginated lists', () => {
    const success: SuccessResponse<Array<{ id: number }>> = {
      data: [{ id: 1 }, { id: 2 }],
      metadata: {
        success: true,
        statusCode: 200,
        timestamp: '2026-06-24T00:00:00.000Z',
        path: '/v1/users',
        message: 'Request processed successfully.',
        extra: {
          pagination: {
            page: 1,
            pageSize: 20,
            totalItems: 2,
            totalPages: 1,
          },
        },
      },
    };

    let result: PaginatedResult<{ id: number }> | undefined;
    client.getPaginated<{ id: number }>('/users').subscribe(r => {
      result = r;
    });

    const req = httpMock.expectOne(`${base}/users`);
    req.flush(success);

    expect(result?.data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result?.pagination).toEqual({
      page: 1,
      pageSize: 20,
      totalItems: 2,
      totalPages: 1,
    });
  });

  it('maps an UnsuccessResponse issue to a typed ApiError', () => {
    const errorBody: UnsuccessResponse = {
      metadata: {
        success: false,
        statusCode: 401,
        timestamp: '2026-06-24T00:00:00.000Z',
        path: '/v1/auth/login',
        message: 'Request processed unsuccessfully.',
      },
      issue: {
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid credentials provided.',
        field: 'email',
      },
    };

    let caught: ApiError | undefined;
    client.post('/auth/login', { email: 'x' }).subscribe({
      error: (err: ApiError) => {
        caught = err;
      },
    });

    const req = httpMock.expectOne(`${base}/auth/login`);
    req.flush(errorBody, { status: 401, statusText: 'Unauthorized' });

    expect(caught).toBeInstanceOf(ApiError);
    expect(caught?.status).toBe(401);
    expect(caught?.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(caught?.message).toBe('Invalid credentials provided.');
    expect(caught?.field).toBe('email');
  });

  it('joins array issue messages into a single ApiError message', () => {
    const errorBody: UnsuccessResponse = {
      metadata: {
        success: false,
        statusCode: 400,
        timestamp: '2026-06-24T00:00:00.000Z',
        path: '/v1/users',
        message: 'Request processed unsuccessfully.',
      },
      issue: {
        message: ['email must be an email', 'password too short'],
        field: ['email', 'password'],
      },
    };

    let caught: ApiError | undefined;
    client.post('/users', {}).subscribe({
      error: (err: ApiError) => {
        caught = err;
      },
    });

    const req = httpMock.expectOne(`${base}/users`);
    req.flush(errorBody, { status: 400, statusText: 'Bad Request' });

    expect(caught?.message).toBe('email must be an email; password too short');
    expect(caught?.field).toEqual(['email', 'password']);
  });

  it('normalizes transport failures into an ApiError with status 0', () => {
    let caught: ApiError | undefined;
    client.get('/health').subscribe({
      error: (err: ApiError) => {
        caught = err;
      },
    });

    const req = httpMock.expectOne(`${base}/health`);
    req.error(new ProgressEvent('error'));

    expect(caught).toBeInstanceOf(ApiError);
    expect(caught?.status).toBe(0);
  });
});
