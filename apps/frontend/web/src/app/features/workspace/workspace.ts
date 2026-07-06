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
    () =>
      this.auth.currentUser()?.firstName?.trim() ||
      $localize`:@@workspace.home.greeting.fallbackName:allí`,
  );

  private readonly allLinks: readonly QuickLink[] = [
    {
      label: $localize`:@@workspace.home.link.templates.label:Plantillas`,
      description: $localize`:@@workspace.home.link.templates.description:Cree y edite plantillas de documentos.`,
      icon: 'pi pi-file-edit',
      route: '/templates',
    },
    {
      label: $localize`:@@workspace.home.link.documents.label:Documentos`,
      description: $localize`:@@workspace.home.link.documents.description:Explore y genere documentos.`,
      icon: 'pi pi-folder',
      route: '/documents',
    },
    {
      label: $localize`:@@workspace.home.link.profile.label:Su perfil`,
      description: $localize`:@@workspace.home.link.profile.description:Actualice sus datos y contraseña.`,
      icon: 'pi pi-user',
      route: '/profile',
    },
    {
      label: $localize`:@@workspace.home.link.users.label:Usuarios`,
      description: $localize`:@@workspace.home.link.users.description:Administre las cuentas y el acceso del personal.`,
      icon: 'pi pi-users',
      route: '/system-admin/users',
      adminOnly: true,
    },
    {
      label: $localize`:@@workspace.home.link.settings.label:Configuración`,
      description: $localize`:@@workspace.home.link.settings.description:Configure los ajustes del sistema.`,
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
