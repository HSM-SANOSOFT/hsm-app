import {
  Component,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RolesEnum } from '@hsm/common/enums';
import { TranslocoPipe } from '@jsverse/transloco';
import { AvatarModule } from 'primeng/avatar';
import { Popover } from 'primeng/popover';

import { AuthService } from '../../core/auth/auth.service';
import { LanguageSwitcher } from '../language-switcher/language-switcher';
import { NavService } from './nav.service';

/** A popover entry that navigates somewhere. */
interface ProfileMenuItem {
  readonly label: string;
  readonly icon: string;
  readonly route: string;
}

/** Where the profile page, personal Settings, and the admin console live. */
const PROFILE_ROUTE = '/profile';
const SETTINGS_ROUTE = '/settings';
const SYSTEM_ADMIN_ROUTE = '/system-admin';

/**
 * The fixed profile card at the bottom of the rail.
 *
 * Collapsed it shows only the avatar; expanded it shows name + role and a
 * Settings gear (origin R11/R14). Clicking the card opens a popover with
 * Profile, System Admin (admins only — origin R12/R13), and Sign Out (moved
 * here from the old top bar). Sign Out and System Admin are the only place those
 * controls live now; the gear opens personal Settings, identical for every user
 * including admins — no admin section (origin R15 / AE4).
 *
 * The popover registers as the `'profile'` open-surface, so opening the flyout
 * or a breadcrumb dropdown closes it and vice-versa (origin R10).
 */
@Component({
  selector: 'app-profile-card',
  imports: [RouterLink, AvatarModule, Popover, LanguageSwitcher, TranslocoPipe],
  template: `
    <div class="pcard" [class.pcard--expanded]="expanded()">
      <button
        type="button"
        class="pcard__id"
        data-testid="profile-card"
        [attr.aria-expanded]="nav.isOpen('profile')"
        aria-haspopup="dialog"
        [attr.aria-label]="'layout.profileCard.menuAriaLabel' | transloco"
        (click)="pop.toggle($event)"
      >
        <p-avatar
          [label]="initials()"
          shape="circle"
          styleClass="pcard-avatar"
        />
        @if (expanded()) {
          <span class="pcard__text">
            <span class="pcard__name" data-testid="profile-name">
              {{ displayName() }}
            </span>
            <span class="pcard__role" data-testid="profile-role">
              {{ roleLabel() | transloco }}
            </span>
          </span>
        }
      </button>

      @if (expanded()) {
        <a
          class="pcard__gear"
          data-testid="settings-gear"
          [routerLink]="settingsRoute"
          [attr.aria-label]="'layout.profileCard.settingsLabel' | transloco"
          [attr.title]="'layout.profileCard.settingsLabel' | transloco"
        >
          <i class="pi pi-cog" aria-hidden="true"></i>
        </a>
      }
    </div>

    <p-popover #pop (onShow)="nav.open('profile')" (onHide)="onHide()">
      <div class="pmenu" data-testid="profile-popover">
        @for (item of menuItems(); track item.route) {
          <a
            class="pmenu__item"
            [routerLink]="item.route"
            [attr.data-testid]="'pmenu-' + item.label"
            (click)="pop.hide()"
          >
            <i class="pmenu__icon" [class]="item.icon" aria-hidden="true"></i>
            {{ item.label | transloco }}
          </a>
        }
        <div class="pmenu__lang" data-testid="pmenu-language-switcher">
          <app-language-switcher />
        </div>
        <button
          type="button"
          class="pmenu__item pmenu__item--action"
          data-testid="pmenu-signout"
          (click)="signOut(); pop.hide()"
        >
          <i class="pmenu__icon pi pi-sign-out" aria-hidden="true"></i>
          <span>{{ 'layout.profileCard.signOut' | transloco }}</span>
        </button>
      </div>
    </p-popover>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .pcard {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.55rem 0.4rem;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }
      .pcard__id {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        flex: 1;
        min-width: 0;
        border: 0;
        background: transparent;
        color: inherit;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: var(--r-md);
        text-align: left;
      }
      .pcard__id:hover {
        background: rgba(255, 255, 255, 0.06);
      }
      .pcard__text {
        display: flex;
        flex-direction: column;
        min-width: 0;
        line-height: 1.2;
      }
      .pcard__name {
        font-weight: 600;
        font-size: 0.86rem;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .pcard__role {
        font-size: 0.72rem;
        color: var(--primary-200);
        white-space: nowrap;
      }
      .pcard__gear {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: var(--r-md);
        color: #aebccd;
        flex: none;
      }
      .pcard__gear:hover {
        background: rgba(255, 255, 255, 0.06);
        color: #fff;
      }
      :host ::ng-deep .pcard-avatar {
        background: var(--primary-100);
        color: var(--primary-800);
        font-weight: 600;
        font-family: var(--font-display);
        flex: none;
      }
      .pmenu {
        display: flex;
        flex-direction: column;
        min-width: 11rem;
      }
      .pmenu__item {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.55rem 0.7rem;
        border-radius: var(--r-md);
        color: var(--ink);
        text-decoration: none;
        font-size: 0.9rem;
        border: 0;
        background: transparent;
        cursor: pointer;
        text-align: left;
        width: 100%;
      }
      .pmenu__item:hover {
        background: var(--surface-sunk);
      }
      .pmenu__item--action {
        color: var(--accent);
      }
      .pmenu__lang {
        padding: 0.35rem 0.7rem 0.55rem;
      }
      .pmenu__icon {
        width: 1.1rem;
        text-align: center;
        color: var(--ink-muted);
      }
      .pmenu__item--action .pmenu__icon {
        color: var(--accent);
      }
      /* 44px touch targets on a coarse pointer (R19). */
      @media (hover: none), (pointer: coarse) {
        .pcard__id,
        .pcard__gear,
        .pmenu__item {
          min-height: 44px;
        }
      }
    `,
  ],
})
export class ProfileCard {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly nav = inject(NavService);

  /** Whether the rail is expanded — drives showing name/role and the gear. */
  readonly expanded = input(false);

  protected readonly settingsRoute = SETTINGS_ROUTE;

  private readonly popover = viewChild<Popover>('pop');

  constructor() {
    // Mutual exclusion: when another surface (flyout / breadcrumb) opens, close
    // this popover so only one overlay is ever visible (origin R10 / AE3).
    effect(() => {
      if (this.nav.openSurface() !== 'profile') {
        this.popover()?.hide();
      }
    });
  }

  protected readonly user = this.auth.currentUser;

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

  /**
   * A display label for the user's role. Admins always read "Administrator";
   * otherwise the first role is humanized. The full role→label/priority map for
   * the 40+ roles is a data deliverable; this is the mechanism that consumes it.
   *
   * Returns a translation KEY for the member/admin branches (translated in the
   * template via `| transloco`, so it stays reactive to a language switch);
   * `humanizeRole` returns plain, non-catalog text derived from the raw role
   * value, which the `transloco` pipe passes through unchanged when it finds
   * no matching key.
   */
  protected readonly roleLabel = computed(() => {
    const roles = this.user()?.roles ?? [];
    if (roles.length === 0) {
      return 'layout.profileCard.role.member';
    }
    if (roles.includes(RolesEnum.System.Admin)) {
      return 'layout.profileCard.role.admin';
    }
    return humanizeRole(roles[0]);
  });

  /** Popover navigation entries — System Admin only for admins (origin R12).
   * Labels are translation keys, translated in the template via `| transloco`. */
  protected readonly menuItems = computed<readonly ProfileMenuItem[]>(() => {
    const items: ProfileMenuItem[] = [
      {
        label: 'layout.profileCard.menu.profile',
        icon: 'pi pi-user',
        route: PROFILE_ROUTE,
      },
    ];
    if (this.auth.isAdmin()) {
      items.push({
        label: 'layout.profileCard.menu.systemAdmin',
        icon: 'pi pi-shield',
        route: SYSTEM_ADMIN_ROUTE,
      });
    }
    return items;
  });

  protected onHide(): void {
    if (this.nav.isOpen('profile')) {
      this.nav.close();
    }
  }

  protected signOut(): void {
    this.auth.logout().subscribe(() => {
      void this.router.navigateByUrl('/login');
    });
  }
}

function humanizeRole(role: string): string {
  return role
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(word => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
