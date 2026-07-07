/**
 * Development environment.
 *
 * The API is run locally inside the dev container (`pnpm --filter @hsm/api
 * start:dev`), which listens on 3000 in the container. The devcontainer compose
 * publishes that to the host as **4201** (web is 4200), so the browser reaches
 * the API at localhost:4201. (Port 10001 is the docker-compose `api` host
 * mapping, only used when running the full stack via `docker compose up`.)
 */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:4201/v1',
  // Build-time UI version; CI replaces 'dev' with the git short SHA / build number.
  appVersion: 'dev',
};
