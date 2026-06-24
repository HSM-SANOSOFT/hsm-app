import { Component } from '@angular/core';

/**
 * Placeholder admin landing page used in U8 to exercise the admin route guard.
 * The real admin screens (users, settings) arrive in U11/U12.
 */
@Component({
  selector: 'app-admin-home',
  template: `
    <section class="admin">
      <h1>Admin</h1>
      <p>Admin-only area.</p>
    </section>
  `,
})
export class AdminHome {}
