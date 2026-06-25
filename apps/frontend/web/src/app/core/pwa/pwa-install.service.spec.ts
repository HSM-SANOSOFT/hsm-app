import { TestBed } from '@angular/core/testing';

import {
  type BeforeInstallPromptEvent,
  PwaInstallService,
} from './pwa-install.service';

/** A minimal fake `beforeinstallprompt` event with spied `prompt`/`preventDefault`. */
function makePromptEvent(): BeforeInstallPromptEvent & {
  prompt: ReturnType<typeof vi.fn>;
  preventDefault: ReturnType<typeof vi.fn>;
} {
  const event = new Event('beforeinstallprompt') as Event & {
    prompt: ReturnType<typeof vi.fn>;
    userChoice: Promise<{ outcome: 'accepted'; platform: string }>;
  };
  event.preventDefault = vi.fn();
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({
    outcome: 'accepted',
    platform: 'web',
  });
  return event as BeforeInstallPromptEvent & {
    prompt: ReturnType<typeof vi.fn>;
    preventDefault: ReturnType<typeof vi.fn>;
  };
}

describe('PwaInstallService', () => {
  let service: PwaInstallService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [PwaInstallService] });
    service = TestBed.inject(PwaInstallService);
  });

  it('starts with no install available', () => {
    expect(service.installAvailable()).toBe(false);
  });

  it('captures beforeinstallprompt: prevents default and marks install available', () => {
    const event = makePromptEvent();
    window.dispatchEvent(event);

    // Default install infobar suppressed; the affordance becomes available.
    // (Asserts `called`, not `calledOnce`: the root-provided service registers
    // a window listener per construction, so prior TestBed instances may also
    // observe the dispatched event — a test-isolation artifact, not behavior.)
    expect(event.preventDefault).toHaveBeenCalled();
    expect(service.installAvailable()).toBe(true);
  });

  it('promptInstall() replays the captured event prompt and then clears it', async () => {
    const event = makePromptEvent();
    window.dispatchEvent(event);

    await service.promptInstall();

    expect(event.prompt).toHaveBeenCalledOnce();
    // Single-use: the affordance hides after prompting.
    expect(service.installAvailable()).toBe(false);
  });

  it('promptInstall() is a no-op when no event was captured', async () => {
    await expect(service.promptInstall()).resolves.toBeUndefined();
    expect(service.installAvailable()).toBe(false);
  });
});
