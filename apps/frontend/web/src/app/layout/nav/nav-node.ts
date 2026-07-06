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
    label: $localize`:@@layout.navTree.workspace:Espacio de trabajo`,
    icon: 'pi pi-th-large',
    route: '/workspace',
    kind: 'module',
    audience: 'staff',
  },

  // ── Domain 1 — Clinical ────────────────────────────────────────────────
  {
    id: 'clinical',
    label: $localize`:@@layout.navTree.clinical:Clínico`,
    icon: 'pi pi-heart',
    kind: 'module',
    audience: 'staff',
    children: [
      {
        id: 'clinical-patient-management',
        label: 'Patient Management',
        kind: 'group',
        children: [
          {
            id: 'clinical-pm-registration',
            label: 'Registration',
            kind: 'view',
            route: '/clinical/patient-management/registration',
          },
          {
            id: 'clinical-pm-mpi-merge',
            label: 'MPI / Merge',
            kind: 'view',
            route: '/clinical/patient-management/mpi-merge',
          },
          {
            id: 'clinical-pm-insurance',
            label: 'Insurance',
            kind: 'view',
            route: '/clinical/patient-management/insurance',
          },
          {
            id: 'clinical-pm-contacts',
            label: 'Contacts',
            kind: 'view',
            route: '/clinical/patient-management/contacts',
          },
          {
            id: 'clinical-pm-summary-timeline',
            label: 'Summary Timeline',
            kind: 'view',
            route: '/clinical/patient-management/summary-timeline',
          },
          {
            id: 'clinical-pm-linked-documents',
            label: 'Linked Documents',
            kind: 'view',
            route: '/clinical/patient-management/linked-documents',
          },
        ],
      },
      {
        id: 'clinical-adt',
        label: 'Patient Administration (ADT)',
        kind: 'group',
        children: [
          {
            id: 'clinical-adt-opd',
            label: 'OPD',
            kind: 'view',
            route: '/clinical/adt/opd',
          },
          {
            id: 'clinical-adt-ipd',
            label: 'IPD',
            kind: 'view',
            route: '/clinical/adt/ipd',
          },
          {
            id: 'clinical-adt-ed-triage',
            label: 'ED Triage',
            kind: 'view',
            route: '/clinical/adt/ed-triage',
          },
          {
            id: 'clinical-adt-beds-wards',
            label: 'Beds & Wards',
            kind: 'view',
            route: '/clinical/adt/beds-wards',
          },
          {
            id: 'clinical-adt-transfers',
            label: 'Transfers',
            kind: 'view',
            route: '/clinical/adt/transfers',
          },
          {
            id: 'clinical-adt-discharge',
            label: 'Discharge',
            kind: 'view',
            route: '/clinical/adt/discharge',
          },
        ],
      },
      {
        id: 'clinical-encounters',
        label: 'Encounters / EHR',
        kind: 'group',
        children: [
          {
            id: 'clinical-ehr-soap-notes',
            label: 'SOAP Notes',
            kind: 'view',
            route: '/clinical/encounters/soap-notes',
          },
          {
            id: 'clinical-ehr-vitals',
            label: 'Vitals',
            kind: 'view',
            route: '/clinical/encounters/vitals',
          },
          {
            id: 'clinical-ehr-diagnoses',
            label: 'Diagnoses (ICD)',
            kind: 'view',
            route: '/clinical/encounters/diagnoses',
          },
          {
            id: 'clinical-ehr-allergies',
            label: 'Allergies',
            kind: 'view',
            route: '/clinical/encounters/allergies',
          },
          {
            id: 'clinical-ehr-care-plans',
            label: 'Care Plans',
            kind: 'view',
            route: '/clinical/encounters/care-plans',
          },
          {
            id: 'clinical-ehr-procedures',
            label: 'Procedures',
            kind: 'view',
            route: '/clinical/encounters/procedures',
          },
          {
            id: 'clinical-ehr-immunizations',
            label: 'Immunizations',
            kind: 'view',
            route: '/clinical/encounters/immunizations',
          },
        ],
      },
      {
        id: 'clinical-orders',
        label: 'Orders / CPOE',
        kind: 'group',
        children: [
          {
            id: 'clinical-orders-lab',
            label: 'Lab Orders',
            kind: 'view',
            route: '/clinical/orders/lab',
          },
          {
            id: 'clinical-orders-imaging',
            label: 'Imaging Orders',
            kind: 'view',
            route: '/clinical/orders/imaging',
          },
          {
            id: 'clinical-orders-medication',
            label: 'Medication Orders',
            kind: 'view',
            route: '/clinical/orders/medication',
          },
          {
            id: 'clinical-orders-procedure',
            label: 'Procedure Orders',
            kind: 'view',
            route: '/clinical/orders/procedure',
          },
          {
            id: 'clinical-orders-order-sets',
            label: 'Order Sets',
            kind: 'view',
            route: '/clinical/orders/order-sets',
          },
          {
            id: 'clinical-orders-results-review',
            label: 'Results Review',
            kind: 'view',
            route: '/clinical/orders/results-review',
          },
        ],
      },
      {
        id: 'clinical-nursing',
        label: 'Nursing',
        kind: 'group',
        children: [
          {
            id: 'clinical-nursing-emar',
            label: 'eMAR',
            kind: 'view',
            route: '/clinical/nursing/emar',
          },
          {
            id: 'clinical-nursing-assessments',
            label: 'Assessments',
            kind: 'view',
            route: '/clinical/nursing/assessments',
          },
          {
            id: 'clinical-nursing-handover',
            label: 'Handover',
            kind: 'view',
            route: '/clinical/nursing/handover',
          },
          {
            id: 'clinical-nursing-care-tasks',
            label: 'Care Tasks',
            kind: 'view',
            route: '/clinical/nursing/care-tasks',
          },
        ],
      },
      {
        id: 'clinical-surgery',
        label: 'Surgery / Operating Theatre',
        kind: 'group',
        children: [
          {
            id: 'clinical-surgery-theatre-scheduling',
            label: 'Theatre Scheduling',
            kind: 'view',
            route: '/clinical/surgery/theatre-scheduling',
          },
          {
            id: 'clinical-surgery-peri-op',
            label: 'Peri-op',
            kind: 'view',
            route: '/clinical/surgery/peri-op',
          },
          {
            id: 'clinical-surgery-op-notes',
            label: 'Op Notes',
            kind: 'view',
            route: '/clinical/surgery/op-notes',
          },
        ],
      },
      {
        id: 'clinical-maternity',
        label: 'Maternity / Obstetrics',
        kind: 'group',
        children: [
          {
            id: 'clinical-maternity-antenatal',
            label: 'Antenatal',
            kind: 'view',
            route: '/clinical/maternity/antenatal',
          },
          {
            id: 'clinical-maternity-labor-delivery',
            label: 'Labor & Delivery',
            kind: 'view',
            route: '/clinical/maternity/labor-delivery',
          },
          {
            id: 'clinical-maternity-postnatal',
            label: 'Postnatal',
            kind: 'view',
            route: '/clinical/maternity/postnatal',
          },
          {
            id: 'clinical-maternity-newborn',
            label: 'Newborn',
            kind: 'view',
            route: '/clinical/maternity/newborn',
          },
        ],
      },
      {
        id: 'clinical-dietary',
        label: 'Dietary / Nutrition',
        kind: 'group',
        children: [
          {
            id: 'clinical-dietary-diet-orders',
            label: 'Diet Orders',
            kind: 'view',
            route: '/clinical/dietary/diet-orders',
          },
          {
            id: 'clinical-dietary-meal-planning',
            label: 'Meal Planning',
            kind: 'view',
            route: '/clinical/dietary/meal-planning',
          },
          {
            id: 'clinical-dietary-nutrition-assessments',
            label: 'Nutrition Assessments',
            kind: 'view',
            route: '/clinical/dietary/nutrition-assessments',
          },
        ],
      },
      {
        id: 'clinical-physiotherapy',
        label: 'Physiotherapy / Rehab',
        kind: 'group',
        children: [
          {
            id: 'clinical-physio-referrals',
            label: 'Referrals',
            kind: 'view',
            route: '/clinical/physiotherapy/referrals',
          },
          {
            id: 'clinical-physio-therapy-plans',
            label: 'Therapy Plans',
            kind: 'view',
            route: '/clinical/physiotherapy/therapy-plans',
          },
          {
            id: 'clinical-physio-session-tracking',
            label: 'Session Tracking',
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
    label: $localize`:@@layout.navTree.diagnostics:Diagnóstico y Terapéutica`,
    icon: 'pi pi-image',
    kind: 'module',
    audience: 'staff',
    children: [
      {
        id: 'diagnostics-laboratory',
        label: 'Laboratory (LIS)',
        kind: 'group',
        children: [
          {
            id: 'diagnostics-lab-test-catalog',
            label: 'Test Catalog',
            kind: 'view',
            route: '/diagnostics/laboratory/test-catalog',
          },
          {
            id: 'diagnostics-lab-order-intake',
            label: 'Order Intake',
            kind: 'view',
            route: '/diagnostics/laboratory/order-intake',
          },
          {
            id: 'diagnostics-lab-specimen-tracking',
            label: 'Specimen Tracking',
            kind: 'view',
            route: '/diagnostics/laboratory/specimen-tracking',
          },
          {
            id: 'diagnostics-lab-worklists',
            label: 'Worklists',
            kind: 'view',
            route: '/diagnostics/laboratory/worklists',
          },
          {
            id: 'diagnostics-lab-results',
            label: 'Results & Analyzers',
            kind: 'view',
            route: '/diagnostics/laboratory/results',
          },
          {
            id: 'diagnostics-lab-qc',
            label: 'QC',
            kind: 'view',
            route: '/diagnostics/laboratory/qc',
          },
        ],
      },
      {
        id: 'diagnostics-imaging',
        label: 'Radiology / Imaging',
        kind: 'group',
        children: [
          {
            id: 'diagnostics-imaging-order-intake',
            label: 'Order Intake',
            kind: 'view',
            route: '/diagnostics/imaging/order-intake',
          },
          {
            id: 'diagnostics-imaging-scheduling',
            label: 'Imaging Scheduling',
            kind: 'view',
            route: '/diagnostics/imaging/scheduling',
          },
          {
            id: 'diagnostics-imaging-dicom-worklist',
            label: 'DICOM Worklist',
            kind: 'view',
            route: '/diagnostics/imaging/dicom-worklist',
          },
          {
            id: 'diagnostics-imaging-acquisition',
            label: 'Acquisition',
            kind: 'view',
            route: '/diagnostics/imaging/acquisition',
          },
          {
            id: 'diagnostics-imaging-dicom-store',
            label: 'DICOM Store & Q/R',
            kind: 'view',
            route: '/diagnostics/imaging/dicom-store',
          },
          {
            id: 'diagnostics-imaging-viewer',
            label: 'Viewer',
            kind: 'view',
            route: '/diagnostics/imaging/viewer',
          },
          {
            id: 'diagnostics-imaging-reporting',
            label: 'Reporting',
            kind: 'view',
            route: '/diagnostics/imaging/reporting',
          },
        ],
      },
      {
        id: 'diagnostics-pharmacy',
        label: 'Pharmacy',
        kind: 'group',
        children: [
          {
            id: 'diagnostics-pharmacy-formulary',
            label: 'Formulary',
            kind: 'view',
            route: '/diagnostics/pharmacy/formulary',
          },
          {
            id: 'diagnostics-pharmacy-e-prescribing',
            label: 'e-Prescribing',
            kind: 'view',
            route: '/diagnostics/pharmacy/e-prescribing',
          },
          {
            id: 'diagnostics-pharmacy-dispensing',
            label: 'Dispensing',
            kind: 'view',
            route: '/diagnostics/pharmacy/dispensing',
          },
          {
            id: 'diagnostics-pharmacy-inpatient-supply',
            label: 'Inpatient Supply',
            kind: 'view',
            route: '/diagnostics/pharmacy/inpatient-supply',
          },
          {
            id: 'diagnostics-pharmacy-interaction-checks',
            label: 'Interaction Checks',
            kind: 'view',
            route: '/diagnostics/pharmacy/interaction-checks',
          },
          {
            id: 'diagnostics-pharmacy-stock',
            label: 'Stock',
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
    label: $localize`:@@layout.navTree.business:Negocio / ERP`,
    icon: 'pi pi-briefcase',
    kind: 'module',
    audience: 'staff',
    children: [
      {
        id: 'business-accounting',
        label: 'Accounting / Finance',
        kind: 'group',
        children: [
          {
            id: 'business-accounting-gl',
            label: 'General Ledger',
            kind: 'view',
            route: '/business/accounting/gl',
          },
          {
            id: 'business-accounting-ar',
            label: 'Accounts Receivable',
            kind: 'view',
            route: '/business/accounting/ar',
          },
          {
            id: 'business-accounting-ap',
            label: 'Accounts Payable',
            kind: 'view',
            route: '/business/accounting/ap',
          },
          {
            id: 'business-accounting-banking',
            label: 'Banking',
            kind: 'view',
            route: '/business/accounting/banking',
          },
          {
            id: 'business-accounting-cost-centers',
            label: 'Cost Centers & Budgets',
            kind: 'view',
            route: '/business/accounting/cost-centers',
          },
          {
            id: 'business-accounting-reports',
            label: 'Reports',
            kind: 'view',
            route: '/business/accounting/reports',
          },
          {
            id: 'business-accounting-taxes',
            label: 'Taxes',
            kind: 'view',
            route: '/business/accounting/taxes',
          },
        ],
      },
      {
        id: 'business-billing',
        label: 'Billing & Revenue Cycle',
        kind: 'group',
        children: [
          {
            id: 'business-billing-charge-capture',
            label: 'Charge Capture',
            kind: 'view',
            route: '/business/billing/charge-capture',
          },
          {
            id: 'business-billing-invoicing',
            label: 'Invoicing & Co-pay',
            kind: 'view',
            route: '/business/billing/invoicing',
          },
          {
            id: 'business-billing-claims',
            label: 'Claims & Pre-auth',
            kind: 'view',
            route: '/business/billing/claims',
          },
          {
            id: 'business-billing-payments',
            label: 'Payments',
            kind: 'view',
            route: '/business/billing/payments',
          },
          {
            id: 'business-billing-tariffs',
            label: 'Tariffs',
            kind: 'view',
            route: '/business/billing/tariffs',
          },
        ],
      },
      {
        id: 'business-inventory',
        label: 'Inventory / Materials',
        kind: 'group',
        children: [
          {
            id: 'business-inventory-item-master',
            label: 'Item Master',
            kind: 'view',
            route: '/business/inventory/item-master',
          },
          {
            id: 'business-inventory-stock',
            label: 'Multi-store Stock',
            kind: 'view',
            route: '/business/inventory/stock',
          },
          {
            id: 'business-inventory-batch-expiry',
            label: 'Batch & Expiry',
            kind: 'view',
            route: '/business/inventory/batch-expiry',
          },
          {
            id: 'business-inventory-requisitions',
            label: 'Requisitions',
            kind: 'view',
            route: '/business/inventory/requisitions',
          },
          {
            id: 'business-inventory-par-levels',
            label: 'Par Levels',
            kind: 'view',
            route: '/business/inventory/par-levels',
          },
          {
            id: 'business-inventory-counts',
            label: 'Counts',
            kind: 'view',
            route: '/business/inventory/counts',
          },
        ],
      },
      {
        id: 'business-procurement',
        label: 'Procurement',
        kind: 'group',
        children: [
          {
            id: 'business-procurement-suppliers',
            label: 'Suppliers',
            kind: 'view',
            route: '/business/procurement/suppliers',
          },
          {
            id: 'business-procurement-requisitions',
            label: 'Requisitions',
            kind: 'view',
            route: '/business/procurement/requisitions',
          },
          {
            id: 'business-procurement-purchase-orders',
            label: 'Purchase Orders',
            kind: 'view',
            route: '/business/procurement/purchase-orders',
          },
          {
            id: 'business-procurement-goods-receipt',
            label: 'Goods Receipt',
            kind: 'view',
            route: '/business/procurement/goods-receipt',
          },
        ],
      },
      {
        id: 'business-assets',
        label: 'Assets / Biomedical',
        kind: 'group',
        children: [
          {
            id: 'business-assets-register',
            label: 'Asset Register',
            kind: 'view',
            route: '/business/assets/register',
          },
          {
            id: 'business-assets-preventive-maintenance',
            label: 'Preventive Maintenance',
            kind: 'view',
            route: '/business/assets/preventive-maintenance',
          },
          {
            id: 'business-assets-warranties',
            label: 'Warranties',
            kind: 'view',
            route: '/business/assets/warranties',
          },
          {
            id: 'business-assets-work-orders',
            label: 'Work Orders',
            kind: 'view',
            route: '/business/assets/work-orders',
          },
          {
            id: 'business-assets-calibration',
            label: 'Calibration',
            kind: 'view',
            route: '/business/assets/calibration',
          },
        ],
      },
      {
        id: 'business-hr',
        label: 'HR & Payroll',
        kind: 'group',
        children: [
          {
            id: 'business-hr-employee-records',
            label: 'Employee Records',
            kind: 'view',
            route: '/business/hr/employee-records',
          },
          {
            id: 'business-hr-recruitment',
            label: 'Recruitment',
            kind: 'view',
            route: '/business/hr/recruitment',
          },
          {
            id: 'business-hr-attendance-leave',
            label: 'Attendance & Leave',
            kind: 'view',
            route: '/business/hr/attendance-leave',
          },
          {
            id: 'business-hr-rostering',
            label: 'Rostering',
            kind: 'view',
            route: '/business/hr/rostering',
          },
          {
            id: 'business-hr-payroll',
            label: 'Payroll',
            kind: 'view',
            route: '/business/hr/payroll',
          },
          {
            id: 'business-hr-appraisals',
            label: 'Appraisals',
            kind: 'view',
            route: '/business/hr/appraisals',
          },
          {
            id: 'business-hr-credentialing',
            label: 'Credentialing',
            kind: 'view',
            route: '/business/hr/credentialing',
          },
        ],
      },
      {
        id: 'business-crm',
        label: 'CRM / Marketing',
        kind: 'group',
        children: [
          {
            id: 'business-crm-engagement',
            label: 'Engagement',
            kind: 'view',
            route: '/business/crm/engagement',
          },
          {
            id: 'business-crm-campaigns',
            label: 'Campaigns',
            kind: 'view',
            route: '/business/crm/campaigns',
          },
          {
            id: 'business-crm-referrals',
            label: 'Referral Management',
            kind: 'view',
            route: '/business/crm/referrals',
          },
          {
            id: 'business-crm-feedback',
            label: 'Feedback & Surveys',
            kind: 'view',
            route: '/business/crm/feedback',
          },
          {
            id: 'business-crm-leads',
            label: 'Leads',
            kind: 'view',
            route: '/business/crm/leads',
          },
        ],
      },
      {
        id: 'business-projects',
        label: 'Projects',
        kind: 'group',
        children: [
          {
            id: 'business-projects-tasks',
            label: 'Projects & Tasks',
            kind: 'view',
            route: '/business/projects/tasks',
          },
          {
            id: 'business-projects-milestones',
            label: 'Milestones',
            kind: 'view',
            route: '/business/projects/milestones',
          },
          {
            id: 'business-projects-timesheets',
            label: 'Timesheets',
            kind: 'view',
            route: '/business/projects/timesheets',
          },
          {
            id: 'business-projects-costing',
            label: 'Costing & Budgets',
            kind: 'view',
            route: '/business/projects/costing',
          },
          {
            id: 'business-projects-billing',
            label: 'Project Billing',
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
    label: $localize`:@@layout.navTree.governance:Gobernanza y Soporte`,
    icon: 'pi pi-shield',
    kind: 'module',
    audience: 'staff',
    children: [
      {
        id: 'governance-quality',
        label: 'Quality & Compliance',
        kind: 'group',
        children: [
          {
            id: 'governance-quality-incidents',
            label: 'Incidents',
            kind: 'view',
            route: '/governance/quality/incidents',
          },
          {
            id: 'governance-quality-audits',
            label: 'Audits',
            kind: 'view',
            route: '/governance/quality/audits',
          },
          {
            id: 'governance-quality-accreditation',
            label: 'Accreditation',
            kind: 'view',
            route: '/governance/quality/accreditation',
          },
          {
            id: 'governance-quality-capa',
            label: 'CAPA',
            kind: 'view',
            route: '/governance/quality/capa',
          },
          {
            id: 'governance-quality-sop-control',
            label: 'SOP / Document Control',
            kind: 'view',
            route: '/governance/quality/sop-control',
          },
          {
            id: 'governance-quality-risk-register',
            label: 'Risk Register',
            kind: 'view',
            route: '/governance/quality/risk-register',
          },
        ],
      },
      {
        id: 'governance-legal',
        label: 'Legal / Medico-legal',
        kind: 'group',
        children: [
          {
            id: 'governance-legal-consents',
            label: 'Consents',
            kind: 'view',
            route: '/governance/legal/consents',
          },
          {
            id: 'governance-legal-cases',
            label: 'Medico-legal Cases',
            kind: 'view',
            route: '/governance/legal/cases',
          },
          {
            id: 'governance-legal-contracts',
            label: 'Contracts',
            kind: 'view',
            route: '/governance/legal/contracts',
          },
          {
            id: 'governance-legal-regulatory',
            label: 'Regulatory',
            kind: 'view',
            route: '/governance/legal/regulatory',
          },
        ],
      },
      {
        id: 'governance-research',
        label: 'Research',
        kind: 'group',
        children: [
          {
            id: 'governance-research-studies',
            label: 'Studies & Trials',
            kind: 'view',
            route: '/governance/research/studies',
          },
          {
            id: 'governance-research-cohorts',
            label: 'Cohorts',
            kind: 'view',
            route: '/governance/research/cohorts',
          },
          {
            id: 'governance-research-ethics',
            label: 'Ethics / IRB',
            kind: 'view',
            route: '/governance/research/ethics',
          },
          {
            id: 'governance-research-data-capture',
            label: 'Data Capture',
            kind: 'view',
            route: '/governance/research/data-capture',
          },
        ],
      },
      {
        id: 'governance-social-work',
        label: 'Social Work',
        kind: 'group',
        children: [
          {
            id: 'governance-social-case-management',
            label: 'Case Management',
            kind: 'view',
            route: '/governance/social-work/case-management',
          },
          {
            id: 'governance-social-advocacy',
            label: 'Advocacy',
            kind: 'view',
            route: '/governance/social-work/advocacy',
          },
          {
            id: 'governance-social-financial-assistance',
            label: 'Financial Assistance',
            kind: 'view',
            route: '/governance/social-work/financial-assistance',
          },
          {
            id: 'governance-social-discharge-support',
            label: 'Discharge Support',
            kind: 'view',
            route: '/governance/social-work/discharge-support',
          },
        ],
      },
      {
        id: 'governance-helpdesk',
        label: 'Helpdesk / Support',
        kind: 'group',
        children: [
          {
            id: 'governance-helpdesk-patient-queries',
            label: 'Patient Queries',
            kind: 'view',
            route: '/governance/helpdesk/patient-queries',
          },
          {
            id: 'governance-helpdesk-internal-tickets',
            label: 'Internal Tickets',
            kind: 'view',
            route: '/governance/helpdesk/internal-tickets',
          },
          {
            id: 'governance-helpdesk-issue-tracking',
            label: 'Issue Tracking',
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
    label: $localize`:@@layout.navTree.platform:Plataforma`,
    icon: 'pi pi-cog',
    kind: 'module',
    audience: 'staff',
    children: [
      {
        id: 'platform-scheduling',
        label: 'Scheduling / Appointments',
        kind: 'group',
        children: [
          {
            id: 'platform-scheduling-booking',
            label: 'Booking Engine',
            kind: 'view',
            route: '/platform/scheduling/booking',
          },
          {
            id: 'platform-scheduling-reminders',
            label: 'Reminders',
            kind: 'view',
            route: '/platform/scheduling/reminders',
          },
          {
            id: 'platform-scheduling-calendar',
            label: 'Calendar',
            kind: 'view',
            route: '/platform/scheduling/calendar',
          },
        ],
      },
      {
        id: 'platform-reporting',
        label: 'Reporting / Analytics / BI',
        kind: 'group',
        children: [
          {
            id: 'platform-reporting-operational',
            label: 'Operational Dashboards',
            kind: 'view',
            route: '/platform/reporting/operational',
          },
          {
            id: 'platform-reporting-clinical',
            label: 'Clinical Dashboards',
            kind: 'view',
            route: '/platform/reporting/clinical',
          },
          {
            id: 'platform-reporting-kpis',
            label: 'KPIs',
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
        label: 'Documents',
        kind: 'group',
        children: [
          {
            id: 'platform-documents-files',
            label: 'Documents',
            kind: 'view',
            route: '/documents',
          },
        ],
      },
      // Templates & Communications — built (R34). Same single-view-group treatment
      // over the real `/templates` route.
      {
        id: 'platform-templates',
        label: 'Templates & Communications',
        kind: 'group',
        children: [
          {
            id: 'platform-templates-editor',
            label: 'Templates',
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
    label: $localize`:@@layout.navTree.patientPortal:Portal del Paciente`,
    icon: 'pi pi-user',
    kind: 'module',
    audience: 'patient',
    children: [
      {
        id: 'portal-my-health',
        label: 'My Health',
        kind: 'group',
        audience: 'patient',
        children: [
          {
            id: 'portal-home',
            label: 'Home',
            kind: 'view',
            route: '/patient',
            audience: 'patient',
          },
          {
            id: 'portal-appointments',
            label: 'Appointments',
            kind: 'view',
            route: '/patient/appointments',
            audience: 'patient',
          },
          {
            id: 'portal-results',
            label: 'Results',
            kind: 'view',
            route: '/patient/results',
            audience: 'patient',
          },
          {
            id: 'portal-documents',
            label: 'Documents',
            kind: 'view',
            route: '/patient/documents',
            audience: 'patient',
          },
          {
            id: 'portal-bills',
            label: 'Bills',
            kind: 'view',
            route: '/patient/bills',
            audience: 'patient',
          },
          {
            id: 'portal-messaging',
            label: 'Messaging',
            kind: 'view',
            route: '/patient/messaging',
            audience: 'patient',
          },
          {
            id: 'portal-consents',
            label: 'Consents',
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
    label: $localize`:@@layout.navTree.adminExit:Volver a la consola`,
    icon: 'pi pi-arrow-left',
    route: '/',
    kind: 'module',
  },
  {
    id: 'admin-users',
    label: $localize`:@@layout.navTree.adminUsers:Usuarios`,
    icon: 'pi pi-users',
    route: '/system-admin/users',
    kind: 'module',
  },
  {
    id: 'admin-env',
    label: $localize`:@@layout.navTree.adminEnv:Entorno`,
    icon: 'pi pi-server',
    route: '/system-admin/settings',
    kind: 'module',
  },
];

/** URL prefix that puts the console into the elevated admin view. */
export const SYSTEM_ADMIN_PREFIX = '/system-admin';

/** The role required to reach the System Admin console (admin gating). */
export const ADMIN_ROLE = RolesEnum.System.Admin;
