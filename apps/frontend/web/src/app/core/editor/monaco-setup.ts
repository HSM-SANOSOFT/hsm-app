/**
 * Monaco editor environment setup.
 *
 * We integrate `monaco-editor` directly (no third-party Angular wrapper) — see
 * `apps/frontend/web/CLAUDE.md` for the rationale. The AMD build is copied to
 * `assets/monaco/vs` via the `angular.json` assets entry; here we tell Monaco
 * where its language/editor web workers live so they load from that path.
 *
 * The actual editor instance is created in the template-editor feature (U13);
 * this only configures the worker resolution and is safe to call at bootstrap.
 */

interface MonacoEnvironment {
  getWorkerUrl(moduleId: string, label: string): string;
  baseUrl?: string;
}

declare global {
  interface Window {
    MonacoEnvironment?: MonacoEnvironment;
  }
}

const MONACO_BASE = 'assets/monaco';

export function configureMonacoEnvironment(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.MonacoEnvironment = {
    baseUrl: MONACO_BASE,
    getWorkerUrl(_moduleId: string, _label: string): string {
      const base = `${MONACO_BASE}/vs`;
      const proxy = `
        self.MonacoEnvironment = { baseUrl: '${base}' };
        importScripts('${base}/base/worker/workerMain.js');
      `;
      const blob = new Blob([proxy], { type: 'text/javascript' });
      // `_label` selects a specialized worker (json/css/html/ts); the generic
      // workerMain handles all of them, including the built-in `handlebars`
      // language used for template authoring.
      return URL.createObjectURL(blob);
    },
  };
}
