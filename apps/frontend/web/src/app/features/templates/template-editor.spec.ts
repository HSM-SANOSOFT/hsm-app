import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { TemplateCategoriesEnum } from '@hsm/common/enums';
import { TranslocoService } from '@jsverse/transloco';

import { environment } from '../../../environments/environment';
import type { SuccessResponse } from '../../core/api/response';
import { provideTranslocoTestingModule } from '../../core/i18n/transloco-testing';
import { TemplateEditor } from './editor/template-editor';
import { MONACO_LOADER, type MonacoLike } from './monaco-editor';
import type { TemplateDetail, TemplateWithBase } from './template.types';
import {
  buildPreviewSrcdoc,
  composeTemplatePreview,
  renderPreview,
  seedSampleDataFromSchema,
} from './template-preview.util';

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

// Monaco is stubbed via the MONACO_LOADER token: the Angular unit-test builder
// pre-bundles the wrapper's dynamic `import('monaco-editor')`, so `vi.mock`
// can't intercept it (the real, worker-laden module would load and reject
// after teardown). Overriding the loader keeps the real module out of tests.
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

describe('seedSampleDataFromSchema (R15 / AE5)', () => {
  const fixedNow = new Date('2026-06-24T12:00:00.000Z');

  it('maps every primitive tag to a sample value', () => {
    const schema = {
      patientName: 'string',
      age: 'number',
      active: 'boolean',
      bornAt: 'date',
      anything: 'any',
    };
    expect(seedSampleDataFromSchema(schema, fixedNow)).toEqual({
      patientName: '',
      age: 0,
      active: false,
      bornAt: fixedNow.toISOString(),
      anything: null,
    });
  });

  it('treats optional (?-suffixed) tags like their base type', () => {
    expect(seedSampleDataFromSchema({ note: 'string?' }, fixedNow)).toEqual({
      note: '',
    });
  });

  it('recurses into nested objects', () => {
    const schema = { address: { street: 'string', city: 'string' } };
    expect(seedSampleDataFromSchema(schema, fixedNow)).toEqual({
      address: { street: '', city: '' },
    });
  });

  it('seeds a single sample item for array schemas', () => {
    expect(
      seedSampleDataFromSchema({ diagnoses: ['string'] }, fixedNow),
    ).toEqual({ diagnoses: [''] });
  });
});

describe('composeTemplatePreview / renderPreview (R16)', () => {
  let transloco: TranslocoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...provideTranslocoTestingModule()],
    });
    transloco = TestBed.inject(TranslocoService);
  });

  it('compiles standalone content against sample data', () => {
    const html = composeTemplatePreview({
      content: '<p>Hola {{patientName}}</p>',
      data: { patientName: 'Ada' },
    });
    expect(html).toBe('<p>Hola Ada</p>');
  });

  it('wraps content in a base template via {{body}}', () => {
    // Mirrors the server `composeTemplate` util exactly: `noEscape: false`, so
    // the `{{body}}` interpolation HTML-escapes the child output. Authors use
    // the triple-stache (`{{{body}}}`) in a base to emit raw HTML; this asserts
    // the default (escaped) path matches the server's behavior, not a bug.
    const html = composeTemplatePreview({
      content: '<p>{{patientName}}</p>',
      baseContent: '<main>{{body}}</main>',
      data: { patientName: 'Ada' },
    });
    expect(html).toBe('<main>&lt;p&gt;Ada&lt;/p&gt;</main>');
  });

  it('emits raw child HTML when the base uses the triple-stache', () => {
    const html = composeTemplatePreview({
      content: '<p>{{patientName}}</p>',
      baseContent: '<main>{{{body}}}</main>',
      data: { patientName: 'Ada' },
    });
    expect(html).toBe('<main><p>Ada</p></main>');
  });

  it('renderPreview parses JSON sample data and composes ok', () => {
    const result = renderPreview(transloco, {
      content: '<p>{{name}}</p>',
      rawSampleData: '{"name":"Ada"}',
    });
    expect(result).toEqual({ ok: true, html: '<p>Ada</p>' });
  });

  it('renderPreview reports invalid JSON without throwing', () => {
    const result = renderPreview(transloco, {
      content: '<p>{{name}}</p>',
      rawSampleData: '{ not json',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('JSON de datos de muestra inválido');
    }
  });

  it('buildPreviewSrcdoc returns the html for an ok result', () => {
    expect(buildPreviewSrcdoc({ ok: true, html: '<b>hi</b>' })).toBe(
      '<b>hi</b>',
    );
  });
});

describe('TemplateEditor component', () => {
  let httpMock: HttpTestingController;

  function setup(): TemplateEditor {
    TestBed.configureTestingModule({
      imports: [TemplateEditor],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideStubMonaco,
        ...provideTranslocoTestingModule(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(TemplateEditor);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('lists BASE-category templates in the base selector (R12)', () => {
    const cmp = setup() as unknown as {
      baseTemplates: () => { label: string; value: string; content: string }[];
    };

    const req = httpMock.expectOne(
      r =>
        r.url === `${base}/templates` &&
        r.params.get('category') === TemplateCategoriesEnum.BASE,
    );
    const bases: TemplateDetail[] = [
      {
        id: 'b1',
        category: TemplateCategoriesEnum.BASE,
        name: 'Letterhead',
        isActive: true,
        schema: {},
        content: '<main>{{body}}</main>',
        metadata: null,
      },
    ];
    req.flush(wrap(bases));

    expect(cmp.baseTemplates()).toEqual([
      { label: 'Letterhead', value: 'b1', content: '<main>{{body}}</main>' },
    ]);
  });

  it('seeds the sample-data panel from a loaded template schema (AE5)', () => {
    const cmp = setup() as unknown as {
      applyLoadedTemplate: (t: TemplateDetail) => void;
      sampleDataJson: () => string;
    };
    // Consume the base-template request fired on init.
    httpMock.expectOne(`${base}/templates?category=BASE`).flush(wrap([]));

    cmp.applyLoadedTemplate({
      id: 't1',
      category: TemplateCategoriesEnum.DOCS,
      name: 'Discharge',
      isActive: true,
      schema: { patientName: 'string', age: 'number' },
      content: '<p>{{patientName}}</p>',
      metadata: null,
    });

    const seeded = JSON.parse(cmp.sampleDataJson());
    expect(seeded).toEqual({ patientName: '', age: 0 });
  });

  it('renders the preview into an allow-scripts-only sandboxed iframe (KTD7)', () => {
    TestBed.configureTestingModule({
      imports: [TemplateEditor],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideStubMonaco,
        ...provideTranslocoTestingModule(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(TemplateEditor);
    fixture.detectChanges();
    httpMock.expectOne(`${base}/templates?category=BASE`).flush(wrap([]));

    const iframe: HTMLIFrameElement = fixture.nativeElement.querySelector(
      '[data-testid="preview-iframe"]',
    );
    expect(iframe).toBeTruthy();
    const sandbox = iframe.getAttribute('sandbox');
    expect(sandbox).toBe('allow-scripts');
    expect(sandbox).not.toContain('allow-same-origin');
  });

  it('emits the full SaveRequest from the Save seam (R17)', () => {
    const cmp = setup() as unknown as {
      name: { set: (v: string) => void };
      description: { set: (v: string) => void };
      category: { set: (v: TemplateCategoriesEnum) => void };
      content: { set: (v: string) => void };
      sampleDataJson: { set: (v: string) => void };
      baseTemplateId: { set: (v: string | null) => void };
      onSave: () => void;
      save: { subscribe: (cb: (p: unknown) => void) => void };
    };
    httpMock.expectOne(`${base}/templates?category=BASE`).flush(wrap([]));

    cmp.name.set('Welcome');
    cmp.description.set('A greeting');
    cmp.category.set(TemplateCategoriesEnum.EMAIL_INTERNAL);
    cmp.content.set('<p>{{name}}</p>');
    cmp.sampleDataJson.set('{"name":"Ada"}');
    cmp.baseTemplateId.set('b1');

    let emitted: unknown;
    cmp.save.subscribe(p => {
      emitted = p;
    });
    cmp.onSave();

    expect(emitted).toEqual({
      loadedId: null,
      name: 'Welcome',
      description: 'A greeting',
      category: TemplateCategoriesEnum.EMAIL_INTERNAL,
      content: '<p>{{name}}</p>',
      baseTemplateId: 'b1',
      sampleData: { name: 'Ada' },
    });
  });
});

// Type-only reference so the import is exercised in the spec.
const _typeCheck: TemplateWithBase | null = null;
void _typeCheck;
