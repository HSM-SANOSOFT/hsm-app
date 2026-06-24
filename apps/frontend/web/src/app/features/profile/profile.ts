import { Component } from '@angular/core';

/**
 * Placeholder for the user self-service screen (profile + password change).
 * Replaced by the real forms in U10 (R5, R6). Exists now so the shell's default
 * route and the Profile nav entry resolve.
 */
@Component({
  selector: 'app-profile',
  template: `
    <section class="feature-placeholder" data-testid="profile-placeholder">
      <h1>Profile</h1>
      <p>Self-service profile and password management arrives in U10.</p>
    </section>
  `,
})
export class Profile {}
