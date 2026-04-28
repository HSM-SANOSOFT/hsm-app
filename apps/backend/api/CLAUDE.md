# CLAUDE.md — `@hsm/api`

NestJS HTTP API. See repo-root `CLAUDE.md` for monorepo-wide conventions.

## Commands

Run inside `hsm-app-be-api` container.

```bash
pnpm --filter @hsm/api start:dev      # nest start --watch
pnpm --filter @hsm/api build          # nest build
pnpm --filter @hsm/api test
pnpm --filter @hsm/api test -- --testPathPattern=coms.service
pnpm --filter @hsm/api test:e2e
```

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
└── ClinicalModule
    ├── PatientsModule
    └── AppointmentsModule
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
