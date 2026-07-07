import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { NavService } from './nav.service';
import { isDestination, type NavNode, rendersAsFlyout } from './nav-node';

/** One rendered cascade column: a parent's children, labelled by the parent. */
interface Column {
  readonly id: string;
  readonly title: string;
  readonly items: readonly NavNode[];
}

/**
 * The cascading flyout that opens beside the rail for a module with
 * sub-modules (origin R5/R6). Each column lists one parent's children; hovering
 * or focusing a child that itself has children cascades the next column, to
 * whatever depth the module nests.
 *
 * It overlays the content (fixed, anchored past the expanded rail) with a
 * shadow and a faint non-modal scrim — the scrim is decorative (`pointer-events:
 * none`) so the content behind stays visible and usable (origin R3). Items use
 * link + disclosure semantics, never ARIA menu roles (KTD3): a leaf view is an
 * `<a>`, a sub-module is a `<button aria-expanded>`. Each column is a labelled
 * `group` so a screen-reader user can tell which level cascaded. Escape closes
 * the flyout; selecting a leaf navigates and closes it.
 *
 * Built on custom fixed positioning rather than CDK Menu: CDK Menu applies
 * `menu`/`menuitem` roles, which KTD3 forbids for site navigation.
 */
@Component({
  selector: 'app-flyout',
  imports: [RouterLink, TranslocoPipe],
  template: `
    @if (visible()) {
      <div class="scrim" aria-hidden="true"></div>
      <div
        class="flyout"
        data-testid="flyout"
        (mouseenter)="keepOpen()"
        (mouseleave)="requestClose()"
        (keydown.escape)="close()"
      >
        @for (column of columns(); track column.id; let col = $index) {
          <div
            class="fcol"
            role="group"
            [attr.aria-label]="column.title | transloco"
            [attr.data-testid]="'flyout-col'"
          >
            <p class="fcol__title">{{ column.title | transloco }}</p>
            @for (item of column.items; track item.id) {
              @if (hasChildren(item)) {
                <button
                  type="button"
                  class="fitem"
                  data-testid="flyout-group"
                  [class.is-open]="isExpanded(col, item)"
                  [attr.aria-expanded]="isExpanded(col, item)"
                  aria-haspopup="true"
                  (mouseenter)="expand(col, item)"
                  (focus)="expand(col, item)"
                  (click)="expand(col, item)"
                >
                  {{ item.label | transloco }}
                  <i class="fitem__chev pi pi-angle-right" aria-hidden="true"></i>
                </button>
              } @else {
                <a
                  class="fitem"
                  data-testid="flyout-leaf"
                  [routerLink]="leafRoute(item)"
                  (click)="select()"
                >
                  {{ item.label | transloco }}
                </a>
              }
            }
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      .scrim {
        position: fixed;
        inset: 0 0 0 var(--rail-w);
        background: rgba(var(--color-ink-rgb), 0.06);
        z-index: 38;
        pointer-events: none;
      }
      .flyout {
        position: fixed;
        top: 0;
        bottom: 0;
        left: var(--rail-w-expanded);
        display: flex;
        z-index: 39;
        box-shadow: var(--shadow-lg);
      }
      .fcol {
        width: 13rem;
        background: var(--primary-950);
        border-left: 1px solid rgba(255, 255, 255, 0.06);
        padding: 0.5rem 0.4rem;
        overflow-y: auto;
      }
      .fcol__title {
        font-family: var(--font-mono);
        font-size: 0.62rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #7d8ba0;
        margin: 0.3rem 0.55rem 0.45rem;
      }
      .fitem {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        padding: 0.5rem 0.6rem;
        border-radius: var(--r-md);
        color: #c7d2df;
        text-decoration: none;
        font-size: 0.88rem;
        border: 0;
        background: transparent;
        cursor: pointer;
        text-align: left;
      }
      .fitem__chev {
        margin-left: auto;
        font-size: 0.75rem;
        opacity: 0.6;
      }
      .fitem:hover,
      .fitem.is-open {
        background: rgba(255, 255, 255, 0.07);
        color: #fff;
      }
    `,
  ],
})
export class Flyout {
  private readonly nav = inject(NavService);

  /** The module whose cascade is shown (from the rail). `null` = hidden. */
  readonly root = input<NavNode | null>(null);

  /** Emitted when the flyout wants to close, so the rail can clear its state. */
  readonly closed = output<void>();

  /** Ids of the expanded sub-module at each depth beyond the root column. */
  private readonly openPath = signal<readonly string[]>([]);

  constructor() {
    // Reset the cascade whenever the root module changes.
    effect(() => {
      this.root();
      this.openPath.set([]);
    });
  }

  protected readonly visible = computed(
    () => this.root() != null && this.nav.isOpen('flyout'),
  );

  protected readonly columns = computed<readonly Column[]>(() => {
    const root = this.root();
    if (root?.children == null || root.children.length === 0) {
      return [];
    }
    const columns: Column[] = [
      { id: root.id, title: root.label, items: root.children },
    ];
    let current = root;
    for (const id of this.openPath()) {
      const next = current.children?.find(child => child.id === id);
      if (next?.children == null || next.children.length === 0) {
        break;
      }
      columns.push({ id: next.id, title: next.label, items: next.children });
      current = next;
    }
    return columns;
  });

  protected hasChildren(node: NavNode): boolean {
    return rendersAsFlyout(node);
  }

  /** The route a non-cascading flyout item links to: a view's own route, or a
   * tab-bearing sub-module's first/last view (so it lands on its tabs). */
  protected leafRoute(node: NavNode): string | null {
    return isDestination(node)
      ? (node.route ?? null)
      : this.nav.entryRouteFor(node);
  }

  protected isExpanded(columnIndex: number, node: NavNode): boolean {
    return this.openPath()[columnIndex] === node.id;
  }

  protected expand(columnIndex: number, node: NavNode): void {
    this.openPath.set([...this.openPath().slice(0, columnIndex), node.id]);
  }

  protected keepOpen(): void {
    this.nav.open('flyout');
  }

  protected requestClose(): void {
    this.close();
  }

  protected select(): void {
    this.close();
  }

  protected close(): void {
    if (this.nav.isOpen('flyout')) {
      this.nav.close();
    }
    this.closed.emit();
  }
}
