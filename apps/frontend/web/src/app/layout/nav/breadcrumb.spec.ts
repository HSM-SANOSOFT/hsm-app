import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../core/auth/auth.service';
import { Breadcrumb } from './breadcrumb';
import type { NavNode } from './nav-node';
import { NAV_TREE_TOKEN, NavService } from './nav.service';

@Component({ standalone: true, template: '' })
class Blank {}

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
              { id: 'studies', label: 'Studies', kind: 'view', route: '/clinical/imaging/ct/studies' },
              { id: 'worklist', label: 'Worklist', kind: 'view', route: '/clinical/imaging/ct/worklist' },
            ],
          },
          { id: 'mri', label: 'MRI', kind: 'view', route: '/clinical/imaging/mri' },
        ],
      },
      { id: 'labs', label: 'Labs', kind: 'view', route: '/clinical/labs' },
    ],
  },
  { id: 'billing', label: 'Billing', kind: 'module', route: '/billing' },
];

function configure(): {
  fixture: ComponentFixture<Breadcrumb>;
  nav: NavService;
  router: Router;
} {
  const authStub = {
    isStaff: () => true,
    isPatient: () => false,
    hasAnyRole: () => true,
    currentUser: signal(null),
  } as unknown as AuthService;

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([{ path: '**', component: Blank }]),
      { provide: AuthService, useValue: authStub },
      { provide: NAV_TREE_TOKEN, useValue: FIXTURE },
    ],
  });
  const nav = TestBed.inject(NavService);
  const fixture = TestBed.createComponent(Breadcrumb);
  return { fixture, nav, router: TestBed.inject(Router) };
}

function crumbs(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll('[data-testid="breadcrumb-crumb"]'),
  );
}

function menu(fixture: ComponentFixture<unknown>): HTMLElement | null {
  return fixture.nativeElement.querySelector('[data-testid="breadcrumb-menu"]');
}

describe('Breadcrumb', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('renders a switchable crumb per level of the active path', async () => {
    const { fixture, router } = configure();
    await router.navigateByUrl('/clinical/imaging/ct/studies');
    fixture.detectChanges();

    expect(crumbs(fixture).map(c => c.textContent?.trim().replace(/\s+/g, ' '))).toEqual([
      'Clinical',
      'Imaging',
      'CT',
      'Studies',
    ]);
    const last = crumbs(fixture).at(-1);
    expect(last?.getAttribute('aria-current')).toBe('page');
  });

  it('opens a sibling dropdown and registers the crumb surface', async () => {
    const { fixture, nav, router } = configure();
    await router.navigateByUrl('/clinical/imaging/ct/studies');
    fixture.detectChanges();

    crumbs(fixture)[1].click(); // Imaging
    fixture.detectChanges();
    expect(menu(fixture)).not.toBeNull();
    expect(nav.isOpen('crumb')).toBe(true);
  });

  it('closes the dropdown when the flyout surface takes over (mutual exclusion)', async () => {
    const { fixture, nav, router } = configure();
    await router.navigateByUrl('/clinical/imaging/ct/studies');
    fixture.detectChanges();

    crumbs(fixture)[1].click();
    fixture.detectChanges();
    expect(menu(fixture)).not.toBeNull();

    nav.open('flyout');
    fixture.detectChanges();
    expect(menu(fixture)).toBeNull();
  });

  it('navigates to a sibling when one is chosen', async () => {
    const { fixture, router } = configure();
    await router.navigateByUrl('/clinical/imaging/ct/studies');
    fixture.detectChanges();
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    crumbs(fixture)[1].click(); // open Imaging dropdown
    fixture.detectChanges();
    const options = fixture.nativeElement.querySelectorAll('.bc__option');
    // Imaging's siblings are [Imaging, Labs]; choose Labs.
    (options[1] as HTMLElement).click();
    expect(navigate).toHaveBeenCalledWith('/clinical/labs');
  });
});
