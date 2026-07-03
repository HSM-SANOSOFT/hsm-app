---
title: Running and testing the HSM app locally inside the dev container
date: 2026-06-24
category: developer-experience
module: Local dev environment (api, worker, web)
problem_type: developer_experience
component: development_workflow
severity: high
applies_when:
  - Bringing the app up locally for development or testing
  - Debugging "can't log in" or API calls that never reach the backend
  - Configuring the frontend's dev-time API base URL
root_cause: config_error
resolution_type: config_change
tags:
  - dev-container
  - local-development
  - ports
  - environment-config
  - login
  - default-admin
---

# Running and testing the HSM app locally inside the dev container

## Context

The monorepo can start two ways and the difference is not obvious. `docker compose up` runs the full stack as containers, but the **everyday dev loop runs the external services (Postgres, Redis, RustFS) as compose containers while running `@hsm/api`, `@hsm/worker`, and `@hsm/web` directly inside the dev container via pnpm** — not the app images. A contributor following the compose-only mental model (or trusting the repo's host **Port map**, which lists API `10001`) points the browser at a port nothing is serving, every API call fails before reaching the backend, and it looks like a login bug.

## Guidance

**Run model**

```bash
# Infra only — the dev container's runServices already brings these up
docker compose -f docker/docker-compose.yaml up -d postgres redis rustfs

# Apps run locally, each in its own terminal:
pnpm --filter @hsm/api start:dev     # API on :3000
pnpm --filter @hsm/worker start:dev
pnpm --filter @hsm/web dev           # Angular dev server on :4200
```

- The API listens on **3000** (`apps/backend/api/src/main.ts`) and the web dev server on **4200**. The dev container forwards **3000** and **4200** to the host, so from the host browser the API is `localhost:3000` and the app is `localhost:4200`.
- The repo **Port map (API `10001`, …) describes the `docker compose up` mappings, NOT the local-run model.** In local-run the frontend dev env (`apps/frontend/web/src/environments/environment.development.ts`) must target `http://localhost:3000/v1`.
- The API enables CORS (`app.enableCors()` in `apps/backend/api/src/main.ts`) because the web origin (`:4200`) differs from the API origin (`:3000`).

**Logging in**

- A default admin is seeded on API bootstrap (`apps/backend/api/src/modules/core/users/admin-seed.service.ts`) from `DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_PASSWORD`, which `.devcontainer/script/get-secrets-infisical.sh` writes into the per-app `apps/backend/api/.env`.
- Login is **username-based** — sign in with the username (e.g. `admin`), **not the email**, plus the `DEFAULT_ADMIN_PASSWORD` value.
- After fetching secrets, **restart `start:dev`** so dotenv reloads the new `.env` (the fetch script prints this reminder). Confirm in the API startup log: `Seeded default admin user "admin"` (or `Default admin already exists`).

## Why This Matters

When the frontend points at a port nothing is listening on, the browser's API calls fail with a connection error *before* reaching the backend — so the API logs show nothing and it presents as a credentials/auth bug when it is actually port wiring. Knowing the local-run model (and that `:3000`/`:4200`, not the `10001`-series compose map, are what the browser uses) turns an hours-long "can't log in" hunt into a one-line env fix.

## When to Apply

- Setting up or onboarding to local development.
- Any "can't log in" / "API call failed" / connection-refused symptom in local dev.
- Editing the frontend's dev-time API base URL.

## Examples

Frontend dev API target — before vs after:

```diff
// apps/frontend/web/src/environments/environment.development.ts
- apiBaseUrl: 'http://localhost:10001/v1'  // docker-compose mapping; not served in local-run
+ apiBaseUrl: 'http://localhost:3000/v1'   // API runs locally on 3000, forwarded to the host
```

Confirm the API directly before touching the UI:

```bash
curl -i -X POST http://localhost:3000/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"<DEFAULT_ADMIN_PASSWORD>"}'
# 200 + tokens  = good
# connection refused = API not on 3000 (didn't boot / DB connect failed)
# 401            = wrong password (check apps/backend/api/.env; restart after a secrets fetch)
```

## Related

- `docs/solutions/developer-experience/2026-05-07-http-test-files-vscode-rest-client-convention.md` — `.http` REST Client convention (same `:3000/v1` base).
- `docs/solutions/test-failures/2026-05-06-nestjs-config-joi-validation-dotenv-conflict.md` — how `@hsm/config` loads env via dotenv/Joi (why per-app `.env` matters).
- `apps/frontend/web/CLAUDE.md` still cites port `10001` for the dev API; align it to `3000` for the local-run model.
