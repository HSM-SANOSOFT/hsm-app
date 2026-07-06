import {
  Component,
  computed,
  ElementRef,
  effect,
  inject,
  type OnDestroy,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { VersionService } from '../../core/version/version.service';
import { Flyout } from './flyout';
import { HoverIntent } from './hover-intent';
import { NavService } from './nav.service';
import { isDestination, type NavNode, rendersAsFlyout } from './nav-node';
import { PointerCapability } from './pointer-capability';
import { ProfileCard } from './profile-card';

/** A rendered rail entry: a plain link, or a disclosure that opens a flyout. */
interface RailItem {
  readonly node: NavNode;
  readonly mode: 'link' | 'disclosure';
  readonly route: string | null;
}

/**
 * The navy icon rail. Collapsed it is a 64px strip of top-level module icons;
 * hovering or focusing it expands it to reveal labels as an OVERLAY — the
 * `:host` keeps its 64px slot in the layout while the fixed rail widens over the
 * content, so nothing reflows (origin R3 / R4).
 *
 * Modules use link + disclosure semantics, not ARIA menu roles: a destination
 * module is an `<a>`; a module that opens a flyout is a `<button aria-expanded>`
 * (origin R5). Focusing any item expands the rail (so a keyboard user sees the
 * labels), and Escape collapses it (R17/R18). The profile card is docked at the
 * bottom (origin R11); flyout columns (U6) anchor to {@link flyoutModule}.
 */
@Component({
  selector: 'app-rail',
  imports: [RouterLink, RouterLinkActive, ProfileCard, Flyout],
  template: `
    <nav
      class="rail"
      [class.rail--expanded]="expanded()"
      i18n-aria-label="@@layout.rail.ariaLabel"
      aria-label="Principal"
      (mouseenter)="intent.enter()"
      (mouseleave)="onLeave()"
      (focusin)="intent.openNow()"
      (focusout)="onFocusOut($event)"
      (keydown.escape)="collapse()"
    >
      <div class="rail-head">
        <a class="rail-brand" routerLink="/" i18n-aria-label="@@layout.rail.homeAriaLabel" aria-label="Inicio">
          <span class="brand-mark" aria-hidden="true"></span>
          <span class="brand-word">
            Hospital <span class="brand-word__sub">Santa María</span>
          </span>
        </a>
        <!-- Touch toggle: hover-expand is inert on a coarse pointer, so tapping
             this opens/closes the rail (R19). Hidden on hover-capable devices. -->
        <button
          type="button"
          class="rail-toggle"
          data-testid="rail-toggle"
          [attr.aria-expanded]="expanded()"
          i18n-aria-label="@@layout.rail.toggleAriaLabel"
          aria-label="Alternar navegación"
          (click)="toggle()"
        >
          <i class="pi" [class.pi-bars]="!expanded()" [class.pi-times]="expanded()"></i>
        </button>
      </div>

      <div class="rail-items">
        @for (item of railItems(); track item.node.id) {
          @if (item.mode === 'disclosure') {
            <button
              type="button"
              class="rail-item"
              data-testid="rail-item"
              [class.is-active]="activeId() === item.node.id"
              [class.is-open]="flyoutModule()?.id === item.node.id"
              [attr.aria-expanded]="flyoutModule()?.id === item.node.id"
              aria-haspopup="true"
              [attr.aria-label]="item.node.label"
              (mouseenter)="openModule(item.node)"
              (focus)="openModule(item.node)"
              (click)="toggleModule(item.node)"
            >
              <i class="rail-item__icon" [class]="item.node.icon"></i>
              <span class="rail-item__label">{{ item.node.label }}</span>
            </button>
          } @else {
            <a
              class="rail-item"
              data-testid="rail-item"
              [routerLink]="item.route"
              routerLinkActive="is-active"
              [attr.aria-label]="item.node.label"
              (mouseenter)="closeFlyout()"
              (focus)="closeFlyout()"
            >
              <i class="rail-item__icon" [class]="item.node.icon"></i>
              <span class="rail-item__label">{{ item.node.label }}</span>
            </a>
          }
        } @empty {
          <p class="rail-empty" data-testid="rail-empty" i18n="@@layout.rail.empty">Sin módulos</p>
        }
      </div>

      <div class="rail-footer" data-testid="version-footer">
        <span class="rail-footer__dot" aria-hidden="true"></span>
        <span class="rail-footer__text mono" i18n="@@layout.rail.version">
          UI v{{ version.uiVersion }} &middot; API
          v{{ version.apiVersion() ?? unknownVersion }}
        </span>
      </div>

      <app-profile-card [expanded]="expanded()" />
    </nav>

    <app-flyout
      [root]="flyoutModule()"
      (mouseenter)="intent.openNow()"
      (mouseleave)="intent.leave()"
      (closed)="closeFlyout()"
    />

    @if (expanded()) {
      <button
        type="button"
        class="rail-scrim"
        data-testid="rail-scrim"
        i18n-aria-label="@@layout.rail.closeAriaLabel"
        aria-label="Cerrar navegación"
        (click)="collapse()"
      ></button>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        width: var(--rail-w);
        flex: none;
      }
      .rail {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: var(--rail-w);
        display: flex;
        flex-direction: column;
        background: var(--primary-900);
        color: #cdd6e0;
        padding: 0.6rem 0.5rem 0.5rem;
        z-index: 40;
        overflow: hidden;
        transition: width 0.18s cubic-bezier(0.2, 0.7, 0.2, 1);
      }
      .rail--expanded {
        width: var(--rail-w-expanded);
        box-shadow: var(--shadow-lg);
      }

      .rail-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .rail-brand {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        text-decoration: none;
        padding: 0.4rem 0.45rem 0.9rem;
        white-space: nowrap;
      }
      .rail-toggle {
        display: none;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border: 0;
        background: transparent;
        color: #aebccd;
        cursor: pointer;
        border-radius: var(--r-md);
        flex: none;
      }
      .rail-toggle:hover {
        background: rgba(255, 255, 255, 0.06);
        color: #fff;
      }
      .rail-scrim {
        display: none;
        position: fixed;
        inset: 0 0 0 var(--rail-w-expanded);
        border: 0;
        background: rgba(var(--color-ink-rgb), 0.4);
        z-index: 39;
        cursor: pointer;
      }
      .brand-mark {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        background: var(--accent);
        position: relative;
        flex: none;
        box-shadow: 0 0 0 4px rgba(var(--color-accent-rgb), 0.16);
      }
      .brand-mark::before,
      .brand-mark::after {
        content: "";
        position: absolute;
        background: #fff;
        border-radius: 1px;
      }
      .brand-mark::before {
        inset: 13px 8px;
      }
      .brand-mark::after {
        inset: 8px 13px;
      }
      .brand-word {
        font-family: var(--font-display);
        font-weight: 700;
        font-size: 1.05rem;
        color: #fff;
        opacity: 0;
        transition: opacity 0.14s ease;
      }
      .brand-word__sub {
        color: var(--primary-200);
        font-weight: 500;
      }

      .rail-items {
        display: flex;
        flex-direction: column;
        gap: 0.12rem;
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
      }

      .rail-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.6rem 0.55rem;
        border-radius: var(--r-md);
        color: #c2cdda;
        text-decoration: none;
        font-size: 0.92rem;
        font-weight: 450;
        position: relative;
        white-space: nowrap;
        border: 0;
        background: transparent;
        cursor: pointer;
        width: 100%;
        text-align: left;
        transition:
          background 0.15s ease,
          color 0.15s ease;
      }
      .rail-item__icon {
        font-size: 1.05rem;
        width: 1.4rem;
        text-align: center;
        color: #8d9bb0;
        flex: none;
        transition: color 0.15s ease;
      }
      .rail-item__label {
        opacity: 0;
        transition: opacity 0.14s ease;
      }
      .rail-item:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #fff;
      }
      .rail-item:hover .rail-item__icon {
        color: var(--primary-200);
      }
      .rail-item.is-active,
      .rail-item.is-open {
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
        font-weight: 500;
      }
      .rail-item.is-active .rail-item__icon {
        color: var(--accent);
      }
      /* Signature accent-red rail on the active module */
      .rail-item.is-active::before {
        content: "";
        position: absolute;
        left: -0.5rem;
        top: 0.4rem;
        bottom: 0.4rem;
        width: 3px;
        border-radius: 0 3px 3px 0;
        background: var(--accent);
      }

      /* Labels + wordmark only legible once expanded */
      .rail--expanded .rail-item__label,
      .rail--expanded .brand-word,
      .rail--expanded .rail-footer__text {
        opacity: 1;
      }

      .rail-empty {
        color: #7d8ba0;
        font-size: 0.78rem;
        padding: 0.6rem 0.55rem;
        white-space: nowrap;
      }

      .rail-footer {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.6rem 0.55rem;
        color: #7d8ba0;
        font-size: 0.68rem;
        white-space: nowrap;
      }
      .rail-footer__dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        flex: none;
        background: var(--ok);
        box-shadow: 0 0 0 3px rgba(15, 122, 82, 0.22);
      }
      .rail-footer__text {
        opacity: 0;
        transition: opacity 0.14s ease;
      }

      /* Touch / coarse-pointer degradation (R19): expose the tap toggle and the
         close scrim, give rows a 44px touch target, and hide the brand on the
         collapsed strip so the toggle fits the 64px width. */
      @media (hover: none), (pointer: coarse) {
        .rail-toggle {
          display: inline-flex;
        }
        .rail-scrim {
          display: block;
        }
        .rail:not(.rail--expanded) .rail-brand {
          display: none;
        }
        .rail-item,
        .rail-toggle {
          min-height: 44px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .rail,
        .rail-item__label,
        .brand-word,
        .rail-footer__text {
          transition: none;
        }
      }
    `,
  ],
})
export class Rail implements OnDestroy {
  protected readonly nav = inject(NavService);
  protected readonly version = inject(VersionService);
  /** Localized fallback when the API version is not yet known. */
  protected readonly unknownVersion =
    $localize`:@@layout.rail.version.unknown:desconocido`;
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly pointer = inject(PointerCapability);

  /** Drives the hover-expand of the rail (snappy open, forgiving close). */
  protected readonly intent = new HoverIntent(this.pointer, {
    openDelay: 80,
    closeDelay: 280,
  });
  /** Whether the rail is expanded (labels visible). */
  protected readonly expanded = this.intent.isOpen;

  /** The module whose flyout is open, or `null`. Consumed by the flyout (U6). */
  readonly flyoutModule = signal<NavNode | null>(null);

  constructor() {
    // When the rail fully collapses (pointer left both rail and flyout, after
    // the close delay), drop any open flyout so it never orphans over content.
    effect(() => {
      if (!this.expanded() && this.flyoutModule() != null) {
        this.closeFlyout();
      }
    });
  }

  protected readonly activeId = computed(
    () => this.nav.activeModule()?.id ?? null,
  );

  protected readonly railItems = computed<readonly RailItem[]>(() =>
    this.nav.visibleTree().map(node => {
      if (rendersAsFlyout(node)) {
        return { node, mode: 'disclosure', route: null };
      }
      const route = isDestination(node)
        ? (node.route ?? '/')
        : (this.nav.entryRouteFor(node) ?? '/');
      return { node, mode: 'link', route };
    }),
  );

  /** Open a module's flyout (hover/focus/click on a disclosure module). Expands
   * the rail immediately so the collapse effect never races the open delay. */
  openModule(node: NavNode): void {
    this.intent.openNow();
    this.flyoutModule.set(node);
    this.nav.open('flyout');
  }

  /** Toggle a module's flyout (click on a disclosure module). */
  toggleModule(node: NavNode): void {
    if (this.flyoutModule()?.id === node.id) {
      this.closeFlyout();
    } else {
      this.openModule(node);
    }
  }

  /** Close any open flyout (e.g. hovering a plain link module). */
  closeFlyout(): void {
    if (this.flyoutModule() != null) {
      this.flyoutModule.set(null);
    }
    if (this.nav.isOpen('flyout')) {
      this.nav.close();
    }
  }

  protected onLeave(): void {
    // Collapse after the close delay; the flyout is closed by the collapse
    // effect, so moving the pointer rightward into the flyout keeps it open.
    this.intent.leave();
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next == null || !this.host.nativeElement.contains(next)) {
      this.collapse();
    }
  }

  /** Tap toggle for coarse pointers (hover-expand is inert there). */
  protected toggle(): void {
    if (this.expanded()) {
      this.collapse();
    } else {
      this.intent.openNow();
    }
  }

  protected collapse(): void {
    this.intent.closeNow();
    this.closeFlyout();
  }

  ngOnDestroy(): void {
    this.intent.destroy();
  }
}
