import { RolesEnum } from '@hsm/common/enums';

/**
 * Which audience a nav entry belongs to.
 *
 * The app is one front door for two populations: `'staff'` (any role outside
 * {patient, family}, incl. admin) and `'patient'`. The tree is filtered by the
 * signed-in user's audience on top of any per-node `roles` gate, so a patient
 * never sees a staff branch. Carried forward verbatim from the retired
 * `NavItem` model.
 */
export type NavAudience = 'staff' | 'patient';

/**
 * The structural kind of a {@link NavNode}, which decides how the chrome renders
 * it:
 *
 * - `'module'` — a top-level rail entry. With children it opens a flyout (or, if
 *   every child is a `'view'`, top tabs); with no children it is itself a
 *   destination and just navigates to its `route`.
 * - `'group'` — an intermediate sub-module that always opens a further flyout
 *   column (origin R5/R6). Never a destination on its own.
 * - `'view'` — a leaf. Carries a `route` and renders as a top-bar tab at the
 *   final level (origin R7).
 */
export type NavKind = 'module' | 'group' | 'view';

/**
 * One node in the console's navigation hierarchy.
 *
 * Replaces the flat `NavItem`: the nav is a recursive, data-driven tree the rail
 * + cascading flyouts + breadcrumb + view tabs all read from. Only `'view'`
 * leaves (and childless `'module'` destinations) carry a `route`; intermediate
 * nodes carry `children`. Per-node `roles` / `audience` drive top-down filtering
 * (see {@link filterTree}) — but tree filtering is presentation only: a
 * role-gated node MUST also have its route protected by `roleGuard`, or a
 * deep-link bypasses the filter.
 */
export interface NavNode {
  /** Stable id, unique among its siblings. Used as the breadcrumb/flyout key. */
  readonly id: string;
  /** Visible label. */
  readonly label: string;
  /**
   * PrimeIcons class (e.g. `'pi pi-th-large'`). Required in practice for
   * top-level modules (the collapsed rail shows icons only); optional deeper in
   * the tree where labels carry the meaning.
   */
  readonly icon?: string;
  /**
   * Router link target. Present only on destinations — `'view'` leaves and
   * childless `'module'` nodes. Intermediate `'module'`/`'group'` nodes that
   * open a flyout do not carry a route.
   */
  readonly route?: string;
  /** Structural kind — see {@link NavKind}. */
  readonly kind: NavKind;
  /** Child nodes, in display order. Absent/empty for a leaf destination. */
  readonly children?: readonly NavNode[];
  /**
   * Roles that may see this node (OR-semantics via `AuthService.hasAnyRole`).
   * Absent means "no role gate" (audience still applies). Hiding a gated node is
   * UX only — its route must also carry `roleGuard`.
   */
  readonly roles?: readonly string[];
  /** Which population sees this node. Defaults to `'staff'`. */
  readonly audience?: NavAudience;
}

/**
 * The access facts {@link filterTree} needs about the current user. Mirrors the
 * `AuthService` signals so the service can pass them straight through.
 */
export interface NavAccess {
  readonly isStaff: boolean;
  readonly isPatient: boolean;
  readonly hasAnyRole: (roles: readonly string[]) => boolean;
}

/** True when the node is a leaf destination (a `'view'`, never has children). */
export function isLeaf(node: NavNode): boolean {
  return node.kind === 'view';
}

/** True when the node carries a navigable route (leaf view or childless module). */
export function isDestination(node: NavNode): boolean {
  return node.route != null && (node.children?.length ?? 0) === 0;
}

/**
 * True when the node's direct children are ALL `'view'`s — it renders its
 * children as top-bar tabs rather than a flyout column (origin R8).
 */
export function rendersAsTabs(node: NavNode): boolean {
  const children = node.children;
  return (
    children != null &&
    children.length > 0 &&
    children.every(child => child.kind === 'view')
  );
}

/**
 * True when the node opens a flyout column — it has children and at least one is
 * not a `'view'` (origin R5/R6).
 */
export function rendersAsFlyout(node: NavNode): boolean {
  const children = node.children;
  return children != null && children.length > 0 && !rendersAsTabs(node);
}

function nodeSelfVisible(node: NavNode, access: NavAccess): boolean {
  const audience = node.audience ?? 'staff';
  if (audience === 'staff' && !access.isStaff) {
    return false;
  }
  if (audience === 'patient' && !access.isPatient) {
    return false;
  }
  if (node.roles != null && node.roles.length > 0) {
    return access.hasAnyRole(node.roles);
  }
  return true;
}

/**
 * Filters a node list for the current user, recursively. A node survives when
 * its own audience/roles pass AND, if it is a branch, at least one descendant
 * survives — so a branch whose every leaf is gated away is hidden entirely
 * (no empty flyout columns). Returns new node objects; the input is untouched.
 */
export function filterTree(
  nodes: readonly NavNode[],
  access: NavAccess,
): NavNode[] {
  const out: NavNode[] = [];
  for (const node of nodes) {
    if (!nodeSelfVisible(node, access)) {
      continue;
    }
    if (node.children != null && node.children.length > 0) {
      const children = filterTree(node.children, access);
      if (children.length === 0) {
        continue;
      }
      out.push({ ...node, children });
    } else {
      out.push(node);
    }
  }
  return out;
}

/**
 * Resolves a router URL to the chain of nodes from a top-level module down to
 * the matched destination, or `null` when no destination matches. Matching is by
 * route prefix: a node matches when `url` equals its `route` or starts with
 * `route + '/'`, so a deep view URL still resolves to its leaf. The chain is
 * root-first; the last element is the matched destination.
 */
export function resolveRoutePath(
  tree: readonly NavNode[],
  url: string,
): NavNode[] | null {
  const path = normalizeUrl(url);
  for (const node of tree) {
    const chain = matchInNode(node, path);
    if (chain != null) {
      return chain;
    }
  }
  return null;
}

function matchInNode(node: NavNode, url: string): NavNode[] | null {
  if (node.children != null && node.children.length > 0) {
    for (const child of node.children) {
      const chain = matchInNode(child, url);
      if (chain != null) {
        return [node, ...chain];
      }
    }
    return null;
  }
  return routeMatches(node.route, url) ? [node] : null;
}

function routeMatches(route: string | undefined, url: string): boolean {
  if (route == null) {
    return false;
  }
  const target = normalizeUrl(route);
  return url === target || url.startsWith(`${target}/`);
}

/** Strips the query/fragment and any trailing slash so route matching is exact. */
function normalizeUrl(url: string): string {
  const withoutQuery = url.split(/[?#]/, 1)[0];
  return withoutQuery.length > 1 && withoutQuery.endsWith('/')
    ? withoutQuery.slice(0, -1)
    : withoutQuery;
}

/**
 * The app's live navigation tree.
 *
 * These are the modules that exist as real lazy routes today (see
 * `app.routes.ts`): each is a childless `'module'` destination, so the rail
 * shows three icons and no flyout opens (origin R8 — no sub-structure means a
 * direct landing). Admin (Users/Settings) has left the rail for the System Admin
 * console, and Profile has become personal Settings (the gear) — neither is a
 * rail entry anymore.
 *
 * The cascade / tabs / breadcrumb machinery is depth-agnostic and exercised
 * against fixture trees in the specs; populating a genuinely nested tree
 * (e.g. Clinical › Imaging › CT › views) is a data/IA deliverable wired here
 * once the module hierarchy and its routes land.
 */
export const NAV_TREE: readonly NavNode[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    icon: 'pi pi-th-large',
    route: '/workspace',
    kind: 'module',
    audience: 'staff',
  },
  {
    id: 'templates',
    label: 'Templates',
    icon: 'pi pi-file-edit',
    route: '/templates',
    kind: 'module',
    audience: 'staff',
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: 'pi pi-folder',
    route: '/documents',
    kind: 'module',
    audience: 'staff',
  },
] as const;

/** The role required to reach the System Admin console (admin gating). */
export const ADMIN_ROLE = RolesEnum.System.Admin;
