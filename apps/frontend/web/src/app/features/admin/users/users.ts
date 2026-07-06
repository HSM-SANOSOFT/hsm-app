import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RolesEnum } from '@hsm/common/enums';
import { ButtonModule } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { Select } from 'primeng/select';
import { type TableLazyLoadEvent, TableModule } from 'primeng/table';

import { ApiClient } from '../../../core/api/api-client';
import { toErrorMessage } from '../../../core/api/api-error';
import {
  computePage,
  DEFAULT_PAGE_SIZE,
} from '../../../core/api/pagination.util';
import type {
  AdminUser,
  ChangeUserRolePayload,
  CreateStaffPayload,
  RoleOption,
  UserRole,
} from './users.types';

const USERS_PATH = '/user';
const CREATE_STAFF_PATH = '/user/staff';

/** `RolesEnum` group key whose members are patient/family — never staff. */
const PATIENT_GROUP = 'Patient';

/**
 * Flattens the nested `RolesEnum` const object (`System`/`Clinical`/…) into a
 * flat option list. Each group is an enum whose *values* are the role strings
 * the backend expects (`RolesType`); the label is `<Group> / <Member>` so
 * admins can tell same-named members apart.
 *
 * When `staffOnly` is true the `Patient` group (patient/family) is excluded —
 * the create-staff endpoint rejects those roles server-side (R5), so the
 * dropdown must not offer them.
 *
 * Built at module load — `RolesEnum` is static.
 */
function buildRoleOptions(staffOnly = false): RoleOption[] {
  const options: RoleOption[] = [];
  for (const [groupName, group] of Object.entries(RolesEnum)) {
    if (staffOnly && groupName === PATIENT_GROUP) {
      continue;
    }
    for (const [memberName, value] of Object.entries(group)) {
      options.push({
        label: `${groupName} / ${memberName}`,
        value: value as string,
      });
    }
  }
  return options;
}

/**
 * Admin user-management screen (U11/U13, R7/R3/R5; AE4).
 *
 * Lists users with **server-side** pagination via PrimeNG `p-table`
 * (`[lazy]="true"` + `(onLazyLoad)`), lets an admin view a single user in a
 * dialog (`GET /v1/user/:id`), change a user's role
 * (`PATCH /v1/user/:id/role`), and **provision a new staff account**
 * (`POST /v1/user/staff`, U13) via a reactive-form dialog. Each row shows a
 * Pending/Active status pill driven by `onboardingCompletedAt`: a freshly
 * created staff account is Pending until it completes first-login onboarding.
 *
 * Admin-only access is enforced by the route's `adminGuard` (U9) — not
 * re-implemented here. R6 (a user cannot change their own role) is enforced
 * server-side via the distinct self-service `PATCH /v1/user/me` path.
 */
@Component({
  selector: 'app-admin-users',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    Select,
    Dialog,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    Message,
  ],
  template: `
    <div class="page admin-users" data-testid="admin-users">
      <header class="page-header">
        <div>
          <span class="page-eyebrow" i18n="@@admin.users.page.eyebrow">ADMIN · USUARIOS</span>
          <h1 class="page-title" i18n="@@admin.users.page.title">Usuarios</h1>
          <p class="page-subtitle" i18n="@@admin.users.page.subtitle">
            Revise las cuentas de la consola y administre los roles asignados.
          </p>
        </div>
        <p-button
          i18n-label="@@admin.users.createStaff"
          label="Crear personal"
          icon="pi pi-user-plus"
          (onClick)="openCreate()"
          data-testid="create-staff-open"
        />
      </header>

      @if (error(); as err) {
        <p-message severity="error" [text]="err" data-testid="users-error" />
      }

      <section class="surface-card">
        <p-table
          [value]="users()"
          [lazy]="true"
          [paginator]="true"
          [rows]="pageSize()"
          [totalRecords]="totalRecords()"
          [loading]="loading()"
          [first]="first()"
          (onLazyLoad)="loadUsers($event)"
          dataKey="id"
          data-testid="users-table"
        >
          <ng-template pTemplate="header">
            <tr>
              <th i18n="@@admin.users.table.username">Usuario</th>
              <th i18n="@@admin.users.table.email">Correo electrónico</th>
              <th i18n="@@admin.users.table.name">Nombre</th>
              <th i18n="@@admin.users.table.roles">Rol(es)</th>
              <th i18n="@@admin.users.table.status">Estado</th>
              <th i18n="@@admin.users.table.actions">Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-user>
            <tr [attr.data-testid]="'user-row-' + user.id">
              <td>{{ user.username }}</td>
              <td class="muted">{{ user.email }}</td>
              <td>{{ user.firstName }}</td>
              <td data-testid="user-roles">
                @for (role of user.roles ?? []; track role.id) {
                  <span class="pill pill--neutral">{{ role.role }}</span>
                } @empty {
                  <span class="muted">—</span>
                }
              </td>
              <td>
                @if (isPending(user)) {
                  <span
                    class="pill pill--pending"
                    [attr.data-testid]="'status-' + user.id"
                    i18n="@@admin.users.status.pending"
                  >
                    Pendiente
                  </span>
                } @else {
                  <span
                    class="pill pill--ok"
                    [attr.data-testid]="'status-' + user.id"
                    i18n="@@admin.users.status.active"
                  >
                    Activo
                  </span>
                }
              </td>
              <td>
                <div class="row-actions">
                  <p-button
                    i18n-label="@@admin.users.row.view"
                    label="Ver"
                    size="small"
                    [text]="true"
                    (onClick)="view(user)"
                    [attr.data-testid]="'view-' + user.id"
                  />
                  <p-select
                    [options]="roleOptions"
                    optionLabel="label"
                    optionValue="value"
                    i18n-placeholder="@@admin.users.row.changeRole"
                    placeholder="Cambiar rol"
                    [ngModel]="currentRoleValue(user)"
                    (onChange)="changeRole(user, $event.value)"
                    [attr.data-testid]="'role-select-' + user.id"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="6">
                <div class="empty-state">
                  <i class="pi pi-users"></i>
                  <span i18n="@@admin.users.table.empty">No se encontraron usuarios.</span>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </section>

      <p-dialog
        i18n-header="@@admin.users.detail.header"
        header="Detalle del usuario"
        [(visible)]="detailVisible"
        [modal]="true"
        [style]="{ width: '28rem' }"
        data-testid="user-detail-dialog"
      >
        @if (selectedUser(); as u) {
          <div class="field-grid" data-testid="user-detail">
            <div class="field">
              <label i18n="@@admin.users.detail.username.label">Usuario</label>
              <span>{{ u.username }}</span>
            </div>
            <div class="field">
              <label i18n="@@admin.users.detail.email.label">Correo electrónico</label>
              <span class="muted">{{ u.email }}</span>
            </div>
            <div class="field">
              <label i18n="@@admin.users.detail.name.label">Nombre</label>
              <span>{{ u.firstName }}</span>
            </div>
            <div class="field">
              <label i18n="@@admin.users.detail.roles.label">Rol(es)</label>
              <span>
                @for (role of u.roles; track role.id) {
                  <span class="pill pill--neutral">{{ role.role }}</span>
                } @empty {
                  <span class="muted">—</span>
                }
              </span>
            </div>
          </div>
        }
      </p-dialog>

      <p-dialog
        i18n-header="@@admin.users.create.header"
        header="Crear cuenta de personal"
        [(visible)]="createVisible"
        [modal]="true"
        [style]="{ width: '32rem' }"
        [breakpoints]="{ '40rem': '92vw' }"
        (onHide)="onCreateHide()"
        data-testid="create-staff-dialog"
      >
        <p class="dialog-lede" i18n="@@admin.users.create.lede">
          Provea una cuenta de consola. Se envía una contraseña temporal por
          correo electrónico al nuevo miembro del personal, quien establece la
          suya propia en el primer inicio de sesión.
        </p>

        <form
          [formGroup]="createForm"
          (ngSubmit)="submitCreate()"
          class="create-staff-form"
        >
          @if (createError(); as message) {
            <p-message
              severity="error"
              [text]="message"
              styleClass="create-staff-msg"
              data-testid="create-staff-error"
            />
          }
          @if (createSuccess(); as message) {
            <p-message
              severity="success"
              [text]="message"
              styleClass="create-staff-msg"
              data-testid="create-staff-success"
            />
          }

          <div class="auth-row">
            <div class="field">
              <label for="cs-firstName" i18n="@@admin.users.create.firstName.label">Nombre</label>
              <input
                pInputText
                id="cs-firstName"
                type="text"
                formControlName="firstName"
                autocomplete="off"
                fluid
              />
              @if (
                createForm.controls.firstName.invalid &&
                createForm.controls.firstName.touched
              ) {
                <small class="field-error" i18n="@@admin.users.create.firstName.error">El nombre es obligatorio.</small>
              }
            </div>

            <div class="field">
              <label for="cs-firstLastName" i18n="@@admin.users.create.lastName.label">Apellido</label>
              <input
                pInputText
                id="cs-firstLastName"
                type="text"
                formControlName="firstLastName"
                autocomplete="off"
                fluid
              />
              @if (
                createForm.controls.firstLastName.invalid &&
                createForm.controls.firstLastName.touched
              ) {
                <small class="field-error" i18n="@@admin.users.create.lastName.error">El apellido es obligatorio.</small>
              }
            </div>
          </div>

          <div class="field">
            <label for="cs-username" i18n="@@admin.users.create.username.label">Usuario</label>
            <input
              pInputText
              id="cs-username"
              type="text"
              formControlName="username"
              autocomplete="off"
              i18n-placeholder="@@admin.users.create.username.placeholder"
              placeholder="p. ej. jdoe"
              fluid
            />
            @if (
              createForm.controls.username.invalid &&
              createForm.controls.username.touched
            ) {
              <small class="field-error" i18n="@@admin.users.create.username.error">El usuario es obligatorio.</small>
            }
          </div>

          <div class="field">
            <label for="cs-email" i18n="@@admin.users.create.email.label">Correo electrónico</label>
            <input
              pInputText
              id="cs-email"
              type="email"
              formControlName="email"
              autocomplete="off"
              i18n-placeholder="@@admin.users.create.email.placeholder"
              placeholder="nombre@hospital.org"
              fluid
            />
            @if (
              createForm.controls.email.invalid &&
              createForm.controls.email.touched
            ) {
              <small class="field-error" i18n="@@admin.users.create.email.error">Ingrese una dirección de correo electrónico válida.</small>
            }
          </div>

          <div class="field">
            <label for="cs-role" i18n="@@admin.users.create.role.label">Rol</label>
            <p-select
              inputId="cs-role"
              formControlName="role"
              [options]="staffRoleOptions"
              optionLabel="label"
              optionValue="value"
              i18n-placeholder="@@admin.users.create.role.placeholder"
              placeholder="Seleccione un rol de personal"
              [filter]="true"
              filterBy="label"
              appendTo="body"
              fluid
              data-testid="create-staff-role"
            />
            @if (
              createForm.controls.role.invalid &&
              createForm.controls.role.touched
            ) {
              <small class="field-error" i18n="@@admin.users.create.role.error">Seleccione un rol de personal.</small>
            }
          </div>

          <div class="field">
            <label for="cs-tempPassword" i18n="@@admin.users.create.tempPassword.label">Contraseña temporal</label>
            <p-password
              inputId="cs-tempPassword"
              formControlName="tempPassword"
              [feedback]="false"
              [toggleMask]="true"
              autocomplete="off"
              i18n-placeholder="@@admin.users.create.tempPassword.placeholder"
              placeholder="Al menos 8 caracteres"
              fluid
            />
            @if (
              createForm.controls.tempPassword.invalid &&
              createForm.controls.tempPassword.touched
            ) {
              <small class="field-error" i18n="@@admin.users.create.tempPassword.error">Use al menos 8 caracteres.</small>
            }
          </div>

          <div class="dialog-actions">
            <p-button
              i18n-label="@@admin.users.create.cancel"
              label="Cancelar"
              [text]="true"
              type="button"
              (onClick)="createVisible = false"
              data-testid="create-staff-cancel"
            />
            <p-button
              type="submit"
              i18n-label="@@admin.users.createStaff"
              label="Crear personal"
              icon="pi pi-user-plus"
              [loading]="creating()"
              [disabled]="creating()"
              data-testid="create-staff-submit"
            />
          </div>
        </form>
      </p-dialog>
    </div>
  `,
  styles: `
    .row-actions {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    [data-testid='user-roles'] .pill + .pill {
      margin-left: 0.35rem;
    }

    [data-testid='user-detail'] .field span .pill + .pill {
      margin-left: 0.35rem;
    }

    .dialog-lede {
      margin: 0 0 1.25rem;
      color: var(--ink-muted);
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .create-staff-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.6rem;
      margin-top: 0.5rem;
    }
  `,
})
export class AdminUsers {
  private readonly api = inject(ApiClient);
  private readonly fb = inject(FormBuilder);

  /** Flattened `RolesEnum` options for the role-change dropdown (all roles). */
  readonly roleOptions = buildRoleOptions();

  /** STAFF-only role options for create-staff (patient/family excluded, R5). */
  readonly staffRoleOptions = buildRoleOptions(true);

  readonly users = signal<AdminUser[]>([]);
  readonly totalRecords = signal(0);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly first = signal(0);
  readonly loading = signal(false);

  /** The user shown in the detail dialog (loaded via `GET /v1/user/:id`). */
  readonly selectedUser = signal<AdminUser | null>(null);
  detailVisible = false;

  /** Surfaces view/role-change failures to the admin. */
  readonly error = signal<string | null>(null);

  // --- Create-staff dialog state (U13) ---
  createVisible = false;
  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);
  readonly createSuccess = signal<string | null>(null);

  readonly createForm = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    firstName: ['', [Validators.required]],
    firstLastName: ['', [Validators.required]],
    role: ['', [Validators.required]],
    tempPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  /**
   * `p-table` lazy-load handler. Translates the table's `first`/`rows` offset
   * into the backend's 1-based `page`/`limit` query and fetches that page,
   * setting `totalRecords` from `metadata.extra.pagination`.
   */
  loadUsers(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.pageSize();
    const offset = event.first ?? 0;
    const { page, limit } = computePage(offset, rows);

    this.pageSize.set(rows);
    this.first.set(offset);
    this.loading.set(true);

    this.api
      .getPaginated<AdminUser>(USERS_PATH, {
        params: { page, limit },
      })
      .subscribe({
        next: result => {
          this.users.set(result.data);
          if (result.pagination) {
            this.totalRecords.set(result.pagination.totalItems);
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  /** Re-fetches the page currently shown (used after a create-staff success). */
  refreshCurrentPage(): void {
    this.loadUsers({ first: this.first(), rows: this.pageSize() });
  }

  /** Opens the create-staff dialog with a clean form. */
  openCreate(): void {
    this.createForm.reset();
    this.createError.set(null);
    this.createSuccess.set(null);
    this.createVisible = true;
  }

  /** Resets transient create-staff state when the dialog closes. */
  onCreateHide(): void {
    this.createForm.reset();
    this.createError.set(null);
    this.createSuccess.set(null);
    this.creating.set(false);
  }

  /**
   * Provisions a staff account via `POST /v1/user/staff` (U3). On success:
   * closes the dialog, resets the form, shows a brief confirmation, and
   * refreshes the list so the new (Pending) account appears. A duplicate
   * username/email — or any server error — surfaces inline and keeps the
   * dialog open.
   */
  submitCreate(): void {
    if (this.createForm.invalid || this.creating()) {
      this.createForm.markAllAsTouched();
      return;
    }

    const raw = this.createForm.getRawValue();
    const payload: CreateStaffPayload = {
      username: raw.username.trim(),
      email: raw.email.trim(),
      firstName: raw.firstName.trim(),
      firstLastName: raw.firstLastName.trim(),
      role: raw.role,
      tempPassword: raw.tempPassword,
    };

    this.creating.set(true);
    this.createError.set(null);
    this.createSuccess.set(null);

    this.api.post<AdminUser>(CREATE_STAFF_PATH, payload).subscribe({
      next: created => {
        this.creating.set(false);
        this.createVisible = false;
        this.createForm.reset();
        this.error.set(null);
        this.createSuccess.set(
          $localize`:@@admin.users.create.success:Se creó la cuenta de personal "${created.username}:USERNAME:". Se envió una contraseña temporal por correo electrónico.`,
        );
        this.refreshCurrentPage();
      },
      error: (err: unknown) => {
        this.creating.set(false);
        this.createError.set(
          toErrorMessage(
            err,
            $localize`:@@admin.users.create.error:No se pudo crear la cuenta de personal.`,
          ),
        );
      },
    });
  }

  /** Opens the detail dialog, loading the freshest copy via `GET /v1/user/:id`. */
  view(user: AdminUser): void {
    this.selectedUser.set(user);
    this.detailVisible = true;
    this.error.set(null);
    this.api.get<AdminUser>(`${USERS_PATH}/${user.id}`).subscribe({
      next: full => this.selectedUser.set(full),
      error: err =>
        this.error.set(
          toErrorMessage(
            err,
            $localize`:@@admin.users.detail.error:No se pudo cargar el detalle del usuario.`,
          ),
        ),
    });
  }

  /**
   * Changes a user's role via `PATCH /v1/user/:id/role`, then reflects the
   * updated user (and its new role) back into the table row on success.
   */
  changeRole(user: AdminUser, role: string): void {
    if (!role || role === this.currentRoleValue(user)) {
      return;
    }
    this.error.set(null);
    const body: ChangeUserRolePayload = { role };
    this.api.patch<AdminUser>(`${USERS_PATH}/${user.id}/role`, body).subscribe({
      next: updated => {
        this.users.update(list =>
          list.map(u => (u.id === updated.id ? updated : u)),
        );
        if (this.selectedUser()?.id === updated.id) {
          this.selectedUser.set(updated);
        }
      },
      error: err => {
        this.error.set(
          toErrorMessage(
            err,
            $localize`:@@admin.users.role.error:No se pudo cambiar el rol.`,
          ),
        );
        // Revert the dropdown to the user's current role: re-set the list to a
        // fresh array reference so the `[ngModel]` binding re-reads the
        // unchanged role and discards the optimistic selection.
        this.users.update(list =>
          list.map(u => (u.id === user.id ? { ...u } : u)),
        );
      },
    });
  }

  /** First role value of a user (drives the dropdown's selected value). */
  currentRoleValue(user: AdminUser): string | null {
    return user.roles?.[0]?.role ?? null;
  }

  /** Comma-joined role values for display in the table / dialog. */
  roleLabels(user: AdminUser): string {
    return (user.roles ?? []).map((r: UserRole) => r.role).join(', ');
  }

  /**
   * A user is pending onboarding when `onboardingCompletedAt` is null/absent —
   * i.e. an admin-created staff account that hasn't completed first-login
   * onboarding yet. Drives the Pending vs Active status pill.
   */
  isPending(user: AdminUser): boolean {
    return user.onboardingCompletedAt == null;
  }
}
