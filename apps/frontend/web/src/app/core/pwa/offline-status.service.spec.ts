import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { OfflineStatusService } from './offline-status.service';

/**
 * The offline indicator's data source: seeds from `navigator.onLine` and flips
 * on the window `online` / `offline` events (R13/KTD7 offline awareness).
 */
describe('OfflineStatusService', () => {
  function create(): OfflineStatusService {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), OfflineStatusService],
    });
    return TestBed.inject(OfflineStatusService);
  }

  it('seeds isOnline from navigator.onLine', () => {
    const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const service = create();
    expect(service.isOnline()).toBe(false);
    spy.mockRestore();
  });

  it('flips to offline on the window offline event', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const service = create();
    expect(service.isOnline()).toBe(true);

    window.dispatchEvent(new Event('offline'));
    expect(service.isOnline()).toBe(false);
  });

  it('flips back to online on the window online event', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const service = create();
    expect(service.isOnline()).toBe(false);

    window.dispatchEvent(new Event('online'));
    expect(service.isOnline()).toBe(true);
  });

  it('stops reacting to events after the injector is destroyed', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const service = create();

    TestBed.resetTestingModule();

    window.dispatchEvent(new Event('offline'));
    // Listener was removed on destroy, so the stale signal stays online.
    expect(service.isOnline()).toBe(true);
  });
});
