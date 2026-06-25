import { Component, computed, inject } from '@angular/core';

import { NavService } from '../../layout/nav/nav.service';

/**
 * A shared placeholder screen for the main modules that are defined in the nav
 * but not yet built. It titles itself from the active navigation node, so the
 * rail, cascade flyouts, breadcrumb, and view tabs all resolve to a real
 * destination while the actual feature work lands later.
 */
@Component({
  selector: 'app-module-placeholder',
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <span class="page-eyebrow">Module</span>
          <h1 class="page-title" data-testid="placeholder-title">
            {{ title() }}
          </h1>
          <p class="page-subtitle">
            Navigation and routing for this area are wired; the screen itself is
            a placeholder until the module is built.
          </p>
        </div>
      </header>

      <section class="surface-card empty-state">
        <i class="pi pi-wrench" aria-hidden="true"></i>
        <p>“{{ title() }}” is coming soon.</p>
      </section>
    </div>
  `,
})
export class ModulePlaceholder {
  private readonly nav = inject(NavService);
  /** The label of the landed node, for the heading. */
  protected readonly title = computed(
    () => this.nav.breadcrumbChain().at(-1)?.label ?? 'Module',
  );
}
