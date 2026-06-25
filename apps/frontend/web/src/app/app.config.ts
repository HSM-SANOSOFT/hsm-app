import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import {
  type ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { providePrimeNG } from 'primeng/config';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import { HsmPreset } from '../theme/hsm-preset';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';

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
    provideAppInitializer(() => {
      const auth = inject(AuthService);
      return firstValueFrom(auth.restoreSession());
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
