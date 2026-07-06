import { ApiErrorCode } from '@hsm/common/enums';
import { apiMessage, validationMessage } from './api-messages';

describe('apiMessage', () => {
  it('returns a non-empty string for a known code', () => {
    expect(apiMessage(ApiErrorCode.InvalidCredentials).length).toBeGreaterThan(
      0,
    );
  });
  it('falls back for an unknown code', () => {
    expect(apiMessage('NOPE.NOPE').length).toBeGreaterThan(0);
  });
});

describe('validationMessage', () => {
  it('maps a known constraint key', () => {
    expect(validationMessage('isNotEmpty').length).toBeGreaterThan(0);
  });
  it('falls back for an unknown key', () => {
    expect(validationMessage('weirdo').length).toBeGreaterThan(0);
  });
});
