import {
  computed,
  Injectable,
  InjectionToken,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import {
  ADMIN_NAV_TREE,
  filterTree,
  isDestination,
  isLeaf,
  NAV_TREE,
  type NavNode,
  resolveRoutePath,
  SYSTEM_ADMIN_PREFIX,
} from './nav-node';

/**
 * The navigation tree the chrome renders. Injectable so the live {@link NAV_TREE}
 * (the real modules) can be swapped for a fixture in tests, and so the eventual
 * data/IA deliverable wires the concrete nested tree as a provider override
 * rather than a code edit.
 */
export const NAV_TREE_TOKEN = new InjectionToken<readonly NavNode[]>(
  'NAV_TREE',
  { factory: () => NAV_TREE },
);

/**
 * Which navigation overlay is currently open. Exactly one (or none) is open at a
 * time, so the flyout, the breadcrumb dropdown, and the profile popover are
 * mutually exclusive (origin R10 / AE3).
 */
export type OpenSurface = 'flyout' | 'crumb' | 'profile' | null;

/**
 * The signal spine the sidebar chrome reads from. It reconstructs the active
 * module, breadcrumb chain, sibling lists, and leaf-level view tabs from the
 * URL on every navigation — including a cold-load deep-link — so the rail
 * highlight, breadcrumb, and tabs are correct without any prior hover (R11).
 *
 * State is signals only (zoneless): `NavigationEnd` feeds a signal via
 * {@link toSignal}, everything else is `computed`. Last-visited-per-module is an
 * in-memory `Map` (never persisted — KTD9), so it resets on a full reload.
 */
@Injectable({ providedIn: 'root' })
export class NavService {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly tree = inject(NAV_TREE_TOKEN);

  /** The current URL, updated on every completed navigation. */
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(event => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /**
   * True while inside the System Admin console — the rail and breadcrumb then
   * resolve against the admin tree (the "elevated admin view", origin R13).
   */
  readonly adminMode = computed(() => isAdminUrl(this.url()));

  /** The tree currently driving the chrome: admin sections inside the console,
   * the feature modules otherwise. */
  private readonly currentTree = computed(() =>
    this.adminMode() ? ADMIN_NAV_TREE : this.tree,
  );

  /**
   * The role/audience-filtered tree the rail renders. A branch whose every leaf
   * is gated away for this user is dropped entirely (no empty flyout columns).
   */
  readonly visibleTree = computed(() =>
    filterTree(this.currentTree(), {
      isStaff: this.auth.isStaff(),
      isPatient: this.auth.isPatient(),
      hasAnyRole: roles => this.auth.hasAnyRole(roles),
    }),
  );

  /**
   * The chain of nodes from the active top-level module down to the matched
   * destination, root-first. Empty when the URL is off-tree (`/settings`,
   * `/system-admin/*`) or otherwise unresolvable — no redirect is triggered, the
   * chrome simply renders an empty active state.
   */
  readonly activePath = computed<readonly NavNode[]>(
    () => resolveRoutePath(this.currentTree(), this.url()) ?? [],
  );

  /** The active top-level module, or `null` when the URL is off-tree. */
  readonly activeModule = computed<NavNode | null>(
    () => this.activePath()[0] ?? null,
  );

  /** The breadcrumb chain for the current location (root-first; empty off-tree). */
  readonly breadcrumbChain = computed<readonly NavNode[]>(() =>
    this.activePath(),
  );

  /**
   * The leaf-level views that render as top-bar tabs: the siblings of the active
   * view (its parent's `'view'` children). Empty when the active path does not
   * end on a view, or when a module has a single view (no tab strip).
   */
  readonly leafTabs = computed<readonly NavNode[]>(() => {
    const path = this.activePath();
    const leaf = path.at(-1);
    if (leaf == null || !isLeaf(leaf)) {
      return [];
    }
    const views = (path.at(-2)?.children ?? []).filter(
      node => node.kind === 'view',
    );
    return views.length > 1 ? views : [];
  });

  private readonly openSurfaceSignal = signal<OpenSurface>(null);
  /** The currently open overlay surface (mutually exclusive — origin R10). */
  readonly openSurface = this.openSurfaceSignal.asReadonly();

  /** In-memory last-visited view route per module id (KTD9 — never persisted). */
  private readonly lastVisited = new Map<string, string>();

  constructor() {
    // Record the last-visited view for a module whenever we land on one of its
    // leaves, so re-entry and breadcrumb sibling-switches can restore it.
    // Recorded straight off NavigationEnd (synchronous on navigation) rather
    // than via an effect, so it is populated the moment a navigation resolves.
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(event => this.recordLastVisited(event.urlAfterRedirects));
    this.recordLastVisited(this.router.url);
  }

  private recordLastVisited(url: string): void {
    const tree = isAdminUrl(url) ? ADMIN_NAV_TREE : this.tree;
    const path = resolveRoutePath(tree, url) ?? [];
    const moduleNode = path[0];
    const leaf = path.at(-1);
    if (moduleNode != null && leaf != null && isLeaf(leaf) && leaf.route) {
      this.lastVisited.set(moduleNode.id, leaf.route);
    }
  }

  /** Opens a surface, closing any other (enforces mutual exclusion). */
  open(surface: Exclude<OpenSurface, null>): void {
    this.openSurfaceSignal.set(surface);
  }

  /** Closes whichever surface is open. */
  close(): void {
    this.openSurfaceSignal.set(null);
  }

  /** True when the given surface is the one currently open. */
  isOpen(surface: Exclude<OpenSurface, null>): boolean {
    return this.openSurfaceSignal() === surface;
  }

  /** Siblings of a node in the active path — its parent's children, or the
   * top-level modules for a root node. Drives breadcrumb sibling-switching. */
  siblingsOf(node: NavNode): readonly NavNode[] {
    const path = this.activePath();
    const index = path.findIndex(entry => entry.id === node.id);
    if (index <= 0) {
      return this.visibleTree();
    }
    return path[index - 1].children ?? [];
  }

  /**
   * The route to navigate to when a node is activated from the rail/flyout: a
   * destination uses its own route; a branch resolves to its module's
   * last-visited view, falling back to its first leaf. `null` when the branch
   * has no reachable leaf.
   */
  entryRouteFor(node: NavNode): string | null {
    if (isDestination(node)) {
      return node.route ?? null;
    }
    const remembered = this.lastVisited.get(node.id);
    if (remembered != null && containsRoute(node, remembered)) {
      return remembered;
    }
    return firstLeafRoute(node);
  }
}

function isAdminUrl(url: string): boolean {
  const path = url.split(/[?#]/, 1)[0];
  return (
    path === SYSTEM_ADMIN_PREFIX || path.startsWith(`${SYSTEM_ADMIN_PREFIX}/`)
  );
}

function firstLeafRoute(node: NavNode): string | null {
  if (isDestination(node)) {
    return node.route ?? null;
  }
  for (const child of node.children ?? []) {
    const route = firstLeafRoute(child);
    if (route != null) {
      return route;
    }
  }
  return null;
}

function containsRoute(node: NavNode, route: string): boolean {
  if (node.route === route) {
    return true;
  }
  return (node.children ?? []).some(child => containsRoute(child, route));
}
