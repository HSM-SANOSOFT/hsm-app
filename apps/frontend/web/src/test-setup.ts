/**
 * Vitest setup for `@hsm/web` (referenced from `angular.json` → `test`
 * → `setupFiles`).
 *
 * `import '@angular/localize/init'` mirrors the side-effect import in
 * `main.ts`: it defines the global `$localize` function at runtime AND pulls
 * `@angular/localize`'s `declare global` typings into the spec TS program (the
 * spec program only includes spec files + this file, not `main.ts`), so any
 * code reachable from a spec that reads `$localize` (e.g. `activeLocale()` in
 * `core/i18n/locale-init.ts`) type-checks and runs correctly under test.
 *
 * jsdom does not implement `window.matchMedia`, but PrimeNG's responsive
 * components (e.g. the menubar in the shell) call it on init. Provide a minimal
 * stub so those components render under test.
 */
import '@angular/localize/init';

function noop(): void {
  // Intentionally empty: media-query listeners are no-ops under test.
}

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: noop,
      removeListener: noop,
      addEventListener: noop,
      removeEventListener: noop,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
