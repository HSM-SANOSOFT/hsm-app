# CLAUDE.md — `@hsm/web`

Angular internal back-office console for the HSM backend. Greenfield app
scaffolded in unit U6 of the internal-web-console plan
(`docs/plans/2026-06-24-001-feat-internal-web-console-plan.md`).

## Stack

- **Angular 21** (latest stable line; `@angular/core` ~21.2). Standalone
  bootstrap (`bootstrapApplication`) — **no NgModules**.
- **Zoneless** change detection. Angular 21's default is zoneless (no `zone.js`
  in deps); `provideZonelessChangeDetection()` is declared explicitly in
  `app.config.ts`. Use signals; do not rely on Zone-based auto change detection.
- **Vitest** for unit tests (Angular 21 default via `@angular/build:unit-test`),
  not Karma/Jasmine. `describe/it/expect` globals are enabled.
- **PrimeNG 21** (+ `@primeng/themes` Aura preset, `primeicons`) — chosen over
  Angular Material for its production-grade `p-table` (KTD1).
- **Monaco** (`monaco-editor`) for the template code editor — integrated
  directly (see "Monaco" below).
- **Handlebars** full build (`handlebars`, the compiler build — not
  `handlebars/runtime`) for client-side live preview (KTD1).

## How to run

All commands run from the repo root (inside the dev container).

```bash
pnpm --filter @hsm/web dev      # ng serve -> http://localhost:4200
pnpm --filter @hsm/web build    # ng build -> apps/frontend/web/dist
pnpm --filter @hsm/web test     # Vitest smoke + future unit specs
```

The dev server runs on **4200**. It talks to the API on host port **10001**
with the default `/v1` URI version (Swagger UI at `http://localhost:10001/api`).

## API base URL / environments

- `src/environments/environment.ts` — production (`apiBaseUrl:
  'http://localhost:10001/v1'`).
- `src/environments/environment.development.ts` — dev override, swapped in via
  `fileReplacements` in `angular.json` for the `development` configuration.
- Import `environment` from `src/environments/environment`; the dev file is
  substituted at build time. Do **not** hardcode the API URL elsewhere.

## API contract reminders

- Talk to `/v1/...` routes; Swagger at `/api`.
- Every successful API body is wrapped (`data` + `metadata`); every error is the
  unsuccess wrapper (`metadata` + `issue` with `code`/`message`/`field`). Do not
  bypass the global response wrapper — the typed client (`core/api`, U7) unwraps
  `data`, exposes pagination at `metadata.extra.pagination`, and normalizes
  errors into a thrown `ApiError`.

## `@hsm/common` consumption (IMPORTANT — read before importing shared code)

`tsconfig.json` maps the shared package to its source:

```jsonc
"paths": {
  "@hsm/common": ["../../../packages/common/src"],
  "@hsm/common/*": ["../../../packages/common/src/*"]
}
```

The split that matters for the browser build:

- **Enums — import directly. Always do this.**
  `import { RolesEnum } from '@hsm/common/enums'` (also `SettingsCategoryEnum`,
  `TemplateCategoriesEnum`, `DocumentStatusEnum`, …). The `enums` barrel is pure
  (no Node/decorator/TypeORM deps) and bundles cleanly. These carry **runtime
  values that must match the backend** — never re-declare a role/category/status
  enum locally, or the two sides will drift silently.

- **DTO / interface *shapes* — mirror locally, do NOT import the barrels.**
  `@hsm/common/dtos` and `@hsm/common/interfaces` transitively pull in
  `@nestjs/swagger` decorators, Node `Buffer`, and `@hsm/database/entities`
  types, so the Angular esbuild/type-check cannot consume them (even as
  `import type`, barrel entanglement drags the whole graph in). The wire
  contracts are mirrored 1:1 in `src/app/core/api/response.ts` against the
  canonical `@hsm/common` field names — extend THAT file when you need a new
  response/payload shape, and keep it in lockstep with the backend DTO.

`strictPropertyInitialization` is `false` (matching the backend tsconfig).

## Monaco decision

**We integrate `monaco-editor` directly — no third-party Angular wrapper.**

Rationale: the most common wrapper, `ngx-monaco-editor-2`, is not published /
not available against the current registry and historically lags new Angular
majors; depending on it would block upgrades and add an unmaintained layer. A
direct integration is a thin component (created in U13) plus worker setup, and
keeps us on the latest `monaco-editor` with no compatibility risk. Monaco's
built-in `handlebars` language gives HTML + `{{...}}` highlighting with no extra
wiring (KTD1).

Wiring:
- `angular.json` copies `node_modules/monaco-editor/min/vs` to
  `assets/monaco/vs` (a build asset).
- `src/app/core/editor/monaco-setup.ts` (`configureMonacoEnvironment()`, called
  from `main.ts`) sets `window.MonacoEnvironment` so Monaco resolves its web
  workers from that asset path.
- The editor component itself is added in U13.

## Conventions

- **Standalone components + signals.** No NgModules. Prefer `signal()`,
  `computed()`, `input()`/`output()`, and the new control-flow (`@if`, `@for`).
- **Lint/format with Biome only** (repo-root `biome.json`): single quotes,
  2-space indent, trailing commas, lineWidth 80, LF. **No ESLint or Prettier**
  (the Prettier config `ng new` emits was removed). Biome runs from the repo
  root: `pnpm check` / `npx @biomejs/biome check apps/frontend/web/src`.
  Biome's HTML parser has `interpolation` enabled in the root config so it
  tolerates Angular `{{ }}` templates.
- **HTTP** via `provideHttpClient(withFetch(), withInterceptors([authInterceptor]))`.
  The U8 `authInterceptor` (`core/auth/auth.interceptor.ts`) attaches the access
  token and runs a single in-flight refresh on 401 (KTD2); concurrent 401s queue
  on a shared `BehaviorSubject` so only one `GET /v1/auth/refresh` fires. Auth
  state lives in `AuthService` (signals: `currentUser`, `isAuthenticated`,
  `isAdmin`); route protection via `authGuard`/`roleGuard`/`adminGuard`; element
  gating via the `*hasRole` / `*ifAdmin` structural directives.
- Output dir is `dist/` so Turborepo's `build` cache (`outputs: ["dist/**"]`)
  works.

## Directory structure

```text
apps/frontend/web/
├── angular.json            # outputPath dist/, monaco assets, env fileReplacements
├── package.json            # @hsm/web; dev=ng serve, build=ng build
├── tsconfig.json           # @hsm/common path mapping
├── tsconfig.app.json
├── tsconfig.spec.json
└── src/
    ├── main.ts             # bootstrapApplication + Monaco env setup
    ├── index.html
    ├── styles.css          # primeicons import + base styles
    ├── environments/       # environment.ts + environment.development.ts
    └── app/
        ├── app.ts          # root standalone component (signal title)
        ├── app.html
        ├── app.config.ts   # zoneless, router, httpClient, PrimeNG/Aura, animations
        ├── app.routes.ts   # empty; lazy role-gated routes added in U8/U9
        ├── app.spec.ts     # boot smoke spec
        └── core/editor/
            └── monaco-setup.ts
```

Feature areas (`core/api`, `core/auth`, `layout`, `features/*`) are added in
later units per the plan's Output Structure.
