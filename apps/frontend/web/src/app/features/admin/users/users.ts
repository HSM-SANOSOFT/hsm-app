import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RolesEnum } from '@hsm/common/enums';
import { ButtonModule } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { type TableLazyLoadEvent, TableModule } from 'primeng/table';

import { ApiClient } from '../../../core/api/api-client';
import {
  computePage,
  DEFAULT_PAGE_SIZE,
} from '../../../core/api/pagination.util';
import type {
  AdminUser,
  ChangeUserRolePayload,
  RoleOption,
  UserRole,
} from './users.types';

const USERS_PATH = '/user';

/**
 * Flattens the nested `RolesEnum` const object (`System`/`Clinical`/…) into a
 * flat option list for the role-change dropdown. Each group is an enum whose
 * *values* are the role strings the backend expects (`RolesType`); the label is
 * `<Group> / <Member>` so admins can tell same-named members apart.
 *
 * Built once at module load — `RolesEnum` is static.
 */
function buildRoleOptions(): RoleOption[] {
  const options: RoleOption[] = [];
  for (const [groupName, group] of Object.entries(RolesEnum)) {
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
 * Admin user-management screen (U11, R7/R3; AE4).
 *
 * Lists users with **server-side** pagination via PrimeNG `p-table`
 * (`[lazy]="true"` + `(onLazyLoad)`), lets an admin view a single user in a
 * dialog (`GET /v1/user/:id`), and change a user's role
 * (`PATCH /v1/user/:id/role`), reflecting the new role in the row on success.
 *
 * Admin-only access is enforced by the route's `adminGuard` (U9) — not
 * re-implemented here. R6 (a user cannot change their own role) is enforced
 * server-side via the distinct self-service `PATCH /v1/user/me` path.
 */
@Component({
  selector: 'app-admin-users',
  imports: [FormsModule, TableModule, Select, Dialog, ButtonModule],
  template: `
    <section class="admin-users" data-testid="admin-users">
      <h1>Users</h1>

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
            <th>Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-user>
          <tr [attr.data-testid]="'user-row-' + user.id">
            <td>{{ user.username }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.firstName }}</td>
            <td data-testid="user-roles">{{ roleLabels(user) }}</td>
            <td>
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
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="5">No users found.</td>
          </tr>
        </ng-template>
      </p-table>

      <p-dialog
        header="User detail"
        [(visible)]="detailVisible"
        [modal]="true"
        [style]="{ width: '28rem' }"
        data-testid="user-detail-dialog"
      >
        @if (selectedUser(); as u) {
          <dl data-testid="user-detail">
            <dt>Username</dt>
            <dd>{{ u.username }}</dd>
            <dt>Email</dt>
            <dd>{{ u.email }}</dd>
            <dt>Name</dt>
            <dd>{{ u.firstName }}</dd>
            <dt>Role(s)</dt>
            <dd>{{ roleLabels(u) }}</dd>
          </dl>
        }
      </p-dialog>
    </section>
  `,
})
export class AdminUsers {
  private readonly api = inject(ApiClient);

  /** Flattened `RolesEnum` options for the role-change dropdown. */
  readonly roleOptions = buildRoleOptions();

  readonly users = signal<AdminUser[]>([]);
  readonly totalRecords = signal(0);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly first = signal(0);
  readonly loading = signal(false);

  /** The user shown in the detail dialog (loaded via `GET /v1/user/:id`). */
  readonly selectedUser = signal<AdminUser | null>(null);
  detailVisible = false;

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

  /** Opens the detail dialog, loading the freshest copy via `GET /v1/user/:id`. */
  view(user: AdminUser): void {
    this.selectedUser.set(user);
    this.detailVisible = true;
    this.api.get<AdminUser>(`${USERS_PATH}/${user.id}`).subscribe({
      next: full => this.selectedUser.set(full),
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
}
