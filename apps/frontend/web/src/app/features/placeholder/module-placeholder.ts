import { Component, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { NavService } from '../../layout/nav/nav.service';

/**
 * A shared placeholder screen for the main modules that are defined in the nav
 * but not yet built. It titles itself from the active navigation node, so the
 * rail, cascade flyouts, breadcrumb, and view tabs all resolve to a real
 * destination while the actual feature work lands later.
 */
@Component({
  selector: 'app-module-placeholder',
  imports: [TranslocoPipe],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <span class="page-eyebrow">{{ 'placeholder.module.eyebrow' | transloco }}</span>
          <h1 class="page-title" data-testid="placeholder-title">
            {{ title() }}
          </h1>
          <p class="page-subtitle">
            {{ 'placeholder.module.subtitle' | transloco }}
          </p>
        </div>
      </header>

      <section class="surface-card empty-state">
        <i class="pi pi-wrench" aria-hidden="true"></i>
        <p>{{ 'placeholder.module.comingSoon' | transloco: { value: title() } }}</p>
      </section>
    </div>
  `,
})
export class ModulePlaceholder {
  private readonly nav = inject(NavService);
  private readonly transloco = inject(TranslocoService);

  /**
   * The label of the landed node, for the heading. A plain method (not a
   * `computed()`) so it re-translates on every change-detection pass instead
   * of memoizing a stale translation across a language switch — the label
   * itself is a translation KEY (from the nav tree), not display text, so it
   * must be resolved via `TranslocoService.translate` on every read.
   */
  protected title(): string {
    const label = this.nav.breadcrumbChain().at(-1)?.label;
    return label
      ? this.transloco.translate(label)
      : this.transloco.translate('placeholder.module.fallbackTitle');
  }
}
