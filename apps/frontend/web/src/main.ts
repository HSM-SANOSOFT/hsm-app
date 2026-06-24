import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { configureMonacoEnvironment } from './app/core/editor/monaco-setup';

// Point Monaco at the AMD assets copied into `assets/monaco/vs`
// (see `angular.json` assets). The editor itself is wired up in a later unit.
configureMonacoEnvironment();

bootstrapApplication(App, appConfig).catch((err: unknown) => {
  // biome-ignore lint/suspicious/noConsole: bootstrap failure fallback
  console.error(err);
});
