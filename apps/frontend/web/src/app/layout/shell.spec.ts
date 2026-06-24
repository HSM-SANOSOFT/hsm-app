import {
  computed,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RolesEnum } from '@hsm/common/enums';

import type { UserProfile } from '../core/api/response';
import { AuthService } from '../core/auth/auth.service';
import { NAV_ITEMS } from './nav-items';
import { Shell } from './shell';

function profile(roles: string[]): UserProfile {
  return {
    id: 'u1',
    username: 'jdoe',
    email: 'jdoe@x.com',
    firstName: 'Jane',
    firstLastName: 'Doe',
    roles,
    iat: 1,
    exp: 2,
  };
}

describe('Shell', () => {
  const currentUser = signal<UserProfile | null>(null);
  let logoutCalls = 0;

  function authStub(): Partial<AuthService> {
    const isAdmin = computed(() =>
      (currentUser()?.roles ?? []).includes(RolesEnum.System.Admin),
    );
    return {
      currentUser: currentUser.asReadonly(),
      isAdmin,
      logout: () => {
        logoutCalls += 1;
        return {
          subscribe: (cb: () => void) => {
            cb();
            return {
              unsubscribe: () => {
                // no-op teardown for the stub subscription.
              },
            };
          },
          // biome-ignore lint/suspicious/noExplicitAny: minimal Observable stub.
        } as any;
      },
    };
  }

  beforeEach(() => {
    logoutCalls = 0;
    currentUser.set(null);
  });

  function setup() {
    TestBed.configureTestingModule({
      imports: [Shell],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: 'login', children: [] }]),
        { provide: AuthService, useValue: authStub() },
      ],
    });
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();
    return fixture;
  }

  function navLabels(host: HTMLElement): string[] {
    // PrimeNG menubar renders each item's label text in `.p-menubar-item-label`.
    return Array.from(host.querySelectorAll('.p-menubar-item-label')).map(el =>
      (el.textContent ?? '').trim(),
    );
  }

  it('shows admin nav entries to an admin', () => {
    currentUser.set(profile([RolesEnum.System.Admin]));
    const fixture = setup();
    const host = fixture.nativeElement as HTMLElement;

    const labels = navLabels(host);
    expect(labels).toContain('Users');
    expect(labels).toContain('Settings');
    expect(labels).toContain('Profile');
  });

  it('hides admin nav entries from a non-admin (R3)', () => {
    currentUser.set(profile([RolesEnum.System.Developer]));
    const fixture = setup();
    const host = fixture.nativeElement as HTMLElement;

    const labels = navLabels(host);
    expect(labels).toContain('Profile');
    expect(labels).toContain('Templates');
    expect(labels).toContain('Documents');
    expect(labels).not.toContain('Users');
    expect(labels).not.toContain('Settings');
  });

  it('renders the signed-in user and a logout control', () => {
    currentUser.set(profile([RolesEnum.System.Developer]));
    const fixture = setup();
    const host = fixture.nativeElement as HTMLElement;

    expect(
      host.querySelector('[data-testid="user-name"]')?.textContent?.trim(),
    ).toBe('Jane Doe');
    expect(host.querySelector('[data-testid="logout-button"]')).not.toBeNull();
  });

  it('logout calls AuthService.logout', () => {
    currentUser.set(profile([RolesEnum.System.Developer]));
    const fixture = setup();
    const host = fixture.nativeElement as HTMLElement;
    const button = host.querySelector(
      '[data-testid="logout-button"] button',
    ) as HTMLButtonElement | null;
    button?.click();

    expect(logoutCalls).toBe(1);
  });

  it('nav is data-driven: every NAV_ITEMS entry is admin-flag-gated', () => {
    // Structural assertion for KTD8 — visibility is driven entirely by the
    // `adminOnly` flag in the data model, not by per-item layout/auth wiring.
    // Adding a module = adding a NavItem here, with no shell/guard change.
    for (const item of NAV_ITEMS) {
      expect(typeof item.label).toBe('string');
      expect(typeof item.route).toBe('string');
      expect(['boolean', 'undefined']).toContain(typeof item.adminOnly);
    }
    // The two admin entries are exactly Users + Settings.
    const adminRoutes = NAV_ITEMS.filter(i => i.adminOnly).map(i => i.route);
    expect(adminRoutes).toEqual(['/admin/users', '/admin/settings']);
  });
});
