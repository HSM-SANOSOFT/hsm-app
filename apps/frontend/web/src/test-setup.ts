/**
 * Vitest setup for `@hsm/web` (referenced from `angular.json` → `test`
 * → `setupFiles`).
 *
 * jsdom does not implement `window.matchMedia`, but PrimeNG's responsive
 * components (e.g. the menubar in the shell) call it on init. Provide a minimal
 * stub so those components render under test.
 */
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
