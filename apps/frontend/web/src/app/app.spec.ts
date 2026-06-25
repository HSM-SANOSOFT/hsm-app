import { DOCUMENT } from '@angular/common';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SwUpdate, type VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';

import { App } from './app';

/**
 * A controllable SwUpdate double: `versionUpdates` is a Subject the test emits
 * on, and `isEnabled` is configurable so we can exercise both the enabled
 * (production) and disabled (dev/test) paths.
 */
function makeSwUpdate(opts: {
  isEnabled: boolean;
  versionUpdates: Subject<VersionEvent>;
  activateUpdate?: () => Promise<boolean>;
}): SwUpdate {
  return {
    isEnabled: opts.isEnabled,
    versionUpdates: opts.versionUpdates.asObservable(),
    activateUpdate: opts.activateUpdate ?? (() => Promise.resolve(true)),
  } as unknown as SwUpdate;
}

describe('App', () => {
  let versionUpdates: Subject<VersionEvent>;

  // `window.location.reload` is non-configurable, so we can't spy it directly.
  // Provide a DOCUMENT proxy whose `location.reload` is a controllable mock;
  // everything else (e.g. `defaultView`/`navigator` for OfflineStatusService)
  // delegates to the real document.
  function configure(swUpdate: SwUpdate, reload?: () => void) {
    const realDocument = document;
    const documentProvider = reload
      ? {
          provide: DOCUMENT,
          useValue: new Proxy(realDocument, {
            get(target, prop, receiver) {
              if (prop === 'location') {
                return { ...realDocument.location, reload };
              }
              const value = Reflect.get(target, prop, receiver);
              return typeof value === 'function' ? value.bind(target) : value;
            },
          }),
        }
      : { provide: DOCUMENT, useValue: realDocument };

    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: SwUpdate, useValue: swUpdate },
        documentProvider,
      ],
    });
  }

  beforeEach(() => {
    versionUpdates = new Subject<VersionEvent>();
    // Default to "online" so the offline banner is absent unless a test forces it.
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  });

  it('should create the app', () => {
    configure(makeSwUpdate({ isEnabled: false, versionUpdates }));
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('hosts a router outlet for the shell / login to render into', () => {
    configure(makeSwUpdate({ isEnabled: false, versionUpdates }));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });

  describe('SwUpdate flow', () => {
    it('sets updateAvailable on a VERSION_READY event when enabled', () => {
      configure(makeSwUpdate({ isEnabled: true, versionUpdates }));
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      const app = fixture.componentInstance;

      expect(app.updateAvailable()).toBe(false);

      versionUpdates.next({
        type: 'VERSION_READY',
        currentVersion: { hash: 'old' },
        latestVersion: { hash: 'new' },
      } as VersionEvent);

      expect(app.updateAvailable()).toBe(true);
    });

    it('does NOT auto-reload on the event (reload only on user action)', () => {
      const reloadSpy = vi.fn();
      configure(makeSwUpdate({ isEnabled: true, versionUpdates }), reloadSpy);
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      versionUpdates.next({
        type: 'VERSION_READY',
        currentVersion: { hash: 'old' },
        latestVersion: { hash: 'new' },
      } as VersionEvent);

      expect(reloadSpy).not.toHaveBeenCalled();
    });

    it('reloads only when the user triggers reload()', async () => {
      const reloadSpy = vi.fn();
      const activateUpdate = vi.fn(() => Promise.resolve(true));
      configure(
        makeSwUpdate({ isEnabled: true, versionUpdates, activateUpdate }),
        reloadSpy,
      );
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      await fixture.componentInstance.reload();

      expect(activateUpdate).toHaveBeenCalled();
      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });

    it('ignores non-VERSION_READY events', () => {
      configure(makeSwUpdate({ isEnabled: true, versionUpdates }));
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      versionUpdates.next({
        type: 'VERSION_DETECTED',
        version: { hash: 'new' },
      } as VersionEvent);

      expect(fixture.componentInstance.updateAvailable()).toBe(false);
    });

    it('does not subscribe or prompt when SwUpdate is disabled', () => {
      configure(makeSwUpdate({ isEnabled: false, versionUpdates }));
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      // Even if an event somehow fires, the disabled path never subscribed.
      versionUpdates.next({
        type: 'VERSION_READY',
        currentVersion: { hash: 'old' },
        latestVersion: { hash: 'new' },
      } as VersionEvent);

      expect(fixture.componentInstance.updateAvailable()).toBe(false);
    });
  });

  describe('offline indicator', () => {
    it('shows no offline banner while online', () => {
      configure(makeSwUpdate({ isEnabled: false, versionUpdates }));
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[data-testid="offline-banner"]')).toBeNull();
    });

    it('toggles the offline banner on offline / online events', () => {
      configure(makeSwUpdate({ isEnabled: false, versionUpdates }));
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;

      window.dispatchEvent(new Event('offline'));
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="offline-banner"]')).not.toBeNull();

      window.dispatchEvent(new Event('online'));
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="offline-banner"]')).toBeNull();
    });
  });
});
