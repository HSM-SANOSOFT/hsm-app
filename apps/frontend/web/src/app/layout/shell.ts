import { Component, inject, type OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { PwaInstallService } from '../core/pwa/pwa-install.service';
import { VersionService } from '../core/version/version.service';
import { Breadcrumb } from './nav/breadcrumb';
import { Rail } from './nav/rail';
import { ViewTabs } from './nav/view-tabs';

/**
 * Application shell: the authenticated chrome every feature route renders
 * inside.
 *
 * Layout is overlay-not-push (origin R3): the rail keeps a fixed 64px column in
 * the grid while its expanded state and flyouts float over the content, which
 * never reflows. The top bar carries the breadcrumb (left) and the Install
 * affordance (right); leaf-level view tabs sit below it. Identity controls —
 * profile, System Admin, Sign Out, Settings — all live in the rail's profile
 * card now, not here.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, ButtonModule, Rail, Breadcrumb, ViewTabs],
  template: `
    <div class="shell">
      <app-rail />

      <div class="shell-main">
        <header class="topbar">
          <app-breadcrumb />
          <div class="topbar-spacer"></div>
          @if (pwa.installAvailable()) {
            <p-button
              i18n-label="@@layout.shell.installApp"
              label="Instalar aplicación"
              icon="pi pi-download"
              severity="secondary"
              [text]="true"
              size="small"
              (onClick)="installApp()"
              data-testid="install-button"
            />
          }
        </header>

        <app-view-tabs />

        <main class="shell-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .shell {
        display: grid;
        grid-template-columns: var(--rail-w) 1fr;
        min-height: 100vh;
      }
      .shell-main {
        display: flex;
        flex-direction: column;
        min-width: 0;
        background: var(--bg);
      }
      .topbar {
        height: var(--topbar-h);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0 1.5rem;
        background: color-mix(in srgb, var(--surface) 90%, transparent);
        backdrop-filter: blur(8px);
        border-bottom: 1px solid var(--line);
        position: sticky;
        top: 0;
        z-index: 30;
      }
      .topbar-spacer {
        flex: 1;
      }
      .shell-content {
        flex: 1;
        min-width: 0;
      }
    `,
  ],
})
export class Shell implements OnInit {
  protected readonly version = inject(VersionService);
  protected readonly pwa = inject(PwaInstallService);

  ngOnInit(): void {
    // Resolve the API version once for the rail footer (UI version is build-time).
    this.version.loadApiVersion();
  }

  protected installApp(): void {
    void this.pwa.promptInstall();
  }
}
