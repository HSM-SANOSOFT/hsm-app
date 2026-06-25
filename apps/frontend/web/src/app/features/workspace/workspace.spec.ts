import {
  computed,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RolesEnum } from '@hsm/common/enums';

import type { UserProfile } from '../../core/api/response';
import { AuthService } from '../../core/auth/auth.service';
import { Workspace } from './workspace';

function profile(roles: string[]): UserProfile {
  return {
    id: 's1',
    username: 'sam',
    email: 'sam@x.com',
    firstName: 'Sam',
    firstLastName: 'Lee',
    roles,
    onboardingCompletedAt: '2026-01-01T00:00:00.000Z',
    iat: 1,
    exp: 2,
  };
}

describe('Workspace', () => {
  const currentUser = signal<UserProfile | null>(null);

  function setup() {
    const isAdmin = computed(() =>
      (currentUser()?.roles ?? []).includes(RolesEnum.System.Admin),
    );
    TestBed.configureTestingModule({
      imports: [Workspace],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { currentUser: currentUser.asReadonly(), isAdmin },
        },
      ],
    });
    const fixture = TestBed.createComponent(Workspace);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function linkRoutes(host: HTMLElement): (string | null)[] {
    return Array.from(host.querySelectorAll('[data-testid="quicklink"]')).map(
      a => a.getAttribute('href'),
    );
  }

  it('greets the staff member and shows the core quick links', () => {
    currentUser.set(profile([RolesEnum.Clinical.Doctor]));
    const host = setup();

    expect(
      host.querySelector('[data-testid="workspace-greeting"]')?.textContent,
    ).toContain('Sam');
    const routes = linkRoutes(host);
    expect(routes).toContain('/templates');
    expect(routes).toContain('/documents');
    expect(routes).toContain('/profile');
  });

  it('hides admin quick links from a non-admin staff member', () => {
    currentUser.set(profile([RolesEnum.Clinical.Doctor]));
    const routes = linkRoutes(setup());

    expect(routes).not.toContain('/admin/users');
    expect(routes).not.toContain('/admin/settings');
  });

  it('shows admin quick links to an admin', () => {
    currentUser.set(profile([RolesEnum.System.Admin]));
    const routes = linkRoutes(setup());

    expect(routes).toContain('/admin/users');
    expect(routes).toContain('/admin/settings');
  });
});
