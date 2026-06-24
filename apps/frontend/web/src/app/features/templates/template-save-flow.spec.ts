import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute } from '@angular/router';
import { TemplateCategoriesEnum } from '@hsm/common/enums';

import { environment } from '../../../environments/environment';
import type { SuccessResponse } from '../../core/api/response';
import { MONACO_LOADER, type MonacoLike } from './monaco-editor';
import type { SaveRequest } from './template.types';
import { deriveSchemaFromSampleData } from './template-preview.util';
import { TemplateSaveFlow } from './template-save-flow';
import { Templates } from './templates';

const base = environment.apiBaseUrl;

function wrap<T>(data: T): SuccessResponse<T> {
  return {
    data,
    metadata: {
      success: true,
      statusCode: 200,
      timestamp: '2026-06-24T00:00:00.000Z',
      path: '/v1/templates',
      message: 'OK',
    },
  };
}

// Monaco is stubbed via the MONACO_LOADER token (the editor child lazy-imports
// it; the Angular unit-test builder pre-bundles that import so vi.mock can't
// intercept it — overriding the loader keeps the real module out of tests).
const noop = (): void => undefined;
const stubMonaco: MonacoLike = {
  editor: {
    create: () => ({
      getValue: () => '',
      setValue: noop,
      onDidChangeModelContent: () => ({ dispose: noop }),
      dispose: noop,
    }),
  },
};
const provideStubMonaco = {
  provide: MONACO_LOADER,
  useValue: () => Promise.resolve(stubMonaco),
};

// --- sampleData -> schema derivation (helper, unit-tested directly) -----------

describe('deriveSchemaFromSampleData (U14)', () => {
  it('maps primitive leaves to their mini-schema tags', () => {
    expect(
      deriveSchemaFromSampleData({
        name: 'Ada',
        age: 36,
        active: true,
      }),
    ).toEqual({ name: 'string', age: 'number', active: 'boolean' });
  });

  it('treats null and undefined as "any"', () => {
    expect(deriveSchemaFromSampleData({ a: null, b: undefined })).toEqual({
      a: 'any',
      b: 'any',
    });
  });

  it('recurses into nested objects', () => {
    expect(
      deriveSchemaFromSampleData({ address: { street: 'X', city: 'Y' } }),
    ).toEqual({ address: { street: 'string', city: 'string' } });
  });

  it('derives a single-element list schema from arrays', () => {
    expect(deriveSchemaFromSampleData({ tags: ['a', 'b'] })).toEqual({
      tags: ['string'],
    });
  });

  it('uses ["any"] for an empty array', () => {
    expect(deriveSchemaFromSampleData({ tags: [] })).toEqual({
      tags: ['any'],
    });
  });

  it('round-trips: derive then matches a flat sample shape', () => {
    const sample = { patientName: 'Ada', age: 36, diagnoses: ['flu'] };
    expect(deriveSchemaFromSampleData(sample)).toEqual({
      patientName: 'string',
      age: 'number',
      diagnoses: ['string'],
    });
  });
});

// --- The save-gate flow (AE1, AE2) -------------------------------------------

describe('Templates save gate (U14, R17; AE1, AE2)', () => {
  let httpMock: HttpTestingController;
  let host: Templates;

  function setup(identifier: string | null = null): void {
    TestBed.configureTestingModule({
      imports: [Templates],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideStubMonaco,
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: { get: () => identifier } },
          },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(Templates);
    fixture.detectChanges();
    // The embedded editor fires the BASE-templates request on init.
    httpMock.expectOne(`${base}/templates?category=BASE`).flush(wrap([]));
    host = fixture.componentInstance;
  }

  afterEach(() => {
    httpMock.verify();
  });

  function asHost(): {
    onSave: (r: SaveRequest) => void;
    confirmSave: () => void;
    cancelSave: () => void;
    confirmVisible: boolean;
    confirmHtml: () => string;
    saveError: () => string | null;
  } {
    return host as unknown as {
      onSave: (r: SaveRequest) => void;
      confirmSave: () => void;
      cancelSave: () => void;
      confirmVisible: boolean;
      confirmHtml: () => string;
      saveError: () => string | null;
    };
  }

  const newRequest: SaveRequest = {
    loadedId: null,
    name: 'Welcome',
    description: 'A greeting',
    category: TemplateCategoriesEnum.BASE,
    content: '<p>{{name}}</p>',
    baseTemplateId: undefined,
    sampleData: { name: 'Ada' },
  };

  it('AE1: Save calls draft-render and persists NOTHING before confirm', () => {
    setup();
    const h = asHost();
    h.onSave(newRequest);

    const draftReq = httpMock.expectOne(`${base}/templates/draft-render`);
    expect(draftReq.request.method).toBe('POST');
    expect(draftReq.request.body).toEqual({
      content: '<p>{{name}}</p>',
      baseTemplateId: undefined,
      sampleData: { name: 'Ada' },
    });
    draftReq.flush(wrap({ html: '<main><p>Ada</p></main>' }));

    // The TRUE server HTML is shown; no persist call has fired.
    expect(h.confirmVisible).toBe(true);
    expect(h.confirmHtml()).toBe('<main><p>Ada</p></main>');
    httpMock.expectNone(
      r => r.url === `${base}/templates` && r.method !== 'GET',
    );
  });

  it('AE1: persist fires only AFTER confirm (CREATE)', () => {
    setup();
    const h = asHost();
    h.onSave(newRequest);
    httpMock
      .expectOne(`${base}/templates/draft-render`)
      .flush(wrap({ html: '<x/>' }));

    // Still nothing persisted.
    httpMock.expectNone(
      r => r.url === `${base}/templates` && r.method === 'POST',
    );

    h.confirmSave();
    const createReq = httpMock.expectOne(
      r => r.url === `${base}/templates` && r.method === 'POST',
    );
    expect(createReq.request.body).toEqual({
      category: TemplateCategoriesEnum.BASE,
      name: 'Welcome',
      schema: { name: 'string' },
      content: '<p>{{name}}</p>',
      description: 'A greeting',
    });
    createReq.flush(wrap({ id: 't-new' }));
    expect(h.confirmVisible).toBe(false);
  });

  it('AE1: confirm on an existing template issues a PUT update', () => {
    setup();
    const h = asHost();
    h.onSave({
      ...newRequest,
      loadedId: 't-1',
      category: TemplateCategoriesEnum.EMAIL_INTERNAL,
      baseTemplateId: 'b-1',
    });
    httpMock
      .expectOne(`${base}/templates/draft-render`)
      .flush(wrap({ html: '<x/>' }));

    h.confirmSave();
    const putReq = httpMock.expectOne(
      r => r.url === `${base}/templates/t-1` && r.method === 'PUT',
    );
    expect(putReq.request.body).toEqual({
      name: 'Welcome',
      category: TemplateCategoriesEnum.EMAIL_INTERNAL,
      content: '<p>{{name}}</p>',
      schema: { name: 'string' },
      description: 'A greeting',
      baseTemplateId: 'b-1',
    });
    putReq.flush(wrap({ id: 't-1' }));
    expect(h.confirmVisible).toBe(false);
  });

  it('AE1/AE2: Cancel persists nothing and keeps editor state', () => {
    setup();
    const h = asHost();
    h.onSave(newRequest);
    httpMock
      .expectOne(`${base}/templates/draft-render`)
      .flush(wrap({ html: '<server/>' }));
    expect(h.confirmVisible).toBe(true);

    h.cancelSave();

    expect(h.confirmVisible).toBe(false);
    // No persist call whatsoever.
    httpMock.expectNone(
      r => r.url === `${base}/templates` && r.method !== 'GET',
    );
  });

  it('AE2: the confirm dialog shows the server HTML (can differ from client preview)', () => {
    setup();
    const h = asHost();
    // Client preview of '<p>{{name}}</p>' would be '<p>Ada</p>'; the server adds
    // base composition the client never saw.
    h.onSave(newRequest);
    httpMock
      .expectOne(`${base}/templates/draft-render`)
      .flush(wrap({ html: '<base><p>Ada</p></base>' }));

    expect(h.confirmHtml()).toBe('<base><p>Ada</p></base>');
    expect(h.confirmHtml()).not.toBe('<p>Ada</p>');

    // Author can still cancel to keep editing.
    h.cancelSave();
    expect(h.confirmVisible).toBe(false);
  });

  it('surfaces a draft-render error WITHOUT persisting (no dialog)', () => {
    setup();
    const h = asHost();
    h.onSave(newRequest);

    httpMock
      .expectOne(`${base}/templates/draft-render`)
      .flush(
        { metadata: {}, issue: { message: 'Handlebars syntax error' } },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(h.confirmVisible).toBe(false);
    expect(h.saveError()).toContain('Handlebars syntax error');
    httpMock.expectNone(
      r => r.url === `${base}/templates` && r.method !== 'GET',
    );
  });

  it('does not persist when draft-render 404s on a bad baseTemplateId', () => {
    setup();
    const h = asHost();
    h.onSave({ ...newRequest, baseTemplateId: 'missing' });

    httpMock
      .expectOne(`${base}/templates/draft-render`)
      .flush(
        { metadata: {}, issue: { message: 'Base template not found' } },
        { status: 404, statusText: 'Not Found' },
      );

    expect(h.confirmVisible).toBe(false);
    expect(h.saveError()).toContain('Base template not found');
    httpMock.expectNone(
      r => r.url === `${base}/templates` && r.method !== 'GET',
    );
  });
});

describe('TemplateSaveFlow service', () => {
  let httpMock: HttpTestingController;
  let flow: TemplateSaveFlow;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    flow = TestBed.inject(TemplateSaveFlow);
  });

  afterEach(() => httpMock.verify());

  it('draftRender returns the server html', () => {
    let html: string | undefined;
    flow.draftRender({ content: '<p/>' }).subscribe(h => {
      html = h;
    });
    httpMock
      .expectOne(`${base}/templates/draft-render`)
      .flush(wrap({ html: '<composed/>' }));
    expect(html).toBe('<composed/>');
  });
});
