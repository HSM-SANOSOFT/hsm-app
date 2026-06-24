import { Component } from '@angular/core';

/**
 * Placeholder for the admin user-management screen (list / view / role change).
 * Replaced by the real `p-table` UI in U11 (R7). Admin-only route.
 */
@Component({
  selector: 'app-admin-users',
  template: `
    <section class="feature-placeholder" data-testid="admin-users-placeholder">
      <h1>Users</h1>
      <p>Admin user management (list, view, role change) arrives in U11.</p>
    </section>
  `,
})
export class AdminUsers {}
