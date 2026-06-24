import { RolesEnum } from '@hsm/common/enums';

/**
 * A single entry in the shell's primary navigation.
 *
 * The nav is **data-driven**: the shell renders one link per {@link NavItem},
 * gating admin-only entries on `AuthService.isAdmin()`. Adding a module to the
 * console is therefore a one-line change here (plus its lazy route in
 * `app.routes.ts`) — no edit to the layout, the auth guards, or the wiring
 * (KTD8).
 */
export interface NavItem {
  /** Visible label. */
  readonly label: string;
  /** PrimeIcons class (e.g. `'pi pi-user'`). */
  readonly icon: string;
  /** Router link target, relative to the shell root. */
  readonly route: string;
  /**
   * When `true`, the entry renders only for admins
   * (`RolesEnum.System.Admin`). Non-admins never see it. Defaults to `false`.
   */
  readonly adminOnly?: boolean;
}

/**
 * The console's primary navigation, in display order.
 *
 * Feature areas mount as lazy routes (see `app.routes.ts`); each gets a row
 * here. Admin-only entries (Users, Settings) carry `adminOnly: true` so the
 * shell hides them from non-admins — the single source of truth for nav
 * visibility (R3).
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Profile', icon: 'pi pi-user', route: '/profile' },
  { label: 'Templates', icon: 'pi pi-file-edit', route: '/templates' },
  { label: 'Documents', icon: 'pi pi-folder', route: '/documents' },
  {
    label: 'Users',
    icon: 'pi pi-users',
    route: '/admin/users',
    adminOnly: true,
  },
  {
    label: 'Settings',
    icon: 'pi pi-cog',
    route: '/admin/settings',
    adminOnly: true,
  },
] as const;

/** The role required to see admin-only nav entries / routes. */
export const ADMIN_ROLE = RolesEnum.System.Admin;
