import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RolesEnum } from '@hsm/common/enums';

import type { UserProfile } from '../api/response';
import { AuthService } from './auth.service';
import { HasRoleDirective, IfAdminDirective } from './has-role.directive';

function profile(roles: string[]): UserProfile {
  return {
    id: 'u1',
    username: 'u',
    email: 'u@x.com',
    firstName: 'U',
    firstLastName: 'X',
    roles,
    iat: 1,
    exp: 2,
  };
}

@Component({
  imports: [HasRoleDirective, IfAdminDirective],
  template: `
    <span *hasRole="'admin'" data-testid="admin-only">admin</span>
    <span *hasRole="['developer', 'admin']" data-testid="dev-or-admin">
      dev
    </span>
    <span *ifAdmin data-testid="if-admin">if-admin</span>
  `,
})
class HostComponent {}

describe('role-gating directives', () => {
  const currentUser = signal<UserProfile | null>(null);

  function authStub(): Partial<AuthService> {
    return {
      hasRole: (role: string) => currentUser()?.roles.includes(role) ?? false,
      hasAnyRole: (roles: readonly string[]) =>
        roles.some(r => currentUser()?.roles.includes(r)) ?? false,
    };
  }

  function setup() {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: AuthService, useValue: authStub() }],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  function visible(el: HTMLElement, testid: string): boolean {
    return el.querySelector(`[data-testid="${testid}"]`) !== null;
  }

  it('hides admin-only content from a non-admin (AE4)', () => {
    currentUser.set(profile([RolesEnum.System.Developer]));
    const fixture = setup();
    const host = fixture.nativeElement as HTMLElement;

    expect(visible(host, 'admin-only')).toBe(false);
    expect(visible(host, 'if-admin')).toBe(false);
    // The developer-or-admin element still shows for a developer.
    expect(visible(host, 'dev-or-admin')).toBe(true);
  });

  it('shows admin-only content to an admin', () => {
    currentUser.set(profile([RolesEnum.System.Admin]));
    const fixture = setup();
    const host = fixture.nativeElement as HTMLElement;

    expect(visible(host, 'admin-only')).toBe(true);
    expect(visible(host, 'if-admin')).toBe(true);
    expect(visible(host, 'dev-or-admin')).toBe(true);
  });

  it('hides everything from an anonymous user', () => {
    currentUser.set(null);
    const fixture = setup();
    const host = fixture.nativeElement as HTMLElement;

    expect(visible(host, 'admin-only')).toBe(false);
    expect(visible(host, 'dev-or-admin')).toBe(false);
    expect(visible(host, 'if-admin')).toBe(false);
  });
});
