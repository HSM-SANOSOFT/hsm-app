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

Listens on port 4201 inside the container, exposed as **10001** on the host. Swagger UI at `http://localhost:10001/api`.

## Bootstrap (`src/main.ts`)

- URI versioning, default version `v1` → routes are `/v1/...`.
- Global `ValidationPipe` with `transform`, `whitelist`, `forbidNonWhitelisted`.
- Global `HttpLoggingInterceptor`.
- `freePort(4201)` is called before `listen` to kill any stale process bound to the port — keep it.
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
└── ClinicalModule       (FHIR R4 clinical data spine — see recipe below)
    ├── PatientModule        (/fhir/R4/Patient — identity / MPI seam)
    ├── EncounterModule      (/fhir/R4/Encounter — Patient reference)
    └── ServiceRequestModule (/fhir/R4/ServiceRequest — orders routing spine)
```

`AdministrativeModule` / `SchedulingModule` were removed — don't re-add without a real use case.

## Adding a FHIR resource (clinical spine)

The clinical spine (`src/modules/clinical/`) is a reusable
`entity → translator → service → FHIR controller` seam. Adding a resource is
mechanical — follow the **Patient** files as the worked example. The shared FHIR
mechanics live in `src/modules/clinical/fhir/` (don't reinvent them):

1. **Entity** (`@hsm/database`): `packages/database/src/entities/modules/clinical/<resource>.entity.ts`,
   extending `ClinicalResourceBaseEntity` (uuid PK + timestamps + soft-delete).
   Searchable scalars → real columns; complex datatypes → `jsonb`; cross-resource
   refs → FK columns (KTD3/KTD4). Export it from the clinical barrel `index.ts`
   (the four-link chain — see `packages/database/CLAUDE.md`).
2. **Translator** (`<resource>.translator.ts`): implement
   `Translator<TEntity, TResource>`. Use `toRelativeReference` /
   `fromRelativeReference` for FK ⇄ `Type/{uuid}` references.
3. **Service** (`<resource>.service.ts`): inject the repo with
   `@InjectRepository(Entity, DatabasesEnum.HsmDbPostgres)`. This is the typed
   internal API (KTD10) — platform modules call it directly, never the facade.
   Pre-resolve referenced resources (existence-check → 422), and validate
   routing-critical enum codes against `@hsm/common/enums` `clinical.enum.ts`
   (KTD6 — `validateResource` does NOT check code bindings).
4. **Controller** (`<resource>.controller.ts`): decorate the class with
   `@FhirController('<ResourceType>')` (supplies the `/fhir/R4/...` path,
   `VERSION_NEUTRAL`, the envelope/error bypass, and the clinical `@Roles` PHI
   gate — KTD7/KTD11). Validate POST bodies with `@Body(FhirValidationPipe)`;
   validate search params with a per-resource `FhirSearchPipe` config; build
   search Bundles with `toSearchsetBundle`.
5. **Module** (`<resource>.module.ts`): declare controller + service +
   translator + `FhirValidationPipe`; import `PatientModule` if you reference
   patients. Wire it into `clinical.module.ts`.
6. **`.http` + co-located `*.spec.ts`** (translator round-trip, service with
   MOCKED repos, controller authz). Then `start:dev` to verify DI + entity
   registration (build success proves nothing — see the entity-barrel hazard).

**Schema delivery:** dev uses `synchronize`; prod migrations are tooling-only and
inert until activated (KTD9). After adding/altering an entity, regenerate the
baseline against a clean DB: `pnpm --filter @hsm/database migration:generate` (CI
drift check enforces this) — see `packages/database/CLAUDE.md`.

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
    "host": "http://127.0.0.1:4201/v1",   // container-internal port
    "contentType": "application/json",
    "at_token": "",  // printed to console as DEV_AT on app startup in dev
    "rt_token": ""   // printed to console as DEV_RT on app startup in dev
  }
}
```

Select the active environment with `Ctrl+Alt+E` in VS Code. On first start in dev, copy `DEV_AT` from the console into `at_token` and `DEV_RT` into `rt_token` — all `.http` files pick them up automatically. Do not commit token values to git.
