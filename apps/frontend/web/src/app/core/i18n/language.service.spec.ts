import { LANG_STORAGE_KEY, resolveBootLocale } from './language.service';

describe('resolveBootLocale', () => {
  it('defaults to es when nothing is set', () => {
    expect(resolveBootLocale('/', null)).toBe('es');
  });
  it('uses the stored locale when valid', () => {
    expect(resolveBootLocale('/', 'en')).toBe('en');
  });
  it('ignores an unsupported stored value', () => {
    expect(resolveBootLocale('/', 'pt')).toBe('es');
  });
  it('prefers the URL prefix over storage', () => {
    expect(resolveBootLocale('/en/workspace', 'es')).toBe('en');
  });
  it('exposes the storage key', () => {
    expect(LANG_STORAGE_KEY).toBe('hsm.lang');
  });
});
