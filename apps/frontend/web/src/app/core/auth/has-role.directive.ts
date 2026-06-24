import {
  Directive,
  effect,
  inject,
  input,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { RolesEnum } from '@hsm/common/enums';

import { AuthService } from './auth.service';

/**
 * Creates or clears the directive's embedded view to match `show`, returning the
 * new `hasView` state. Shared by {@link HasRoleDirective} and
 * {@link IfAdminDirective} so both toggle identically.
 */
function applyView(
  vcr: ViewContainerRef,
  tpl: TemplateRef<unknown>,
  show: boolean,
  hasView: boolean,
): boolean {
  if (show && !hasView) {
    vcr.createEmbeddedView(tpl);
    return true;
  }
  if (!show && hasView) {
    vcr.clear();
    return false;
  }
  return hasView;
}

/**
 * Structural directive that renders its host element only when the signed-in
 * user holds at least one of the given role values.
 *
 * ```html
 * <button *hasRole="'admin'">Delete user</button>
 * <a *hasRole="['admin', 'developer']" routerLink="/admin">Admin</a>
 * ```
 *
 * Reacts to auth-state changes (login / logout / refresh) via an `effect` over
 * `AuthService.currentUser`, so visibility updates without a manual refresh.
 */
@Directive({
  selector: '[hasRole]',
})
export class HasRoleDirective {
  private readonly auth = inject(AuthService);
  private readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);
  private readonly viewContainer = inject(ViewContainerRef);

  /** Accepts a single role value or an array of role values. */
  readonly hasRole = input.required<string | readonly string[]>();

  private hasView = false;

  constructor() {
    effect(() => {
      const required = this.normalize(this.hasRole());
      const allowed = this.auth.hasAnyRole(required);
      this.hasView = applyView(
        this.viewContainer,
        this.templateRef,
        allowed,
        this.hasView,
      );
    });
  }

  private normalize(value: string | readonly string[]): readonly string[] {
    return Array.isArray(value) ? value : [value as string];
  }
}

/**
 * Structural directive that renders its host element only for admins
 * (`RolesEnum.System.Admin`). A thin convenience over {@link HasRoleDirective}.
 *
 * ```html
 * <a *ifAdmin routerLink="/admin/settings">Settings</a>
 * ```
 */
@Directive({
  selector: '[ifAdmin]',
})
export class IfAdminDirective {
  private readonly auth = inject(AuthService);
  private readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);
  private readonly viewContainer = inject(ViewContainerRef);

  private hasView = false;

  constructor() {
    effect(() => {
      const allowed = this.auth.hasRole(RolesEnum.System.Admin);
      this.hasView = applyView(
        this.viewContainer,
        this.templateRef,
        allowed,
        this.hasView,
      );
    });
  }
}
