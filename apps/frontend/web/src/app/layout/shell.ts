import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';

import { AuthService } from '../core/auth/auth.service';
import { PwaInstallService } from '../core/pwa/pwa-install.service';
import { VersionService } from '../core/version/version.service';
import { NAV_ITEMS } from './nav-items';

/**
 * Application shell: the authenticated chrome every feature route renders
 * inside. A persistent left sidebar carries the role-gated, sectioned
 * navigation (the active item gets the accent-red rail — the console's
 * signature); a slim top bar carries the signed-in user and logout. On narrow
 * screens the sidebar becomes an off-canvas drawer toggled from the top bar.
 *
 * Navigation is data-driven from {@link NAV_ITEMS}: {@link mainNav} /
 * {@link adminNav} are `computed`, so a new module is just a new `NavItem` +
 * a lazy route — no change to this shell or the auth wiring (R3, R4, KTD8).
 */
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    AvatarModule,
    ButtonModule,
  ],
  template: `
    <div class="shell" [class.shell--nav-open]="navOpen()">
      <aside class="sidebar" data-testid="sidebar">
        <a routerLink="/" class="brand" data-testid="brand" (click)="closeNav()">
          <span class="brand-mark" aria-hidden="true"></span>
          <span class="brand-word" data-testid="brand-word">
            Hospital <span class="brand-word__sub">Santa María</span>
          </span>
        </a>

        <nav class="nav" aria-label="Primary">
          @if (mainNav().length) {
            <p class="nav-group">Workspace</p>
          }
          @for (item of mainNav(); track item.route) {
            <a
              class="nav-link"
              data-testid="nav-link"
              [routerLink]="item.route"
              routerLinkActive="is-active"
              (click)="closeNav()"
            >
              <i class="nav-link__icon" [class]="item.icon"></i>
              <span class="nav-link__label">{{ item.label }}</span>
            </a>
          }

          @if (adminNav().length) {
            <p class="nav-group">Administration</p>
            @for (item of adminNav(); track item.route) {
              <a
                class="nav-link"
                data-testid="nav-link"
                [routerLink]="item.route"
                routerLinkActive="is-active"
                (click)="closeNav()"
              >
                <i class="nav-link__icon" [class]="item.icon"></i>
                <span class="nav-link__label">{{ item.label }}</span>
              </a>
            }
          }
        </nav>

        <div class="nav-footer" data-testid="version-footer">
          <span class="nav-footer__dot" aria-hidden="true"></span>
          <span class="mono">
            UI v{{ version.uiVersion }} &middot; API
            v{{ version.apiVersion() ?? 'unknown' }}
          </span>
        </div>
      </aside>

      <button
        type="button"
        class="scrim"
        aria-label="Close navigation"
        (click)="closeNav()"
      ></button>

      <div class="shell-main">
        <header class="topbar">
          <button
            type="button"
            class="icon-btn menu-toggle"
            aria-label="Toggle navigation"
            (click)="toggleNav()"
          >
            <i class="pi pi-bars"></i>
          </button>
          <div class="topbar-spacer"></div>
          @if (pwa.installAvailable()) {
            <p-button
              label="Install app"
              icon="pi pi-download"
              severity="secondary"
              [text]="true"
              size="small"
              (onClick)="installApp()"
              data-testid="install-button"
            />
          }
          @if (user(); as u) {
            <div class="topbar-user">
              <p-avatar
                [label]="initials()"
                shape="circle"
                styleClass="topbar-avatar"
                data-testid="user-avatar"
              />
              <span class="topbar-user__name" data-testid="user-name">
                {{ displayName() }}
              </span>
            </div>
          }
          <p-button
            label="Sign out"
            icon="pi pi-sign-out"
            severity="secondary"
            [text]="true"
            size="small"
            (onClick)="logout()"
            data-testid="logout-button"
          />
        </header>

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
        grid-template-columns: var(--sidebar-w) 1fr;
        min-height: 100vh;
      }

      /* ---- Sidebar -------------------------------------------------------- */
      .sidebar {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        background: var(--primary-900);
        color: #cdd6e0;
        padding: 1.1rem 0.85rem 0.85rem;
        position: sticky;
        top: 0;
        height: 100vh;
        z-index: 40;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        text-decoration: none;
        padding: 0.35rem 0.5rem 1.15rem;
      }

      .brand-mark {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        background: var(--accent);
        position: relative;
        flex: none;
        box-shadow: 0 0 0 4px rgba(var(--color-accent-rgb), 0.16);
      }
      .brand-mark::before,
      .brand-mark::after {
        content: "";
        position: absolute;
        background: #fff;
        border-radius: 1px;
      }
      .brand-mark::before {
        inset: 13px 8px;
      }
      .brand-mark::after {
        inset: 8px 13px;
      }

      .brand-word {
        font-family: var(--font-display);
        font-weight: 700;
        font-size: 1.15rem;
        letter-spacing: -0.01em;
        color: #fff;
      }
      .brand-word__sub {
        color: var(--primary-200);
        font-weight: 500;
      }

      .nav {
        display: flex;
        flex-direction: column;
        gap: 0.12rem;
        flex: 1;
        overflow-y: auto;
      }

      .nav-group {
        font-family: var(--font-mono);
        font-size: 0.64rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: #7d8ba0;
        margin: 1.1rem 0.7rem 0.4rem;
      }
      .nav-group:first-child {
        margin-top: 0.2rem;
      }

      .nav-link {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        padding: 0.55rem 0.7rem;
        border-radius: var(--r-md);
        color: #c2cdda;
        text-decoration: none;
        font-size: 0.92rem;
        font-weight: 450;
        position: relative;
        transition:
          background 0.15s ease,
          color 0.15s ease;
      }
      .nav-link__icon {
        font-size: 1rem;
        width: 1.1rem;
        text-align: center;
        color: #8d9bb0;
        transition: color 0.15s ease;
      }
      .nav-link:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #fff;
      }
      .nav-link:hover .nav-link__icon {
        color: var(--primary-200);
      }
      .nav-link.is-active {
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
        font-weight: 500;
      }
      .nav-link.is-active .nav-link__icon {
        color: var(--accent);
      }
      /* The signature: accent-red rail on the active item */
      .nav-link.is-active::before {
        content: "";
        position: absolute;
        left: -0.85rem;
        top: 0.4rem;
        bottom: 0.4rem;
        width: 3px;
        border-radius: 0 3px 3px 0;
        background: var(--accent);
      }

      .nav-footer {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.85rem 0.7rem 0.2rem;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        color: #7d8ba0;
        font-size: 0.7rem;
      }
      .nav-footer__dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--ok);
        box-shadow: 0 0 0 3px rgba(15, 122, 82, 0.22);
      }

      /* ---- Main column ---------------------------------------------------- */
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
        background: color-mix(in srgb, var(--surface) 88%, transparent);
        backdrop-filter: blur(8px);
        border-bottom: 1px solid var(--line);
        position: sticky;
        top: 0;
        z-index: 30;
      }
      .topbar-spacer {
        flex: 1;
      }

      .icon-btn {
        display: none;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border: 1px solid var(--line);
        border-radius: var(--r-md);
        background: var(--surface);
        color: var(--ink-soft);
        cursor: pointer;
      }

      .topbar-user {
        display: flex;
        align-items: center;
        gap: 0.55rem;
      }
      .topbar-user__name {
        font-weight: 500;
        font-size: 0.9rem;
        color: var(--ink);
        white-space: nowrap;
      }
      :host ::ng-deep .topbar-avatar {
        background: var(--primary-100);
        color: var(--primary-800);
        font-weight: 600;
        font-family: var(--font-display);
      }

      .shell-content {
        flex: 1;
        min-width: 0;
      }

      /* ---- Scrim (mobile drawer backdrop) --------------------------------- */
      .scrim {
        display: none;
        position: fixed;
        inset: 0;
        border: 0;
        background: rgba(var(--color-ink-rgb), 0.45);
        z-index: 35;
        cursor: pointer;
      }

      /* ---- Responsive ----------------------------------------------------- */
      @media (max-width: 880px) {
        .shell {
          grid-template-columns: 1fr;
        }
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: var(--sidebar-w);
          transform: translateX(-100%);
          transition: transform 0.24s cubic-bezier(0.2, 0.7, 0.2, 1);
        }
        .shell--nav-open .sidebar {
          transform: translateX(0);
          box-shadow: var(--shadow-lg);
        }
        .shell--nav-open .scrim {
          display: block;
        }
        .icon-btn {
          display: inline-flex;
        }
        .topbar-user__name {
          display: none;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .sidebar {
          transition: none;
        }
      }
    `,
  ],
})
export class Shell implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Version service (U8) — drives the live UI + API version footer. */
  protected readonly version = inject(VersionService);

  /** PWA install affordance — exposes a captured `beforeinstallprompt`. */
  protected readonly pwa = inject(PwaInstallService);

  /** The signed-in profile signal, exposed to the template. */
  protected readonly user = this.auth.currentUser;

  /** Mobile off-canvas drawer state. */
  protected readonly navOpen = signal(false);

  /**
   * Feature ("Workspace" group) nav entries, scoped to the signed-in user.
   *
   * An item shows when its audience matches the user (staff items for staff,
   * patient items for patients) and it is not admin-gated. Patients have no
   * feature nav this round, so this is empty for them — the group header and
   * the whole list hide.
   */
  protected readonly mainNav = computed(() =>
    NAV_ITEMS.filter(item => !item.adminOnly && this.isForAudience(item)),
  );

  /**
   * Admin-only nav entries — empty for non-admins (so the section hides, R3)
   * and for patients (admin is a staff role; no patient is an admin).
   */
  protected readonly adminNav = computed(() => {
    const isAdmin = this.auth.isAdmin();
    return NAV_ITEMS.filter(
      item => item.adminOnly && isAdmin && this.isForAudience(item),
    );
  });

  /** True when a nav item's audience matches the signed-in user. */
  private isForAudience(item: { audience?: 'staff' | 'patient' }): boolean {
    const audience = item.audience ?? 'staff';
    return audience === 'staff' ? this.auth.isStaff() : this.auth.isPatient();
  }

  ngOnInit(): void {
    // Resolve the API version once for the footer (UI version is build-time).
    this.version.loadApiVersion();
  }

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

  protected installApp(): void {
    void this.pwa.promptInstall();
  }

  protected toggleNav(): void {
    this.navOpen.update(v => !v);
  }

  protected closeNav(): void {
    this.navOpen.set(false);
  }

  protected logout(): void {
    this.auth.logout().subscribe(() => {
      void this.router.navigateByUrl('/login');
    });
  }
}
