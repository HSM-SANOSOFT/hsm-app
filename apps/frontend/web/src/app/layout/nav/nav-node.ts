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
export function normalizeUrl(url: string): string {
  const withoutQuery = url.split(/[?#]/, 1)[0];
  return withoutQuery.length > 1 && withoutQuery.endsWith('/')
    ? withoutQuery.slice(0, -1)
    : withoutQuery;
}

/**
 * The app's live navigation tree — the committed hospital-platform module
 * taxonomy (origin: the module-taxonomy brainstorm, R6–R36).
 *
 * Shape (KTD6 kind mapping): each **domain** is a `'module'` rail entry with an
 * icon; each **module** is a `'group'`; each **submodule** is a `'view'` leaf
 * carrying a `/<domain>/<module>/<submodule>` route. Sibling homogeneity is
 * preserved everywhere — a domain's children are all groups (so it opens a
 * flyout), a module's children are all views (so they render as top tabs) — so
 * no level mixes kinds. The two naturally two-level modules (ADT, Imaging) are
 * authored **flat** (submodules as a flat view list) for this scaffold.
 *
 * The rail (top to bottom) is **Workspace** + the five staff domains
 * (**Clinical**, **Diagnostics & Therapeutics**, **Business / ERP**,
 * **Governance & Support**, **Platform**); **Patient Portal** is the sixth
 * domain, patient-only, so a patient's rail shows only it (KTD1). Roles are
 * greenfield (KTD5): no node carries a `roles` gate — only `audience` splits
 * staff vs patient.
 *
 * The already-built modules are absorbed, not rebuilt (KTD4): **Documents** and
 * **Templates & Communications** live under **Platform** as single-view groups
 * carrying their real `/documents` and `/templates` routes, and **Patient
 * Portal**'s first leaf carries the existing `/patient` stub route — these sit
 * in `BUILT_MODULE_ROUTES` so the route generator (`nav-routes.ts`) skips them
 * and the real lazy routes keep owning the path. Every other leaf resolves to
 * the shared `ModulePlaceholder` via a generated route.
 *
 * Admin (Users/Environment) lives in the System Admin console
 * ({@link ADMIN_NAV_TREE}), reached from the profile card — it is deliberately
 * NOT on the rail. Profile and Settings are likewise reached from the profile
 * card, not the rail.
 */
export const NAV_TREE: readonly NavNode[] = [
  {
    id: 'workspace',
    label: 'layout.navTree.workspace',
    icon: 'pi pi-th-large',
    route: '/workspace',
    kind: 'module',
    audience: 'staff',
  },

  // ── Domain 1 — Clinical ────────────────────────────────────────────────
  {
    id: 'clinical',
    label: 'layout.navTree.clinical',
    icon: 'pi pi-heart',
    kind: 'module',
    audience: 'staff',
    children: [
      {
        id: 'clinical-patient-management',
        label: 'layout.navTree.clinical-patient-management',
        kind: 'group',
        children: [
          {
            id: 'clinical-pm-registration',
            label: 'layout.navTree.clinical-pm-registration',
            kind: 'view',
            route: '/clinical/patient-management/registration',
          },
          {
            id: 'clinical-pm-mpi-merge',
            label: 'layout.navTree.clinical-pm-mpi-merge',
            kind: 'view',
            route: '/clinical/patient-management/mpi-merge',
          },
          {
            id: 'clinical-pm-insurance',
            label: 'layout.navTree.clinical-pm-insurance',
            kind: 'view',
            route: '/clinical/patient-management/insurance',
          },
          {
            id: 'clinical-pm-contacts',
            label: 'layout.navTree.clinical-pm-contacts',
            kind: 'view',
            route: '/clinical/patient-management/contacts',
          },
          {
            id: 'clinical-pm-summary-timeline',
            label: 'layout.navTree.clinical-pm-summary-timeline',
            kind: 'view',
            route: '/clinical/patient-management/summary-timeline',
          },
          {
            id: 'clinical-pm-linked-documents',
            label: 'layout.navTree.clinical-pm-linked-documents',
            kind: 'view',
            route: '/clinical/patient-management/linked-documents',
          },
        ],
      },
      {
        id: 'clinical-adt',
        label: 'layout.navTree.clinical-adt',
        kind: 'group',
        children: [
          {
            id: 'clinical-adt-opd',
            label: 'layout.navTree.clinical-adt-opd',
            kind: 'view',
            route: '/clinical/adt/opd',
          },
          {
            id: 'clinical-adt-ipd',
            label: 'layout.navTree.clinical-adt-ipd',
            kind: 'view',
            route: '/clinical/adt/ipd',
          },
          {
            id: 'clinical-adt-ed-triage',
            label: 'layout.navTree.clinical-adt-ed-triage',
            kind: 'view',
            route: '/clinical/adt/ed-triage',
          },
          {
            id: 'clinical-adt-beds-wards',
            label: 'layout.navTree.clinical-adt-beds-wards',
            kind: 'view',
            route: '/clinical/adt/beds-wards',
          },
          {
            id: 'clinical-adt-transfers',
            label: 'layout.navTree.clinical-adt-transfers',
            kind: 'view',
            route: '/clinical/adt/transfers',
          },
          {
            id: 'clinical-adt-discharge',
            label: 'layout.navTree.clinical-adt-discharge',
            kind: 'view',
            route: '/clinical/adt/discharge',
          },
        ],
      },
      {
        id: 'clinical-encounters',
        label: 'layout.navTree.clinical-encounters',
        kind: 'group',
        children: [
          {
            id: 'clinical-ehr-soap-notes',
            label: 'layout.navTree.clinical-ehr-soap-notes',
            kind: 'view',
            route: '/clinical/encounters/soap-notes',
          },
          {
            id: 'clinical-ehr-vitals',
            label: 'layout.navTree.clinical-ehr-vitals',
            kind: 'view',
            route: '/clinical/encounters/vitals',
          },
          {
            id: 'clinical-ehr-diagnoses',
            label: 'layout.navTree.clinical-ehr-diagnoses',
            kind: 'view',
            route: '/clinical/encounters/diagnoses',
          },
          {
            id: 'clinical-ehr-allergies',
            label: 'layout.navTree.clinical-ehr-allergies',
            kind: 'view',
            route: '/clinical/encounters/allergies',
          },
          {
            id: 'clinical-ehr-care-plans',
            label: 'layout.navTree.clinical-ehr-care-plans',
            kind: 'view',
            route: '/clinical/encounters/care-plans',
          },
          {
            id: 'clinical-ehr-procedures',
            label: 'layout.navTree.clinical-ehr-procedures',
            kind: 'view',
            route: '/clinical/encounters/procedures',
          },
          {
            id: 'clinical-ehr-immunizations',
            label: 'layout.navTree.clinical-ehr-immunizations',
            kind: 'view',
            route: '/clinical/encounters/immunizations',
          },
        ],
      },
      {
        id: 'clinical-orders',
        label: 'layout.navTree.clinical-orders',
        kind: 'group',
        children: [
          {
            id: 'clinical-orders-lab',
            label: 'layout.navTree.clinical-orders-lab',
            kind: 'view',
            route: '/clinical/orders/lab',
          },
          {
            id: 'clinical-orders-imaging',
            label: 'layout.navTree.clinical-orders-imaging',
            kind: 'view',
            route: '/clinical/orders/imaging',
          },
          {
            id: 'clinical-orders-medication',
            label: 'layout.navTree.clinical-orders-medication',
            kind: 'view',
            route: '/clinical/orders/medication',
          },
          {
            id: 'clinical-orders-procedure',
            label: 'layout.navTree.clinical-orders-procedure',
            kind: 'view',
            route: '/clinical/orders/procedure',
          },
          {
            id: 'clinical-orders-order-sets',
            label: 'layout.navTree.clinical-orders-order-sets',
            kind: 'view',
            route: '/clinical/orders/order-sets',
          },
          {
            id: 'clinical-orders-results-review',
            label: 'layout.navTree.clinical-orders-results-review',
            kind: 'view',
            route: '/clinical/orders/results-review',
          },
        ],
      },
      {
        id: 'clinical-nursing',
        label: 'layout.navTree.clinical-nursing',
        kind: 'group',
        children: [
          {
            id: 'clinical-nursing-emar',
            label: 'layout.navTree.clinical-nursing-emar',
            kind: 'view',
            route: '/clinical/nursing/emar',
          },
          {
            id: 'clinical-nursing-assessments',
            label: 'layout.navTree.clinical-nursing-assessments',
            kind: 'view',
            route: '/clinical/nursing/assessments',
          },
          {
            id: 'clinical-nursing-handover',
            label: 'layout.navTree.clinical-nursing-handover',
            kind: 'view',
            route: '/clinical/nursing/handover',
          },
          {
            id: 'clinical-nursing-care-tasks',
            label: 'layout.navTree.clinical-nursing-care-tasks',
            kind: 'view',
            route: '/clinical/nursing/care-tasks',
          },
        ],
      },
      {
        id: 'clinical-surgery',
        label: 'layout.navTree.clinical-surgery',
        kind: 'group',
        children: [
          {
            id: 'clinical-surgery-theatre-scheduling',
            label: 'layout.navTree.clinical-surgery-theatre-scheduling',
            kind: 'view',
            route: '/clinical/surgery/theatre-scheduling',
          },
          {
            id: 'clinical-surgery-peri-op',
            label: 'layout.navTree.clinical-surgery-peri-op',
            kind: 'view',
            route: '/clinical/surgery/peri-op',
          },
          {
            id: 'clinical-surgery-op-notes',
            label: 'layout.navTree.clinical-surgery-op-notes',
            kind: 'view',
            route: '/clinical/surgery/op-notes',
          },
        ],
      },
      {
        id: 'clinical-maternity',
        label: 'layout.navTree.clinical-maternity',
        kind: 'group',
        children: [
          {
            id: 'clinical-maternity-antenatal',
            label: 'layout.navTree.clinical-maternity-antenatal',
            kind: 'view',
            route: '/clinical/maternity/antenatal',
          },
          {
            id: 'clinical-maternity-labor-delivery',
            label: 'layout.navTree.clinical-maternity-labor-delivery',
            kind: 'view',
            route: '/clinical/maternity/labor-delivery',
          },
          {
            id: 'clinical-maternity-postnatal',
            label: 'layout.navTree.clinical-maternity-postnatal',
            kind: 'view',
            route: '/clinical/maternity/postnatal',
          },
          {
            id: 'clinical-maternity-newborn',
            label: 'layout.navTree.clinical-maternity-newborn',
            kind: 'view',
            route: '/clinical/maternity/newborn',
          },
        ],
      },
      {
        id: 'clinical-dietary',
        label: 'layout.navTree.clinical-dietary',
        kind: 'group',
        children: [
          {
            id: 'clinical-dietary-diet-orders',
            label: 'layout.navTree.clinical-dietary-diet-orders',
            kind: 'view',
            route: '/clinical/dietary/diet-orders',
          },
          {
            id: 'clinical-dietary-meal-planning',
            label: 'layout.navTree.clinical-dietary-meal-planning',
            kind: 'view',
            route: '/clinical/dietary/meal-planning',
          },
          {
            id: 'clinical-dietary-nutrition-assessments',
            label: 'layout.navTree.clinical-dietary-nutrition-assessments',
            kind: 'view',
            route: '/clinical/dietary/nutrition-assessments',
          },
        ],
      },
      {
        id: 'clinical-physiotherapy',
        label: 'layout.navTree.clinical-physiotherapy',
        kind: 'group',
        children: [
          {
            id: 'clinical-physio-referrals',
            label: 'layout.navTree.clinical-physio-referrals',
            kind: 'view',
            route: '/clinical/physiotherapy/referrals',
          },
          {
            id: 'clinical-physio-therapy-plans',
            label: 'layout.navTree.clinical-physio-therapy-plans',
            kind: 'view',
            route: '/clinical/physiotherapy/therapy-plans',
          },
          {
            id: 'clinical-physio-session-tracking',
            label: 'layout.navTree.clinical-physio-session-tracking',
            kind: 'view',
            route: '/clinical/physiotherapy/session-tracking',
          },
        ],
      },
    ],
  },

  // ── Domain 2 — Diagnostics & Therapeutics ──────────────────────────────
  {
    id: 'diagnostics',
    label: 'layout.navTree.diagnostics',
    icon: 'pi pi-image',
    kind: 'module',
    audience: 'staff',
    children: [
      {
        id: 'diagnostics-laboratory',
        label: 'layout.navTree.diagnostics-laboratory',
        kind: 'group',
        children: [
          {
            id: 'diagnostics-lab-test-catalog',
            label: 'layout.navTree.diagnostics-lab-test-catalog',
            kind: 'view',
            route: '/diagnostics/laboratory/test-catalog',
          },
          {
            id: 'diagnostics-lab-order-intake',
            label: 'layout.navTree.diagnostics-lab-order-intake',
            kind: 'view',
            route: '/diagnostics/laboratory/order-intake',
          },
          {
            id: 'diagnostics-lab-specimen-tracking',
            label: 'layout.navTree.diagnostics-lab-specimen-tracking',
            kind: 'view',
            route: '/diagnostics/laboratory/specimen-tracking',
          },
          {
            id: 'diagnostics-lab-worklists',
            label: 'layout.navTree.diagnostics-lab-worklists',
            kind: 'view',
            route: '/diagnostics/laboratory/worklists',
          },
          {
            id: 'diagnostics-lab-results',
            label: 'layout.navTree.diagnostics-lab-results',
            kind: 'view',
            route: '/diagnostics/laboratory/results',
          },
          {
            id: 'diagnostics-lab-qc',
            label: 'layout.navTree.diagnostics-lab-qc',
            kind: 'view',
            route: '/diagnostics/laboratory/qc',
          },
        ],
      },
      {
        id: 'diagnostics-imaging',
        label: 'layout.navTree.diagnostics-imaging',
        kind: 'group',
        children: [
          {
            id: 'diagnostics-imaging-order-intake',
            label: 'layout.navTree.diagnostics-imaging-order-intake',
            kind: 'view',
            route: '/diagnostics/imaging/order-intake',
          },
          {
            id: 'diagnostics-imaging-scheduling',
            label: 'layout.navTree.diagnostics-imaging-scheduling',
            kind: 'view',
            route: '/diagnostics/imaging/scheduling',
          },
          {
            id: 'diagnostics-imaging-dicom-worklist',
            label: 'layout.navTree.diagnostics-imaging-dicom-worklist',
            kind: 'view',
            route: '/diagnostics/imaging/dicom-worklist',
          },
          {
            id: 'diagnostics-imaging-acquisition',
            label: 'layout.navTree.diagnostics-imaging-acquisition',
            kind: 'view',
            route: '/diagnostics/imaging/acquisition',
          },
          {
            id: 'diagnostics-imaging-dicom-store',
            label: 'layout.navTree.diagnostics-imaging-dicom-store',
            kind: 'view',
            route: '/diagnostics/imaging/dicom-store',
          },
          {
            id: 'diagnostics-imaging-viewer',
            label: 'layout.navTree.diagnostics-imaging-viewer',
            kind: 'view',
            route: '/diagnostics/imaging/viewer',
          },
          {
            id: 'diagnostics-imaging-reporting',
            label: 'layout.navTree.diagnostics-imaging-reporting',
            kind: 'view',
            route: '/diagnostics/imaging/reporting',
          },
        ],
      },
      {
        id: 'diagnostics-pharmacy',
        label: 'layout.navTree.diagnostics-pharmacy',
        kind: 'group',
        children: [
          {
            id: 'diagnostics-pharmacy-formulary',
            label: 'layout.navTree.diagnostics-pharmacy-formulary',
            kind: 'view',
            route: '/diagnostics/pharmacy/formulary',
          },
          {
            id: 'diagnostics-pharmacy-e-prescribing',
            label: 'layout.navTree.diagnostics-pharmacy-e-prescribing',
            kind: 'view',
            route: '/diagnostics/pharmacy/e-prescribing',
          },
          {
            id: 'diagnostics-pharmacy-dispensing',
            label: 'layout.navTree.diagnostics-pharmacy-dispensing',
            kind: 'view',
            route: '/diagnostics/pharmacy/dispensing',
          },
          {
            id: 'diagnostics-pharmacy-inpatient-supply',
            label: 'layout.navTree.diagnostics-pharmacy-inpatient-supply',
            kind: 'view',
            route: '/diagnostics/pharmacy/inpatient-supply',
          },
          {
            id: 'diagnostics-pharmacy-interaction-checks',
            label: 'layout.navTree.diagnostics-pharmacy-interaction-checks',
            kind: 'view',
            route: '/diagnostics/pharmacy/interaction-checks',
          },
          {
            id: 'diagnostics-pharmacy-stock',
            label: 'layout.navTree.diagnostics-pharmacy-stock',
            kind: 'view',
            route: '/diagnostics/pharmacy/stock',
          },
        ],
      },
    ],
  },

  // ── Domain 3 — Business / ERP ──────────────────────────────────────────
  {
    id: 'business',
    label: 'layout.navTree.business',
    icon: 'pi pi-briefcase',
    kind: 'module',
    audience: 'staff',
    children: [
      {
        id: 'business-accounting',
        label: 'layout.navTree.business-accounting',
        kind: 'group',
        children: [
          {
            id: 'business-accounting-gl',
            label: 'layout.navTree.business-accounting-gl',
            kind: 'view',
            route: '/business/accounting/gl',
          },
          {
            id: 'business-accounting-ar',
            label: 'layout.navTree.business-accounting-ar',
            kind: 'view',
            route: '/business/accounting/ar',
          },
          {
            id: 'business-accounting-ap',
            label: 'layout.navTree.business-accounting-ap',
            kind: 'view',
            route: '/business/accounting/ap',
          },
          {
            id: 'business-accounting-banking',
            label: 'layout.navTree.business-accounting-banking',
            kind: 'view',
            route: '/business/accounting/banking',
          },
          {
            id: 'business-accounting-cost-centers',
            label: 'layout.navTree.business-accounting-cost-centers',
            kind: 'view',
            route: '/business/accounting/cost-centers',
          },
          {
            id: 'business-accounting-reports',
            label: 'layout.navTree.business-accounting-reports',
            kind: 'view',
            route: '/business/accounting/reports',
          },
          {
            id: 'business-accounting-taxes',
            label: 'layout.navTree.business-accounting-taxes',
            kind: 'view',
            route: '/business/accounting/taxes',
          },
        ],
      },
      {
        id: 'business-billing',
        label: 'layout.navTree.business-billing',
        kind: 'group',
        children: [
          {
            id: 'business-billing-charge-capture',
            label: 'layout.navTree.business-billing-charge-capture',
            kind: 'view',
            route: '/business/billing/charge-capture',
          },
          {
            id: 'business-billing-invoicing',
            label: 'layout.navTree.business-billing-invoicing',
            kind: 'view',
            route: '/business/billing/invoicing',
          },
          {
            id: 'business-billing-claims',
            label: 'layout.navTree.business-billing-claims',
            kind: 'view',
            route: '/business/billing/claims',
          },
          {
            id: 'business-billing-payments',
            label: 'layout.navTree.business-billing-payments',
            kind: 'view',
            route: '/business/billing/payments',
          },
          {
            id: 'business-billing-tariffs',
            label: 'layout.navTree.business-billing-tariffs',
            kind: 'view',
            route: '/business/billing/tariffs',
          },
        ],
      },
      {
        id: 'business-inventory',
        label: 'layout.navTree.business-inventory',
        kind: 'group',
        children: [
          {
            id: 'business-inventory-item-master',
            label: 'layout.navTree.business-inventory-item-master',
            kind: 'view',
            route: '/business/inventory/item-master',
          },
          {
            id: 'business-inventory-stock',
            label: 'layout.navTree.business-inventory-stock',
            kind: 'view',
            route: '/business/inventory/stock',
          },
          {
            id: 'business-inventory-batch-expiry',
            label: 'layout.navTree.business-inventory-batch-expiry',
            kind: 'view',
            route: '/business/inventory/batch-expiry',
          },
          {
            id: 'business-inventory-requisitions',
            label: 'layout.navTree.business-inventory-requisitions',
            kind: 'view',
            route: '/business/inventory/requisitions',
          },
          {
            id: 'business-inventory-par-levels',
            label: 'layout.navTree.business-inventory-par-levels',
            kind: 'view',
            route: '/business/inventory/par-levels',
          },
          {
            id: 'business-inventory-counts',
            label: 'layout.navTree.business-inventory-counts',
            kind: 'view',
            route: '/business/inventory/counts',
          },
        ],
      },
      {
        id: 'business-procurement',
        label: 'layout.navTree.business-procurement',
        kind: 'group',
        children: [
          {
            id: 'business-procurement-suppliers',
            label: 'layout.navTree.business-procurement-suppliers',
            kind: 'view',
            route: '/business/procurement/suppliers',
          },
          {
            id: 'business-procurement-requisitions',
            label: 'layout.navTree.business-procurement-requisitions',
            kind: 'view',
            route: '/business/procurement/requisitions',
          },
          {
            id: 'business-procurement-purchase-orders',
            label: 'layout.navTree.business-procurement-purchase-orders',
            kind: 'view',
            route: '/business/procurement/purchase-orders',
          },
          {
            id: 'business-procurement-goods-receipt',
            label: 'layout.navTree.business-procurement-goods-receipt',
            kind: 'view',
            route: '/business/procurement/goods-receipt',
          },
        ],
      },
      {
        id: 'business-assets',
        label: 'layout.navTree.business-assets',
        kind: 'group',
        children: [
          {
            id: 'business-assets-register',
            label: 'layout.navTree.business-assets-register',
            kind: 'view',
            route: '/business/assets/register',
          },
          {
            id: 'business-assets-preventive-maintenance',
            label: 'layout.navTree.business-assets-preventive-maintenance',
            kind: 'view',
            route: '/business/assets/preventive-maintenance',
          },
          {
            id: 'business-assets-warranties',
            label: 'layout.navTree.business-assets-warranties',
            kind: 'view',
            route: '/business/assets/warranties',
          },
          {
            id: 'business-assets-work-orders',
            label: 'layout.navTree.business-assets-work-orders',
            kind: 'view',
            route: '/business/assets/work-orders',
          },
          {
            id: 'business-assets-calibration',
            label: 'layout.navTree.business-assets-calibration',
            kind: 'view',
            route: '/business/assets/calibration',
          },
        ],
      },
      {
        id: 'business-hr',
        label: 'layout.navTree.business-hr',
        kind: 'group',
        children: [
          {
            id: 'business-hr-employee-records',
            label: 'layout.navTree.business-hr-employee-records',
            kind: 'view',
            route: '/business/hr/employee-records',
          },
          {
            id: 'business-hr-recruitment',
            label: 'layout.navTree.business-hr-recruitment',
            kind: 'view',
            route: '/business/hr/recruitment',
          },
          {
            id: 'business-hr-attendance-leave',
            label: 'layout.navTree.business-hr-attendance-leave',
            kind: 'view',
            route: '/business/hr/attendance-leave',
          },
          {
            id: 'business-hr-rostering',
            label: 'layout.navTree.business-hr-rostering',
            kind: 'view',
            route: '/business/hr/rostering',
          },
          {
            id: 'business-hr-payroll',
            label: 'layout.navTree.business-hr-payroll',
            kind: 'view',
            route: '/business/hr/payroll',
          },
          {
            id: 'business-hr-appraisals',
            label: 'layout.navTree.business-hr-appraisals',
            kind: 'view',
            route: '/business/hr/appraisals',
          },
          {
            id: 'business-hr-credentialing',
            label: 'layout.navTree.business-hr-credentialing',
            kind: 'view',
            route: '/business/hr/credentialing',
          },
        ],
      },
      {
        id: 'business-crm',
        label: 'layout.navTree.business-crm',
        kind: 'group',
        children: [
          {
            id: 'business-crm-engagement',
            label: 'layout.navTree.business-crm-engagement',
            kind: 'view',
            route: '/business/crm/engagement',
          },
          {
            id: 'business-crm-campaigns',
            label: 'layout.navTree.business-crm-campaigns',
            kind: 'view',
            route: '/business/crm/campaigns',
          },
          {
            id: 'business-crm-referrals',
            label: 'layout.navTree.business-crm-referrals',
            kind: 'view',
            route: '/business/crm/referrals',
          },
          {
            id: 'business-crm-feedback',
            label: 'layout.navTree.business-crm-feedback',
            kind: 'view',
            route: '/business/crm/feedback',
          },
          {
            id: 'business-crm-leads',
            label: 'layout.navTree.business-crm-leads',
            kind: 'view',
            route: '/business/crm/leads',
          },
        ],
      },
      {
        id: 'business-projects',
        label: 'layout.navTree.business-projects',
        kind: 'group',
        children: [
          {
            id: 'business-projects-tasks',
            label: 'layout.navTree.business-projects-tasks',
            kind: 'view',
            route: '/business/projects/tasks',
          },
          {
            id: 'business-projects-milestones',
            label: 'layout.navTree.business-projects-milestones',
            kind: 'view',
            route: '/business/projects/milestones',
          },
          {
            id: 'business-projects-timesheets',
            label: 'layout.navTree.business-projects-timesheets',
            kind: 'view',
            route: '/business/projects/timesheets',
          },
          {
            id: 'business-projects-costing',
            label: 'layout.navTree.business-projects-costing',
            kind: 'view',
            route: '/business/projects/costing',
          },
          {
            id: 'business-projects-billing',
            label: 'layout.navTree.business-projects-billing',
            kind: 'view',
            route: '/business/projects/billing',
          },
        ],
      },
    ],
  },

  // ── Domain 4 — Governance & Support ────────────────────────────────────
  {
    id: 'governance',
    label: 'layout.navTree.governance',
    icon: 'pi pi-shield',
    kind: 'module',
    audience: 'staff',
    children: [
      {
        id: 'governance-quality',
        label: 'layout.navTree.governance-quality',
        kind: 'group',
        children: [
          {
            id: 'governance-quality-incidents',
            label: 'layout.navTree.governance-quality-incidents',
            kind: 'view',
            route: '/governance/quality/incidents',
          },
          {
            id: 'governance-quality-audits',
            label: 'layout.navTree.governance-quality-audits',
            kind: 'view',
            route: '/governance/quality/audits',
          },
          {
            id: 'governance-quality-accreditation',
            label: 'layout.navTree.governance-quality-accreditation',
            kind: 'view',
            route: '/governance/quality/accreditation',
          },
          {
            id: 'governance-quality-capa',
            label: 'layout.navTree.governance-quality-capa',
            kind: 'view',
            route: '/governance/quality/capa',
          },
          {
            id: 'governance-quality-sop-control',
            label: 'layout.navTree.governance-quality-sop-control',
            kind: 'view',
            route: '/governance/quality/sop-control',
          },
          {
            id: 'governance-quality-risk-register',
            label: 'layout.navTree.governance-quality-risk-register',
            kind: 'view',
            route: '/governance/quality/risk-register',
          },
        ],
      },
      {
        id: 'governance-legal',
        label: 'layout.navTree.governance-legal',
        kind: 'group',
        children: [
          {
            id: 'governance-legal-consents',
            label: 'layout.navTree.governance-legal-consents',
            kind: 'view',
            route: '/governance/legal/consents',
          },
          {
            id: 'governance-legal-cases',
            label: 'layout.navTree.governance-legal-cases',
            kind: 'view',
            route: '/governance/legal/cases',
          },
          {
            id: 'governance-legal-contracts',
            label: 'layout.navTree.governance-legal-contracts',
            kind: 'view',
            route: '/governance/legal/contracts',
          },
          {
            id: 'governance-legal-regulatory',
            label: 'layout.navTree.governance-legal-regulatory',
            kind: 'view',
            route: '/governance/legal/regulatory',
          },
        ],
      },
      {
        id: 'governance-research',
        label: 'layout.navTree.governance-research',
        kind: 'group',
        children: [
          {
            id: 'governance-research-studies',
            label: 'layout.navTree.governance-research-studies',
            kind: 'view',
            route: '/governance/research/studies',
          },
          {
            id: 'governance-research-cohorts',
            label: 'layout.navTree.governance-research-cohorts',
            kind: 'view',
            route: '/governance/research/cohorts',
          },
          {
            id: 'governance-research-ethics',
            label: 'layout.navTree.governance-research-ethics',
            kind: 'view',
            route: '/governance/research/ethics',
          },
          {
            id: 'governance-research-data-capture',
            label: 'layout.navTree.governance-research-data-capture',
            kind: 'view',
            route: '/governance/research/data-capture',
          },
        ],
      },
      {
        id: 'governance-social-work',
        label: 'layout.navTree.governance-social-work',
        kind: 'group',
        children: [
          {
            id: 'governance-social-case-management',
            label: 'layout.navTree.governance-social-case-management',
            kind: 'view',
            route: '/governance/social-work/case-management',
          },
          {
            id: 'governance-social-advocacy',
            label: 'layout.navTree.governance-social-advocacy',
            kind: 'view',
            route: '/governance/social-work/advocacy',
          },
          {
            id: 'governance-social-financial-assistance',
            label: 'layout.navTree.governance-social-financial-assistance',
            kind: 'view',
            route: '/governance/social-work/financial-assistance',
          },
          {
            id: 'governance-social-discharge-support',
            label: 'layout.navTree.governance-social-discharge-support',
            kind: 'view',
            route: '/governance/social-work/discharge-support',
          },
        ],
      },
      {
        id: 'governance-helpdesk',
        label: 'layout.navTree.governance-helpdesk',
        kind: 'group',
        children: [
          {
            id: 'governance-helpdesk-patient-queries',
            label: 'layout.navTree.governance-helpdesk-patient-queries',
            kind: 'view',
            route: '/governance/helpdesk/patient-queries',
          },
          {
            id: 'governance-helpdesk-internal-tickets',
            label: 'layout.navTree.governance-helpdesk-internal-tickets',
            kind: 'view',
            route: '/governance/helpdesk/internal-tickets',
          },
          {
            id: 'governance-helpdesk-issue-tracking',
            label: 'layout.navTree.governance-helpdesk-issue-tracking',
            kind: 'view',
            route: '/governance/helpdesk/issue-tracking',
          },
        ],
      },
    ],
  },

  // ── Domain 6 — Platform (shared services + absorbed built modules) ──────
  {
    id: 'platform',
    label: 'layout.navTree.platform',
    icon: 'pi pi-cog',
    kind: 'module',
    audience: 'staff',
    children: [
      {
        id: 'platform-scheduling',
        label: 'layout.navTree.platform-scheduling',
        kind: 'group',
        children: [
          {
            id: 'platform-scheduling-booking',
            label: 'layout.navTree.platform-scheduling-booking',
            kind: 'view',
            route: '/platform/scheduling/booking',
          },
          {
            id: 'platform-scheduling-reminders',
            label: 'layout.navTree.platform-scheduling-reminders',
            kind: 'view',
            route: '/platform/scheduling/reminders',
          },
          {
            id: 'platform-scheduling-calendar',
            label: 'layout.navTree.platform-scheduling-calendar',
            kind: 'view',
            route: '/platform/scheduling/calendar',
          },
        ],
      },
      {
        id: 'platform-reporting',
        label: 'layout.navTree.platform-reporting',
        kind: 'group',
        children: [
          {
            id: 'platform-reporting-operational',
            label: 'layout.navTree.platform-reporting-operational',
            kind: 'view',
            route: '/platform/reporting/operational',
          },
          {
            id: 'platform-reporting-clinical',
            label: 'layout.navTree.platform-reporting-clinical',
            kind: 'view',
            route: '/platform/reporting/clinical',
          },
          {
            id: 'platform-reporting-kpis',
            label: 'layout.navTree.platform-reporting-kpis',
            kind: 'view',
            route: '/platform/reporting/kpis',
          },
        ],
      },
      // Documents — built (R33). Single-view group so it sits in the Platform
      // flyout like every other module but lands directly on its real `/documents`
      // screen (no tab strip for a lone view). `/documents` is in
      // `BUILT_MODULE_ROUTES`, so the generator skips it.
      {
        id: 'platform-documents',
        label: 'layout.navTree.platform-documents',
        kind: 'group',
        children: [
          {
            id: 'platform-documents-files',
            label: 'layout.navTree.platform-documents-files',
            kind: 'view',
            route: '/documents',
          },
        ],
      },
      // Templates & Communications — built (R34). Same single-view-group treatment
      // over the real `/templates` route.
      {
        id: 'platform-templates',
        label: 'layout.navTree.platform-templates',
        kind: 'group',
        children: [
          {
            id: 'platform-templates-editor',
            label: 'layout.navTree.platform-templates-editor',
            kind: 'view',
            route: '/templates',
          },
        ],
      },
    ],
  },

  // ── Domain 5 — Patient Portal (patient-only) ───────────────────────────
  // A patient's rail shows only this domain. Wrapped in a single "My Health"
  // group so the rail icon opens a flyout like every staff domain (KTD8); the
  // first leaf carries the existing `/patient` stub route (in
  // `BUILT_MODULE_ROUTES`) so a patient's role-resolved home `/patient` lands on
  // a real nav chain. Every node here is `audience: 'patient'` so the staff rail
  // never shows it and `filterTree` keeps the whole branch for a patient.
  {
    id: 'patient-portal',
    label: 'layout.navTree.patientPortal',
    icon: 'pi pi-user',
    kind: 'module',
    audience: 'patient',
    children: [
      {
        id: 'portal-my-health',
        label: 'layout.navTree.portal-my-health',
        kind: 'group',
        audience: 'patient',
        children: [
          {
            id: 'portal-home',
            label: 'layout.navTree.portal-home',
            kind: 'view',
            route: '/patient',
            audience: 'patient',
          },
          {
            id: 'portal-appointments',
            label: 'layout.navTree.portal-appointments',
            kind: 'view',
            route: '/patient/appointments',
            audience: 'patient',
          },
          {
            id: 'portal-results',
            label: 'layout.navTree.portal-results',
            kind: 'view',
            route: '/patient/results',
            audience: 'patient',
          },
          {
            id: 'portal-documents',
            label: 'layout.navTree.portal-documents',
            kind: 'view',
            route: '/patient/documents',
            audience: 'patient',
          },
          {
            id: 'portal-bills',
            label: 'layout.navTree.portal-bills',
            kind: 'view',
            route: '/patient/bills',
            audience: 'patient',
          },
          {
            id: 'portal-messaging',
            label: 'layout.navTree.portal-messaging',
            kind: 'view',
            route: '/patient/messaging',
            audience: 'patient',
          },
          {
            id: 'portal-consents',
            label: 'layout.navTree.portal-consents',
            kind: 'view',
            route: '/patient/consents',
            audience: 'patient',
          },
        ],
      },
    ],
  },
] as const;

/**
 * The rail tree shown while inside the System Admin console (the "elevated admin
 * view", origin R13). The rail swaps to this whenever the URL is under
 * `/system-admin`, so the console exposes its own sections — Users and
 * Environment (the email/webhook/storage/app-behavior system settings) — plus a
 * way back to the normal console. Reaching here is already admin-gated by the
 * route, so the nodes carry no extra role gate.
 */
export const ADMIN_NAV_TREE: readonly NavNode[] = [
  {
    id: 'admin-exit',
    label: 'layout.navTree.adminExit',
    icon: 'pi pi-arrow-left',
    route: '/',
    kind: 'module',
  },
  {
    id: 'admin-users',
    label: 'layout.navTree.adminUsers',
    icon: 'pi pi-users',
    route: '/system-admin/users',
    kind: 'module',
  },
  {
    id: 'admin-env',
    label: 'layout.navTree.adminEnv',
    icon: 'pi pi-server',
    route: '/system-admin/settings',
    kind: 'module',
  },
];

/** URL prefix that puts the console into the elevated admin view. */
export const SYSTEM_ADMIN_PREFIX = '/system-admin';

/** The role required to reach the System Admin console (admin gating). */
export const ADMIN_ROLE = RolesEnum.System.Admin;
