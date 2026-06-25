import { describe, expect, it } from 'vitest';

import {
  filterTree,
  isDestination,
  isLeaf,
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
