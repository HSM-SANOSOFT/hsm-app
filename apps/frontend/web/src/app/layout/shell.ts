import { Component, computed, inject, signal } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';

import { AuthService } from '../core/auth/auth.service';
import { NAV_ITEMS } from './nav-items';

/**
 * Application shell: the authenticated chrome every feature route renders
 * inside. A persistent left sidebar carries the role-gated, sectioned
 * navigation (the active item gets the clay accent rail — the console's
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
          <span class="brand-word">
            HSM<span class="brand-word__sub">Console</span>
          </span>
        </a>

        <nav class="nav" aria-label="Primary">
          <p class="nav-group">Workspace</p>
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

        <div class="nav-footer">
          <span class="nav-footer__dot" aria-hidden="true"></span>
          <span class="mono">console v0.1</span>
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
        background: var(--pine-900);
        color: #cfe0d9;
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
        background: var(--clay);
        position: relative;
        flex: none;
        box-shadow: 0 0 0 4px rgba(217, 118, 60, 0.16);
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
        color: var(--pine-200);
        font-weight: 500;
        margin-left: 0.18em;
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
        color: #6f8b82;
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
        color: #bcd0c8;
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
        color: #84a399;
        transition: color 0.15s ease;
      }
      .nav-link:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #fff;
      }
      .nav-link:hover .nav-link__icon {
        color: var(--pine-200);
      }
      .nav-link.is-active {
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
        font-weight: 500;
      }
      .nav-link.is-active .nav-link__icon {
        color: var(--clay);
      }
      /* The signature: clay rail on the active item */
      .nav-link.is-active::before {
        content: "";
        position: absolute;
        left: -0.85rem;
        top: 0.4rem;
        bottom: 0.4rem;
        width: 3px;
        border-radius: 0 3px 3px 0;
        background: var(--clay);
      }

      .nav-footer {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.85rem 0.7rem 0.2rem;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        color: #6f8b82;
        font-size: 0.7rem;
      }
      .nav-footer__dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #38c79a;
        box-shadow: 0 0 0 3px rgba(56, 199, 154, 0.18);
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
        background: var(--pine-100);
        color: var(--pine-800);
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
        background: rgba(10, 26, 22, 0.45);
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
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** The signed-in profile signal, exposed to the template. */
  protected readonly user = this.auth.currentUser;

  /** Mobile off-canvas drawer state. */
  protected readonly navOpen = signal(false);

  /** Non-admin (always-visible) nav entries. */
  protected readonly mainNav = computed(() =>
    NAV_ITEMS.filter(item => !item.adminOnly),
  );

  /** Admin-only nav entries — empty for non-admins, so the section hides (R3). */
  protected readonly adminNav = computed(() => {
    const isAdmin = this.auth.isAdmin();
    return NAV_ITEMS.filter(item => item.adminOnly && isAdmin);
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
