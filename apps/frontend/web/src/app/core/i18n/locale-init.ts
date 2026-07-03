import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeEsEc from '@angular/common/locales/es-EC';

export type AppLocale = 'es' | 'en';

/**
 * The locale baked into THIS build. In a localized build `$localize.locale` is
 * the target locale id ('en'); in the source build it is 'es-EC'. Normalize to
 * our two-letter app locale.
 */
export function activeLocale(): AppLocale {
  const id = ($localize as unknown as { locale?: string }).locale ?? 'es-EC';
  return id.toLowerCase().startsWith('en') ? 'en' : 'es';
}

export function registerAppLocales(): void {
  registerLocaleData(localeEsEc, 'es-EC');
  registerLocaleData(localeEn, 'en');
}
