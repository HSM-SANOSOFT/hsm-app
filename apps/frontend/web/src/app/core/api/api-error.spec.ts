import { TestBed } from '@angular/core/testing';
import { ApiErrorCode } from '@hsm/common/enums';
import { TranslocoService } from '@jsverse/transloco';
import { provideTranslocoTestingModule } from '../i18n/transloco-testing';
import { issueToMessage } from './api-error';

describe('issueToMessage', () => {
  let transloco: TranslocoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...provideTranslocoTestingModule()],
    });
    transloco = TestBed.inject(TranslocoService);
  });

  it('localizes a known code (ignoring the raw server message)', () => {
    const msg = issueToMessage(
      transloco,
      { code: ApiErrorCode.InvalidCredentials, message: 'Bad creds' },
      'fallback',
    );
    // localized copy, not the English server text
    expect(msg).not.toBe('Bad creds');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('prefers structured validation errors over the code', () => {
    const msg = issueToMessage(
      transloco,
      {
        code: ApiErrorCode.Validation,
        message: ['email must be an email'],
        errors: [{ field: 'email', constraints: ['isEmail'] }],
      },
      'fallback',
    );
    // the per-constraint localized message, not the generic validation copy
    expect(msg).toBe(
      issueToMessage(
        transloco,
        { errors: [{ field: 'email', constraints: ['isEmail'] }] },
        'fallback',
      ),
    );
    expect(msg.length).toBeGreaterThan(0);
  });

  it('preserves the server message for an unknown/legacy code', () => {
    const msg = issueToMessage(
      transloco,
      {
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid credentials provided.',
      },
      'fallback',
    );
    expect(msg).toBe('Invalid credentials provided.');
  });

  it('falls back to the server message when no code is present', () => {
    expect(
      issueToMessage(transloco, { message: 'Something broke' }, 'fallback'),
    ).toBe('Something broke');
  });

  it('uses the fallback when the issue is undefined', () => {
    expect(issueToMessage(transloco, undefined, 'fallback')).toBe('fallback');
  });
});
