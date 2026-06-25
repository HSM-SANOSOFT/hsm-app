import { Component } from '@angular/core';

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
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <span class="page-eyebrow">Account</span>
          <h1 class="page-title">Settings</h1>
          <p class="page-subtitle">
            Preferences that control how the app behaves for you. These apply to
            your account only.
          </p>
        </div>
      </header>

      @for (group of groups; track group.title) {
        <section class="surface-card">
          <h2 class="card-title">{{ group.title }}</h2>
          <p class="card-hint">{{ group.hint }}</p>
          <span class="pill pill--neutral" data-testid="settings-placeholder">
            Coming soon
          </span>
        </section>
      }
    </div>
  `,
})
export class Settings {
  protected readonly groups = [
    {
      title: 'Appearance',
      hint: 'Density and display preferences for your sessions.',
    },
    {
      title: 'Notifications',
      hint: 'Choose which in-app and email notifications you receive.',
    },
    {
      title: 'Language & region',
      hint: 'Interface language, date, and number formats.',
    },
  ];
}
