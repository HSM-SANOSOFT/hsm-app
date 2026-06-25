/**
 * Development environment.
 *
 * The API is run locally inside the dev container (`pnpm --filter @hsm/api
 * start:dev`), which listens on 3000 — the port VS Code forwards to the host.
 * (Port 10001 is the docker-compose `api` host mapping, only used when running
 * the full stack via `docker compose up`, not the local-api dev workflow.)
 */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/v1',
  // Build-time UI version; CI replaces 'dev' with the git short SHA / build number.
  appVersion: 'dev',
};
