import type { Route } from '@angular/router';
import { describe, expect, it } from 'vitest';

import type { NavNode } from './nav-node';
import { BUILT_MODULE_ROUTES, placeholderRoutesFromTree } from './nav-routes';

/** A sentinel loader; specs assert it is passed through by identity. */
const loader: NonNullable<Route['loadComponent']> = () =>
  Promise.resolve(class Placeholder {});

/**
 * Uneven fixture: a deep `view` leaf (3 levels), a built-route `view` leaf that
 * must be skipped, a childless `module` whose route is built (skip), a routeless
 * `group`, and a duplicate route to prove de-duplication.
 */
const TREE: readonly NavNode[] = [
  {
    id: 'clinical',
    label: 'Clinical',
    kind: 'module',
    children: [
      {
        id: 'pm',
        label: 'Patient Management',
        kind: 'group',
        children: [
          {
            id: 'registration',
            label: 'Registration',
            kind: 'view',
            route: '/clinical/patient-management/registration',
          },
          // Same route again, to exercise dedupe.
          {
            id: 'registration-dup',
            label: 'Registration (dup)',
            kind: 'view',
            route: '/clinical/patient-management/registration',
          },
        ],
      },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    kind: 'module',
    children: [
      // A re-homed built module carrying its real route — must be skipped.
      {
        id: 'documents',
        label: 'Documents',
        kind: 'view',
        route: '/documents',
      },
      // Built route with format drift (trailing slash) — still skipped.
      {
        id: 'templates',
        label: 'Templates',
        kind: 'view',
        route: '/templates/',
      },
      // A genuine placeholder leaf under Platform.
      {
        id: 'scheduling',
        label: 'Scheduling',
        kind: 'view',
        route: '/platform/scheduling',
      },
    ],
  },
  // A childless module whose route is built (Workspace) — yields nothing.
  {
    id: 'workspace',
    label: 'Workspace',
    kind: 'module',
    route: '/workspace',
  },
  // A routeless group with no children produces nothing for itself.
  { id: 'empty-group', label: 'Empty', kind: 'group' },
];

describe('placeholderRoutesFromTree', () => {
  const routes = placeholderRoutesFromTree(TREE, loader);
  const paths = routes.map(r => r.path);

  it('turns a deep view leaf into an exact child-route path (no leading slash)', () => {
    expect(paths).toContain('clinical/patient-management/registration');
    expect(paths).toContain('platform/scheduling');
  });

  it('traverses nested group levels to reach every leaf', () => {
    // The deep leaf lives two group levels down; it must be reached.
    const deep = routes.find(
      r => r.path === 'clinical/patient-management/registration',
    );
    expect(deep).toBeDefined();
  });

  it('points every generated route at the supplied loader by identity', () => {
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      expect(route.loadComponent).toBe(loader);
    }
  });

  it('excludes a view leaf whose route is a built module route', () => {
    expect(paths).not.toContain('documents');
  });

  it('excludes a childless module whose route is built (the lazy route owns it)', () => {
    expect(paths).not.toContain('workspace');
  });

  it('honours the skip-set under trailing-slash/format drift', () => {
    // `/templates/` in the tree vs `/templates` in the skip-set.
    expect(paths).not.toContain('templates');
    expect(paths).not.toContain('templates/');
  });

  it('de-duplicates two leaves sharing a route into one entry', () => {
    const matches = paths.filter(
      p => p === 'clinical/patient-management/registration',
    );
    expect(matches).toHaveLength(1);
  });

  it('produces no route for a routeless group/module node', () => {
    // Only the four genuine destinations survive (deep leaf, scheduling) minus
    // skips; empty-group contributes nothing.
    expect(paths).toEqual(
      expect.arrayContaining([
        'clinical/patient-management/registration',
        'platform/scheduling',
      ]),
    );
    expect(paths).toHaveLength(2);
  });

  it('exposes the built-route skip-set as the absorbed/special destinations', () => {
    expect(BUILT_MODULE_ROUTES).toEqual([
      '/workspace',
      '/documents',
      '/templates',
      '/patient',
      '/settings',
      '/profile',
    ]);
  });
});
