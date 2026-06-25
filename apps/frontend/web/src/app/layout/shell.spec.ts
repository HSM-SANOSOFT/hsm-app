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
import { VersionService } from '../core/version/version.service';
import { NAV_ITEMS } from './nav-items';
import { Shell } from './shell';

const PATIENT_ROLES = new Set<string>([
  RolesEnum.Patient.Patient,
  RolesEnum.Patient.Family,
]);

function profile(roles: string[]): UserProfile {
  return {
    id: 'u1',
    username: 'jdoe',
    email: 'jdoe@x.com',
    firstName: 'Jane',
    firstLastName: 'Doe',
    roles,
    onboardingCompletedAt: '2026-01-01T00:00:00.000Z',
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
    const isStaff = computed(() => {
      const u = currentUser();
      return u !== null && u.roles.some(r => !PATIENT_ROLES.has(r));
    });
    const isPatient = computed(() => currentUser() !== null && !isStaff());
    return {
      currentUser: currentUser.asReadonly(),
      isAdmin,
      isStaff,
      isPatient,
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

  function versionStub(): Partial<VersionService> {
    return {
      uiVersion: '1.2.3',
      apiVersion: signal('9.9.9').asReadonly(),
      loadApiVersion: () => {
        // no-op: the footer reads the stubbed signal directly.
      },
    };
  }

  function setup() {
    TestBed.configureTestingModule({
      imports: [Shell],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: 'login', children: [] }]),
        { provide: AuthService, useValue: authStub() },
        { provide: VersionService, useValue: versionStub() },
      ],
    });
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();
    return fixture;
  }

  function navLabels(host: HTMLElement): string[] {
    // The sidebar renders each entry's label in `.nav-link__label`.
    return Array.from(
      host.querySelectorAll('[data-testid="nav-link"] .nav-link__label'),
    ).map(el => (el.textContent ?? '').trim());
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

  it('hides admin nav entries from a non-admin staff member (R3)', () => {
    currentUser.set(profile([RolesEnum.System.Developer]));
    const fixture = setup();
    const host = fixture.nativeElement as HTMLElement;

    const labels = navLabels(host);
    expect(labels).toContain('Workspace');
    expect(labels).toContain('Profile');
    expect(labels).toContain('Templates');
    expect(labels).toContain('Documents');
    expect(labels).not.toContain('Users');
    expect(labels).not.toContain('Settings');
  });

  it('shows the staff feature group to a staff member', () => {
    currentUser.set(profile([RolesEnum.Clinical.Doctor]));
    const fixture = setup();
    const host = fixture.nativeElement as HTMLElement;

    // The "Workspace" group header renders only when the staff nav is non-empty.
    const groups = Array.from(host.querySelectorAll('.nav-group')).map(el =>
      (el.textContent ?? '').trim(),
    );
    expect(groups).toContain('Workspace');
    expect(navLabels(host)).toContain('Templates');
  });

  it('a patient sees no staff nav links (wordmark + user + logout only)', () => {
    currentUser.set(profile([RolesEnum.Patient.Patient]));
    const fixture = setup();
    const host = fixture.nativeElement as HTMLElement;

    expect(navLabels(host)).toEqual([]);
    // The empty "Workspace" group header is hidden when there is no staff nav.
    const groups = Array.from(host.querySelectorAll('.nav-group')).map(el =>
      (el.textContent ?? '').trim(),
    );
    expect(groups).not.toContain('Workspace');
    expect(groups).not.toContain('Administration');
    // The wordmark, user, and logout remain.
    expect(host.querySelector('[data-testid="brand-word"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="logout-button"]')).not.toBeNull();
  });

  it('shows the hospital wordmark, not "Console"', () => {
    currentUser.set(profile([RolesEnum.System.Developer]));
    const fixture = setup();
    const host = fixture.nativeElement as HTMLElement;

    const word = host
      .querySelector('[data-testid="brand-word"]')
      ?.textContent?.replace(/\s+/g, ' ')
      .trim();
    expect(word).toBe('Hospital Santa María');
    expect(word).not.toContain('Console');
  });

  it('renders a live UI + API version footer (no hardcoded "console v0.1")', () => {
    currentUser.set(profile([RolesEnum.System.Developer]));
    const fixture = setup();
    const host = fixture.nativeElement as HTMLElement;

    const footer = host
      .querySelector('[data-testid="version-footer"]')
      ?.textContent?.replace(/\s+/g, ' ')
      .trim();
    expect(footer).toContain('UI v1.2.3');
    expect(footer).toContain('API v9.9.9');
    expect(footer).not.toContain('console v0.1');
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
