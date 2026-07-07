import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from '../../core/auth/auth.service';
import { provideTranslocoTestingModule } from '../../core/i18n/transloco-testing';
import { NAV_TREE_TOKEN, NavService } from './nav.service';
import type { NavNode } from './nav-node';
import { ViewTabs } from './view-tabs';

@Component({ standalone: true, template: '' })
class Blank {}

const FIXTURE: readonly NavNode[] = [
  {
    id: 'billing',
    label: 'Billing',
    kind: 'module',
    children: [
      {
        id: 'invoices',
        label: 'Invoices',
        kind: 'group',
        children: [
          {
            id: 'open',
            label: 'Open',
            kind: 'view',
            route: '/billing/invoices/open',
          },
          {
            id: 'paid',
            label: 'Paid',
            kind: 'view',
            route: '/billing/invoices/paid',
          },
        ],
      },
    ],
  },
  {
    id: 'inbox',
    label: 'Inbox',
    kind: 'module',
    children: [{ id: 'all', label: 'All', kind: 'view', route: '/inbox/all' }],
  },
];

function configure(): { fixture: ComponentFixture<ViewTabs>; router: Router } {
  const authStub = {
    isStaff: () => true,
    isPatient: () => false,
    hasAnyRole: () => true,
    currentUser: signal(null),
  } as unknown as AuthService;

  TestBed.configureTestingModule({
    providers: [
      ...provideTranslocoTestingModule(),
      provideZonelessChangeDetection(),
      provideRouter([{ path: '**', component: Blank }]),
      { provide: AuthService, useValue: authStub },
      { provide: NAV_TREE_TOKEN, useValue: FIXTURE },
    ],
  });
  // Ensure the NavService router subscription is live before navigation.
  TestBed.inject(NavService);
  const fixture = TestBed.createComponent(ViewTabs);
  return { fixture, router: TestBed.inject(Router) };
}

function tabs(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll('[data-testid="view-tab"]'),
  );
}

describe('ViewTabs', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('renders the leaf views of the landed sub-module as tabs', async () => {
    const { fixture, router } = configure();
    await router.navigateByUrl('/billing/invoices/open');
    fixture.detectChanges();

    expect(tabs(fixture).map(t => t.textContent?.trim())).toEqual([
      'Open',
      'Paid',
    ]);
    const active = tabs(fixture).find(t => t.classList.contains('is-active'));
    expect(active?.getAttribute('aria-current')).toBe('page');
  });

  it('renders no tab strip for a single-view module', async () => {
    const { fixture, router } = configure();
    await router.navigateByUrl('/inbox/all');
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="view-tabs"]'),
    ).toBeNull();
  });
});
