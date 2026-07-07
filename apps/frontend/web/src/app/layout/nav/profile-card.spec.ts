import { provideZonelessChangeDetection, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../core/auth/auth.service';
import { provideTranslocoTestingModule } from '../../core/i18n/transloco-testing';
import { ProfileCard } from './profile-card';

interface StubUser {
  username: string;
  firstName?: string;
  firstLastName?: string;
  roles: string[];
}

function setup(
  user: StubUser,
  isAdmin: boolean,
): {
  fixture: ComponentFixture<ProfileCard>;
  component: ProfileCard;
  logout: ReturnType<typeof vi.fn>;
} {
  const logout = vi.fn(() => of(undefined));
  const authStub = {
    currentUser: signal(user),
    isAdmin: () => isAdmin,
    isStaff: () => true,
    isPatient: () => false,
    hasAnyRole: () => true,
    logout,
  } as unknown as AuthService;

  TestBed.configureTestingModule({
    providers: [
      ...provideTranslocoTestingModule(),
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: AuthService, useValue: authStub },
    ],
  });

  const fixture = TestBed.createComponent(ProfileCard);
  fixture.componentRef.setInput('expanded', true);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, logout };
}

const ADMIN: StubUser = {
  username: 'rsanta',
  firstName: 'Raul',
  firstLastName: 'Santamaria',
  roles: ['admin'],
};

const STAFF: StubUser = {
  username: 'jdoe',
  firstName: 'Jane',
  firstLastName: 'Doe',
  roles: ['billing'],
};

function testId(
  fixture: ComponentFixture<unknown>,
  id: string,
): HTMLElement | null {
  return fixture.nativeElement.querySelector(`[data-testid="${id}"]`);
}

describe('ProfileCard', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('shows System Admin in the menu only for admins (AE4)', () => {
    const admin = setup(ADMIN, true);
    expect(admin.component['menuItems']().map(i => i.label)).toEqual([
      'Perfil',
      'Administración del sistema',
    ]);

    TestBed.resetTestingModule();
    const staff = setup(STAFF, false);
    expect(staff.component['menuItems']().map(i => i.label)).toEqual([
      'Perfil',
    ]);
  });

  it('renders the display name and a role label', () => {
    const { fixture } = setup(STAFF, false);
    expect(testId(fixture, 'profile-name')?.textContent?.trim()).toBe(
      'Jane Doe',
    );
    expect(testId(fixture, 'profile-role')?.textContent?.trim()).toBe(
      'Billing',
    );
  });

  it('labels an admin as Administrator regardless of role order', () => {
    const { component } = setup(
      { ...ADMIN, roles: ['billing', 'admin'] },
      true,
    );
    expect(component['roleLabel']()).toBe('Administrador');
  });

  it('points the Settings gear at the personal settings route', () => {
    const { fixture } = setup(STAFF, false);
    const gear = testId(fixture, 'settings-gear');
    expect(gear?.getAttribute('href')).toBe('/settings');
  });

  it('signs out and navigates to login', () => {
    const { component, logout } = setup(STAFF, false);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    component['signOut']();
    expect(logout).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
