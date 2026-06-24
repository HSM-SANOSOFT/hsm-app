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
- Every successful API body is a `SuccessResponseDto`; every error is an
  `ErrorResponseDto`. Do not bypass the global response wrapper — the typed
  client (U7) unwraps `data` and surfaces `issue` fields.
- Reuse shared DTOs/enums from `@hsm/common` instead of duplicating types.

## `@hsm/common` path mapping

`tsconfig.json` maps the shared package to its source:

```jsonc
"paths": {
  "@hsm/common": ["../../../packages/common/src"],
  "@hsm/common/*": ["../../../packages/common/src/*"]
}
```

`strictPropertyInitialization` is set to `false` (matching the backend
tsconfig) so `@hsm/common` DTO classes — written without field initializers —
type-check when imported here.

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
- **HTTP** via `provideHttpClient(withFetch())` (auth/refresh interceptors are
  added in U8).
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
