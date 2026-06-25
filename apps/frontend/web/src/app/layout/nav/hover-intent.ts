import { signal } from '@angular/core';

import type { PointerCapability } from './pointer-capability';

/** Tunable open/close delays. Defaults: snappy open, forgiving close. */
export interface HoverIntentOptions {
  /** Delay before opening on pointer-enter (ms). */
  readonly openDelay?: number;
  /** Delay before closing on pointer-leave (ms), cleared if the pointer
   * re-enters first — this is what keeps the cascade open across the gap. */
  readonly closeDelay?: number;
}

const DEFAULT_OPEN_DELAY = 100;
const DEFAULT_CLOSE_DELAY = 320;

/**
 * Models hover *intent* for one surface (the rail, or a flyout column): a brief
 * open delay rejects accidental fly-overs, and a longer close delay — cleared
 * when the pointer comes back — keeps the surface open while the pointer travels
 * the gap between trigger and panel (WCAG 2.2 SC 1.4.13 "hoverable"). The CDK
 * cascade pairs this with `cdkTargetMenuAim` for the diagonal safe-triangle.
 *
 * Hover handlers ({@link enter} / {@link leave}) no-op on a coarse pointer, so
 * the same component degrades to tap-to-open via {@link openNow} (U10) with no
 * stray timers. Keyboard activation uses {@link openNow} / {@link closeNow} too,
 * so the surface never depends on hover alone (R17).
 *
 * State is a signal, so writes from the timers drive change detection under
 * zoneless with no manual tick.
 */
export class HoverIntent {
  private readonly openSignal = signal(false);
  /** Whether the surface is currently open. */
  readonly isOpen = this.openSignal.asReadonly();

  private readonly openDelay: number;
  private readonly closeDelay: number;
  private openTimer: ReturnType<typeof setTimeout> | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly pointer: PointerCapability,
    options: HoverIntentOptions = {},
  ) {
    this.openDelay = options.openDelay ?? DEFAULT_OPEN_DELAY;
    this.closeDelay = options.closeDelay ?? DEFAULT_CLOSE_DELAY;
  }

  /** Pointer entered the trigger or panel — schedule an open (hover only). */
  enter(): void {
    if (!this.pointer.hasHover()) {
      return;
    }
    this.clearCloseTimer();
    if (this.openSignal() || this.openTimer != null) {
      return;
    }
    this.openTimer = setTimeout(() => {
      this.openTimer = null;
      this.openSignal.set(true);
    }, this.openDelay);
  }

  /** Pointer left the trigger and panel — schedule a close (hover only). */
  leave(): void {
    if (!this.pointer.hasHover()) {
      return;
    }
    this.clearOpenTimer();
    if (!this.openSignal() || this.closeTimer != null) {
      return;
    }
    this.closeTimer = setTimeout(() => {
      this.closeTimer = null;
      this.openSignal.set(false);
    }, this.closeDelay);
  }

  /** Open immediately, cancelling pending timers — keyboard / tap path. */
  openNow(): void {
    this.clearTimers();
    this.openSignal.set(true);
  }

  /** Close immediately, cancelling pending timers — Escape / tap-away path. */
  closeNow(): void {
    this.clearTimers();
    this.openSignal.set(false);
  }

  /** Release any pending timers (call on host destroy). */
  destroy(): void {
    this.clearTimers();
  }

  private clearOpenTimer(): void {
    if (this.openTimer != null) {
      clearTimeout(this.openTimer);
      this.openTimer = null;
    }
  }

  private clearCloseTimer(): void {
    if (this.closeTimer != null) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearOpenTimer();
    this.clearCloseTimer();
  }
}
