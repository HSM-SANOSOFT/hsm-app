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
          <span class="page-eyebrow" i18n="@@settings.page.eyebrow">Cuenta</span>
          <h1 class="page-title" i18n="@@settings.page.title">Configuración</h1>
          <p class="page-subtitle" i18n="@@settings.page.subtitle">
            Preferencias que controlan cómo se comporta la aplicación para usted.
            Estas se aplican solo a su cuenta.
          </p>
        </div>
      </header>

      @for (group of groups; track group.title) {
        <section class="surface-card">
          <h2 class="card-title">{{ group.title }}</h2>
          <p class="card-hint">{{ group.hint }}</p>
          <span class="pill pill--neutral" data-testid="settings-placeholder" i18n="@@settings.group.comingSoon">
            Próximamente
          </span>
        </section>
      }
    </div>
  `,
})
export class Settings {
  protected readonly groups = [
    {
      title: $localize`:@@settings.group.appearance.title:Apariencia`,
      hint: $localize`:@@settings.group.appearance.hint:Densidad y preferencias de visualización para sus sesiones.`,
    },
    {
      title: $localize`:@@settings.group.notifications.title:Notificaciones`,
      hint: $localize`:@@settings.group.notifications.hint:Elija qué notificaciones dentro de la aplicación y por correo electrónico desea recibir.`,
    },
    {
      title: $localize`:@@settings.group.language.title:Idioma y región`,
      hint: $localize`:@@settings.group.language.hint:Idioma de la interfaz, formatos de fecha y número.`,
    },
  ];
}
