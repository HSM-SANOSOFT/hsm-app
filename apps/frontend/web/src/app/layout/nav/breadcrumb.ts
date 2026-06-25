import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NavService } from './nav.service';
import { type NavNode } from './nav-node';

/**
 * The top-bar breadcrumb of the current path (origin R9). Each crumb that has
 * siblings opens a dropdown to switch to a sibling at that level — a secondary,
 * lateral way to move without opening the rail. The dropdown registers as the
 * `'crumb'` open-surface, so it and the flyout are mutually exclusive: opening
 * one closes the other (origin R10 / AE3).
 *
 * It is hidden when the path is empty (an off-tree route like `/settings`).
 */
@Component({
  selector: 'app-breadcrumb',
  template: `
    @if (chain().length) {
      <nav class="bc" aria-label="Breadcrumb" data-testid="breadcrumb">
        @for (crumb of crumbs(); track crumb.node.id; let last = $last) {
          @if (!$first) {
            <span class="bc__sep" aria-hidden="true">›</span>
          }
          @if (crumb.siblings.length > 1) {
            <span class="bc__slot">
              <button
                type="button"
                class="bc__crumb bc__crumb--switch"
                [class.bc__crumb--current]="last"
                data-testid="breadcrumb-crumb"
                aria-haspopup="true"
                [attr.aria-expanded]="openId() === crumb.node.id"
                [attr.aria-current]="last ? 'page' : null"
                (click)="toggle(crumb.node)"
              >
                {{ crumb.node.label }}
                <i class="bc__chev pi pi-angle-down" aria-hidden="true"></i>
              </button>
              @if (openId() === crumb.node.id) {
                <ul class="bc__menu" data-testid="breadcrumb-menu">
                  @for (sibling of crumb.siblings; track sibling.id) {
                    <li>
                      <button
                        type="button"
                        class="bc__option"
                        [class.is-current]="sibling.id === crumb.node.id"
                        (click)="go(sibling)"
                      >
                        {{ sibling.label }}
                      </button>
                    </li>
                  }
                </ul>
              }
            </span>
          } @else {
            <span
              class="bc__crumb"
              [class.bc__crumb--current]="last"
              [attr.aria-current]="last ? 'page' : null"
            >
              {{ crumb.node.label }}
            </span>
          }
        }
      </nav>
    }
  `,
  styles: [
    `
      .bc {
        display: flex;
        align-items: center;
        gap: 0.15rem;
        font-size: 0.85rem;
      }
      .bc__sep {
        color: var(--line-strong);
        margin: 0 0.1rem;
      }
      .bc__slot {
        position: relative;
        display: inline-flex;
      }
      .bc__crumb {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        color: var(--ink-muted);
        padding: 0.35rem 0.5rem;
        border-radius: var(--r-sm);
        border: 0;
        background: transparent;
        font: inherit;
      }
      .bc__crumb--switch {
        cursor: pointer;
      }
      .bc__crumb--switch:hover {
        background: var(--surface-sunk);
        color: var(--ink);
      }
      .bc__crumb--current {
        color: var(--ink);
        font-weight: 600;
      }
      .bc__chev {
        font-size: 0.7rem;
      }
      .bc__menu {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        z-index: 50;
        min-width: 11rem;
        margin: 0;
        padding: 0.3rem;
        list-style: none;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--r-md);
        box-shadow: var(--shadow-md);
      }
      .bc__option {
        display: block;
        width: 100%;
        text-align: left;
        padding: 0.45rem 0.6rem;
        border-radius: var(--r-sm);
        border: 0;
        background: transparent;
        color: var(--ink);
        font: inherit;
        cursor: pointer;
      }
      .bc__option:hover {
        background: var(--surface-sunk);
      }
      .bc__option.is-current {
        color: var(--primary-700);
        font-weight: 600;
      }
    `,
  ],
})
export class Breadcrumb {
  private readonly nav = inject(NavService);
  private readonly router = inject(Router);

  protected readonly chain = this.nav.breadcrumbChain;
  private readonly openIdSignal = signal<string | null>(null);
  protected readonly openId = this.openIdSignal.asReadonly();

  constructor() {
    // Close the dropdown when another surface (flyout / profile) takes over.
    effect(() => {
      if (this.nav.openSurface() !== 'crumb') {
        this.openIdSignal.set(null);
      }
    });
  }

  /** Each crumb paired with its switchable siblings at that level. */
  protected readonly crumbs = computed(() =>
    this.chain().map(node => ({
      node,
      siblings: this.nav.siblingsOf(node),
    })),
  );

  protected toggle(node: NavNode): void {
    if (this.openIdSignal() === node.id) {
      this.nav.close();
      this.openIdSignal.set(null);
    } else {
      this.openIdSignal.set(node.id);
      this.nav.open('crumb');
    }
  }

  protected go(sibling: NavNode): void {
    const route = this.nav.entryRouteFor(sibling);
    this.openIdSignal.set(null);
    this.nav.close();
    if (route != null) {
      void this.router.navigateByUrl(route);
    }
  }
}
