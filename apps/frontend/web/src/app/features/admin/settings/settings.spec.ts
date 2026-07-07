import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { SettingsCategoryEnum } from '@hsm/common/enums';

import { environment } from '../../../../environments/environment';
import type { SuccessResponse } from '../../../core/api/response';
import { provideTranslocoTestingModule } from '../../../core/i18n/transloco-testing';
import { AdminSettings } from './settings';
import type {
  GetSettingsResponse,
  UpdateSettingsPayload,
} from './settings.types';

const base = environment.apiBaseUrl;

/** Backend masked-secret placeholder (mirrors `SECRET_MASK`). */
const SECRET_MASK = '********';

function wrap<T>(data: T): SuccessResponse<T> {
  return {
    data,
    metadata: {
      success: true,
      statusCode: 200,
      timestamp: '2026-06-24T00:00:00.000Z',
      path: '/v1/settings',
      message: 'OK',
    },
  };
}

const emailResponse: GetSettingsResponse = {
  category: SettingsCategoryEnum.EMAIL,
  settings: [
    {
      key: 'SMTP_ADDRESS',
      category: SettingsCategoryEnum.EMAIL,
      value: 'smtp.hsm.org',
      isSecret: false,
      isSet: true,
    },
    {
      key: 'SMTP_PASSWORD',
      category: SettingsCategoryEnum.EMAIL,
      // Stored secret -> masked placeholder, never the real value.
      value: SECRET_MASK,
      isSecret: true,
      isSet: true,
    },
  ],
};

type SettingsHandle = {
  fields: () => Array<{
    item: { key: string; isSecret: boolean };
    draft: string;
    dirty: boolean;
  }>;
  onFieldInput: (field: { item: { key: string } }, value: string) => void;
  save: () => void;
};

describe('AdminSettings component', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminSettings],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        ...provideTranslocoTestingModule(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function createWithInitialLoad(): {
    cmp: SettingsHandle;
    fixture: ReturnType<typeof TestBed.createComponent<AdminSettings>>;
  } {
    // Instantiating the component runs its constructor, which kicks off the
    // initial category load. We deliberately do NOT call `detectChanges()`:
    // rendering the PrimeNG tabs template needs a `ResizeObserver`, which the
    // jsdom test env lacks — and these specs exercise the TS load/save logic,
    // not the template.
    const fixture = TestBed.createComponent(AdminSettings);
    const cmp = fixture.componentInstance as unknown as SettingsHandle;

    // Initial load fires for the first category (EMAIL).
    const req = httpMock.expectOne(
      `${base}/settings?category=${SettingsCategoryEnum.EMAIL}`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(wrap(emailResponse));

    return { cmp, fixture };
  }

  it('shows a masked placeholder for a stored secret, never the real value', () => {
    const { cmp } = createWithInitialLoad();

    const secret = cmp.fields().find(f => f.item.key === 'SMTP_PASSWORD');

    expect(secret).toBeDefined();
    expect(secret?.item.isSecret).toBe(true);
    // The editable draft starts BLANK — the real/masked value is never an
    // editable field value the user could submit back verbatim.
    expect(secret?.draft).toBe('');
    expect(secret?.draft).not.toContain(SECRET_MASK);
  });

  it('omits an untouched secret from the PUT payload (leaves it unchanged)', () => {
    const { cmp } = createWithInitialLoad();

    // Edit only the non-secret field; leave the secret untouched.
    const smtp = cmp.fields().find(f => f.item.key === 'SMTP_ADDRESS');
    cmp.onFieldInput(smtp as never, 'smtp.new.org');

    cmp.save();

    const req = httpMock.expectOne(`${base}/settings`);
    expect(req.request.method).toBe('PUT');
    const body = req.request.body as UpdateSettingsPayload;

    const keys = body.settings.map(s => s.key);
    expect(keys).toContain('SMTP_ADDRESS');
    // Untouched secret is NOT in the payload -> backend leaves it unchanged.
    expect(keys).not.toContain('SMTP_PASSWORD');
    expect(body.settings.find(s => s.key === 'SMTP_ADDRESS')?.value).toBe(
      'smtp.new.org',
    );

    // Reload after save.
    req.flush(wrap(emailResponse));
  });

  it('includes a secret in the payload only when the admin types a value', () => {
    const { cmp } = createWithInitialLoad();

    const secret = cmp.fields().find(f => f.item.key === 'SMTP_PASSWORD');
    cmp.onFieldInput(secret as never, 'new-secret');

    cmp.save();

    const req = httpMock.expectOne(`${base}/settings`);
    const body = req.request.body as UpdateSettingsPayload;
    const sent = body.settings.find(s => s.key === 'SMTP_PASSWORD');

    expect(sent).toBeDefined();
    expect(sent?.value).toBe('new-secret');

    req.flush(wrap(emailResponse));
  });

  it('persists an edited non-secret value and reflects it on reload', () => {
    const { cmp } = createWithInitialLoad();

    const smtp = cmp.fields().find(f => f.item.key === 'SMTP_ADDRESS');
    cmp.onFieldInput(smtp as never, 'smtp.updated.org');
    cmp.save();

    const req = httpMock.expectOne(`${base}/settings`);
    const body = req.request.body as UpdateSettingsPayload;
    expect(body.settings.find(s => s.key === 'SMTP_ADDRESS')?.value).toBe(
      'smtp.updated.org',
    );

    // Backend returns the persisted value on the post-save reload.
    const reloaded: GetSettingsResponse = {
      category: SettingsCategoryEnum.EMAIL,
      settings: [
        {
          key: 'SMTP_ADDRESS',
          category: SettingsCategoryEnum.EMAIL,
          value: 'smtp.updated.org',
          isSecret: false,
          isSet: true,
        },
        emailResponse.settings[1],
      ],
    };
    req.flush(wrap(reloaded));

    const refreshed = cmp.fields().find(f => f.item.key === 'SMTP_ADDRESS');
    expect(refreshed?.draft).toBe('smtp.updated.org');
    expect(refreshed?.dirty).toBe(false);
  });
});
