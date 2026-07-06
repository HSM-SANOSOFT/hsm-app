# Web i18n: native @angular/localize → Transloco (runtime) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app's compile-time `@angular/localize` i18n (per-locale `/es//en/` builds, `i18n=`/`$localize` markers, XLIFF/JSON build catalogs) with **Transloco** (`@jsverse/transloco`) runtime i18n — one bundle, translations loaded from `public/i18n/*.json`, instant no-reload language switching.

**Architecture:** Transloco loads a nested JSON translation file per language at runtime (`public/i18n/es.json`, `en.json`), served as static assets. Templates read keys via the `transloco` pipe / `*transloco` structural directive; `.ts` code reads via `TranslocoService.translate()`. Switching language calls `TranslocoService.setActiveLang(lang)` and persists to `localStorage['hsm.lang']` — the UI re-renders in place (`reRenderOnLangChange: true`), no reload, no URL locale prefix. PrimeNG chrome is re-translated on every Transloco lang change. The app builds and serves as a single bundle (`ng serve` / `ng build`, no `--localize`).

**Tech Stack:** Angular 21 (standalone, zoneless, signals), `@jsverse/transloco` v7, PrimeNG 21, Vitest, Biome.

## Global Constraints

- **Package:** `@jsverse/transloco` (the maintained Transloco; NOT the old `@ngneat/transloco`). Pin a version compatible with Angular 21 (`^7.x`; the implementer resolves the exact latest 7.x that lists Angular 21 in peer deps — if none, use the newest published major that does, and record the version chosen).
- **Languages:** `availableLangs: ['es', 'en']`, `defaultLang: 'es'`, `fallbackLang: 'es'`. Spanish is the source/default; English is the alternate. Adding a language later = drop `public/i18n/<lang>.json` + add to `availableLangs`.
- **Translation files:** `public/i18n/es.json` and `public/i18n/en.json`, **nested** structure (`{ "auth": { "login": { "title": "…" } } }`), interpolation via **`{{paramName}}`** (Transloco/ICU-less named params), NOT `{$INTERPOLATION}`.
- **Keys are preserved** from the current `@@<feature>.<component>.<key>` ids (dotted → nested path). Do NOT invent new key names except the 3 collision renames in Task 1.
- **No `/es//en/` subpaths, no locale in the URL, no per-locale build.** One bundle. `reRenderOnLangChange: true` so switching is live.
- `strictPropertyInitialization` is `false`; standalone components + signals; new control flow (`@if`/`@for`). Import Transloco via standalone imports (`TranslocoDirective`, `TranslocoPipe`), never NgModules.
- Biome: single quotes, 2-space indent, trailing commas, lineWidth 80, LF. Run `npx @biomejs/biome check --write <paths>` before each commit.
- All build/test/serve commands run **inside the dev container**: `docker exec hsm-app-workspace-1 sh -c 'cd /workspace && <cmd>'`.
- **Do NOT use the official schematic** (`@jsverse/transloco-schematics:ng-migrate`). It keys by SOURCE TEXT (kebab-case), ignores our existing `@@<feature>.<component>.<key>` ids and the already-built `src/i18n/{es,en}.json` catalogs, and does not touch `$localize`. This plan REUSES those ids/catalogs 1:1 (the `@@id` becomes the dotted Transloco key), which is cleaner and covers `$localize` — the manual conversions below are the source of truth.

## File Structure

**Create:**
- `apps/frontend/web/public/i18n/es.json` — Spanish catalog (nested).
- `apps/frontend/web/public/i18n/en.json` — English catalog (nested).
- `apps/frontend/web/src/app/core/i18n/transloco-loader.ts` — `TranslocoHttpLoader` (fetches `/i18n/<lang>.json`).
- `apps/frontend/web/src/app/core/i18n/transloco-testing.ts` — test helper exporting `provideTranslocoTestingModule()` reading the real `public/i18n/*.json`.

**Modify (rewire):**
- `src/app/app.config.ts` — add `provideTransloco` + `provideHttpClient` (already present) + PrimeNG lang wiring; remove native-localize providers.
- `src/app/core/i18n/language.service.ts` — rewrite around `TranslocoService`.
- `src/app/core/i18n/primeng-translations.ts` — keep `ES`/`EN` maps; add `primeNgTranslationFor(lang)`.
- `src/app/layout/language-switcher/language-switcher.ts` — call `LanguageService.switch()` (now instant).
- Every component with `i18n=`/`$localize` (21 template files, 20 `.ts` files) — Task 4.x per namespace.
- Component specs that render translated markup — add Transloco testing provider.

**Delete (native localize teardown, Task 6):**
- `src/main.ts` — remove `import '@angular/localize/init'` + the pre-bootstrap chooser redirect block.
- `src/app/core/i18n/locale-init.ts` — delete (native `activeLocale()`/`registerAppLocales`).
- `src/i18n/es.json`, `src/i18n/en.json` — delete (moved to `public/i18n`).
- `apps/frontend/web/serve.json`, `apps/frontend/web/serve-root/index.html` — delete (no chooser/subpath serving).
- `angular.json` — remove `i18n` block, `es`/`en` build configs, `development,es`/`en` serve configs + `servePath`; `build.options.localize` stays absent.
- `package.json` — `build`: `ng build` (drop `--localize`); remove `dev:en`; `dev`/`start`: `ng serve`.
- `apps/frontend/web/Dockerfile` — serve single `dist/browser` (drop per-locale copy + serve.json + chooser).
- `src/test-setup.ts` — remove `import '@angular/localize/init'`.
- Remove `@angular/localize` from `package.json` deps.

---

### Task 1: Install Transloco, root config, HTTP loader, nested catalogs

**Files:**
- Modify: `apps/frontend/web/package.json` (add `@jsverse/transloco`)
- Create: `apps/frontend/web/src/app/core/i18n/transloco-loader.ts`
- Modify: `apps/frontend/web/src/app/app.config.ts`
- Create: `apps/frontend/web/public/i18n/es.json`, `apps/frontend/web/public/i18n/en.json`
- Test: `apps/frontend/web/src/app/core/i18n/transloco-loader.spec.ts`

**Interfaces:**
- Produces: `TranslocoHttpLoader` (implements `TranslocoLoader`, `getTranslation(lang): Observable<Translation>`), and a configured `provideTransloco(...)` in `appConfig.providers`. Active lang defaults to `es`.

- [ ] **Step 1: Install the package (in container)**

Run:
```bash
docker exec hsm-app-workspace-1 sh -c 'cd /workspace && pnpm --filter @hsm/web add @jsverse/transloco'
```
Expected: added to `apps/frontend/web/package.json` dependencies; lockfile updated. Record the resolved version.

- [ ] **Step 2: Convert the flat catalogs to nested `public/i18n/*.json` (with collision + interpolation fixes)**

Run this script from `apps/frontend/web` (it reads the existing flat `src/i18n/{es,en}.json`, resolves the 3 leaf/parent collisions, converts the 8 `{$INTERPOLATION}` placeholders to named `{{…}}` params, and writes nested files to `public/i18n/`):

```bash
cd apps/frontend/web && mkdir -p public/i18n && python3 - <<'PY'
import json, re

# 3 keys are BOTH a leaf and a parent prefix -> rename the leaf so nesting is valid.
RENAME = {
    'patient.home.greeting': 'patient.home.greetingText',
    'workspace.home.greeting': 'workspace.home.greetingText',
    'layout.rail.version': 'layout.rail.versionText',
}
# 8 interpolated strings: map positional {$INTERPOLATION[_n]} -> named {{param}}.
# Single-interpolation strings use {{name}}; the two version footers use {{ui}}/{{api}}.
PARAMS = {
    'auth.login.version': ['ui', 'api'],
    'layout.rail.versionText': ['ui', 'api'],  # after rename
}
DEFAULT_PARAM = 'value'

def convert_interp(key, text):
    order = PARAMS.get(key)
    idx = {'i': 0}
    def repl(m):
        i = idx['i']; idx['i'] += 1
        name = order[i] if order else DEFAULT_PARAM
        return '{{' + name + '}}'
    return re.sub(r'\{\$[A-Z0-9_]+\}', repl, text)

def nest(flat):
    root = {}
    for k, v in flat.items():
        k = RENAME.get(k, k)
        v = convert_interp(k, v)
        parts = k.split('.')
        node = root
        for p in parts[:-1]:
            node = node.setdefault(p, {})
            assert isinstance(node, dict), f'collision at {k}'
        node[parts[-1]] = v
    return root

for lang in ('es', 'en'):
    flat = json.load(open(f'src/i18n/{lang}.json'))['translations']
    nested = nest(flat)
    with open(f'public/i18n/{lang}.json', 'w', encoding='utf-8') as f:
        json.dump(nested, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(lang, 'written; top-level keys:', sorted(nested))
PY
```
Expected: `public/i18n/es.json` and `public/i18n/en.json` written, nested, top-level keys `admin api auth documents layout onboarding patient placeholder profile settings templates workspace`. Verify: `python3 -c "import json;json.load(open('public/i18n/es.json'));json.load(open('public/i18n/en.json'));print('valid json')"`.

> The 3 renamed keys (`*.greetingText`, `layout.rail.versionText`) and the named params (`{{ui}}`, `{{api}}`, `{{value}}`) must be used verbatim when those specific strings are migrated in Task 4 — they are called out again there.

- [ ] **Step 3: Write the loader**

Create `apps/frontend/web/src/app/core/i18n/transloco-loader.ts`:
```ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Translation, TranslocoLoader } from '@jsverse/transloco';
import type { Observable } from 'rxjs';

/**
 * Loads a language's nested JSON from `public/i18n/<lang>.json` (served at the
 * site root as `/i18n/<lang>.json`). One HTTP fetch per language, cached by
 * Transloco after first load.
 */
@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(lang: string): Observable<Translation> {
    return this.http.get<Translation>(`/i18n/${lang}.json`);
  }
}
```

- [ ] **Step 4: Write the failing loader spec**

Create `apps/frontend/web/src/app/core/i18n/transloco-loader.spec.ts`:
```ts
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoHttpLoader } from './transloco-loader';

describe('TranslocoHttpLoader', () => {
  it('fetches /i18n/<lang>.json', () => {
    TestBed.configureTestingModule({
      providers: [
        TranslocoHttpLoader,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const loader = TestBed.inject(TranslocoHttpLoader);
    const http = TestBed.inject(HttpTestingController);

    let result: unknown;
    loader.getTranslation('es').subscribe(t => (result = t));
    http.expectOne('/i18n/es.json').flush({ auth: { login: { title: 'x' } } });

    expect(result).toEqual({ auth: { login: { title: 'x' } } });
    http.verify();
  });
});
```

- [ ] **Step 5: Run the spec, verify it fails**

Run:
```bash
docker exec hsm-app-workspace-1 sh -c 'cd /workspace && CI=true pnpm --filter @hsm/web test -- transloco-loader'
```
Expected: FAIL (module not yet wired / or PASS once Step 3 landed — if it passes, that's fine; the loader is trivial). Proceed.

- [ ] **Step 6: Register Transloco in `app.config.ts`**

In `apps/frontend/web/src/app/app.config.ts`, add to the imports and providers (keep the existing `provideHttpClient`, router, zoneless, PrimeNG/Aura providers). Add:
```ts
import { provideTransloco } from '@jsverse/transloco';
import { TranslocoHttpLoader } from './core/i18n/transloco-loader';
```
and inside `providers: [...]`:
```ts
    provideTransloco({
      config: {
        availableLangs: ['es', 'en'],
        defaultLang: 'es',
        fallbackLang: 'es',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        missingHandler: { logMissingKey: true, useFallbackTranslation: true },
      },
      loader: TranslocoHttpLoader,
    }),
```
Add `isDevMode` to the `@angular/core` import. Do NOT remove the native-localize providers yet if any exist here — Task 6 handles teardown; but if `app.config.ts` currently calls `setTranslation(primeNgTranslationForActiveLocale())` at provider-init, leave it for now (Task 3 rewires it).

- [ ] **Step 7: Run the spec, verify pass**

Run:
```bash
docker exec hsm-app-workspace-1 sh -c 'cd /workspace && CI=true pnpm --filter @hsm/web test -- transloco-loader'
```
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/web/package.json apps/frontend/web/pnpm-lock.yaml apps/frontend/web/public/i18n apps/frontend/web/src/app/core/i18n/transloco-loader.ts apps/frontend/web/src/app/core/i18n/transloco-loader.spec.ts apps/frontend/web/src/app/app.config.ts
git commit -m "feat(web-i18n): add Transloco + nested public/i18n catalogs + HTTP loader"
```
(pnpm-lock.yaml is at the repo root — adjust the path to `pnpm-lock.yaml` if so.)

---

### Task 2: LanguageService + boot lang + instant switcher

**Files:**
- Modify: `apps/frontend/web/src/app/core/i18n/language.service.ts`
- Modify: `apps/frontend/web/src/app/layout/language-switcher/language-switcher.ts`
- Test: `apps/frontend/web/src/app/core/i18n/language.service.spec.ts`

**Interfaces:**
- Consumes: `TranslocoService` from `@jsverse/transloco`.
- Produces: `LanguageService` with `LANG_STORAGE_KEY = 'hsm.lang'`, `type AppLang = 'es' | 'en'`, `SUPPORTED: readonly AppLang[]`, `current(): Signal<AppLang>`, `switch(lang: AppLang): void` (sets active lang + persists; NO reload), and a standalone `resolveBootLang(stored: string | null): AppLang` pure function. On construction it applies the persisted lang.

- [ ] **Step 1: Write the failing test**

Replace `apps/frontend/web/src/app/core/i18n/language.service.spec.ts` with:
```ts
import { resolveBootLang } from './language.service';

describe('resolveBootLang', () => {
  it('defaults to es when nothing stored', () => {
    expect(resolveBootLang(null)).toBe('es');
  });
  it('honors a stored supported lang', () => {
    expect(resolveBootLang('en')).toBe('en');
  });
  it('falls back to es for an unknown stored value', () => {
    expect(resolveBootLang('de')).toBe('es');
  });
});
```

- [ ] **Step 2: Run it, verify fail**

Run:
```bash
docker exec hsm-app-workspace-1 sh -c 'cd /workspace && CI=true pnpm --filter @hsm/web test -- language.service'
```
Expected: FAIL (`resolveBootLang` not exported).

- [ ] **Step 3: Rewrite `language.service.ts`**

Replace the file contents with:
```ts
import { effect, inject, Injectable, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export const LANG_STORAGE_KEY = 'hsm.lang';
export type AppLang = 'es' | 'en';
const SUPPORTED = ['es', 'en'] as const;

function isSupported(v: string | null | undefined): v is AppLang {
  return v === 'es' || v === 'en';
}

/** Pure boot resolver: stored lang if supported, else the default 'es'. */
export function resolveBootLang(stored: string | null): AppLang {
  return isSupported(stored) ? stored : 'es';
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly SUPPORTED = SUPPORTED;
  private readonly transloco = inject(TranslocoService);
  private readonly _current = signal<AppLang>(
    resolveBootLang(this.readStored()),
  );
  readonly current = this._current.asReadonly();

  constructor() {
    // Apply the persisted language at startup (Transloco default is 'es').
    this.transloco.setActiveLang(this._current());
    // Keep the signal in sync if the active lang changes elsewhere.
    effect(() => {
      const lang = this._current();
      if (this.transloco.getActiveLang() !== lang) {
        this.transloco.setActiveLang(lang);
      }
    });
  }

  /** Switch language in place — no reload. Persists the choice. */
  switch(lang: AppLang): void {
    if (!isSupported(lang)) return;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      /* storage blocked — still switch for this session */
    }
    this._current.set(lang);
    this.transloco.setActiveLang(lang);
  }

  private readStored(): string | null {
    try {
      return localStorage.getItem(LANG_STORAGE_KEY);
    } catch {
      return null;
    }
  }
}
```

- [ ] **Step 4: Run it, verify pass**

Run:
```bash
docker exec hsm-app-workspace-1 sh -c 'cd /workspace && CI=true pnpm --filter @hsm/web test -- language.service'
```
Expected: PASS.

- [ ] **Step 5: Point the switcher at the new API**

In `apps/frontend/web/src/app/layout/language-switcher/language-switcher.ts`: the `choose(locale)` handler must call `this.lang.switch(locale)` (unchanged name) and the option `value` type is now `AppLang`. Import `type AppLang` from `../../core/i18n/language.service` instead of the deleted `locale-init`. The `$localize` aria label becomes a Transloco read — since this component is migrated for real in Task 4 (layout namespace), for now replace the `$localize` aria with a literal `'Idioma'` string ONLY if the file otherwise won't compile after `locale-init` is removed; otherwise leave the `$localize` and let Task 4 convert it. (The reviewer confirms the switcher compiles.)

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/web/src/app/core/i18n/language.service.ts apps/frontend/web/src/app/core/i18n/language.service.spec.ts apps/frontend/web/src/app/layout/language-switcher/language-switcher.ts
git commit -m "feat(web-i18n): LanguageService drives Transloco setActiveLang (instant switch)"
```

---

### Task 3: PrimeNG chrome follows the Transloco active lang

**Files:**
- Modify: `apps/frontend/web/src/app/core/i18n/primeng-translations.ts`
- Modify: `apps/frontend/web/src/app/app.config.ts`
- Test: `apps/frontend/web/src/app/core/i18n/primeng-translations.spec.ts`

**Interfaces:**
- Consumes: the `ES`/`EN` `Translation` maps already in `primeng-translations.ts`.
- Produces: `primeNgTranslationFor(lang: 'es' | 'en'): Translation`. A bootstrap effect calls `PrimeNG.setTranslation(...)` on every Transloco lang change.

- [ ] **Step 1: Write the failing test**

Replace `apps/frontend/web/src/app/core/i18n/primeng-translations.spec.ts` (create if absent) with:
```ts
import { primeNgTranslationFor } from './primeng-translations';

describe('primeNgTranslationFor', () => {
  it('returns Spanish for es', () => {
    expect(primeNgTranslationFor('es').accept).toBe('Aceptar');
  });
  it('returns English for en', () => {
    expect(primeNgTranslationFor('en').accept).toBe('Accept');
  });
});
```

- [ ] **Step 2: Run it, verify fail**

Run:
```bash
docker exec hsm-app-workspace-1 sh -c 'cd /workspace && CI=true pnpm --filter @hsm/web test -- primeng-translations'
```
Expected: FAIL (`primeNgTranslationFor` not exported).

- [ ] **Step 3: Replace the export**

In `apps/frontend/web/src/app/core/i18n/primeng-translations.ts`, keep the `ES` and `EN` `Translation` consts unchanged; replace the trailing `primeNgTranslationForActiveLocale()` function with:
```ts
export function primeNgTranslationFor(lang: 'es' | 'en'): Translation {
  return lang === 'en' ? EN : ES;
}
```
Remove the `import { activeLocale } from './locale-init';` line (no longer used).

- [ ] **Step 4: Wire PrimeNG to lang changes in `app.config.ts`**

In `app.config.ts`, replace the current one-shot `inject(PrimeNG).setTranslation(primeNgTranslationForActiveLocale())` with a provider that re-applies on every Transloco lang change. Add a `provideAppInitializer` (Angular 21) or an `ENVIRONMENT_INITIALIZER`-style effect:
```ts
import { inject, provideAppInitializer } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { PrimeNG } from 'primeng/config';
import { primeNgTranslationFor } from './core/i18n/primeng-translations';
// ...
    provideAppInitializer(() => {
      const primeng = inject(PrimeNG);
      const transloco = inject(TranslocoService);
      transloco.langChanges$.subscribe(lang => {
        primeng.setTranslation(primeNgTranslationFor(lang === 'en' ? 'en' : 'es'));
      });
    }),
```
Update the import line for `primeng-translations` to `primeNgTranslationFor`. Remove the old `primeNgTranslationForActiveLocale` import/usage.

- [ ] **Step 5: Run it, verify pass**

Run:
```bash
docker exec hsm-app-workspace-1 sh -c 'cd /workspace && CI=true pnpm --filter @hsm/web test -- primeng-translations'
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/web/src/app/core/i18n/primeng-translations.ts apps/frontend/web/src/app/core/i18n/primeng-translations.spec.ts apps/frontend/web/src/app/app.config.ts
git commit -m "feat(web-i18n): PrimeNG chrome re-translates on Transloco lang change"
```

---

### Task 4: Migrate markers per namespace (REPEATABLE — one commit per namespace)

This is a **repeatable per-namespace procedure**. Do `auth` first as the proven pattern, then repeat for each remaining namespace, committing per namespace.

**Namespace order (folder in `src/app`):** `auth` (features/auth) → `workspace` → `patient` → `documents` → `templates` → `settings` → `admin` → `onboarding` → `profile` → `placeholder` → `layout` (layout/**, incl. `nav-node.ts`, switcher, profile-card, rail, breadcrumb, shell, view-tabs, flyout). `api` keys are consumed by `core/i18n/api-messages.ts` — migrate that file with the `layout`/`core` pass (see Step 4 note).

**Files (per pass):** every `*.html` and string-bearing `*.ts` under the namespace's folder(s), plus their `*.spec.ts`.

The four marker shapes and their conversions:

- [ ] **Step 1: Element text `i18n="@@ns.comp.key"`**

```html
<!-- before -->
<h1 i18n="@@workspace.home.title">Bienvenido de nuevo</h1>
<!-- after -->
<h1 transloco="workspace.home.title"></h1>
```
The `transloco` **attribute directive** sets the element's text to the key's translation and re-renders on lang change. For an element that also has child markup/interpolations, use the pipe form instead:
```html
<h1>{{ 'workspace.home.title' | transloco }}</h1>
```
Add `TranslocoDirective` and/or `TranslocoPipe` to the component's standalone `imports`:
```ts
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco';
// @Component({ imports: [TranslocoDirective, TranslocoPipe, /* … */] })
```

- [ ] **Step 2: Attribute markers `i18n-placeholder`, `i18n-aria-label`, etc.**

```html
<!-- before -->
<input i18n-placeholder="@@auth.login.username.placeholder" placeholder="Usuario" />
<!-- after -->
<input [placeholder]="'auth.login.username.placeholder' | transloco" />
```
For `[attr.aria-label]` bound markers, mirror: `[attr.aria-label]="'key' | transloco"`.

- [ ] **Step 3: Interpolation strings (only 8 across the app — use the exact param names)**

For a string that had `{{ expr }}` inside an `i18n` element, pass Transloco params. The catalog value uses the named param (already converted in Task 1). The 8 keys and their params:
  - `workspace.home.greetingText` → param `value` (was `workspace.home.greeting`):
    ```html
    <h1>{{ 'workspace.home.greetingText' | transloco: { value: firstName() } }}</h1>
    ```
    (catalog: `"greetingText": "Bienvenido de nuevo, {{value}}."`)
  - `patient.home.greetingText` → param `value` (was `patient.home.greeting`): same shape with `patient.home.greetingText`.
  - `auth.login.version` → params `ui`, `api`:
    ```html
    <span>{{ 'auth.login.version' | transloco: { ui: version.uiVersion, api: version.apiVersion() ?? unknownVersion } }}</span>
    ```
    (catalog: `"version": " UI v{{ui}} · API v{{api}} "`)
  - `layout.rail.versionText` → params `ui`, `api` (was `layout.rail.version`): same shape with `layout.rail.versionText`.
  - The remaining ≤4 interpolated keys: grep the namespace for `{{value}}` in `public/i18n/es.json` and pass `{ value: <the original bound expr> }`. (Find them: `grep -rn '{{value}}' public/i18n/es.json`.)

> NOTE the renames from Task 1: use `workspace.home.greetingText`, `patient.home.greetingText`, `layout.rail.versionText` — NOT the old `.greeting`/`.version` keys. Their `.fallbackName`/`.unknown` siblings keep their original key.

- [ ] **Step 4: `.ts` `$localize`**

```ts
// before
const msg = $localize`:@@documents.generate.error.failed:La generación del documento falló.`;
// after
private readonly transloco = inject(TranslocoService);
const msg = this.transloco.translate('documents.generate.error.failed');
```
For a class-field initializer that can't inject, read lazily in a method, or use `translate` at call time. For `api-messages.ts` (the `api.*` keys), inject `TranslocoService` and return `this.transloco.translate(\`api.error.${…}\`)` / `translate(\`api.validation.${…}\`)` — since it's a plain function today, convert it to functions that take a `TranslocoService` arg, or (preferred) an injectable `ApiMessages` service; update the single caller in `core/api/api-error.ts` accordingly. Keep the key strings identical (`api.error.invalidCredentials`, `api.validation.isNotEmpty` mapping, etc.).

- [ ] **Step 5: Extract-check the namespace**

After converting a namespace's files, confirm no `@@` markers or `$localize` remain in it:
```bash
grep -rn 'i18n=\|i18n-\|\$localize' apps/frontend/web/src/app/features/auth   # -> no output
```
Expected: empty.

- [ ] **Step 6: Fix + run the namespace's specs**

Specs that assert translated text need the Transloco testing provider (Task 5 creates the helper; until then, add `provideTranslocoTestingModule()` to the spec's `providers`). Run:
```bash
docker exec hsm-app-workspace-1 sh -c 'cd /workspace && CI=true pnpm --filter @hsm/web test -- <namespace>'
```
Expected: PASS. Assertions on visible text should match the Spanish catalog value (tests run with the `es` testing lang by default).

- [ ] **Step 7: Commit the namespace**

```bash
git add apps/frontend/web/src/app/features/auth
git commit -m "i18n(web): migrate auth markers to Transloco"
```

- [ ] **Step 8: Repeat Steps 1–7 for each remaining namespace.** After the final namespace, confirm the WHOLE app is clean:
```bash
grep -rn 'i18n=\|i18n-\|\$localize' apps/frontend/web/src   # -> no output
```

---

### Task 5: Transloco testing helper + spec sweep

**Files:**
- Create: `apps/frontend/web/src/app/core/i18n/transloco-testing.ts`
- Modify: `apps/frontend/web/src/test-setup.ts` (remove localize init — full teardown in Task 6, but the localize import can go here)
- Modify: component specs as needed.

**Interfaces:**
- Produces: `provideTranslocoTestingModule(lang?: 'es' | 'en')` returning the providers array a spec adds to `TestBed`, loading the real `public/i18n/*.json` synchronously.

- [ ] **Step 1: Write the helper**

Create `apps/frontend/web/src/app/core/i18n/transloco-testing.ts`:
```ts
import {
  provideTranslocoTesting,
  type Translation,
} from '@jsverse/transloco';
import en from '../../../../public/i18n/en.json';
import es from '../../../../public/i18n/es.json';

/**
 * Providers for specs that render translated markup: loads the real catalogs
 * so assertions read the actual copy. Defaults to Spanish (the app default).
 */
export function provideTranslocoTestingModule(lang: 'es' | 'en' = 'es') {
  return provideTranslocoTesting({
    langs: { es: es as Translation, en: en as Translation },
    translocoConfig: {
      availableLangs: ['es', 'en'],
      defaultLang: lang,
    },
    preloadLangs: true,
  });
}
```
> `tsconfig` must allow JSON imports (`resolveJsonModule: true`). If not set, add it to `tsconfig.spec.json`/`tsconfig.app.json` `compilerOptions` in this step and note it.

- [ ] **Step 2: Add the helper to specs that broke in Task 4**

Any component spec that instantiates a component using the `transloco` pipe/directive needs `...provideTranslocoTestingModule()` in its `TestBed` `providers`. Sweep them:
```bash
docker exec hsm-app-workspace-1 sh -c 'cd /workspace && CI=true pnpm --filter @hsm/web test' 2>&1 | grep -i 'missing\|transloco\|FAIL'
```
Add the provider to each failing spec until green.

- [ ] **Step 3: Full suite green**

Run:
```bash
docker exec hsm-app-workspace-1 sh -c 'cd /workspace && CI=true pnpm --filter @hsm/web test'
```
Expected: all specs pass.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/web/src/app/core/i18n/transloco-testing.ts apps/frontend/web/src/app apps/frontend/web/tsconfig.spec.json
git commit -m "test(web-i18n): Transloco testing module + spec sweep"
```

---

### Task 6: Remove native @angular/localize + single-bundle build/serve

**Files:**
- Modify: `src/main.ts`, `src/test-setup.ts`, `angular.json`, `package.json`, `Dockerfile`
- Delete: `src/app/core/i18n/locale-init.ts`, `src/i18n/es.json`, `src/i18n/en.json`, `serve.json`, `serve-root/index.html`

- [ ] **Step 1: Strip `main.ts`**

Remove the first line `import '@angular/localize/init';` and the entire pre-bootstrap locale-redirect block (the `{ const first = … window.location.replace(...) }` IIFE). Keep `configureMonacoEnvironment()` and `bootstrapApplication(App, appConfig)`.

- [ ] **Step 2: Strip `test-setup.ts`**

Remove `import '@angular/localize/init';` (Transloco needs no global init). Keep the `matchMedia` polyfill and any other setup.

- [ ] **Step 3: Delete native-only files**

```bash
cd apps/frontend/web
git rm src/app/core/i18n/locale-init.ts src/i18n/es.json src/i18n/en.json serve.json serve-root/index.html
```
(If `locale-init.ts` is still imported anywhere, that import was missed in Task 4 — grep `locale-init` and fix before deleting.)

- [ ] **Step 4: Clean `angular.json`**

Remove the whole `projects.web.i18n` block, the `build.configurations.es`/`en` entries, and the `serve.configurations.development`/`en` locale specializations — restore `serve.configurations.development` to `{ "buildTarget": "web:build:development" }` and drop the `en` serve config. Ensure `build.options` has no `localize` key. Keep the `styles`/`inlineStyleLanguage`/`schematics` (SCSS) settings intact.

- [ ] **Step 5: Clean `package.json` scripts + drop the dep**

Set:
```json
"dev": "ng serve",
"start": "ng serve",
"build": "ng build",
```
Remove the `dev:en` script. Remove `@angular/localize` from `dependencies`:
```bash
docker exec hsm-app-workspace-1 sh -c 'cd /workspace && pnpm --filter @hsm/web remove @angular/localize'
```

- [ ] **Step 6: Simplify the Dockerfile runtime stage**

Replace the per-locale runtime stage with a single static serve:
```dockerfile
RUN npm install -g serve
WORKDIR /app
COPY --from=builder /app/apps/frontend/web/dist/browser ./dist
EXPOSE 4200
# -s: SPA fallback to index.html for client-side routes (one bundle, no locale subpaths).
CMD ["serve", "-s", "dist", "-l", "4200"]
```
(`public/i18n/*.json` are emitted into `dist/browser/i18n/` as build assets — confirm `angular.json` `assets` includes the `public` glob, which it already does via `{ "glob": "**/*", "input": "public" }`.)

- [ ] **Step 7: Verify single-bundle build + serve**

Run:
```bash
docker exec hsm-app-workspace-1 sh -c 'cd /workspace/apps/frontend/web && rm -rf dist && pnpm exec ng build 2>&1 | tail -5 && ls dist/browser && ls dist/browser/i18n'
```
Expected: one build (no `es/`/`en/` subdirs); `dist/browser/i18n/es.json` + `en.json` present; `index.html` at `dist/browser/index.html`.

- [ ] **Step 8: Full test suite + boot check**

Run:
```bash
docker exec hsm-app-workspace-1 sh -c 'cd /workspace && CI=true pnpm --filter @hsm/web test 2>&1 | tail -5'
```
Expected: all pass. Then start `ng serve` and confirm `http://localhost:4200/` serves the app at baseHref `/` (no redirect), `/i18n/es.json` is fetchable, and switching language in the UI re-renders without a reload.

- [ ] **Step 9: Commit**

```bash
git add -A apps/frontend/web
git commit -m "refactor(web-i18n): remove @angular/localize; single-bundle build + runtime switch"
```

---

### Task 7: Docs + dev-serving update

**Files:**
- Modify: `apps/frontend/web/CLAUDE.md`

- [ ] **Step 1: Rewrite the i18n section of `CLAUDE.md`**

Replace the native-localize / per-locale-serving section with the Transloco model: `public/i18n/<lang>.json` nested catalogs, `{{ 'key' | transloco }}` / `transloco` directive / `TranslocoService.translate()`, instant `setActiveLang` switch (persist `hsm.lang`), ONE bundle, plain `pnpm --filter @hsm/web dev` (`ng serve`, HMR, no locale subpaths). Document adding a language: drop `public/i18n/<lang>.json`, add to `availableLangs` + the switcher. Note PrimeNG chrome follows the active lang via `provideAppInitializer` + `langChanges$`.

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/web/CLAUDE.md
git commit -m "docs(web-i18n): document Transloco runtime i18n + single-instance deploy"
```

---

## Verification (whole feature)

- `grep -rn 'i18n=\|i18n-\|\$localize\|@angular/localize\|localize/init' apps/frontend/web/src` → **no output**.
- `pnpm --filter @hsm/web build` → single `dist/browser` (no `es/`/`en/`), `dist/browser/i18n/{es,en}.json` present.
- `pnpm --filter @hsm/web test` → all specs pass.
- Manual: `ng serve`; app loads Spanish at `/`; switch to English re-renders in place (no reload, URL unchanged); reload keeps English (localStorage); PrimeNG paginator/calendar follow the language.
- `angular.json` has no `i18n`/`localize`; `package.json` has no `@angular/localize` and `build` is `ng build`.
