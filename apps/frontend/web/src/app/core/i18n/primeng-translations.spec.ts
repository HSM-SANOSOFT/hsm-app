import { primeNgTranslationFor } from './primeng-translations';

describe('primeNgTranslationFor', () => {
  it('returns Spanish for es', () => {
    expect(primeNgTranslationFor('es').clear).toBe('Limpiar');
  });
  it('returns English for en', () => {
    expect(primeNgTranslationFor('en').clear).toBe('Clear');
  });
});
