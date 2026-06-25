import { Injectable, signal } from '@angular/core';

/**
 * The `beforeinstallprompt` event, typed minimally for our use.
 *
 * It is not in the standard DOM lib (it's a non-standard, Chromium-family
 * event), so we declare just the surface we touch: `preventDefault()` to stop
 * the browser's default mini-infobar, and `prompt()` to show the install
 * dialog on demand from a user gesture.
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

/**
 * Captures the browser's PWA install prompt so the app can offer a quiet,
 * on-brand "Install app" affordance instead of relying on the default
 * mini-infobar.
 *
 * On Chromium browsers the `beforeinstallprompt` event fires when the app is
 * installable. We `preventDefault()` it (suppressing the default banner), stash
 * the event, and expose {@link installAvailable}; the UI shows its button only
 * while that signal is true. {@link promptInstall} replays the stored event's
 * native `prompt()` from a user gesture. After a prompt resolves (or the app is
 * installed) the event is single-use, so we clear it.
 *
 * Browsers without `beforeinstallprompt` (e.g. Safari/iOS) never set the
 * signal, so the button simply stays hidden there.
 */
@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  private readonly installAvailableSignal = signal(false);

  /** True while a captured install prompt is available to replay. */
  readonly installAvailable = this.installAvailableSignal.asReadonly();

  constructor() {
    window.addEventListener('beforeinstallprompt', event => {
      // Stop the browser's default install infobar; we drive it ourselves.
      event.preventDefault();
      this.deferredPrompt = event as BeforeInstallPromptEvent;
      this.installAvailableSignal.set(true);
    });

    // Once installed, the prompt is spent — hide the affordance.
    window.addEventListener('appinstalled', () => this.reset());
  }

  /**
   * Replays the captured install prompt. No-op when none is available. The
   * `beforeinstallprompt` event can only be prompted once, so it is cleared
   * afterwards regardless of the user's choice.
   */
  async promptInstall(): Promise<void> {
    const event = this.deferredPrompt;
    if (!event) {
      return;
    }
    await event.prompt();
    this.reset();
  }

  private reset(): void {
    this.deferredPrompt = null;
    this.installAvailableSignal.set(false);
  }
}
