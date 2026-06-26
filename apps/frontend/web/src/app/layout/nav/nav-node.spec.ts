import { describe, expect, it } from 'vitest';

import {
  filterTree,
  isDestination,
  isLeaf,
  NAV_TREE,
  type NavAccess,
  type NavNode,
  rendersAsFlyout,
  rendersAsTabs,
  resolveRoutePath,
} from './nav-node';

/**
 * A deliberately uneven fixture tree: `clinical` nests 3 deep (Clinical ›
 * Imaging › CT › views) while `billing` nests 2 (Billing › Invoices › views),
 * and `reports` is a childless module destination. Mirrors the illustrative IA
 * the cascade must support without the live `NAV_TREE` committing to it.
 */
const TREE: readonly NavNode[] = [
  {
    id: 'clinical',
    label: 'Clinical',
    kind: 'module',
    children: [
      {
        id: 'imaging',
        label: 'Imaging',
        kind: 'group',
        children: [
          {
            id: 'ct',
            label: 'CT',
            kind: 'group',
            children: [
              {
                id: 'studies',
                label: 'Studies',
                kind: 'view',
                route: '/clinical/imaging/ct/studies',
              },
              {
                id: 'worklist',
                label: 'Worklist',
                kind: 'view',
                route: '/clinical/imaging/ct/worklist',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'billing',
    label: 'Billing',
    kind: 'module',
    roles: ['billing'],
    children: [
      {
        id: 'invoices',
        label: 'Invoices',
        kind: 'group',
        children: [
          {
            id: 'open',
            label: 'Open',
            kind: 'view',
            route: '/billing/invoices/open',
          },
          {
            id: 'paid',
            label: 'Paid',
            kind: 'view',
            route: '/billing/invoices/paid',
          },
        ],
      },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    kind: 'module',
    route: '/reports',
  },
];

const STAFF: NavAccess = {
  isStaff: true,
  isPatient: false,
  hasAnyRole: roles => roles.includes('billing'),
};

describe('nav-node classification', () => {
  it('classifies a module whose children are all views as tab-bearing', () => {
    const invoices = TREE[1].children?.[0] as NavNode;
    expect(rendersAsTabs(invoices)).toBe(true);
    expect(rendersAsFlyout(invoices)).toBe(false);
  });

  it('classifies a module with non-view children as flyout-bearing', () => {
    expect(rendersAsFlyout(TREE[0])).toBe(true);
    expect(rendersAsTabs(TREE[0])).toBe(false);
  });

  it('resolves child kinds per branch across uneven depth', () => {
    const ct = TREE[0].children?.[0].children?.[0] as NavNode;
    expect(rendersAsTabs(ct)).toBe(true); // CT -> its views are tabs (depth 3)
    expect(rendersAsFlyout(TREE[1])).toBe(true); // Billing -> flyout (depth 2)
  });

  it('treats a childless module as a direct destination', () => {
    expect(isDestination(TREE[2])).toBe(true);
    expect(isLeaf(TREE[2])).toBe(false); // a module, not a view
  });

  it('marks only view leaves as leaves, and only leaves/childless modules carry routes', () => {
    const studies = TREE[0].children?.[0].children?.[0]
      .children?.[0] as NavNode;
    expect(isLeaf(studies)).toBe(true);
    expect(studies.route).toBeDefined();
    expect(TREE[0].route).toBeUndefined(); // branch module: no route
  });
});

describe('filterTree', () => {
  it('keeps a role-gated branch when the user has the role', () => {
    const visible = filterTree(TREE, STAFF);
    expect(visible.map(n => n.id)).toContain('billing');
  });

  it('hides a branch whose every leaf is role-excluded', () => {
    const noBilling: NavAccess = { ...STAFF, hasAnyRole: () => false };
    const visible = filterTree(TREE, noBilling);
    expect(visible.map(n => n.id)).not.toContain('billing');
    // Non-gated branches survive.
    expect(visible.map(n => n.id)).toEqual(['clinical', 'reports']);
  });

  it('hides every staff branch from a patient (empty result)', () => {
    const patient: NavAccess = {
      isStaff: false,
      isPatient: true,
      hasAnyRole: () => false,
    };
    expect(filterTree(TREE, patient)).toEqual([]);
  });

  it('does not mutate the input tree', () => {
    const before = JSON.stringify(TREE);
    filterTree(TREE, { ...STAFF, hasAnyRole: () => false });
    expect(JSON.stringify(TREE)).toBe(before);
  });
});

describe('resolveRoutePath', () => {
  it('resolves a deep leaf-view URL to its root-first chain', () => {
    const chain = resolveRoutePath(TREE, '/clinical/imaging/ct/studies');
    expect(chain?.map(n => n.id)).toEqual([
      'clinical',
      'imaging',
      'ct',
      'studies',
    ]);
  });

  it('matches a childless module destination', () => {
    expect(resolveRoutePath(TREE, '/reports')?.map(n => n.id)).toEqual([
      'reports',
    ]);
  });

  it('strips query and trailing slash before matching', () => {
    expect(
      resolveRoutePath(TREE, '/billing/invoices/open?tab=1')?.map(n => n.id),
    ).toEqual(['billing', 'invoices', 'open']);
    expect(resolveRoutePath(TREE, '/reports/')?.map(n => n.id)).toEqual([
      'reports',
    ]);
  });

  it('returns null for an unresolvable or non-leaf path', () => {
    expect(resolveRoutePath(TREE, '/clinical/imaging')).toBeNull(); // non-leaf
    expect(resolveRoutePath(TREE, '/settings')).toBeNull(); // off-tree
  });
});

describe('NAV_TREE (committed module taxonomy)', () => {
  const byId = (id: string) => NAV_TREE.find(n => n.id === id) as NavNode;

  const STAFF_ACCESS: NavAccess = {
    isStaff: true,
    isPatient: false,
    hasAnyRole: () => false,
  };
  const PATIENT_ACCESS: NavAccess = {
    isStaff: false,
    isPatient: true,
    hasAnyRole: () => false,
  };

  /** Depth-first walk of every node in the live tree. */
  const everyNode = (nodes: readonly NavNode[]): NavNode[] =>
    nodes.flatMap(n => [n, ...everyNode(n.children ?? [])]);

  it('exposes Workspace + the five staff domains as the staff rail, in order', () => {
    expect(filterTree(NAV_TREE, STAFF_ACCESS).map(n => n.id)).toEqual([
      'workspace',
      'clinical',
      'diagnostics',
      'business',
      'governance',
      'platform',
    ]);
  });

  it('shows a patient only the Patient Portal domain', () => {
    expect(filterTree(NAV_TREE, PATIENT_ACCESS).map(n => n.id)).toEqual([
      'patient-portal',
    ]);
  });

  it('renders each domain as a flyout and each module as tabs', () => {
    // Domain: children are groups -> flyout.
    expect(rendersAsFlyout(byId('clinical'))).toBe(true);
    // Module: children are all views -> tabs.
    const pm = byId('clinical').children?.find(
      n => n.id === 'clinical-patient-management',
    );
    expect(rendersAsTabs(pm as NavNode)).toBe(true);
  });

  it('resolves a deep placeholder leaf URL root-first', () => {
    expect(
      resolveRoutePath(
        NAV_TREE,
        '/clinical/patient-management/registration',
      )?.map(n => n.id),
    ).toEqual([
      'clinical',
      'clinical-patient-management',
      'clinical-pm-registration',
    ]);
  });

  it('authors ADT and Imaging flat (all-view modules -> tabs, no modality nesting)', () => {
    const adt = byId('clinical').children?.find(n => n.id === 'clinical-adt');
    const imaging = byId('diagnostics').children?.find(
      n => n.id === 'diagnostics-imaging',
    );
    expect((adt as NavNode).children?.every(c => c.kind === 'view')).toBe(true);
    expect((imaging as NavNode).children?.every(c => c.kind === 'view')).toBe(
      true,
    );
  });

  it("keeps every node's children homogeneous in kind (all view or all group)", () => {
    for (const node of everyNode(NAV_TREE)) {
      const kinds = new Set((node.children ?? []).map(c => c.kind));
      expect(kinds.size).toBeLessThanOrEqual(1);
    }
  });

  it('renders Patient Portal as a flyout whose home resolves to a nav chain', () => {
    expect(rendersAsFlyout(byId('patient-portal'))).toBe(true); // has a group child
    // The patient home `/patient` resolves to rail highlight + breadcrumb.
    expect(resolveRoutePath(NAV_TREE, '/patient')?.map(n => n.id)).toEqual([
      'patient-portal',
      'portal-my-health',
      'portal-home',
    ]);
  });

  it('absorbs Documents and Templates under Platform with their real routes', () => {
    const platform = byId('platform');
    const routesUnderPlatform = everyNode(platform.children ?? [])
      .map(n => n.route)
      .filter(Boolean);
    expect(routesUnderPlatform).toContain('/documents');
    expect(routesUnderPlatform).toContain('/templates');
    // Scheduling is present as a placeholder module.
    expect(platform.children?.map(n => n.id)).toContain('platform-scheduling');
  });

  it('carries no roles gate on any node (roles are greenfield — KTD5)', () => {
    for (const node of everyNode(NAV_TREE)) {
      expect(node.roles).toBeUndefined();
    }
  });
});
