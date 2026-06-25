/**
 * Production environment.
 *
 * `apiBaseUrl` points at the HSM API. In dev this is overridden by
 * `environment.development.ts` via the `fileReplacements` in `angular.json`.
 */
export const environment = {
  production: true,
  apiBaseUrl: 'http://localhost:10001/v1',
  // Build-time UI version; CI replaces 'dev' with the git short SHA / build number.
  appVersion: 'dev',
};
