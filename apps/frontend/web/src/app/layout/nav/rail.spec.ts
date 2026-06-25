import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from '../../core/auth/auth.service';
import { VersionService } from '../../core/version/version.service';
import type { NavNode } from './nav-node';
import { NAV_TREE_TOKEN, NavService } from './nav.service';
import { Rail } from './rail';

@Component({ standalone: true, template: '' })
class Blank {}

const FIXTURE: readonly NavNode[] = [
  { id: 'home', label: 'Home', icon: 'pi pi-home', kind: 'module', route: '/home' },
  {
    id: 'billing',
    label: 'Billing',
    icon: 'pi pi-dollar',
    kind: 'module',
    children: [
      {
        id: 'invoices',
        label: 'Invoices',
        kind: 'group',
        children: [
          { id: 'open', label: 'Open', kind: 'view', route: '/billing/invoices/open' },
        ],
      },
    ],
  },
];

function configure(patient = false): {
  fixture: ComponentFixture<Rail>;
  nav: NavService;
  router: Router;
} {
  const authStub = {
    currentUser: signal({ username: 'u', roles: [] }),
    isAdmin: () => false,
    isStaff: () => !patient,
    isPatient: () => patient,
    hasAnyRole: () => true,
    logout: () => of(undefined),
  } as unknown as AuthService;

  const versionStub = {
    uiVersion: '1.2.3',
    apiVersion: () => '4.5.6',
    loadApiVersion: () => {},
  } as unknown as VersionService;

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([{ path: '**', component: Blank }]),
      { provide: AuthService, useValue: authStub },
      { provide: VersionService, useValue: versionStub },
      { provide: NAV_TREE_TOKEN, useValue: FIXTURE },
    ],
  });

  const fixture = TestBed.createComponent(Rail);
  fixture.detectChanges();
  return {
    fixture,
    nav: TestBed.inject(NavService),
    router: TestBed.inject(Router),
  };
}

function items(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll('[data-testid="rail-item"]'),
  );
}

describe('Rail', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('renders one rail item per visible module', () => {
    const { fixture } = configure();
    expect(items(fixture)).toHaveLength(2);
  });

  it('renders a destination module as a link and a flyout module as a disclosure button', () => {
    const { fixture } = configure();
    const [home, billing] = items(fixture);
    expect(home.tagName).toBe('A');
    expect(billing.tagName).toBe('BUTTON');
    expect(billing.getAttribute('aria-expanded')).toBe('false');
    expect(billing.getAttribute('aria-haspopup')).toBe('true');
  });

  it('opens the flyout surface when a disclosure module is clicked', () => {
    const { fixture, nav } = configure();
    const billing = items(fixture)[1];

    billing.click();
    fixture.detectChanges();
    expect(billing.getAttribute('aria-expanded')).toBe('true');
    expect(nav.isOpen('flyout')).toBe(true);

    billing.click(); // toggle closed
    fixture.detectChanges();
    expect(billing.getAttribute('aria-expanded')).toBe('false');
    expect(nav.isOpen('flyout')).toBe(false);
  });

  it('marks the active module with the accent rail', async () => {
    const { fixture, router } = configure();
    await router.navigateByUrl('/home');
    fixture.detectChanges();
    const home = items(fixture)[0];
    expect(home.classList.contains('is-active')).toBe(true);
  });

  it('shows an empty affordance when no modules are visible', () => {
    const { fixture } = configure(/* patient */ true);
    expect(items(fixture)).toHaveLength(0);
    expect(
      fixture.nativeElement.querySelector('[data-testid="rail-empty"]'),
    ).not.toBeNull();
  });

  it('renders the UI/API version footer', () => {
    const { fixture } = configure();
    const footer = fixture.nativeElement.querySelector(
      '[data-testid="version-footer"]',
    );
    expect(footer?.textContent).toContain('UI v1.2.3');
    expect(footer?.textContent).toContain('API v4.5.6');
  });
});
