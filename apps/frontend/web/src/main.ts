import '@angular/localize/init';
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { configureMonacoEnvironment } from './app/core/editor/monaco-setup';
import {
  LANG_STORAGE_KEY,
  resolveBootLocale,
} from './app/core/i18n/language.service';

// If the URL has no locale prefix, redirect into the persisted/default locale
// build. The static server serves each locale under /es/ and /en/.
{
  const first = window.location.pathname.split('/').filter(Boolean)[0];
  if (first !== 'es' && first !== 'en') {
    const locale = resolveBootLocale(
      window.location.pathname,
      localStorage.getItem(LANG_STORAGE_KEY),
    );
    window.location.replace(
      `/${locale}${window.location.pathname}${window.location.search}`,
    );
  }
}

// Point Monaco at the AMD assets copied into `assets/monaco/vs`
// (see `angular.json` assets). The editor itself is wired up in a later unit.
configureMonacoEnvironment();

bootstrapApplication(App, appConfig).catch((err: unknown) => {
  // biome-ignore lint/suspicious/noConsole: bootstrap failure fallback
  console.error(err);
});
