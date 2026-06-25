import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PointerCapability } from './pointer-capability';

type ChangeListener = (event: { matches: boolean }) => void;

describe('PointerCapability', () => {
  let original: typeof window.matchMedia;
  let listeners: ChangeListener[];

  function installMatchMedia(matches: boolean): void {
    listeners = [];
    window.matchMedia = ((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: (_type: string, cb: ChangeListener) =>
        listeners.push(cb),
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }

  beforeEach(() => {
    original = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = original;
  });

  it('reflects the matchMedia result for hover-capable and coarse pointers', () => {
    installMatchMedia(true);
    expect(new PointerCapability().hasHover()).toBe(true);

    installMatchMedia(false);
    expect(new PointerCapability().hasHover()).toBe(false);
  });

  it('updates hasHover when the media query change event fires', () => {
    installMatchMedia(false);
    const capability = new PointerCapability();
    expect(capability.hasHover()).toBe(false);

    for (const listener of listeners) {
      listener({ matches: true });
    }
    expect(capability.hasHover()).toBe(true);
  });
});
