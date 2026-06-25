import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HoverIntent } from './hover-intent';
import type { PointerCapability } from './pointer-capability';

function pointer(hasHover: boolean): PointerCapability {
  return { hasHover: () => hasHover } as unknown as PointerCapability;
}

describe('HoverIntent', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('opens after the open delay on enter', () => {
    const intent = new HoverIntent(pointer(true), { openDelay: 100 });
    intent.enter();
    expect(intent.isOpen()).toBe(false);
    vi.advanceTimersByTime(100);
    expect(intent.isOpen()).toBe(true);
  });

  it('keeps the surface open when the pointer re-enters within the close delay', () => {
    const intent = new HoverIntent(pointer(true), {
      openDelay: 0,
      closeDelay: 300,
    });
    intent.enter();
    vi.advanceTimersByTime(0);
    expect(intent.isOpen()).toBe(true);

    intent.leave();
    vi.advanceTimersByTime(200); // still within the close delay
    intent.enter(); // pointer came back — cancels the pending close
    vi.advanceTimersByTime(300);
    expect(intent.isOpen()).toBe(true);
  });

  it('closes after the close delay once the pointer stays away', () => {
    const intent = new HoverIntent(pointer(true), {
      openDelay: 0,
      closeDelay: 300,
    });
    intent.openNow();
    intent.leave();
    vi.advanceTimersByTime(300);
    expect(intent.isOpen()).toBe(false);
  });

  it('no-ops enter/leave on a coarse pointer', () => {
    const intent = new HoverIntent(pointer(false), { openDelay: 0 });
    intent.enter();
    vi.advanceTimersByTime(1000);
    expect(intent.isOpen()).toBe(false);
  });

  it('opens immediately via openNow regardless of pointer (tap/keyboard)', () => {
    const intent = new HoverIntent(pointer(false));
    intent.openNow();
    expect(intent.isOpen()).toBe(true);
    intent.closeNow();
    expect(intent.isOpen()).toBe(false);
  });

  it('cancels a pending open when switching to another surface', () => {
    const intent = new HoverIntent(pointer(true), { openDelay: 100 });
    intent.enter(); // pending open
    intent.closeNow(); // switched away before it opened
    vi.advanceTimersByTime(100);
    expect(intent.isOpen()).toBe(false);
  });
});
