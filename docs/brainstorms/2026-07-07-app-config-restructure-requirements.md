# App Config Restructure — Design

**Date:** 2026-07-07
**Status:** design (pending user review → writing-plans)

## Goal

Two related changes to how the monorepo's apps get configuration:

1. **Frontend (`@hsm/web`)** — get config (API base URL, etc.) from **environment
   variables** (Infisical-managed), the same operational model as the backend
   (change env → restart, no code edit), replacing Angular's
   `src/environments/environment.{ts,development.ts}` + `fileReplacements`.
2. **Backend (`@hsm/config`)** — split the single shared env object into
   **per-app** validated config (api and worker each validate only the vars they
   use), sharing common field definitions.

## Key constraint (drives the whole frontend design)

`@hsm/config` is **Node-only** — it does `import 'dotenv/config'`, uses
`node:process`, and reads `process.env` at import time. A browser bundle has
**no `process.env` at runtime** and is a static artifact. Therefore the frontend
**cannot** consume `@hsm/config`, and "read env like the API" must be done via
either build-time injection or a runtime-fetched config file. **Decision
(user):** runtime — it mirrors the API's runtime-env model (env at container
start, no rebuild) and lets Infisical changes take effect on restart.

**Validator:** Joi, in both backend and frontend (consistency with the existing
backend). Joi bundles in the browser (heavier than a browser-first validator,
accepted for consistency).

---

## Part 1 — Frontend runtime config (`@hsm/web`)

### Data flow

```
env vars (Infisical) ──▶ gen-config.mjs ──▶ config.json ──▶ ConfigService (boot) ──▶ typed getters
  WEB_API_BASE_URL        (writes JSON       (static asset    APP_INITIALIZER:        apiBaseUrl,
  WEB_APP_VERSION          from process.env)  at /config.json) fetch + Joi-validate   appVersion, production
```

### Components

- **`gen-config.mjs`** (`apps/frontend/web/scripts/`): a Node script that reads
  `process.env.WEB_*` and writes `config.json`. Runs at:
  - **dev** — a `predev` npm step, sourcing `.env` (dotenv), writing to
    `public/config.json` so `ng serve` serves it at `/config.json`.
  - **prod/container** — the web image entrypoint, before `serve`, writing to
    the served `dist/config.json` (or `dist/browser/config.json`).
  `config.json` is **gitignored** (generated, environment-specific). A committed
  `config.json.example` documents the shape.

- **`config.schema.ts`** (`core/config/`): a **Joi** schema for the config
  object — `{ apiBaseUrl: string(uri), appVersion: string, production: boolean }`
  (fields finalized in the plan). Throws on invalid/missing.

- **`ConfigService`** (`core/config/config.service.ts`): holds the validated
  config; exposes typed getters (`apiBaseUrl`, `appVersion`, `production`).

- **Bootstrap loader**: `provideAppInitializer` in `app.config.ts` does
  `fetch('/config.json')` → Joi-validate → seed `ConfigService`. Bootstrap
  **blocks** until it resolves (guards/interceptors/`ApiClient` see a ready
  config). A failed fetch/validation throws a clear boot error (fail-fast, like
  the backend).

### Env var names (proposed; adjust in plan if there's a convention)

| env var | config.json key | example |
|---|---|---|
| `WEB_API_BASE_URL` | `apiBaseUrl` | `http://localhost:4201/v1` (dev), compose host in prod |
| `WEB_APP_VERSION` | `appVersion` | git short SHA / `dev` |
| `WEB_PRODUCTION` | `production` | `false` dev / `true` prod (or derived) |

### Removals / migrations

- Delete `src/environments/environment.ts`, `environment.development.ts`, and the
  `fileReplacements` block in `angular.json`.
- Replace every `environment.apiBaseUrl` usage (`core/api/api-client.ts` +
  ~9 specs) with `ConfigService`. Component specs get a **test config provider**
  (`provideTestConfig()` seeding a fixed config) so they never fetch.
- The web Dockerfile gains the entrypoint that runs `gen-config.mjs` then
  `serve -s dist`.

---

## Part 2 — Backend per-app config split (`@hsm/config`)

### Structure

```
packages/config/src/
  fields.ts    # shared Joi field rules — one definition per env var
               #   (ENVIRONMENT, DB_POSTGRES_*, DB_REDIS_*, STRG_S3_*, SMTP_*, …)
  api.ts       # export const envs = validate(pick(fields, <api's vars>))
  worker.ts    # export const envs = validate(pick(fields, <worker's vars>))
```

- **`fields.ts`** is the single source of truth for each var's Joi rule
  (type, required/default). No `dotenv`/`process` here — pure schema pieces.
- **`api.ts` / `worker.ts`** each assemble the schema for **only the vars that
  app uses**, load `dotenv/config`, validate `process.env` against it, and export
  the frozen `envs`. Each fails fast on its own missing/invalid vars — no
  cross-app false positives.
- **Package subpath exports** (`package.json` `exports`): `@hsm/config/api`,
  `@hsm/config/worker`. Consumers switch:
  `import { envs } from '@hsm/config'` → `'@hsm/config/api'` (api) / `'@hsm/config/worker'` (worker).
  Keep a deprecated `@hsm/config` root export (union) only if needed for a
  transition; otherwise remove it.

### Which vars go where

Resolved in the **plan** by auditing each app's actual `envs.<VAR>` references
(`grep` in `apps/backend/api` vs `apps/backend/worker`). Vars used by both →
shared in `fields.ts` and picked by both. Not guessed in this design.

---

## Testing

- **Frontend**: `config.service.spec.ts` — loads a valid config; a config missing
  a required field or with a bad `apiBaseUrl` fails Joi validation. A
  `provideTestConfig()` helper (in `core/config/`) seeds a fixed config for all
  component specs (replaces the current `environment.apiBaseUrl` constant).
- **Backend**: each app's env module throws at import on a missing/invalid var,
  scoped to that app's schema. Existing api/worker test-setup env shims updated
  to the per-app var sets.

## Non-goals / scope boundaries

- The frontend does **not** share `@hsm/config` (Node vs browser) — separate
  Joi schema in the web app.
- No change to *which* config values exist (same `apiBaseUrl` etc.), only *how*
  they're delivered.
- Runtime config is fetched once at boot (no live re-fetch / hot config reload).

## Verification

- `grep -rn 'src/environments\|environment\.apiBaseUrl' apps/frontend/web/src` → none.
- Web: `ng build` → `dist` has no baked API URL; `config.json` generated from env,
  fetched at boot; app reaches the API via `ConfigService.apiBaseUrl`.
- `@hsm/config/api` and `@hsm/config/worker` each validate their own vars; api +
  worker build and boot (start:dev / e2e) clean.
