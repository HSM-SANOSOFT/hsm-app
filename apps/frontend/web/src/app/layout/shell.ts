import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { MenubarModule } from 'primeng/menubar';

import { AuthService } from '../core/auth/auth.service';
import { NAV_ITEMS } from './nav-items';

/**
 * Application shell: the authenticated chrome that every feature route renders
 * inside. A PrimeNG `p-menubar` top bar carries the role-gated navigation, the
 * signed-in user, and a logout action; the `<router-outlet />` below it hosts
 * the active feature (R3, R4, KTD8).
 *
 * Navigation is data-driven from {@link NAV_ITEMS}: {@link menuModel} is a
 * `computed` that filters out `adminOnly` entries for non-admins, so a new
 * module is just a new `NavItem` + a new lazy route — no change to this shell
 * or the auth wiring.
 */
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    MenubarModule,
    AvatarModule,
    ButtonModule,
  ],
  template: `
    <p-menubar [model]="menuModel()" styleClass="shell-menubar">
      <ng-template #start>
        <a routerLink="/" class="shell-brand" data-testid="brand">
          <i class="pi pi-server"></i>
          <span>HSM Console</span>
        </a>
      </ng-template>
      <ng-template #end>
        <div class="shell-end">
          @if (user(); as u) {
            <p-avatar
              [label]="initials()"
              shape="circle"
              data-testid="user-avatar"
            />
            <span class="shell-user" data-testid="user-name">
              {{ displayName() }}
            </span>
          }
          <p-button
            label="Logout"
            icon="pi pi-sign-out"
            severity="secondary"
            [text]="true"
            (onClick)="logout()"
            data-testid="logout-button"
          />
        </div>
      </ng-template>
    </p-menubar>

    <main class="shell-content">
      <router-outlet />
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
      }

      .shell-brand {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
        text-decoration: none;
        color: inherit;
        margin-right: 1rem;
      }

      .shell-end {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .shell-user {
        white-space: nowrap;
      }

      /* Hide the username label on narrow screens; avatar + logout stay. */
      @media (max-width: 640px) {
        .shell-user {
          display: none;
        }
      }

      .shell-content {
        padding: 1.5rem;
        max-width: 1200px;
        margin: 0 auto;
        box-sizing: border-box;
      }
    `,
  ],
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** The signed-in profile signal, exposed to the template. */
  protected readonly user = this.auth.currentUser;

  /**
   * PrimeNG menubar model derived from {@link NAV_ITEMS}. Recomputes when the
   * admin state changes, dropping `adminOnly` entries for non-admins (R3).
   */
  protected readonly menuModel = computed<MenuItem[]>(() => {
    const isAdmin = this.auth.isAdmin();
    return NAV_ITEMS.filter(item => !item.adminOnly || isAdmin).map(item => ({
      label: item.label,
      icon: item.icon,
      routerLink: item.route,
    }));
  });

  protected readonly displayName = computed(() => {
    const u = this.user();
    if (!u) {
      return '';
    }
    const full = `${u.firstName ?? ''} ${u.firstLastName ?? ''}`.trim();
    return full || u.username;
  });

  protected readonly initials = computed(() => {
    const u = this.user();
    if (!u) {
      return '?';
    }
    const first = u.firstName?.[0] ?? u.username[0] ?? '?';
    const last = u.firstLastName?.[0] ?? '';
    return `${first}${last}`.toUpperCase();
  });

  protected logout(): void {
    this.auth.logout().subscribe(() => {
      void this.router.navigateByUrl('/login');
    });
  }
}
