import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../core/auth/auth.service';
import { provideTranslocoTestingModule } from '../core/i18n/transloco-testing';
import { PwaInstallService } from '../core/pwa/pwa-install.service';
import { VersionService } from '../core/version/version.service';
import { Shell } from './shell';

@Component({ standalone: true, template: '' })
class Blank {}

function configure(installAvailable = false): {
  fixture: ComponentFixture<Shell>;
  loadApiVersion: ReturnType<typeof vi.fn>;
} {
  const authStub = {
    currentUser: signal({ username: 'admin', roles: ['admin'] }),
    isAdmin: () => true,
    isStaff: () => true,
    isPatient: () => false,
    hasAnyRole: () => true,
    logout: () => of(undefined),
  } as unknown as AuthService;

  const loadApiVersion = vi.fn();
  const versionStub = {
    uiVersion: '1.0.0',
    apiVersion: () => '2.0.0',
    loadApiVersion,
  } as unknown as VersionService;

  const pwaStub = {
    installAvailable: signal(installAvailable),
    promptInstall: async () => undefined,
  } as unknown as PwaInstallService;

  TestBed.configureTestingModule({
    providers: [
      ...provideTranslocoTestingModule(),
      provideZonelessChangeDetection(),
      provideRouter([{ path: '**', component: Blank }]),
      { provide: AuthService, useValue: authStub },
      { provide: VersionService, useValue: versionStub },
      { provide: PwaInstallService, useValue: pwaStub },
    ],
  });

  const fixture = TestBed.createComponent(Shell);
  fixture.detectChanges();
  return { fixture, loadApiVersion };
}

function has(fixture: ComponentFixture<unknown>, selector: string): boolean {
  return fixture.nativeElement.querySelector(selector) != null;
}

describe('Shell', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('renders the rail, breadcrumb, view tabs, and the routed content outlet', () => {
    const { fixture } = configure();
    expect(has(fixture, 'app-rail')).toBe(true);
    expect(has(fixture, 'router-outlet')).toBe(true);
    expect(has(fixture, 'app-breadcrumb')).toBe(true);
    expect(has(fixture, 'app-view-tabs')).toBe(true);
  });

  it('renders the version footer (via the rail)', () => {
    const { fixture } = configure();
    const footer = fixture.nativeElement.querySelector(
      '[data-testid="version-footer"]',
    );
    expect(footer?.textContent).toContain('UI v1.0.0');
  });

  it('no longer renders Sign out in the top bar (it moved to the profile card)', () => {
    const { fixture } = configure();
    expect(has(fixture, '[data-testid="logout-button"]')).toBe(false);
  });

  it('shows the Install button only when an install is available', () => {
    expect(
      has(configure(false).fixture, '[data-testid="install-button"]'),
    ).toBe(false);
    TestBed.resetTestingModule();
    expect(has(configure(true).fixture, '[data-testid="install-button"]')).toBe(
      true,
    );
  });

  it('loads the API version on init', () => {
    const { loadApiVersion } = configure();
    expect(loadApiVersion).toHaveBeenCalledOnce();
  });
});
