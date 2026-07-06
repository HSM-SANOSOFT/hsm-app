import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavService } from './nav.service';
import { isLeaf } from './nav-node';

/**
 * The horizontal view tabs in the top bar — the final level of navigation
 * (origin R7). They render the leaf views of the landed sub-module and switch
 * the active route; the active tab is derived from the URL via
 * {@link NavService.leafTabs}, so it always reflects the current view, including
 * on a cold-load deep-link.
 *
 * Route-driven `<a>` tabs (with `routerLinkActive`) rather than PrimeNG `p-tabs`:
 * the tabs ARE navigation, and a route-link tab strip sidesteps the
 * `p-tabs` programmatic-`[value]` binding issue (primefaces/primeng#18426). A
 * module with one (or zero) views renders no strip — `leafTabs` returns empty.
 */
@Component({
  selector: 'app-view-tabs',
  imports: [RouterLink],
  template: `
    @if (tabs().length) {
      <nav class="tabs" i18n-aria-label="@@layout.viewTabs.ariaLabel" aria-label="Vistas" data-testid="view-tabs">
        <span class="tabs__label" i18n="@@layout.viewTabs.label">Vistas</span>
        @for (view of tabs(); track view.id) {
          <a
            class="tab"
            data-testid="view-tab"
            [class.is-active]="view.id === activeId()"
            [routerLink]="view.route"
            [attr.aria-current]="view.id === activeId() ? 'page' : null"
          >
            {{ view.label }}
          </a>
        }
      </nav>
    }
  `,
  styles: [
    `
      .tabs {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        height: 2.5rem;
        padding: 0 1.5rem;
        background: var(--surface);
        border-bottom: 1px solid var(--line);
      }
      .tabs__label {
        font-family: var(--font-mono);
        font-size: 0.62rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--ink-muted);
        margin-right: 0.5rem;
      }
      .tab {
        font-size: 0.85rem;
        color: var(--ink-muted);
        text-decoration: none;
        padding: 0.5rem 0.75rem;
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
      }
      .tab:hover {
        color: var(--ink);
      }
      .tab.is-active {
        color: var(--primary-700);
        border-bottom-color: var(--primary-700);
        font-weight: 600;
      }
      @media (hover: none), (pointer: coarse) {
        .tab {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
        }
      }
    `,
  ],
})
export class ViewTabs {
  private readonly nav = inject(NavService);
  /** The leaf views to show as tabs (empty for a single-view module). */
  protected readonly tabs = this.nav.leafTabs;
  /** The id of the active leaf view — drives the active tab marker. */
  protected readonly activeId = computed(() => {
    const leaf = this.nav.activePath().at(-1);
    return leaf != null && isLeaf(leaf) ? leaf.id : null;
  });
}
