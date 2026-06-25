import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from '../../core/auth/auth.service';
import { NAV_TREE_TOKEN, NavService } from './nav.service';
import type { NavNode } from './nav-node';

@Component({ standalone: true, template: '' })
class Blank {}

/** Nested fixture: Clinical nests 3 deep, Billing 2, Inbox is single-view,
 * Reports is a childless module destination. */
const FIXTURE: readonly NavNode[] = [
  {
    id: 'clinical',
    label: 'Clinical',
    kind: 'module',
    children: [
      {
        id: 'imaging',
        label: 'Imaging',
        kind: 'group',
        children: [
          {
            id: 'ct',
            label: 'CT',
            kind: 'group',
            children: [
              {
                id: 'studies',
                label: 'Studies',
                kind: 'view',
                route: '/clinical/imaging/ct/studies',
              },
              {
                id: 'worklist',
                label: 'Worklist',
                kind: 'view',
                route: '/clinical/imaging/ct/worklist',
              },
            ],
          },
        ],
      },
    ],
  },
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
  { id: 'reports', label: 'Reports', kind: 'module', route: '/reports' },
];

function configure(access: Record<string, () => unknown> = {}): {
  nav: NavService;
  router: Router;
} {
  const authStub = {
    isStaff: () => true,
    isPatient: () => false,
    hasAnyRole: () => true,
    ...access,
  } as unknown as AuthService;

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([{ path: '**', component: Blank }]),
      { provide: AuthService, useValue: authStub },
      { provide: NAV_TREE_TOKEN, useValue: FIXTURE },
    ],
  });

  return { nav: TestBed.inject(NavService), router: TestBed.inject(Router) };
}

describe('NavService', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('reconstructs module, breadcrumb, and tabs from a deep-link URL', async () => {
    const { nav, router } = configure();
    await router.navigateByUrl('/clinical/imaging/ct/studies');

    expect(nav.activeModule()?.id).toBe('clinical');
    expect(nav.breadcrumbChain().map(n => n.id)).toEqual([
      'clinical',
      'imaging',
      'ct',
      'studies',
    ]);
    expect(nav.leafTabs().map(n => n.id)).toEqual(['studies', 'worklist']);
  });

  it('clears active state for a valid off-tree route without redirecting', async () => {
    const { nav, router } = configure();
    await router.navigateByUrl('/settings');

    expect(nav.activeModule()).toBeNull();
    expect(nav.breadcrumbChain()).toEqual([]);
    expect(nav.leafTabs()).toEqual([]);
    expect(router.url).toBe('/settings'); // not redirected away
  });

  it('renders no tab strip for a single-view module', async () => {
    const { nav, router } = configure();
    await router.navigateByUrl('/inbox/all');

    expect(nav.activeModule()?.id).toBe('inbox');
    expect(nav.leafTabs()).toEqual([]);
  });

  it('entryRouteFor a branch falls back to its first leaf with no last-visited', () => {
    const { nav } = configure();
    const billing = FIXTURE[1];
    expect(nav.entryRouteFor(billing)).toBe('/billing/invoices/open');
  });

  it('entryRouteFor a destination module returns its own route', () => {
    const { nav } = configure();
    expect(nav.entryRouteFor(FIXTURE[3])).toBe('/reports');
  });

  it('restores the last-visited view of a module after visiting it', async () => {
    const { nav, router } = configure();
    await router.navigateByUrl('/billing/invoices/paid');
    expect(nav.entryRouteFor(FIXTURE[1])).toBe('/billing/invoices/paid');
  });

  it('produces an empty visible tree for a patient (all branches are staff)', () => {
    const { nav } = configure({
      isStaff: () => false,
      isPatient: () => true,
    });
    expect(nav.visibleTree()).toEqual([]);
  });

  it('keeps overlay surfaces mutually exclusive', () => {
    const { nav } = configure();
    nav.open('flyout');
    expect(nav.isOpen('flyout')).toBe(true);
    expect(nav.isOpen('crumb')).toBe(false);

    nav.open('crumb');
    expect(nav.isOpen('flyout')).toBe(false);
    expect(nav.openSurface()).toBe('crumb');

    nav.close();
    expect(nav.openSurface()).toBeNull();
  });

  it('resolves siblings at each level for breadcrumb switching', async () => {
    const { nav, router } = configure();
    await router.navigateByUrl('/clinical/imaging/ct/studies');

    const [clinical, imaging, ct, studies] = nav.activePath();
    expect(nav.siblingsOf(studies).map(n => n.id)).toEqual([
      'studies',
      'worklist',
    ]);
    expect(nav.siblingsOf(ct).map(n => n.id)).toEqual(['ct']);
    expect(nav.siblingsOf(imaging).map(n => n.id)).toEqual(['imaging']);
    // Top-level siblings come from the visible tree.
    expect(nav.siblingsOf(clinical).map(n => n.id)).toEqual([
      'clinical',
      'billing',
      'inbox',
      'reports',
    ]);
  });

  it('swaps to the admin sections inside the System Admin console', async () => {
    const { nav, router } = configure();
    await router.navigateByUrl('/system-admin/settings');

    expect(nav.adminMode()).toBe(true);
    expect(nav.activeModule()?.id).toBe('admin-env'); // Environment = env settings
    expect(nav.visibleTree().map(n => n.id)).toEqual([
      'admin-exit',
      'admin-users',
      'admin-env',
    ]);
  });

  it('returns to the feature tree outside the console', async () => {
    const { nav, router } = configure();
    await router.navigateByUrl('/system-admin/users');
    expect(nav.adminMode()).toBe(true);

    await router.navigateByUrl('/reports');
    expect(nav.adminMode()).toBe(false);
    expect(nav.activeModule()?.id).toBe('reports');
    expect(nav.visibleTree().map(n => n.id)).toEqual([
      'clinical',
      'billing',
      'inbox',
      'reports',
    ]);
  });
});
