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
/**
 * Which audience a nav entry belongs to.
 *
 * The app is one front door for two populations: `'staff'` (any role outside
 * {patient, family}, incl. admin) and `'patient'`. The shell filters entries by
 * the signed-in user's audience (`AuthService.isStaff()` / `isPatient()`) on top
 * of the `adminOnly` gate, so a patient never sees a staff link. The patient
 * area is a placeholder this round, so there are no `'patient'` entries yet — a
 * patient sees only the wordmark, their name, and logout.
 */
export type NavAudience = 'staff' | 'patient';

export interface NavItem {
  /** Visible label. */
  readonly label: string;
  /** PrimeIcons class (e.g. `'pi pi-user'`). */
  readonly icon: string;
  /** Router link target, relative to the shell root. */
  readonly route: string;
  /**
   * Which population sees this entry. Defaults to `'staff'` — the feature
   * areas are staff-only this round.
   */
  readonly audience?: NavAudience;
  /**
   * When `true`, the entry renders only for admins
   * (`RolesEnum.System.Admin`). Non-admins never see it. Defaults to `false`.
   */
  readonly adminOnly?: boolean;
}

/**
 * The app's primary navigation, in display order.
 *
 * Feature areas mount as lazy routes (see `app.routes.ts`); each gets a row
 * here. Every entry today is `audience: 'staff'` (the patient area is a
 * placeholder with no feature nav), and admin-only entries (Users, Settings)
 * carry `adminOnly: true`. The shell scopes by audience AND admin role — the
 * single source of truth for nav visibility (R3).
 */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    label: 'Workspace',
    icon: 'pi pi-th-large',
    route: '/workspace',
    audience: 'staff',
  },
  {
    label: 'Templates',
    icon: 'pi pi-file-edit',
    route: '/templates',
    audience: 'staff',
  },
  {
    label: 'Documents',
    icon: 'pi pi-folder',
    route: '/documents',
    audience: 'staff',
  },
  {
    label: 'Profile',
    icon: 'pi pi-user',
    route: '/profile',
    audience: 'staff',
  },
  {
    label: 'Users',
    icon: 'pi pi-users',
    route: '/admin/users',
    audience: 'staff',
    adminOnly: true,
  },
  {
    label: 'Settings',
    icon: 'pi pi-cog',
    route: '/admin/settings',
    audience: 'staff',
    adminOnly: true,
  },
] as const;

/** The role required to see admin-only nav entries / routes. */
export const ADMIN_ROLE = RolesEnum.System.Admin;
