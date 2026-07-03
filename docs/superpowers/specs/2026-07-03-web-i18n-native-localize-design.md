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
Spanish source text with stable `i18n` IDs and produces the `en` target file.

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

## Non-Goals (explicitly deferred)

- **Instant in-app switching (no reload).** Not possible with native `@angular/localize`;
  switching reloads into the other locale build. (Transloco is the alternative if this
  ever becomes a hard requirement.)
- **Portuguese (`pt`).** Structure supports it; not built now (es + en only).
- **Translating API-originated messages.** Backend returns English free-text messages
  (e.g. "Invalid password"). Translating these needs the backend to emit **stable
  codes** that the frontend maps to `$localize` strings — a **separate follow-up**
  (touches the API response/error envelope). Until then, API messages display as sent.
- **SSR / prerendering per locale.** Out of scope.

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
| API messages remain English (deferred) | Explicit non-goal; backend-codes follow-up tracked separately |
| Source-text authored in Spanish but reviewers expect English source | Team convention: Spanish is the source language of record |

## Open Questions — resolved

- **Engine:** native `@angular/localize` (user-chosen), not Transloco. Reload-to-switch accepted.
- **Languages now:** `es` (source) + `en` (target). `pt` deferred.
- **API messages:** deferred to a backend-codes follow-up.
- **Default language:** always Spanish first load; explicit choice persisted.
- **Formatting:** switches with language (`es-EC`/`en`, USD).
- **Switcher placement:** profile menu + login/auth screens.
