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
        label: $localize`:@@layout.navTree.clinical-patient-management:Pacientes`,
        kind: 'group',
        children: [
          {
            id: 'clinical-pm-registration',
            label: $localize`:@@layout.navTree.clinical-pm-registration:Registro`,
            kind: 'view',
            route: '/clinical/patient-management/registration',
          },
          {
            id: 'clinical-pm-mpi-merge',
            label: $localize`:@@layout.navTree.clinical-pm-mpi-merge:Fusión`,
            kind: 'view',
            route: '/clinical/patient-management/mpi-merge',
          },
          {
            id: 'clinical-pm-insurance',
            label: $localize`:@@layout.navTree.clinical-pm-insurance:Seguro`,
            kind: 'view',
            route: '/clinical/patient-management/insurance',
          },
          {
            id: 'clinical-pm-contacts',
            label: $localize`:@@layout.navTree.clinical-pm-contacts:Contactos`,
            kind: 'view',
            route: '/clinical/patient-management/contacts',
          },
          {
            id: 'clinical-pm-summary-timeline',
            label: $localize`:@@layout.navTree.clinical-pm-summary-timeline:Cronología`,
            kind: 'view',
            route: '/clinical/patient-management/summary-timeline',
          },
          {
            id: 'clinical-pm-linked-documents',
            label: $localize`:@@layout.navTree.clinical-pm-linked-documents:Documentos`,
            kind: 'view',
            route: '/clinical/patient-management/linked-documents',
          },
        ],
      },
      {
        id: 'clinical-adt',
        label: $localize`:@@layout.navTree.clinical-adt:Admisiones`,
        kind: 'group',
        children: [
          {
            id: 'clinical-adt-opd',
            label: $localize`:@@layout.navTree.clinical-adt-opd:OPD`,
            kind: 'view',
            route: '/clinical/adt/opd',
          },
          {
            id: 'clinical-adt-ipd',
            label: $localize`:@@layout.navTree.clinical-adt-ipd:IPD`,
            kind: 'view',
            route: '/clinical/adt/ipd',
          },
          {
            id: 'clinical-adt-ed-triage',
            label: $localize`:@@layout.navTree.clinical-adt-ed-triage:Triaje`,
            kind: 'view',
            route: '/clinical/adt/ed-triage',
          },
          {
            id: 'clinical-adt-beds-wards',
            label: $localize`:@@layout.navTree.clinical-adt-beds-wards:Camas`,
            kind: 'view',
            route: '/clinical/adt/beds-wards',
          },
          {
            id: 'clinical-adt-transfers',
            label: $localize`:@@layout.navTree.clinical-adt-transfers:Traslados`,
            kind: 'view',
            route: '/clinical/adt/transfers',
          },
          {
            id: 'clinical-adt-discharge',
            label: $localize`:@@layout.navTree.clinical-adt-discharge:Altas`,
            kind: 'view',
            route: '/clinical/adt/discharge',
          },
        ],
      },
      {
        id: 'clinical-encounters',
        label: $localize`:@@layout.navTree.clinical-encounters:Encuentros`,
        kind: 'group',
        children: [
          {
            id: 'clinical-ehr-soap-notes',
            label: $localize`:@@layout.navTree.clinical-ehr-soap-notes:Notas`,
            kind: 'view',
            route: '/clinical/encounters/soap-notes',
          },
          {
            id: 'clinical-ehr-vitals',
            label: $localize`:@@layout.navTree.clinical-ehr-vitals:Signos`,
            kind: 'view',
            route: '/clinical/encounters/vitals',
          },
          {
            id: 'clinical-ehr-diagnoses',
            label: $localize`:@@layout.navTree.clinical-ehr-diagnoses:Diagnósticos`,
            kind: 'view',
            route: '/clinical/encounters/diagnoses',
          },
          {
            id: 'clinical-ehr-allergies',
            label: $localize`:@@layout.navTree.clinical-ehr-allergies:Alergias`,
            kind: 'view',
            route: '/clinical/encounters/allergies',
          },
          {
            id: 'clinical-ehr-care-plans',
            label: $localize`:@@layout.navTree.clinical-ehr-care-plans:Planes`,
            kind: 'view',
            route: '/clinical/encounters/care-plans',
          },
          {
            id: 'clinical-ehr-procedures',
            label: $localize`:@@layout.navTree.clinical-ehr-procedures:Procedimientos`,
            kind: 'view',
            route: '/clinical/encounters/procedures',
          },
          {
            id: 'clinical-ehr-immunizations',
            label: $localize`:@@layout.navTree.clinical-ehr-immunizations:Inmunizaciones`,
            kind: 'view',
            route: '/clinical/encounters/immunizations',
          },
        ],
      },
      {
        id: 'clinical-orders',
        label: $localize`:@@layout.navTree.clinical-orders:Órdenes`,
        kind: 'group',
        children: [
          {
            id: 'clinical-orders-lab',
            label: $localize`:@@layout.navTree.clinical-orders-lab:Laboratorio`,
            kind: 'view',
            route: '/clinical/orders/lab',
          },
          {
            id: 'clinical-orders-imaging',
            label: $localize`:@@layout.navTree.clinical-orders-imaging:Imágenes`,
            kind: 'view',
            route: '/clinical/orders/imaging',
          },
          {
            id: 'clinical-orders-medication',
            label: $localize`:@@layout.navTree.clinical-orders-medication:Medicación`,
            kind: 'view',
            route: '/clinical/orders/medication',
          },
          {
            id: 'clinical-orders-procedure',
            label: $localize`:@@layout.navTree.clinical-orders-procedure:Procedimientos`,
            kind: 'view',
            route: '/clinical/orders/procedure',
          },
          {
            id: 'clinical-orders-order-sets',
            label: $localize`:@@layout.navTree.clinical-orders-order-sets:Conjuntos`,
            kind: 'view',
            route: '/clinical/orders/order-sets',
          },
          {
            id: 'clinical-orders-results-review',
            label: $localize`:@@layout.navTree.clinical-orders-results-review:Resultados`,
            kind: 'view',
            route: '/clinical/orders/results-review',
          },
        ],
      },
      {
        id: 'clinical-nursing',
        label: $localize`:@@layout.navTree.clinical-nursing:Enfermería`,
        kind: 'group',
        children: [
          {
            id: 'clinical-nursing-emar',
            label: $localize`:@@layout.navTree.clinical-nursing-emar:eMAR`,
            kind: 'view',
            route: '/clinical/nursing/emar',
          },
          {
            id: 'clinical-nursing-assessments',
            label: $localize`:@@layout.navTree.clinical-nursing-assessments:Evaluaciones`,
            kind: 'view',
            route: '/clinical/nursing/assessments',
          },
          {
            id: 'clinical-nursing-handover',
            label: $localize`:@@layout.navTree.clinical-nursing-handover:Relevo`,
            kind: 'view',
            route: '/clinical/nursing/handover',
          },
          {
            id: 'clinical-nursing-care-tasks',
            label: $localize`:@@layout.navTree.clinical-nursing-care-tasks:Tareas`,
            kind: 'view',
            route: '/clinical/nursing/care-tasks',
          },
        ],
      },
      {
        id: 'clinical-surgery',
        label: $localize`:@@layout.navTree.clinical-surgery:Cirugía`,
        kind: 'group',
        children: [
          {
            id: 'clinical-surgery-theatre-scheduling',
            label: $localize`:@@layout.navTree.clinical-surgery-theatre-scheduling:Programación`,
            kind: 'view',
            route: '/clinical/surgery/theatre-scheduling',
          },
          {
            id: 'clinical-surgery-peri-op',
            label: $localize`:@@layout.navTree.clinical-surgery-peri-op:Perioperatorio`,
            kind: 'view',
            route: '/clinical/surgery/peri-op',
          },
          {
            id: 'clinical-surgery-op-notes',
            label: $localize`:@@layout.navTree.clinical-surgery-op-notes:Notas`,
            kind: 'view',
            route: '/clinical/surgery/op-notes',
          },
        ],
      },
      {
        id: 'clinical-maternity',
        label: $localize`:@@layout.navTree.clinical-maternity:Maternidad`,
        kind: 'group',
        children: [
          {
            id: 'clinical-maternity-antenatal',
            label: $localize`:@@layout.navTree.clinical-maternity-antenatal:Prenatal`,
            kind: 'view',
            route: '/clinical/maternity/antenatal',
          },
          {
            id: 'clinical-maternity-labor-delivery',
            label: $localize`:@@layout.navTree.clinical-maternity-labor-delivery:Parto`,
            kind: 'view',
            route: '/clinical/maternity/labor-delivery',
          },
          {
            id: 'clinical-maternity-postnatal',
            label: $localize`:@@layout.navTree.clinical-maternity-postnatal:Posparto`,
            kind: 'view',
            route: '/clinical/maternity/postnatal',
          },
          {
            id: 'clinical-maternity-newborn',
            label: $localize`:@@layout.navTree.clinical-maternity-newborn:Neonatos`,
            kind: 'view',
            route: '/clinical/maternity/newborn',
          },
        ],
      },
      {
        id: 'clinical-dietary',
        label: $localize`:@@layout.navTree.clinical-dietary:Nutrición`,
        kind: 'group',
        children: [
          {
            id: 'clinical-dietary-diet-orders',
            label: $localize`:@@layout.navTree.clinical-dietary-diet-orders:Dietas`,
            kind: 'view',
            route: '/clinical/dietary/diet-orders',
          },
          {
            id: 'clinical-dietary-meal-planning',
            label: $localize`:@@layout.navTree.clinical-dietary-meal-planning:Menús`,
            kind: 'view',
            route: '/clinical/dietary/meal-planning',
          },
          {
            id: 'clinical-dietary-nutrition-assessments',
            label: $localize`:@@layout.navTree.clinical-dietary-nutrition-assessments:Evaluaciones`,
            kind: 'view',
            route: '/clinical/dietary/nutrition-assessments',
          },
        ],
      },
      {
        id: 'clinical-physiotherapy',
        label: $localize`:@@layout.navTree.clinical-physiotherapy:Fisioterapia`,
        kind: 'group',
        children: [
          {
            id: 'clinical-physio-referrals',
            label: $localize`:@@layout.navTree.clinical-physio-referrals:Referencias`,
            kind: 'view',
            route: '/clinical/physiotherapy/referrals',
          },
          {
            id: 'clinical-physio-therapy-plans',
            label: $localize`:@@layout.navTree.clinical-physio-therapy-plans:Terapias`,
            kind: 'view',
            route: '/clinical/physiotherapy/therapy-plans',
          },
          {
            id: 'clinical-physio-session-tracking',
            label: $localize`:@@layout.navTree.clinical-physio-session-tracking:Sesiones`,
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
        label: $localize`:@@layout.navTree.diagnostics-laboratory:Laboratorio`,
        kind: 'group',
        children: [
          {
            id: 'diagnostics-lab-test-catalog',
            label: $localize`:@@layout.navTree.diagnostics-lab-test-catalog:Catálogo`,
            kind: 'view',
            route: '/diagnostics/laboratory/test-catalog',
          },
          {
            id: 'diagnostics-lab-order-intake',
            label: $localize`:@@layout.navTree.diagnostics-lab-order-intake:Recepción`,
            kind: 'view',
            route: '/diagnostics/laboratory/order-intake',
          },
          {
            id: 'diagnostics-lab-specimen-tracking',
            label: $localize`:@@layout.navTree.diagnostics-lab-specimen-tracking:Muestras`,
            kind: 'view',
            route: '/diagnostics/laboratory/specimen-tracking',
          },
          {
            id: 'diagnostics-lab-worklists',
            label: $localize`:@@layout.navTree.diagnostics-lab-worklists:Listas`,
            kind: 'view',
            route: '/diagnostics/laboratory/worklists',
          },
          {
            id: 'diagnostics-lab-results',
            label: $localize`:@@layout.navTree.diagnostics-lab-results:Resultados`,
            kind: 'view',
            route: '/diagnostics/laboratory/results',
          },
          {
            id: 'diagnostics-lab-qc',
            label: $localize`:@@layout.navTree.diagnostics-lab-qc:Calidad`,
            kind: 'view',
            route: '/diagnostics/laboratory/qc',
          },
        ],
      },
      {
        id: 'diagnostics-imaging',
        label: $localize`:@@layout.navTree.diagnostics-imaging:Imágenes`,
        kind: 'group',
        children: [
          {
            id: 'diagnostics-imaging-order-intake',
            label: $localize`:@@layout.navTree.diagnostics-imaging-order-intake:Recepción`,
            kind: 'view',
            route: '/diagnostics/imaging/order-intake',
          },
          {
            id: 'diagnostics-imaging-scheduling',
            label: $localize`:@@layout.navTree.diagnostics-imaging-scheduling:Programación`,
            kind: 'view',
            route: '/diagnostics/imaging/scheduling',
          },
          {
            id: 'diagnostics-imaging-dicom-worklist',
            label: $localize`:@@layout.navTree.diagnostics-imaging-dicom-worklist:DICOM`,
            kind: 'view',
            route: '/diagnostics/imaging/dicom-worklist',
          },
          {
            id: 'diagnostics-imaging-acquisition',
            label: $localize`:@@layout.navTree.diagnostics-imaging-acquisition:Adquisición`,
            kind: 'view',
            route: '/diagnostics/imaging/acquisition',
          },
          {
            id: 'diagnostics-imaging-dicom-store',
            label: $localize`:@@layout.navTree.diagnostics-imaging-dicom-store:DICOM`,
            kind: 'view',
            route: '/diagnostics/imaging/dicom-store',
          },
          {
            id: 'diagnostics-imaging-viewer',
            label: $localize`:@@layout.navTree.diagnostics-imaging-viewer:Visor`,
            kind: 'view',
            route: '/diagnostics/imaging/viewer',
          },
          {
            id: 'diagnostics-imaging-reporting',
            label: $localize`:@@layout.navTree.diagnostics-imaging-reporting:Informes`,
            kind: 'view',
            route: '/diagnostics/imaging/reporting',
          },
        ],
      },
      {
        id: 'diagnostics-pharmacy',
        label: $localize`:@@layout.navTree.diagnostics-pharmacy:Farmacia`,
        kind: 'group',
        children: [
          {
            id: 'diagnostics-pharmacy-formulary',
            label: $localize`:@@layout.navTree.diagnostics-pharmacy-formulary:Formulario`,
            kind: 'view',
            route: '/diagnostics/pharmacy/formulary',
          },
          {
            id: 'diagnostics-pharmacy-e-prescribing',
            label: $localize`:@@layout.navTree.diagnostics-pharmacy-e-prescribing:Recetas`,
            kind: 'view',
            route: '/diagnostics/pharmacy/e-prescribing',
          },
          {
            id: 'diagnostics-pharmacy-dispensing',
            label: $localize`:@@layout.navTree.diagnostics-pharmacy-dispensing:Dispensación`,
            kind: 'view',
            route: '/diagnostics/pharmacy/dispensing',
          },
          {
            id: 'diagnostics-pharmacy-inpatient-supply',
            label: $localize`:@@layout.navTree.diagnostics-pharmacy-inpatient-supply:Suministro`,
            kind: 'view',
            route: '/diagnostics/pharmacy/inpatient-supply',
          },
          {
            id: 'diagnostics-pharmacy-interaction-checks',
            label: $localize`:@@layout.navTree.diagnostics-pharmacy-interaction-checks:Interacciones`,
            kind: 'view',
            route: '/diagnostics/pharmacy/interaction-checks',
          },
          {
            id: 'diagnostics-pharmacy-stock',
            label: $localize`:@@layout.navTree.diagnostics-pharmacy-stock:Existencias`,
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
        label: $localize`:@@layout.navTree.business-accounting:Contabilidad`,
        kind: 'group',
        children: [
          {
            id: 'business-accounting-gl',
            label: $localize`:@@layout.navTree.business-accounting-gl:Mayor`,
            kind: 'view',
            route: '/business/accounting/gl',
          },
          {
            id: 'business-accounting-ar',
            label: $localize`:@@layout.navTree.business-accounting-ar:Cobros`,
            kind: 'view',
            route: '/business/accounting/ar',
          },
          {
            id: 'business-accounting-ap',
            label: $localize`:@@layout.navTree.business-accounting-ap:Adeudos`,
            kind: 'view',
            route: '/business/accounting/ap',
          },
          {
            id: 'business-accounting-banking',
            label: $localize`:@@layout.navTree.business-accounting-banking:Bancos`,
            kind: 'view',
            route: '/business/accounting/banking',
          },
          {
            id: 'business-accounting-cost-centers',
            label: $localize`:@@layout.navTree.business-accounting-cost-centers:Presupuestos`,
            kind: 'view',
            route: '/business/accounting/cost-centers',
          },
          {
            id: 'business-accounting-reports',
            label: $localize`:@@layout.navTree.business-accounting-reports:Informes`,
            kind: 'view',
            route: '/business/accounting/reports',
          },
          {
            id: 'business-accounting-taxes',
            label: $localize`:@@layout.navTree.business-accounting-taxes:Impuestos`,
            kind: 'view',
            route: '/business/accounting/taxes',
          },
        ],
      },
      {
        id: 'business-billing',
        label: $localize`:@@layout.navTree.business-billing:Facturación`,
        kind: 'group',
        children: [
          {
            id: 'business-billing-charge-capture',
            label: $localize`:@@layout.navTree.business-billing-charge-capture:Cargos`,
            kind: 'view',
            route: '/business/billing/charge-capture',
          },
          {
            id: 'business-billing-invoicing',
            label: $localize`:@@layout.navTree.business-billing-invoicing:Facturas`,
            kind: 'view',
            route: '/business/billing/invoicing',
          },
          {
            id: 'business-billing-claims',
            label: $localize`:@@layout.navTree.business-billing-claims:Reclamaciones`,
            kind: 'view',
            route: '/business/billing/claims',
          },
          {
            id: 'business-billing-payments',
            label: $localize`:@@layout.navTree.business-billing-payments:Pagos`,
            kind: 'view',
            route: '/business/billing/payments',
          },
          {
            id: 'business-billing-tariffs',
            label: $localize`:@@layout.navTree.business-billing-tariffs:Tarifas`,
            kind: 'view',
            route: '/business/billing/tariffs',
          },
        ],
      },
      {
        id: 'business-inventory',
        label: $localize`:@@layout.navTree.business-inventory:Inventario`,
        kind: 'group',
        children: [
          {
            id: 'business-inventory-item-master',
            label: $localize`:@@layout.navTree.business-inventory-item-master:Artículos`,
            kind: 'view',
            route: '/business/inventory/item-master',
          },
          {
            id: 'business-inventory-stock',
            label: $localize`:@@layout.navTree.business-inventory-stock:Existencias`,
            kind: 'view',
            route: '/business/inventory/stock',
          },
          {
            id: 'business-inventory-batch-expiry',
            label: $localize`:@@layout.navTree.business-inventory-batch-expiry:Lotes`,
            kind: 'view',
            route: '/business/inventory/batch-expiry',
          },
          {
            id: 'business-inventory-requisitions',
            label: $localize`:@@layout.navTree.business-inventory-requisitions:Requisiciones`,
            kind: 'view',
            route: '/business/inventory/requisitions',
          },
          {
            id: 'business-inventory-par-levels',
            label: $localize`:@@layout.navTree.business-inventory-par-levels:Niveles`,
            kind: 'view',
            route: '/business/inventory/par-levels',
          },
          {
            id: 'business-inventory-counts',
            label: $localize`:@@layout.navTree.business-inventory-counts:Conteos`,
            kind: 'view',
            route: '/business/inventory/counts',
          },
        ],
      },
      {
        id: 'business-procurement',
        label: $localize`:@@layout.navTree.business-procurement:Compras`,
        kind: 'group',
        children: [
          {
            id: 'business-procurement-suppliers',
            label: $localize`:@@layout.navTree.business-procurement-suppliers:Proveedores`,
            kind: 'view',
            route: '/business/procurement/suppliers',
          },
          {
            id: 'business-procurement-requisitions',
            label: $localize`:@@layout.navTree.business-procurement-requisitions:Requisiciones`,
            kind: 'view',
            route: '/business/procurement/requisitions',
          },
          {
            id: 'business-procurement-purchase-orders',
            label: $localize`:@@layout.navTree.business-procurement-purchase-orders:Órdenes`,
            kind: 'view',
            route: '/business/procurement/purchase-orders',
          },
          {
            id: 'business-procurement-goods-receipt',
            label: $localize`:@@layout.navTree.business-procurement-goods-receipt:Recibo`,
            kind: 'view',
            route: '/business/procurement/goods-receipt',
          },
        ],
      },
      {
        id: 'business-assets',
        label: $localize`:@@layout.navTree.business-assets:Activos`,
        kind: 'group',
        children: [
          {
            id: 'business-assets-register',
            label: $localize`:@@layout.navTree.business-assets-register:Inventario`,
            kind: 'view',
            route: '/business/assets/register',
          },
          {
            id: 'business-assets-preventive-maintenance',
            label: $localize`:@@layout.navTree.business-assets-preventive-maintenance:Mantenimiento`,
            kind: 'view',
            route: '/business/assets/preventive-maintenance',
          },
          {
            id: 'business-assets-warranties',
            label: $localize`:@@layout.navTree.business-assets-warranties:Garantías`,
            kind: 'view',
            route: '/business/assets/warranties',
          },
          {
            id: 'business-assets-work-orders',
            label: $localize`:@@layout.navTree.business-assets-work-orders:Órdenes`,
            kind: 'view',
            route: '/business/assets/work-orders',
          },
          {
            id: 'business-assets-calibration',
            label: $localize`:@@layout.navTree.business-assets-calibration:Calibración`,
            kind: 'view',
            route: '/business/assets/calibration',
          },
        ],
      },
      {
        id: 'business-hr',
        label: $localize`:@@layout.navTree.business-hr:Personal`,
        kind: 'group',
        children: [
          {
            id: 'business-hr-employee-records',
            label: $localize`:@@layout.navTree.business-hr-employee-records:Empleados`,
            kind: 'view',
            route: '/business/hr/employee-records',
          },
          {
            id: 'business-hr-recruitment',
            label: $localize`:@@layout.navTree.business-hr-recruitment:Reclutamiento`,
            kind: 'view',
            route: '/business/hr/recruitment',
          },
          {
            id: 'business-hr-attendance-leave',
            label: $localize`:@@layout.navTree.business-hr-attendance-leave:Asistencia`,
            kind: 'view',
            route: '/business/hr/attendance-leave',
          },
          {
            id: 'business-hr-rostering',
            label: $localize`:@@layout.navTree.business-hr-rostering:Turnos`,
            kind: 'view',
            route: '/business/hr/rostering',
          },
          {
            id: 'business-hr-payroll',
            label: $localize`:@@layout.navTree.business-hr-payroll:Nómina`,
            kind: 'view',
            route: '/business/hr/payroll',
          },
          {
            id: 'business-hr-appraisals',
            label: $localize`:@@layout.navTree.business-hr-appraisals:Desempeño`,
            kind: 'view',
            route: '/business/hr/appraisals',
          },
          {
            id: 'business-hr-credentialing',
            label: $localize`:@@layout.navTree.business-hr-credentialing:Credenciales`,
            kind: 'view',
            route: '/business/hr/credentialing',
          },
        ],
      },
      {
        id: 'business-crm',
        label: $localize`:@@layout.navTree.business-crm:Mercadeo`,
        kind: 'group',
        children: [
          {
            id: 'business-crm-engagement',
            label: $localize`:@@layout.navTree.business-crm-engagement:Fidelización`,
            kind: 'view',
            route: '/business/crm/engagement',
          },
          {
            id: 'business-crm-campaigns',
            label: $localize`:@@layout.navTree.business-crm-campaigns:Campañas`,
            kind: 'view',
            route: '/business/crm/campaigns',
          },
          {
            id: 'business-crm-referrals',
            label: $localize`:@@layout.navTree.business-crm-referrals:Referencias`,
            kind: 'view',
            route: '/business/crm/referrals',
          },
          {
            id: 'business-crm-feedback',
            label: $localize`:@@layout.navTree.business-crm-feedback:Encuestas`,
            kind: 'view',
            route: '/business/crm/feedback',
          },
          {
            id: 'business-crm-leads',
            label: $localize`:@@layout.navTree.business-crm-leads:Prospectos`,
            kind: 'view',
            route: '/business/crm/leads',
          },
        ],
      },
      {
        id: 'business-projects',
        label: $localize`:@@layout.navTree.business-projects:Proyectos`,
        kind: 'group',
        children: [
          {
            id: 'business-projects-tasks',
            label: $localize`:@@layout.navTree.business-projects-tasks:Tareas`,
            kind: 'view',
            route: '/business/projects/tasks',
          },
          {
            id: 'business-projects-milestones',
            label: $localize`:@@layout.navTree.business-projects-milestones:Hitos`,
            kind: 'view',
            route: '/business/projects/milestones',
          },
          {
            id: 'business-projects-timesheets',
            label: $localize`:@@layout.navTree.business-projects-timesheets:Horas`,
            kind: 'view',
            route: '/business/projects/timesheets',
          },
          {
            id: 'business-projects-costing',
            label: $localize`:@@layout.navTree.business-projects-costing:Costos`,
            kind: 'view',
            route: '/business/projects/costing',
          },
          {
            id: 'business-projects-billing',
            label: $localize`:@@layout.navTree.business-projects-billing:Facturación`,
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
        label: $localize`:@@layout.navTree.governance-quality:Calidad`,
        kind: 'group',
        children: [
          {
            id: 'governance-quality-incidents',
            label: $localize`:@@layout.navTree.governance-quality-incidents:Incidentes`,
            kind: 'view',
            route: '/governance/quality/incidents',
          },
          {
            id: 'governance-quality-audits',
            label: $localize`:@@layout.navTree.governance-quality-audits:Auditorías`,
            kind: 'view',
            route: '/governance/quality/audits',
          },
          {
            id: 'governance-quality-accreditation',
            label: $localize`:@@layout.navTree.governance-quality-accreditation:Acreditación`,
            kind: 'view',
            route: '/governance/quality/accreditation',
          },
          {
            id: 'governance-quality-capa',
            label: $localize`:@@layout.navTree.governance-quality-capa:CAPA`,
            kind: 'view',
            route: '/governance/quality/capa',
          },
          {
            id: 'governance-quality-sop-control',
            label: $localize`:@@layout.navTree.governance-quality-sop-control:Procedimientos`,
            kind: 'view',
            route: '/governance/quality/sop-control',
          },
          {
            id: 'governance-quality-risk-register',
            label: $localize`:@@layout.navTree.governance-quality-risk-register:Riesgos`,
            kind: 'view',
            route: '/governance/quality/risk-register',
          },
        ],
      },
      {
        id: 'governance-legal',
        label: $localize`:@@layout.navTree.governance-legal:Legal`,
        kind: 'group',
        children: [
          {
            id: 'governance-legal-consents',
            label: $localize`:@@layout.navTree.governance-legal-consents:Consentimientos`,
            kind: 'view',
            route: '/governance/legal/consents',
          },
          {
            id: 'governance-legal-cases',
            label: $localize`:@@layout.navTree.governance-legal-cases:Casos`,
            kind: 'view',
            route: '/governance/legal/cases',
          },
          {
            id: 'governance-legal-contracts',
            label: $localize`:@@layout.navTree.governance-legal-contracts:Contratos`,
            kind: 'view',
            route: '/governance/legal/contracts',
          },
          {
            id: 'governance-legal-regulatory',
            label: $localize`:@@layout.navTree.governance-legal-regulatory:Normativa`,
            kind: 'view',
            route: '/governance/legal/regulatory',
          },
        ],
      },
      {
        id: 'governance-research',
        label: $localize`:@@layout.navTree.governance-research:Investigación`,
        kind: 'group',
        children: [
          {
            id: 'governance-research-studies',
            label: $localize`:@@layout.navTree.governance-research-studies:Estudios`,
            kind: 'view',
            route: '/governance/research/studies',
          },
          {
            id: 'governance-research-cohorts',
            label: $localize`:@@layout.navTree.governance-research-cohorts:Cohortes`,
            kind: 'view',
            route: '/governance/research/cohorts',
          },
          {
            id: 'governance-research-ethics',
            label: $localize`:@@layout.navTree.governance-research-ethics:Ética`,
            kind: 'view',
            route: '/governance/research/ethics',
          },
          {
            id: 'governance-research-data-capture',
            label: $localize`:@@layout.navTree.governance-research-data-capture:Datos`,
            kind: 'view',
            route: '/governance/research/data-capture',
          },
        ],
      },
      {
        id: 'governance-social-work',
        label: $localize`:@@layout.navTree.governance-social-work:Social`,
        kind: 'group',
        children: [
          {
            id: 'governance-social-case-management',
            label: $localize`:@@layout.navTree.governance-social-case-management:Casos`,
            kind: 'view',
            route: '/governance/social-work/case-management',
          },
          {
            id: 'governance-social-advocacy',
            label: $localize`:@@layout.navTree.governance-social-advocacy:Defensoría`,
            kind: 'view',
            route: '/governance/social-work/advocacy',
          },
          {
            id: 'governance-social-financial-assistance',
            label: $localize`:@@layout.navTree.governance-social-financial-assistance:Ayuda`,
            kind: 'view',
            route: '/governance/social-work/financial-assistance',
          },
          {
            id: 'governance-social-discharge-support',
            label: $localize`:@@layout.navTree.governance-social-discharge-support:Alta`,
            kind: 'view',
            route: '/governance/social-work/discharge-support',
          },
        ],
      },
      {
        id: 'governance-helpdesk',
        label: $localize`:@@layout.navTree.governance-helpdesk:Soporte`,
        kind: 'group',
        children: [
          {
            id: 'governance-helpdesk-patient-queries',
            label: $localize`:@@layout.navTree.governance-helpdesk-patient-queries:Consultas`,
            kind: 'view',
            route: '/governance/helpdesk/patient-queries',
          },
          {
            id: 'governance-helpdesk-internal-tickets',
            label: $localize`:@@layout.navTree.governance-helpdesk-internal-tickets:Tickets`,
            kind: 'view',
            route: '/governance/helpdesk/internal-tickets',
          },
          {
            id: 'governance-helpdesk-issue-tracking',
            label: $localize`:@@layout.navTree.governance-helpdesk-issue-tracking:Incidencias`,
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
        label: $localize`:@@layout.navTree.platform-scheduling:Citas`,
        kind: 'group',
        children: [
          {
            id: 'platform-scheduling-booking',
            label: $localize`:@@layout.navTree.platform-scheduling-booking:Reservas`,
            kind: 'view',
            route: '/platform/scheduling/booking',
          },
          {
            id: 'platform-scheduling-reminders',
            label: $localize`:@@layout.navTree.platform-scheduling-reminders:Recordatorios`,
            kind: 'view',
            route: '/platform/scheduling/reminders',
          },
          {
            id: 'platform-scheduling-calendar',
            label: $localize`:@@layout.navTree.platform-scheduling-calendar:Calendario`,
            kind: 'view',
            route: '/platform/scheduling/calendar',
          },
        ],
      },
      {
        id: 'platform-reporting',
        label: $localize`:@@layout.navTree.platform-reporting:Análisis`,
        kind: 'group',
        children: [
          {
            id: 'platform-reporting-operational',
            label: $localize`:@@layout.navTree.platform-reporting-operational:Operaciones`,
            kind: 'view',
            route: '/platform/reporting/operational',
          },
          {
            id: 'platform-reporting-clinical',
            label: $localize`:@@layout.navTree.platform-reporting-clinical:Clínicos`,
            kind: 'view',
            route: '/platform/reporting/clinical',
          },
          {
            id: 'platform-reporting-kpis',
            label: $localize`:@@layout.navTree.platform-reporting-kpis:KPI`,
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
        label: $localize`:@@layout.navTree.platform-documents:Documentos`,
        kind: 'group',
        children: [
          {
            id: 'platform-documents-files',
            label: $localize`:@@layout.navTree.platform-documents-files:Documentos`,
            kind: 'view',
            route: '/documents',
          },
        ],
      },
      // Templates & Communications — built (R34). Same single-view-group treatment
      // over the real `/templates` route.
      {
        id: 'platform-templates',
        label: $localize`:@@layout.navTree.platform-templates:Plantillas`,
        kind: 'group',
        children: [
          {
            id: 'platform-templates-editor',
            label: $localize`:@@layout.navTree.platform-templates-editor:Plantillas`,
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
        label: $localize`:@@layout.navTree.portal-my-health:Salud`,
        kind: 'group',
        audience: 'patient',
        children: [
          {
            id: 'portal-home',
            label: $localize`:@@layout.navTree.portal-home:Inicio`,
            kind: 'view',
            route: '/patient',
            audience: 'patient',
          },
          {
            id: 'portal-appointments',
            label: $localize`:@@layout.navTree.portal-appointments:Citas`,
            kind: 'view',
            route: '/patient/appointments',
            audience: 'patient',
          },
          {
            id: 'portal-results',
            label: $localize`:@@layout.navTree.portal-results:Resultados`,
            kind: 'view',
            route: '/patient/results',
            audience: 'patient',
          },
          {
            id: 'portal-documents',
            label: $localize`:@@layout.navTree.portal-documents:Documentos`,
            kind: 'view',
            route: '/patient/documents',
            audience: 'patient',
          },
          {
            id: 'portal-bills',
            label: $localize`:@@layout.navTree.portal-bills:Cuentas`,
            kind: 'view',
            route: '/patient/bills',
            audience: 'patient',
          },
          {
            id: 'portal-messaging',
            label: $localize`:@@layout.navTree.portal-messaging:Mensajes`,
            kind: 'view',
            route: '/patient/messaging',
            audience: 'patient',
          },
          {
            id: 'portal-consents',
            label: $localize`:@@layout.navTree.portal-consents:Consentimientos`,
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
