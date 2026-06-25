import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/**
 * Tracks browser online/offline state for the offline-awareness indicator.
 *
 * The PWA's offline fallback is the cached app shell (the service worker serves
 * `/index.html` for navigations when offline — see `ngsw-config.json`'s
 * `navigationUrls`). This service exists only to tell the user *why* live data
 * isn't loading: it seeds from `navigator.onLine` and flips on the window
 * `online` / `offline` events, exposing the state as a readonly signal the
 * root component renders a quiet `role="status"` banner from.
 *
 * It is deliberately runtime-only (no caching, no API): it never touches
 * authenticated/clinical responses, so it has no bearing on the
 * "assets-only, never PHI" cache invariant (R13/KTD7).
 */
@Injectable({ providedIn: 'root' })
export class OfflineStatusService {
  private readonly document = inject(DOCUMENT);

  private readonly onlineSignal = signal(this.readInitialOnline());

  /** True while the browser reports a network connection. */
  readonly isOnline = this.onlineSignal.asReadonly();

  constructor() {
    const window = this.document.defaultView;
    if (!window) {
      return;
    }

    const onOnline = () => this.onlineSignal.set(true);
    const onOffline = () => this.onlineSignal.set(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    });
  }

  /** `navigator.onLine` defaults to `true` where the API is unavailable. */
  private readInitialOnline(): boolean {
    const nav = this.document.defaultView?.navigator;
    return nav ? nav.onLine : true;
  }
}
