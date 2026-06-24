import { Component } from '@angular/core';

/**
 * Placeholder for the admin live-settings screen (category-tabbed config with
 * masked secrets). Replaced by the real UI in U12 (R8–R11). Admin-only route.
 */
@Component({
  selector: 'app-admin-settings',
  template: `
    <section
      class="feature-placeholder"
      data-testid="admin-settings-placeholder"
    >
      <h1>Settings</h1>
      <p>Operational config management arrives in U12.</p>
    </section>
  `,
})
export class AdminSettings {}
