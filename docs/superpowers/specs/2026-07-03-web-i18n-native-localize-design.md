---
title: "Web i18n — native @angular/localize, Spanish-first, reload-to-switch (es + en)"
date: 2026-07-03
type: design
status: draft
app: "@hsm/web"
---

# Web i18n — native `@angular/localize`, Spanish-first

## Summary

Make the `@hsm/web` Angular app **Spanish-first** and translatable, using Angular's
**first-party** i18n (`@angular/localize`). Spanish (`es-EC`) becomes the **source
locale** (templates authored in Spanish); **English (`en`)** is the first translation
target. Language is changed by **reloading into a per-locale build** served under a
base-href (`/es/`, `/en/`) — native i18n is compile-time, so there is no instant
in-app toggle (accepted trade-off). The structure supports adding **Portuguese (`pt`)**
later as one more target with no rework.

All UI strings are currently **hardcoded in English**; this effort migrates them to
Spanish source text with stable `i18n` IDs and produces the `en` target file. It also
**localizes API-surfaced messages**: the backend emits stable error codes and the
frontend maps them to `$localize` messages (so login/validation errors are translated too).

## Goals

- G1. The app renders **entirely in Spanish by default**, first load.
- G2. A user can **change language at runtime** (Spanish ⇄ English) via a switcher; the
  choice persists and survives reloads.
- G3. Adding a new language later (`pt`) is: author one `.xlf` target + one build config
  — no code changes to features.
- G4. Locale-correct **formatting** (dates, numbers, currency USD) follows the active
  language.
- G5. **PrimeNG** built-in component text (paginator, calendar, confirm dialogs, etc.)
  is localized to match.
- G6. **API-originated messages are localized.** Backend emits stable **codes**; the
  frontend maps each code to a `$localize` message, so errors like "Invalid password" and
  form-validation feedback render in the active language.

## Non-Goals (explicitly deferred)

- **Instant in-app switching (no reload).** Not possible with native `@angular/localize`;
  switching reloads into the other locale build. (Transloco is the alternative if this
  ever becomes a hard requirement.)
- **Portuguese (`pt`).** Structure supports it; not built now (es + en only).
- **SSR / prerendering per locale.** Out of scope.
- **Param-accurate validation messages** (e.g. echoing the exact `minLength` value into
  the text) — v1 maps each constraint key to a generic localized message; interpolating
  constraint params is a later refinement (see U7).

## Requirements

- R1. `es-EC` is the source locale; `en` is a translation target. Default served locale
  is `es`. (G1)
- R2. Every user-facing string in `apps/frontend/web/src` is marked (`i18n` attr in
  templates, `$localize` in TS) with a **stable custom ID** and authored in Spanish. (G1, G3)
- R3. A `LanguageService` persists the chosen locale (`localStorage`) and switches by
  redirecting to the target locale's base-href, preserving the current route. (G2)
- R4. On load with no locale prefix, the app redirects to the persisted locale (default
  `es`). (G1, G2)
- R5. A language switcher is available in the **profile menu** (authenticated) and on the
  **login/auth screens** (anonymous). (G2)
- R6. Each localized build sets `LOCALE_ID` and registers locale data so dates/numbers/
  currency format correctly; default currency **USD**. (G4)
- R7. PrimeNG translations are applied per locale at bootstrap. (G5)
- R8. Production serving delivers both locale builds under their base-hrefs with a root
  redirect and per-locale SPA fallback; CI builds all locales. (G1, G2)
- R9. The backend error envelope carries a **stable `code`** on every error response, and
  validation failures carry structured `{ field, constraints: [key] }` (constraint keys,
  not just English text). (G6)
- R10. The frontend maps every emitted code (business + generic HTTP + validation
  constraint keys) to a `$localize` message; an unknown code falls back to a generic
  localized "unexpected error" (never a blank or raw English string). (G6)

## Key Technical Decisions

- **KTD1 — Native `@angular/localize`, Spanish as `sourceLocale`.** Author templates in
  Spanish; `en` (and later `pt`) are `.xlf` targets. First-party, no runtime dep. Chosen
  by the user over Transloco despite the reload-to-switch cost.
- **KTD2 — Reload-to-switch via base-href builds.** `ng build --localize` emits
  `dist/browser/es/` and `dist/browser/en/` (each with `baseHref` `/es/` … `/en/`).
  Switching = `window.location.href = '/<locale>/' + <currentPath>`. Simple, matches how
  native Angular apps do language switching.
- **KTD3 — Stable custom message IDs (`@@domain.feature.key`).** e.g.
  `@@auth.login.title`. IDs decouple translations from source-text edits (no re-translation
  when Spanish wording changes). Enforced by convention + review.
- **KTD4 — One source `messages.xlf`, one target `messages.en.xlf`.** Extracted via
  `ng extract-i18n`. `pt` later = `messages.pt.xlf`. Stored under `src/locale/`.
- **KTD5 — `LOCALE_ID` comes free per localized build; register locale data.** Import and
  `registerLocaleData` for `es-EC` and `en`. Default `CurrencyPipe` currency = `USD`.
- **KTD6 — PrimeNG i18n via `PrimeNG.setTranslation()` in an app initializer**, selecting
  the JSON matching the build locale (`$localize.locale` / `LOCALE_ID`).
- **KTD7 — Serving with `serve`.** Runtime keeps the `serve` static server but points it
  at `dist/browser` so `/es/` and `/en/` resolve; add a root `/` → `/es/` redirect and
  per-locale SPA fallback (small `serve.json` or equivalent). Dev (`ng serve`) runs one
  locale at a time (source by default; `--configuration=en` to preview English) — a known
  native-i18n dev limitation, documented.
- **KTD8 — API messages via stable codes + a build-time frontend map.** A shared
  `ApiErrorCode` enum lives in `@hsm/common` (imported by BE and FE). The backend
  `ResponseFilter` is the single seam: it attaches `code` to the `issue` envelope — custom
  domain exceptions carry their own code; uncoded `HttpException`s map by status
  (`401 → AUTH.UNAUTHORIZED`, `403 → COMMON.FORBIDDEN`, `404 → COMMON.NOT_FOUND`,
  `5xx → COMMON.INTERNAL`); class-validator failures emit `{ field, constraints: [key] }`
  (constraint keys) instead of only English strings. The frontend's `apiMessage(code)` /
  `validationMessage(key)` are **finite `switch`es of `$localize`-marked constants** —
  which is exactly what native `@angular/localize` can localize (all branches known at
  build time). Unknown code → generic localized fallback (R10). **Success-envelope
  messages are not shown verbatim by the UI**, so only error/validation codes are in
  scope; success `message` stays as-is. Param-accurate validation text is deferred (v1 =
  generic per-key messages).

## Implementation Units (for the plan)

> The plan (writing-plans) will detail these; listed here as the intended decomposition.

- **U1. Enable `@angular/localize` + i18n config.** Add the dependency and
  `/// <reference types="@angular/localize" />` (polyfill). Add the `i18n` block to
  `angular.json` (`sourceLocale: es-EC`, `locales: { en: src/locale/messages.en.xlf }`),
  set `localize: true` + per-locale `baseHref`, and per-locale build configurations.
  Files: `apps/frontend/web/angular.json`, `package.json`, `src/main.ts` (or polyfills).
- **U2. Locale data + currency + PrimeNG i18n.** `registerLocaleData(es, 'es-EC')` and
  `en`; default `USD`; `provideAppInitializer` that calls `PrimeNG.setTranslation()` with
  the locale-matched JSON (`src/locale/primeng/{es,en}.ts`). Files:
  `src/app/app.config.ts`, new `src/app/core/i18n/*`.
- **U3. `LanguageService` + locale redirect.** Signal-based service: `current()`,
  `switch(locale)` (persist + redirect preserving route), `SUPPORTED = ['es','en']`.
  A bootstrap redirect (APP_INITIALIZER or a root route guard): no locale prefix → go to
  persisted/default. Files: `src/app/core/i18n/language.service.ts` (+ spec), wiring in
  `app.config.ts` / `app.routes.ts`.
- **U4. Language switcher UI.** A small standalone component (PrimeNG dropdown/menu)
  placed in the profile popover and the auth/login layout. Files:
  `src/app/layout/**` (profile menu), `src/app/features/auth/**` (login), new
  `language-switcher` component (+ spec).
- **U5. String migration — auth slice first, then the rest.** Replace hardcoded English
  with Spanish + `i18n="@@id"` / `$localize`, feature by feature (auth → workspace →
  patient → documents → templates → settings → admin → onboarding → profile → placeholder).
  Run `ng extract-i18n` to (re)generate `messages.xlf`; seed `messages.en.xlf` with the
  original English as the `en` target. Files: all `src/app/**/*.html` + string-bearing
  `*.ts`, `src/locale/messages*.xlf`.
- **U6. Serving + CI.** Update the web Dockerfile/`serve` config for per-locale dirs +
  root redirect + SPA fallback; update CI build to `ng build --localize` (all locales).
  Files: `apps/frontend/web/Dockerfile`, serve config, `.github/workflows/*` (web build,
  once a web job exists — currently web unit tests are excluded from CI).
- **U7. Backend — stable error codes (@hsm/common + ResponseFilter + ValidationPipe).**
  Add an `ApiErrorCode` enum + the `issue.code` / validation `{field, constraints[]}`
  shape to `@hsm/common` (dtos/interfaces). Give domain exceptions a code (a small
  `AppException(code, status)` base or a `code` on the thrown payload); extend
  `ResponseFilter` to always set `issue.code` (status-map fallback for uncoded ones) and
  to surface constraint **keys** for validation errors. Configure the global
  `ValidationPipe` `exceptionFactory` to preserve constraint keys + field. Files:
  `packages/common/src/{enums,dtos,interfaces}/*`, `apps/backend/api/src/filters/
  response.filter.ts` (+ spec), `apps/backend/api/src/main.ts` (ValidationPipe), the
  auth/validation exception sites touched first. **Ordering:** land U7 before the FE map
  (U8) so real codes exist to map against.
- **U8. Frontend — `apiMessage` / `validationMessage` localized map.** A pure module with
  finite `switch`es over `ApiErrorCode` / constraint keys returning `$localize`-marked
  strings (+ generic fallback). Wire the HTTP error interceptor / form-error display to
  use it so surfaced API + validation errors render localized. Files:
  `src/app/core/i18n/api-messages.ts` (+ spec), the HTTP error interceptor and form-field
  error components. Depends on U1–U3 (i18n active) and U7 (codes exist).

## Data Flow — switching language

```
User clicks "English" in switcher
  → LanguageService.switch('en')
      → localStorage.lang = 'en'
      → window.location.href = '/en/' + currentRoute
  → browser loads the /en/ build (English strings baked in, LOCALE_ID='en')
On next visit (any URL without /es|/en prefix):
  bootstrap redirect → reads localStorage.lang (default 'es') → /es/ or /en/
```

## Testing

- `LanguageService` unit spec: default `es`, persistence, supported-locale guard, redirect
  URL construction (route preserved).
- Language-switcher component spec: renders options, calls `switch()`.
- Extraction sanity: `ng extract-i18n` runs clean; every marked ID present in
  `messages.xlf`; `messages.en.xlf` has no missing/untranslated targets for shipped keys
  (a check to prevent English leaking as Spanish or vice-versa).
- Build check: `ng build --localize` produces `dist/browser/es` and `dist/browser/en`.
- Existing frontend specs stay green (247/247 baseline).

## Risks

| Risk | Mitigation |
|------|------------|
| Large string migration touches every feature | Do it feature-by-feature (U5), auth slice first as the proven pattern; stable IDs keep it mechanical |
| Native dev serves one locale at a time — switcher can't be exercised in `ng serve` | Document `--configuration=en`; full switch behavior verified against the localized production build |
| `serve -s dist` doesn't natively do per-locale base-href + fallback | U6 adds a root redirect + per-locale SPA fallback config; verify both locales load |
| CI/build time ~2× (one build per locale) | Acceptable; only `es`+`en` now |
| Backend code migration is broad (every error path) | Central seam is `ResponseFilter` + a status-map fallback, so uncoded errors still get a code; code the high-traffic domains (auth, validation) first, others inherit the fallback |
| Adding `issue.code` could break existing FE error handling | `code` is additive to the envelope; existing `message`/`error` fields stay until the FE map replaces their display |
| Source-text authored in Spanish but reviewers expect English source | Team convention: Spanish is the source language of record |

## Open Questions — resolved

- **Engine:** native `@angular/localize` (user-chosen), not Transloco. Reload-to-switch accepted.
- **Languages now:** `es` (source) + `en` (target). `pt` deferred.
- **API messages:** **in scope** — backend emits stable codes (U7), frontend maps them to
  `$localize` messages (U8). Success messages and param-accurate validation text are the
  only pieces deferred.
- **Default language:** always Spanish first load; explicit choice persisted.
- **Formatting:** switches with language (`es-EC`/`en`, USD).
- **Switcher placement:** profile menu + login/auth screens.
