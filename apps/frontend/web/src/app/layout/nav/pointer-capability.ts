import { Injectable, signal } from '@angular/core';

/** The media query that marks a precise, hover-capable pointer (a mouse). */
const HOVER_QUERY = '(hover: hover) and (pointer: fine)';

/**
 * Exposes whether the device has a precise, hover-capable pointer as a signal.
 *
 * The hover-expand rail and the cascade flyouts are hover-driven; on a
 * coarse/touch pointer that model is inert, so the chrome degrades to a
 * tap-to-open drawer (U10) and the hover-intent controller (U4) no-ops. Detection
 * uses the `hover`/`pointer` media features — not viewport width — because a
 * narrow desktop window still has a mouse and a wide tablet still does not.
 *
 * When `matchMedia` is unavailable (SSR / non-browser), it assumes a
 * hover-capable desktop so the full experience renders by default.
 */
@Injectable({ providedIn: 'root' })
export class PointerCapability {
  private readonly hasHoverSignal = signal(readHover());
  /** True when the device has a precise, hover-capable pointer. */
  readonly hasHover = this.hasHoverSignal.asReadonly();

  constructor() {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    const query = window.matchMedia(HOVER_QUERY);
    query.addEventListener?.('change', event =>
      this.hasHoverSignal.set(event.matches),
    );
  }
}

function readHover(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return true;
  }
  return window.matchMedia(HOVER_QUERY).matches;
}
