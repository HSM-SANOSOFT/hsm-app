import { LANG_STORAGE_KEY, resolveBootLang } from './language.service';

describe('resolveBootLang', () => {
  it('defaults to es when nothing stored', () => {
    expect(resolveBootLang(null)).toBe('es');
  });
  it('honors a stored supported lang', () => {
    expect(resolveBootLang('en')).toBe('en');
  });
  it('falls back to es for an unknown stored value', () => {
    expect(resolveBootLang('de')).toBe('es');
  });
  it('exposes the storage key', () => {
    expect(LANG_STORAGE_KEY).toBe('hsm.lang');
  });
});
