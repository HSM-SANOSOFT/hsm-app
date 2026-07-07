import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import type { SuccessResponse } from '../api/response';
import { provideTranslocoTestingModule } from '../i18n/transloco-testing';
import { API_VERSION_FALLBACK, VersionService } from './version.service';

const base = environment.apiBaseUrl;

function wrap<T>(data: T): SuccessResponse<T> {
  return {
    data,
    metadata: {
      success: true,
      statusCode: 200,
      timestamp: '2026-06-25T00:00:00.000Z',
      path: '/v1/health/version',
      message: 'OK',
    },
  };
}

describe('VersionService', () => {
  let service: VersionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...provideTranslocoTestingModule(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(VersionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('exposes the build-time UI version from the environment', () => {
    expect(service.uiVersion).toBe(environment.appVersion);
  });

  it('loadApiVersion sets the signal from the API response', () => {
    expect(service.apiVersion()).toBeNull();

    service.loadApiVersion();
    httpMock
      .expectOne(`${base}/health/version`)
      .flush(wrap({ version: '1.4.2' }));

    expect(service.apiVersion()).toBe('1.4.2');
  });

  it('loadApiVersion sets the fallback on error (no indefinite spinner)', () => {
    service.loadApiVersion();
    httpMock
      .expectOne(`${base}/health/version`)
      .flush(
        { metadata: {}, issue: {} },
        { status: 503, statusText: 'Service Unavailable' },
      );

    expect(service.apiVersion()).toBe(API_VERSION_FALLBACK);
  });
});
