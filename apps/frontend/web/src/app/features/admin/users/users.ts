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
          <span class="page-eyebrow">ADMIN · USERS</span>
          <h1 class="page-title">Users</h1>
          <p class="page-subtitle">
            Review console accounts and manage their assigned roles.
          </p>
        </div>
        <p-button
          label="Create staff"
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
              <th>Username</th>
              <th>Email</th>
              <th>Name</th>
              <th>Role(s)</th>
              <th>Status</th>
              <th>Actions</th>
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
                  >
                    Pending
                  </span>
                } @else {
                  <span
                    class="pill pill--ok"
                    [attr.data-testid]="'status-' + user.id"
                  >
                    Active
                  </span>
                }
              </td>
              <td>
                <div class="row-actions">
                  <p-button
                    label="View"
                    size="small"
                    [text]="true"
                    (onClick)="view(user)"
                    [attr.data-testid]="'view-' + user.id"
                  />
                  <p-select
                    [options]="roleOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Change role"
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
                  No users found.
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </section>

      <p-dialog
        header="User detail"
        [(visible)]="detailVisible"
        [modal]="true"
        [style]="{ width: '28rem' }"
        data-testid="user-detail-dialog"
      >
        @if (selectedUser(); as u) {
          <div class="field-grid" data-testid="user-detail">
            <div class="field">
              <label>Username</label>
              <span>{{ u.username }}</span>
            </div>
            <div class="field">
              <label>Email</label>
              <span class="muted">{{ u.email }}</span>
            </div>
            <div class="field">
              <label>Name</label>
              <span>{{ u.firstName }}</span>
            </div>
            <div class="field">
              <label>Role(s)</label>
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
        header="Create staff account"
        [(visible)]="createVisible"
        [modal]="true"
        [style]="{ width: '32rem' }"
        [breakpoints]="{ '40rem': '92vw' }"
        (onHide)="onCreateHide()"
        data-testid="create-staff-dialog"
      >
        <p class="dialog-lede">
          Provision a console account. A temporary password is emailed to the
          new staff member, who sets their own on first sign-in.
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
              <label for="cs-firstName">First name</label>
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
                <small class="field-error">First name is required.</small>
              }
            </div>

            <div class="field">
              <label for="cs-firstLastName">Last name</label>
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
                <small class="field-error">Last name is required.</small>
              }
            </div>
          </div>

          <div class="field">
            <label for="cs-username">Username</label>
            <input
              pInputText
              id="cs-username"
              type="text"
              formControlName="username"
              autocomplete="off"
              placeholder="e.g. jdoe"
              fluid
            />
            @if (
              createForm.controls.username.invalid &&
              createForm.controls.username.touched
            ) {
              <small class="field-error">Username is required.</small>
            }
          </div>

          <div class="field">
            <label for="cs-email">Email</label>
            <input
              pInputText
              id="cs-email"
              type="email"
              formControlName="email"
              autocomplete="off"
              placeholder="name@hospital.org"
              fluid
            />
            @if (
              createForm.controls.email.invalid &&
              createForm.controls.email.touched
            ) {
              <small class="field-error">Enter a valid email address.</small>
            }
          </div>

          <div class="field">
            <label for="cs-role">Role</label>
            <p-select
              inputId="cs-role"
              formControlName="role"
              [options]="staffRoleOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select a staff role"
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
              <small class="field-error">Select a staff role.</small>
            }
          </div>

          <div class="field">
            <label for="cs-tempPassword">Temporary password</label>
            <p-password
              inputId="cs-tempPassword"
              formControlName="tempPassword"
              [feedback]="false"
              [toggleMask]="true"
              autocomplete="off"
              placeholder="At least 8 characters"
              fluid
            />
            @if (
              createForm.controls.tempPassword.invalid &&
              createForm.controls.tempPassword.touched
            ) {
              <small class="field-error">Use at least 8 characters.</small>
            }
          </div>

          <div class="dialog-actions">
            <p-button
              label="Cancel"
              [text]="true"
              type="button"
              (onClick)="createVisible = false"
              data-testid="create-staff-cancel"
            />
            <p-button
              type="submit"
              label="Create staff"
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
          `Staff account "${created.username}" created. A temporary password was emailed.`,
        );
        this.refreshCurrentPage();
      },
      error: (err: unknown) => {
        this.creating.set(false);
        this.createError.set(
          toErrorMessage(err, 'Could not create the staff account.'),
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
        this.error.set(toErrorMessage(err, 'Failed to load user detail.')),
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
        this.error.set(toErrorMessage(err, 'Failed to change role.'));
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
