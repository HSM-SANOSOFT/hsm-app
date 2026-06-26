import type { Route } from '@angular/router';

import { type NavNode, normalizeUrl } from './nav-node';

/**
 * Routes that already have explicit, real-component entries in `app.routes.ts`
 * and therefore must NOT be replaced by a generated placeholder.
 *
 * These are the built/special destinations the taxonomy "absorbs" rather than
 * rebuilds (origin R33/R34): the staff home, the two shipped Platform modules,
 * the patient stub, and the personal settings/profile pages. A leaf in
 * `NAV_TREE` that carries one of these routes (e.g. Documents/Templates re-homed
 * under Platform, or the Patient Portal's first leaf at `/patient`) is skipped
 * here so the real lazy route keeps owning the path.
 *
 * Invariant (asserted by the collision-guard spec in `app.routes.spec.ts`): this
 * set covers every non-placeholder Shell child route, so a future built route
 * added without a matching entry fails CI rather than being silently shadowed by
 * a generated placeholder at runtime.
 */
export const BUILT_MODULE_ROUTES: readonly string[] = [
  '/workspace',
  '/documents',
  '/templates',
  '/patient',
  '/settings',
  '/profile',
];

/** The lazy-component loader a generated placeholder route points at. */
type PlaceholderLoader = NonNullable<Route['loadComponent']>;

/**
 * Walks a `NavNode` tree and returns the exact-path `Route[]` of placeholder
 * destinations — one per routable leaf — so `app.routes.ts` never hand-lists the
 * ~150 taxonomy leaves (KTD3). The tree stays the single source of truth: adding
 * a module later is a tree edit only, and its route appears here automatically.
 *
 * Collects the `route` of every leaf/childless destination (a `'view'`, or a
 * childless `'module'`), drops any whose normalized route is in
 * {@link BUILT_MODULE_ROUTES}, strips the leading slash to a child-route `path`,
 * and de-duplicates by path. Both sides of the skip comparison are run through
 * {@link normalizeUrl} so a built route is excluded regardless of
 * trailing-slash/format drift. In a well-formed tree every routable taxonomy
 * leaf is a `'view'`; the childless-`'module'` branch exists only to *skip* built
 * nodes (Workspace/Documents/Templates), never to emit.
 *
 * Pure and DI-free — the loader is passed in, so the helper is unit-testable in
 * isolation and the generated routes match before the `** -> ''` catch-all.
 */
export function placeholderRoutesFromTree(
  tree: readonly NavNode[],
  placeholderLoader: PlaceholderLoader,
): Route[] {
  const skip = new Set(BUILT_MODULE_ROUTES.map(normalizeUrl));
  const byPath = new Map<string, Route>();

  const visit = (nodes: readonly NavNode[]): void => {
    for (const node of nodes) {
      const children = node.children;
      if (children != null && children.length > 0) {
        // A branch (flyout/group/module-with-children) is never a destination
        // itself; descend to its leaves.
        visit(children);
        continue;
      }
      // Childless node: a destination only if it carries a route.
      if (node.route == null) {
        continue;
      }
      const normalized = normalizeUrl(node.route);
      if (skip.has(normalized)) {
        continue;
      }
      const path = normalized.replace(/^\//, '');
      if (path.length === 0 || byPath.has(path)) {
        continue;
      }
      byPath.set(path, { path, loadComponent: placeholderLoader });
    }
  };

  visit(tree);
  return [...byPath.values()];
}
