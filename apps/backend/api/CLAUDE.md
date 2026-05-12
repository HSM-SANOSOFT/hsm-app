# CLAUDE.md — `@hsm/api`

NestJS HTTP API. See repo-root `CLAUDE.md` for monorepo-wide conventions.

## Commands

Run inside `hsm-app-be-api` container.

```bash
pnpm --filter @hsm/api start:dev      # STARTUP TEST — must reach DB connection phase with no DI errors
pnpm --filter @hsm/api build
pnpm --filter @hsm/api test
pnpm --filter @hsm/api test:watch
pnpm --filter @hsm/api test:cov
pnpm --filter @hsm/api test:e2e
pnpm --filter @hsm/api test -- --testPathPattern=coms.service   # single file
```

`build` only catches TypeScript errors. NestJS DI failures (missing providers, circular deps) only surface at runtime — run `start:dev` after any module or entity change.

Listens on port 3000 inside the container, exposed as **10001** on the host. Swagger UI at `http://localhost:10001/api`.

## Bootstrap (`src/main.ts`)

- URI versioning, default version `v1` → routes are `/v1/...`.
- Global `ValidationPipe` with `transform`, `whitelist`, `forbidNonWhitelisted`.
- Global `HttpLoggingInterceptor`.
- `freePort(3000)` is called before `listen` to kill any stale process bound to the port — keep it.
- Bearer auth schemes registered in Swagger: `access_token`, `refresh_token`.

## Module tree

```
MainModule
├── ThrottlerModule (3/s, 20/10s, 100/min — APP_GUARD)
├── DatabaseModule  (@hsm/database, global)
├── QueueModule     (@hsm/queue, global — producer side)
├── TerminusModule  (health checks on MainController)
├── CoreModule
│   ├── UsersModule
│   ├── ComsModule       (email/notification — enqueues to `coms` queue)
│   ├── DocsModule       (document generation — enqueues to `document` queue)
│   └── TemplatesModule  (email/doc templates)
├── SecurityModule       (registers AuthJwtAtGuard + RolesGuard as APP_GUARDs)
│   ├── AuthModule       (JWT AT+RT, Passport local)
│   └── RolesModule
```

`AdministrativeModule` / `SchedulingModule` were removed — don't re-add without a real use case.

## Globals registered in `MainModule`

| Provider | Token | Purpose |
| -------- | ----- | ------- |
| `ThrottlerGuard` | `APP_GUARD` | Rate limits |
| `AuthJwtAtGuard` | `APP_GUARD` (via `SecurityModule`) | Default = auth required. Opt out with `@Public()`. |
| `RolesGuard` | `APP_GUARD` (via `SecurityModule`) | Reads `@Roles(...)` |
| `ResponseFilter` | `APP_FILTER` | HTTP error → `ErrorResponseDto` |
| `TypeOrmExceptionFilter` | (in `@hsm/database`) | TypeORM errors |
| `ResponseInterceptor` | `APP_INTERCEPTOR` | Wraps body in `SuccessResponseDto` |

Don't wrap successful responses by hand — the interceptor does it.

## Adding a feature module

1. Create `src/modules/<domain>/<feature>/{feature.module,controller,service}.ts`.
2. Import the feature module from its domain module (`core.module.ts` / `clinical.module.ts` / `security.module.ts`). Don't import directly into `MainModule`.
3. Inject repositories with `@InjectRepository(Entity, Databases.HsmDbPostgres)` (or `HsmDbOracle`).
4. To enqueue jobs, inject `@InjectQueue('<queue>')` from `@hsm/queue` — actual processing lives in `@hsm/worker`.
5. Routes are `/v1/<path>` by default. Override per-controller with `@Version('2')` if needed.

## Auth

- `AuthJwtAtGuard` is global. Public endpoints need `@Public()`.
- Two JWTs: AT (`JWT_AT_SECRET`), RT (`JWT_RT_SECRET`). Refresh flow uses the refresh strategy in `modules/security/auth/strategy/`.
- Role checks: `@Roles(Role.X)` + `RolesGuard` (already global).

## Test layout

- `*.spec.ts` colocated with source. Jest config inline in `package.json`.
- `moduleNameMapper` rewrites `@hsm/*` to package sources — no build step needed for tests.
- E2E specs live in `test/`, run via `pnpm --filter @hsm/api test:e2e`.
- **Env shim:** `src/test-setup.ts` runs before every test file (jest `setupFiles`). It sets dummy `process.env` values so `@hsm/config` Joi validation passes without real infrastructure. **When adding a new required env var to `@hsm/config`, also add a dummy value in this file** — omitting it causes a `Config validation error` at test startup.

## HTTP test files

Every controller has a co-located `.http` file (e.g. `auth.controller.ts` → `auth.http`) for manual endpoint testing with the VS Code [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) extension.

**Convention — mirrors the test file rule:**
- **New endpoint** → add a request block to that controller's `.http` file
- **New controller** → create a co-located `.http` file at the same time, covering all endpoints

**Shared environment variables** live in `.vscode/settings.json` under `rest-client.environmentVariables`. All `.http` files use `{{host}}`, `{{contentType}}`, `{{at_token}}`, and `{{rt_token}}` — no per-file variable declarations.

```jsonc
// .vscode/settings.json
"rest-client.environmentVariables": {
  "dev": {
    "host": "http://127.0.0.1:3000/v1",   // container-internal port
    "contentType": "application/json",
    "at_token": "",  // printed to console as DEV_AT on app startup in dev
    "rt_token": ""   // printed to console as DEV_RT on app startup in dev
  }
}
```

Select the active environment with `Ctrl+Alt+E` in VS Code. On first start in dev, copy `DEV_AT` from the console into `at_token` and `DEV_RT` into `rt_token` — all `.http` files pick them up automatically. Do not commit token values to git.
