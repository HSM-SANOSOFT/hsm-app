import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from '../../core/auth/auth.service';
import { provideTranslocoTestingModule } from '../../core/i18n/transloco-testing';
import { Flyout } from './flyout';
import { NavService } from './nav.service';
import type { NavNode } from './nav-node';

@Component({ standalone: true, template: '' })
class Blank {}

const CLINICAL: NavNode = {
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
          ],
        },
        {
          id: 'mri',
          label: 'MRI',
          kind: 'view',
          route: '/clinical/imaging/mri',
        },
      ],
    },
    { id: 'labs', label: 'Labs', kind: 'view', route: '/clinical/labs' },
  ],
};

function configure(): {
  fixture: ComponentFixture<Flyout>;
  component: Flyout;
  nav: NavService;
} {
  const authStub = {
    currentUser: signal(null),
    isAdmin: () => false,
    isStaff: () => true,
    isPatient: () => false,
    hasAnyRole: () => true,
  } as unknown as AuthService;

  TestBed.configureTestingModule({
    providers: [
      ...provideTranslocoTestingModule(),
      provideZonelessChangeDetection(),
      provideRouter([{ path: '**', component: Blank }]),
      { provide: AuthService, useValue: authStub },
    ],
  });

  const fixture = TestBed.createComponent(Flyout);
  return {
    fixture,
    component: fixture.componentInstance,
    nav: TestBed.inject(NavService),
  };
}

function show(fixture: ComponentFixture<Flyout>, nav: NavService): void {
  fixture.componentRef.setInput('root', CLINICAL);
  nav.open('flyout');
  fixture.detectChanges();
}

function cols(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll('[data-testid="flyout-col"]'),
  );
}

describe('Flyout', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('is hidden until the flyout surface is open with a root', () => {
    const { fixture, nav } = configure();
    fixture.componentRef.setInput('root', CLINICAL);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="flyout"]'),
    ).toBeNull();

    nav.open('flyout');
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="flyout"]'),
    ).not.toBeNull();
  });

  it('renders the root column with leaves as links and sub-modules as disclosures', () => {
    const { fixture, nav } = configure();
    show(fixture, nav);
    expect(cols(fixture)).toHaveLength(1);

    const imaging = fixture.nativeElement.querySelector(
      '[data-testid="flyout-group"]',
    ) as HTMLElement;
    const labs = fixture.nativeElement.querySelector(
      '[data-testid="flyout-leaf"]',
    ) as HTMLElement;
    expect(imaging.tagName).toBe('BUTTON');
    expect(imaging.getAttribute('aria-expanded')).toBe('false');
    expect(labs.tagName).toBe('A');
  });

  it('cascades the next column when a sub-module is hovered', () => {
    const { fixture, nav } = configure();
    show(fixture, nav);
    const imaging = fixture.nativeElement.querySelector(
      '[data-testid="flyout-group"]',
    ) as HTMLElement;

    imaging.dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();

    const columns = cols(fixture);
    expect(columns).toHaveLength(2);
    expect(imaging.getAttribute('aria-expanded')).toBe('true');
  });

  it('labels each column with its parent for screen-reader orientation', () => {
    const { fixture, nav } = configure();
    show(fixture, nav);
    const imaging = fixture.nativeElement.querySelector(
      '[data-testid="flyout-group"]',
    ) as HTMLElement;
    imaging.dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();

    const [first, second] = cols(fixture);
    expect(first.getAttribute('aria-label')).toBe('Clinical');
    expect(second.getAttribute('aria-label')).toBe('Imaging');
  });

  it('closes and emits when a leaf is selected', () => {
    const { fixture, component, nav } = configure();
    show(fixture, nav);
    let closed = 0;
    component.closed.subscribe(() => closed++);

    const labs = fixture.nativeElement.querySelector(
      '[data-testid="flyout-leaf"]',
    ) as HTMLElement;
    labs.click();
    fixture.detectChanges();

    expect(nav.isOpen('flyout')).toBe(false);
    expect(closed).toBe(1);
  });
});
