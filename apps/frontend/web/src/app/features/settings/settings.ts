import { Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Personal app Settings — user-controllable application preferences, identical
 * for every user (no admin section; system/env configuration lives in the
 * System Admin console). Distinct from the Profile/account page.
 *
 * Placeholder this round: the preference groups are scaffolded so the route,
 * the Settings gear, and the navigation all resolve to a real destination; the
 * individual controls are wired once a user-preferences API exists.
 */
@Component({
  selector: 'app-settings',
  imports: [TranslocoPipe],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <span class="page-eyebrow">{{ 'settings.page.eyebrow' | transloco }}</span>
          <h1 class="page-title">{{ 'settings.page.title' | transloco }}</h1>
          <p class="page-subtitle">
            {{ 'settings.page.subtitle' | transloco }}
          </p>
        </div>
      </header>

      @for (group of groups; track group.title) {
        <section class="surface-card">
          <h2 class="card-title">{{ group.title | transloco }}</h2>
          <p class="card-hint">{{ group.hint | transloco }}</p>
          <span class="pill pill--neutral" data-testid="settings-placeholder">
            {{ 'settings.group.comingSoon' | transloco }}
          </span>
        </section>
      }
    </div>
  `,
})
export class Settings {
  protected readonly groups = [
    {
      title: 'settings.group.appearance.title',
      hint: 'settings.group.appearance.hint',
    },
    {
      title: 'settings.group.notifications.title',
      hint: 'settings.group.notifications.hint',
    },
    {
      title: 'settings.group.language.title',
      hint: 'settings.group.language.hint',
    },
  ];
}
