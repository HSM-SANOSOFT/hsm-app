import { TestBed } from '@angular/core/testing';
import { ApiErrorCode } from '@hsm/common/enums';
import { TranslocoService } from '@jsverse/transloco';
import { apiMessage, validationMessage } from './api-messages';
import { provideTranslocoTestingModule } from './transloco-testing';

describe('apiMessage', () => {
  let transloco: TranslocoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...provideTranslocoTestingModule()],
    });
    transloco = TestBed.inject(TranslocoService);
  });

  it('returns a non-empty string for a known code', () => {
    expect(
      apiMessage(transloco, ApiErrorCode.InvalidCredentials).length,
    ).toBeGreaterThan(0);
  });
  it('falls back for an unknown code', () => {
    expect(apiMessage(transloco, 'NOPE.NOPE').length).toBeGreaterThan(0);
  });
});

describe('validationMessage', () => {
  let transloco: TranslocoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...provideTranslocoTestingModule()],
    });
    transloco = TestBed.inject(TranslocoService);
  });

  it('maps a known constraint key', () => {
    expect(validationMessage(transloco, 'isNotEmpty').length).toBeGreaterThan(
      0,
    );
  });
  it('falls back for an unknown key', () => {
    expect(validationMessage(transloco, 'weirdo').length).toBeGreaterThan(0);
  });
});
