import { type EnvironmentProviders, importProvidersFrom } from '@angular/core';
import { type Translation, TranslocoTestingModule } from '@jsverse/transloco';
import en from '../../../../public/i18n/en.json';
import es from '../../../../public/i18n/es.json';

/**
 * Providers for specs whose component tree injects `TranslocoService` (e.g. via
 * the language switcher) or renders the `transloco` pipe/directive. Loads the
 * real `public/i18n/*.json` catalogs so assertions read the actual copy;
 * defaults to Spanish (the app default). Spread into a TestBed `providers` array.
 */
export function provideTranslocoTestingModule(
  lang: 'es' | 'en' = 'es',
): EnvironmentProviders[] {
  return [
    importProvidersFrom(
      TranslocoTestingModule.forRoot({
        langs: { es: es as Translation, en: en as Translation },
        translocoConfig: { availableLangs: ['es', 'en'], defaultLang: lang },
        preloadLangs: true,
      }),
    ),
  ];
}
