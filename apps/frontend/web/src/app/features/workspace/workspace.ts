import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

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
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './workspace.html',
  styleUrl: './workspace.scss',
})
export class Workspace {
  private readonly auth = inject(AuthService);
  private readonly transloco = inject(TranslocoService);

  /**
   * First name for the greeting; falls back to a neutral generic.
   *
   * A plain method (not a `computed()`) so the fallback re-translates on
   * every template check instead of being cached at first evaluation — it
   * must track the active language like the rest of the template.
   */
  protected firstName(): string {
    return (
      this.auth.currentUser()?.firstName?.trim() ||
      this.transloco.translate('workspace.home.greeting.fallbackName')
    );
  }

  /**
   * Quick-link cards. `label`/`description` store translation KEYS, not
   * translated strings — they are translated in the template via
   * `| transloco` so they stay reactive to a language switch, rather than
   * being eagerly translated once here at construction time.
   */
  private readonly allLinks: readonly QuickLink[] = [
    {
      label: 'workspace.home.link.templates.label',
      description: 'workspace.home.link.templates.description',
      icon: 'pi pi-file-edit',
      route: '/templates',
    },
    {
      label: 'workspace.home.link.documents.label',
      description: 'workspace.home.link.documents.description',
      icon: 'pi pi-folder',
      route: '/documents',
    },
    {
      label: 'workspace.home.link.profile.label',
      description: 'workspace.home.link.profile.description',
      icon: 'pi pi-user',
      route: '/profile',
    },
    {
      label: 'workspace.home.link.users.label',
      description: 'workspace.home.link.users.description',
      icon: 'pi pi-users',
      route: '/system-admin/users',
      adminOnly: true,
    },
    {
      label: 'workspace.home.link.settings.label',
      description: 'workspace.home.link.settings.description',
      icon: 'pi pi-cog',
      route: '/system-admin/settings',
      adminOnly: true,
    },
  ];

  /** Quick links scoped to the signed-in staff member (admin cards gated). */
  protected readonly links = computed(() => {
    const isAdmin = this.auth.isAdmin();
    return this.allLinks.filter(link => !link.adminOnly || isAdmin);
  });
}
