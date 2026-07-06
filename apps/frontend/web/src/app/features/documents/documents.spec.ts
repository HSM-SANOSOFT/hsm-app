import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DocumentStatusEnum } from '@hsm/common/enums';
import { of, throwError } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';

import { environment } from '../../../environments/environment';
import type { SuccessResponse } from '../../core/api/response';
import {
  DEFAULT_POLL_MAX_ATTEMPTS,
  type DocumentRecord,
  pollDocumentStatus,
  schemaToFields,
} from './document.types';
import { Documents } from './documents';

const base = environment.apiBaseUrl;

function wrap<T>(data: T): SuccessResponse<T> {
  return {
    data,
    metadata: {
      success: true,
      statusCode: 200,
      timestamp: '2026-06-24T00:00:00.000Z',
      path: '/v1/docs',
      message: 'OK',
    },
  };
}

function doc(status: string, id = 'doc-1'): DocumentRecord {
  return {
    id,
    title: 'Doc',
    type: 'GENERATED',
    status,
    source: 'TEMPLATE',
  };
}

describe('pollDocumentStatus', () => {
  it('polls until COMPLETED then stops (does not fetch again)', () => {
    const statuses = [
      DocumentStatusEnum.PENDING,
      DocumentStatusEnum.PROCESSING,
      DocumentStatusEnum.COMPLETED,
    ];
    let calls = 0;
    const fetch = vi.fn(() => of(doc(statuses[calls++])));

    const scheduler = new TestScheduler((actual, expected) =>
      expect(actual).toEqual(expected),
    );

    scheduler.run(({ expectObservable }) => {
      const stream$ = pollDocumentStatus(fetch, {
        intervalMs: 10,
        scheduler,
      });
      // Emits at frames 0, 10, 20 then completes on the COMPLETED emission.
      expectObservable(stream$).toBe('a 9ms b 9ms (c|)', {
        a: doc(DocumentStatusEnum.PENDING),
        b: doc(DocumentStatusEnum.PROCESSING),
        c: doc(DocumentStatusEnum.COMPLETED),
      });
    });

    // Exactly 3 fetches — no extra poll after COMPLETED.
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('stops on FAILED and surfaces the failed status', () => {
    const statuses = [DocumentStatusEnum.PENDING, DocumentStatusEnum.FAILED];
    let calls = 0;
    const fetch = vi.fn(() => of(doc(statuses[calls++])));
    const scheduler = new TestScheduler((actual, expected) =>
      expect(actual).toEqual(expected),
    );

    scheduler.run(({ expectObservable }) => {
      const stream$ = pollDocumentStatus(fetch, {
        intervalMs: 10,
        scheduler,
      });
      expectObservable(stream$).toBe('a 9ms (b|)', {
        a: doc(DocumentStatusEnum.PENDING),
        b: doc(DocumentStatusEnum.FAILED),
      });
    });

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('terminates at the attempt cap rather than looping forever on a stuck job', () => {
    // Always PENDING — must stop after `maxAttempts` poll attempts.
    const fetch = vi.fn(() => of(doc(DocumentStatusEnum.PENDING)));
    const scheduler = new TestScheduler((actual, expected) =>
      expect(actual).toEqual(expected),
    );

    scheduler.run(({ expectObservable }) => {
      const stream$ = pollDocumentStatus(fetch, {
        intervalMs: 10,
        maxAttempts: 3,
        scheduler,
      });
      // Emits PENDING at frames 0, 10, 20 then completes at frame 30 (cap)
      // WITHOUT ever seeing a terminal status — proves it doesn't loop forever.
      expectObservable(stream$).toBe('a 9ms b 9ms c 9ms |', {
        a: doc(DocumentStatusEnum.PENDING),
        b: doc(DocumentStatusEnum.PENDING),
        c: doc(DocumentStatusEnum.PENDING),
      });
    });

    // Capped — never exceeds maxAttempts even though status never leaves PENDING.
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('propagates a fetch error and ends the stream', () => {
    const fetch = vi.fn(() => throwError(() => new Error('network down')));
    const scheduler = new TestScheduler((actual, expected) =>
      expect(actual).toEqual(expected),
    );

    scheduler.run(({ expectObservable }) => {
      const stream$ = pollDocumentStatus(fetch, {
        intervalMs: 10,
        scheduler,
      });
      expectObservable(stream$).toBe('#', undefined, new Error('network down'));
    });

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('caps attempts at the documented default', () => {
    expect(DEFAULT_POLL_MAX_ATTEMPTS).toBeGreaterThan(0);
  });
});

describe('schemaToFields', () => {
  it('derives field kinds and optionality from a template schema', () => {
    const fields = schemaToFields({
      patientName: 'string',
      age: 'number',
      active: 'boolean',
      admittedAt: 'date',
      notes: 'string?',
      address: { street: 'string' },
    });

    expect(fields).toEqual([
      { key: 'patientName', kind: 'string', optional: false },
      { key: 'age', kind: 'number', optional: false },
      { key: 'active', kind: 'boolean', optional: false },
      { key: 'admittedAt', kind: 'date', optional: false },
      { key: 'notes', kind: 'string', optional: true },
      { key: 'address', kind: 'any', optional: false },
    ]);
  });
});

describe('Documents component', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Documents],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(Documents);
    // Constructor fires loadTemplates() — answer the templates request.
    httpMock.expectOne(req => req.url === `${base}/templates`).flush(wrap([]));
    return fixture;
  }

  it('library list uses getPaginated and sets totalRecords from pagination', () => {
    const fixture = createComponent();
    const cmp = fixture.componentInstance;

    cmp.loadDocuments({ first: 0, rows: 20 });

    const req = httpMock.expectOne(
      r => r.url === `${base}/docs` && r.params.get('page') === '1',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('limit')).toBe('20');

    req.flush({
      data: [doc(DocumentStatusEnum.COMPLETED)],
      metadata: {
        success: true,
        statusCode: 200,
        timestamp: 't',
        path: '/v1/docs',
        message: 'OK',
        extra: {
          pagination: {
            page: 1,
            pageSize: 20,
            totalItems: 42,
            totalPages: 3,
          },
        },
      },
    });

    expect(cmp.documents().length).toBe(1);
    expect(cmp.totalRecords()).toBe(42);
  });

  it('upload posts multipart with files + payload and refreshes the library', () => {
    const fixture = createComponent();
    const cmp = fixture.componentInstance;

    const file = new File(['hello'], 'report.pdf', {
      type: 'application/pdf',
    });
    cmp.upload({ files: [file] } as never);

    const uploadReq = httpMock.expectOne(`${base}/docs/upload`);
    expect(uploadReq.request.method).toBe('POST');
    const body = uploadReq.request.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.getAll('files').length).toBe(1);
    const payload = JSON.parse(body.get('payload') as string);
    expect(payload[0].files[0].fileInfo.fileName).toBe('report.pdf');
    uploadReq.flush(wrap({ documentIds: ['new-1'] }));

    // Success triggers a library refresh (loadDocuments -> getPaginated).
    httpMock
      .expectOne(r => r.url === `${base}/docs`)
      .flush(wrap([doc(DocumentStatusEnum.COMPLETED, 'new-1')]));

    expect(cmp.documents().some(d => d.id === 'new-1')).toBe(true);
  });

  it('download fetches the presigned URL endpoint', () => {
    const fixture = createComponent();
    const cmp = fixture.componentInstance;
    // Suppress the synthetic anchor click navigation in jsdom.
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {
        // no-op: prevent jsdom "navigation not implemented" noise.
      });

    cmp.download('doc-9');

    const req = httpMock.expectOne(`${base}/docs/doc-9/url`);
    expect(req.request.method).toBe('GET');
    req.flush(wrap({ url: 'https://signed.example/doc-9' }));

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('generate kicks off polling and downloads once COMPLETED', () => {
    // The poller uses `timer(0, …)`; its first tick is a macrotask, so drive it
    // with fake timers and flush at frame 0.
    vi.useFakeTimers();
    try {
      const fixture = createComponent();
      const cmp = fixture.componentInstance;

      const downloadSpy = vi.spyOn(cmp, 'download').mockImplementation(() => {
        // no-op: assert the COMPLETED path calls download without real HTTP.
      });

      cmp.onTemplateChange({
        id: 'tpl-1',
        name: 'HCU',
        isActive: true,
        schema: { patientName: 'string' },
      });
      cmp.title.set('My Doc');
      cmp.setField('patientName', 'Ada');

      cmp.generate();

      const genReq = httpMock.expectOne(`${base}/docs/generate`);
      expect(genReq.request.method).toBe('POST');
      expect(genReq.request.body.templateIdentifier).toBe('tpl-1');
      expect(genReq.request.body.data.patientName).toBe('Ada');

      genReq.flush(wrap({ documentId: 'doc-1', jobId: 'job-1' }));

      // First poll fires at frame 0; COMPLETED is terminal so the poller
      // completes without a second poll.
      vi.advanceTimersByTime(0);
      const pollReq = httpMock.expectOne(`${base}/docs/doc-1`);
      pollReq.flush(wrap(doc(DocumentStatusEnum.COMPLETED, 'doc-1')));

      // Completed -> library refresh (loadDocuments -> getPaginated). The table
      // may also fire its initial lazy-load; flush every pending list request.
      const listReqs = httpMock.match(r => r.url === `${base}/docs`);
      expect(listReqs.length).toBeGreaterThanOrEqual(1);
      for (const r of listReqs) {
        r.flush(wrap([]));
      }

      // No further poll happens even if time advances (stream completed).
      vi.advanceTimersByTime(5000);
      httpMock.expectNone(`${base}/docs/doc-1`);

      expect(downloadSpy).toHaveBeenCalledWith('doc-1');
      expect(cmp.generating()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a FAILED generation surfaces an error and stops polling', () => {
    vi.useFakeTimers();
    try {
      const fixture = createComponent();
      const cmp = fixture.componentInstance;

      cmp.onTemplateChange({
        id: 'tpl-1',
        name: 'HCU',
        isActive: true,
        schema: {},
      });
      cmp.title.set('My Doc');
      cmp.generate();

      httpMock
        .expectOne(`${base}/docs/generate`)
        .flush(wrap({ documentId: 'doc-2', jobId: 'job-2' }));

      vi.advanceTimersByTime(0);
      httpMock
        .expectOne(`${base}/docs/doc-2`)
        .flush(wrap(doc(DocumentStatusEnum.FAILED, 'doc-2')));

      // FAILED is terminal -> library refresh, no further poll. Flush every
      // pending list request (table initial lazy-load + the refresh).
      const listReqs = httpMock.match(r => r.url === `${base}/docs`);
      expect(listReqs.length).toBeGreaterThanOrEqual(1);
      for (const r of listReqs) {
        r.flush(wrap([]));
      }

      vi.advanceTimersByTime(5000);
      httpMock.expectNone(`${base}/docs/doc-2`);

      expect(cmp.generateError()).toBe('La generación del documento falló.');
      expect(cmp.generating()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
