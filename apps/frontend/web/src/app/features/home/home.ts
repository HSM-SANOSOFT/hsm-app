import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IfAdminDirective } from '../../core/auth/has-role.directive';

/**
 * Placeholder authenticated landing page. Real shell + nav arrive in U9; this
 * exists so the auth guard, role guard, and `*ifAdmin` directive have a
 * protected route to gate during U8.
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink, IfAdminDirective],
  template: `
    <section class="home">
      <h1>HSM Console</h1>
      <p>You are signed in.</p>
      <a *ifAdmin routerLink="/admin" data-testid="admin-link">
        Admin panel
      </a>
    </section>
  `,
})
export class Home {}
