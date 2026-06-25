import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

/** A quick-link card on the staff workspace home. */
interface QuickLink {
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly route: string;
  /** When true, the card shows only for admins. */
  readonly adminOnly?: boolean;
}

/**
 * Staff workspace home (the role-resolved landing for staff).
 *
 * A small, fast launchpad rather than the profile screen: a greeting plus
 * quick-link cards into the staff features (Templates, Documents, Profile, and
 * — for admins — Users and Settings). Admin cards are filtered out for
 * non-admins via {@link AuthService.isAdmin}, mirroring the shell nav gate.
 */
@Component({
  selector: 'app-workspace',
  imports: [RouterLink],
  templateUrl: './workspace.html',
  styleUrl: './workspace.css',
})
export class Workspace {
  private readonly auth = inject(AuthService);

  /** First name for the greeting; falls back to a neutral generic. */
  protected readonly firstName = computed(
    () => this.auth.currentUser()?.firstName?.trim() || 'there',
  );

  private readonly allLinks: readonly QuickLink[] = [
    {
      label: 'Templates',
      description: 'Author and edit document templates.',
      icon: 'pi pi-file-edit',
      route: '/templates',
    },
    {
      label: 'Documents',
      description: 'Browse and generate documents.',
      icon: 'pi pi-folder',
      route: '/documents',
    },
    {
      label: 'Your profile',
      description: 'Update your details and password.',
      icon: 'pi pi-user',
      route: '/profile',
    },
    {
      label: 'Users',
      description: 'Manage staff accounts and access.',
      icon: 'pi pi-users',
      route: '/admin/users',
      adminOnly: true,
    },
    {
      label: 'Settings',
      description: 'Configure system settings.',
      icon: 'pi pi-cog',
      route: '/admin/settings',
      adminOnly: true,
    },
  ];

  /** Quick links scoped to the signed-in staff member (admin cards gated). */
  protected readonly links = computed(() => {
    const isAdmin = this.auth.isAdmin();
    return this.allLinks.filter(link => !link.adminOnly || isAdmin);
  });
}
