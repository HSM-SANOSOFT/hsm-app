import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  inject,
  type OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

import { OfflineStatusService } from './core/pwa/offline-status.service';

/**
 * Root component. Hosts a `<router-outlet />` for the shell / login, plus two
 * unobtrusive, brand-tokened, accessible (`role="status"`) banners that live
 * above every route:
 *
 * - **Offline indicator** — shown when the browser reports it is offline, so a
 *   user understands why live data isn't loading while the cached app shell
 *   still serves (the SW falls back to `/index.html` for navigations offline).
 * - **Update prompt** — when the service worker reports a new version is
 *   `READY`, a quiet banner offers a reload. The reload is **deferred**: it
 *   only runs on the user's click ({@link reload}), so a staff member mid-form
 *   isn't interrupted. The whole flow is guarded behind `SwUpdate.isEnabled`,
 *   so in dev/test (SW disabled) it is a no-op.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly swUpdate = inject(SwUpdate);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly offlineStatus = inject(OfflineStatusService);

  /** True while the browser reports a network connection (drives the banner). */
  readonly isOnline = this.offlineStatus.isOnline;

  /** Set true once the SW reports a new app version is ready to activate. */
  readonly updateAvailable = signal(false);

  ngOnInit(): void {
    // Guard everything behind `isEnabled`: in dev/test the SW is disabled
    // (see `provideServiceWorker(..., { enabled: production })`), so no
    // subscription is created and the prompt never shows.
    if (!this.swUpdate.isEnabled) {
      return;
    }

    this.swUpdate.versionUpdates
      .pipe(
        filter(
          (event): event is VersionReadyEvent => event.type === 'VERSION_READY',
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        // Surface the prompt only — do NOT auto-reload. The reload is deferred
        // to the user's explicit action so an in-progress form isn't lost.
        this.updateAvailable.set(true);
      });
  }

  /**
   * User-triggered reload: activate the waiting update (best-effort) and then
   * reload to pick up the new app shell. Only reachable from the prompt the
   * user dismisses by acting, so it never interrupts unattended work.
   */
  async reload(): Promise<void> {
    try {
      await this.swUpdate.activateUpdate();
    } catch {
      // Best-effort: reload even if activation fails so the user isn't stuck.
    } finally {
      this.document.location.reload();
    }
  }

  /** Dismiss the update prompt without reloading (defer to a later session). */
  dismissUpdate(): void {
    this.updateAvailable.set(false);
  }
}
