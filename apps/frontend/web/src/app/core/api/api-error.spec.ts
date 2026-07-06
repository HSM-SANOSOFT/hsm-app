import { ApiErrorCode } from '@hsm/common/enums';
import { issueToMessage } from './api-error';

describe('issueToMessage', () => {
  it('localizes a known code (ignoring the raw server message)', () => {
    const msg = issueToMessage(
      { code: ApiErrorCode.InvalidCredentials, message: 'Bad creds' },
      'fallback',
    );
    // localized copy, not the English server text
    expect(msg).not.toBe('Bad creds');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('prefers structured validation errors over the code', () => {
    const msg = issueToMessage(
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
        { errors: [{ field: 'email', constraints: ['isEmail'] }] },
        'fallback',
      ),
    );
    expect(msg.length).toBeGreaterThan(0);
  });

  it('preserves the server message for an unknown/legacy code', () => {
    const msg = issueToMessage(
      {
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid credentials provided.',
      },
      'fallback',
    );
    expect(msg).toBe('Invalid credentials provided.');
  });

  it('falls back to the server message when no code is present', () => {
    expect(issueToMessage({ message: 'Something broke' }, 'fallback')).toBe(
      'Something broke',
    );
  });

  it('uses the fallback when the issue is undefined', () => {
    expect(issueToMessage(undefined, 'fallback')).toBe('fallback');
  });
});
