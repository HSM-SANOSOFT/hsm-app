import { registerLocaleData } from '@angular/common';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import localeEn from '@angular/common/locales/en';
import localeEsEc from '@angular/common/locales/es-EC';
import {
  type ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  inject,
  isDevMode,
  LOCALE_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { PrimeNG, providePrimeNG } from 'primeng/config';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import { HsmPreset } from '../theme/hsm-preset';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';
import { LANG_STORAGE_KEY } from './core/i18n/language.service';
import { primeNgTranslationFor } from './core/i18n/primeng-translations';
import { TranslocoHttpLoader } from './core/i18n/transloco-loader';

// Register locale data for Angular's date/number/currency pipes (independent of
// Transloco's text i18n). LOCALE_ID below picks which one formats by default.
registerLocaleData(localeEsEc, 'es-EC');
registerLocaleData(localeEn, 'en');

/** The persisted UI language at boot, normalized to an Angular LOCALE_ID. */
function bootLocaleId(): string {
  try {
    return localStorage.getItem(LANG_STORAGE_KEY) === 'en' ? 'en' : 'es-EC';
  } catch {
    return 'es-EC';
  }
}

/**
 * Root application providers.
 *
 * - Zoneless change detection (Angular 21 default, declared explicitly).
 * - `provideHttpClient(withFetch(), withInterceptors([authInterceptor]))` —
 *   the U8 auth interceptor attaches the AT and performs the single-in-flight
 *   refresh (KTD2).
 * - `provideAppInitializer` rehydrates the session on boot: if a token is
 *   persisted, the profile is loaded before the first route resolves so guards
 *   see the correct auth state.
 * - PrimeNG with the Aura theme preset.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideTransloco({
      config: {
        availableLangs: ['es', 'en'],
        defaultLang: 'es',
        fallbackLang: 'es',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        missingHandler: { logMissingKey: true, useFallbackTranslation: true },
      },
      loader: TranslocoHttpLoader,
    }),
    { provide: LOCALE_ID, useValue: bootLocaleId() },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'USD' },
    provideAppInitializer(() => {
      const auth = inject(AuthService);
      return firstValueFrom(auth.restoreSession());
    }),
    provideAppInitializer(() => {
      // Re-apply PrimeNG chrome copy on every Transloco language change.
      const primeng = inject(PrimeNG);
      const transloco = inject(TranslocoService);
      transloco.langChanges$.subscribe(lang => {
        primeng.setTranslation(
          primeNgTranslationFor(lang === 'en' ? 'en' : 'es'),
        );
      });
    }),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: HsmPreset,
        options: {
          // All-day light operations console; no dark-mode toggle.
          darkModeSelector: false,
          // Keep PrimeNG utilities below app styles so our chrome wins.
          cssLayer: { name: 'primeng', order: 'theme, base, primeng' },
        },
      },
    }),
    // PWA service worker — registered in production only (orthogonal to the
    // zoneless setup). Disabled in dev/test so the SW never intercepts the dev
    // server or TestBed. U15 owns the offline caching strategy + SwUpdate flow;
    // here it is asset-only via ngsw-config.json.
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
