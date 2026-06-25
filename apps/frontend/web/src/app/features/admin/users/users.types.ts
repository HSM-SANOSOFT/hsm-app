/**
 * Feature-local mirrors of the backend user-management wire shapes.
 *
 * Following the `@hsm/web` rule (apps/frontend/web/CLAUDE.md): DTO/entity
 * *shapes* are mirrored locally rather than imported from `@hsm/common`
 * (its DTO/interface barrels drag in `@nestjs/swagger`, `@hsm/database`, and
 * Node globals that the browser build cannot type-check). Role *values*,
 * however, are imported directly from `@hsm/common/enums` — never re-declared —
 * so they stay in lockstep with the backend (see `users.ts`).
 *
 * Canonical sources:
 * - `packages/database/.../core/users/users.entity.ts` (`UserEntity`)
 * - `packages/database/.../core/users/user-roles.entity.ts` (`UserRoleEntity`)
 * - `apps/backend/api/.../core/users/user.controller.ts` (endpoints)
 *
 * Keep these in lockstep with the backend if the entities change.
 */

/** Mirror of `UserRoleEntity` (only the fields the list/view read). */
export interface UserRole {
  id: string;
  /** The role *value*, matching a `RolesEnum.*` member (e.g. `'admin'`). */
  role: string;
  /** Functional domain the role applies to (e.g. `'prod'`). */
  domain: string;
}

/**
 * Mirror of `UserEntity` as returned by `GET /v1/user` and `GET /v1/user/:id`
 * (only the fields the admin screen reads). `roles` is the related
 * `UserRoleEntity` rows — an array of `{ id, role, domain }`.
 */
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  firstLastName?: string;
  roles: UserRole[];
  /**
   * Pending-onboarding marker (mirror of the backend `onboardingCompletedAt`):
   * `null` for an admin-created staff account that still has to complete
   * first-login onboarding, an ISO timestamp once it has. Drives the
   * Pending/Active status pill in the list.
   */
  onboardingCompletedAt?: string | null;
}

/** Mirror of `@hsm/common` `ChangeUserRoleDto` — the PATCH body. */
export interface ChangeUserRolePayload {
  /** A flattened `RolesEnum` value (e.g. `'admin'`). */
  role: string;
}

/**
 * Mirror of `@hsm/common` `CreateStaffDto` — the `POST /v1/user/staff` body
 * (admin-only). `role` MUST be a STAFF role value (patient/family are rejected
 * server-side); `tempPassword` (min 8 chars) is emailed to the new staff member
 * and is never returned. The optional fields are sent only when filled.
 */
export interface CreateStaffPayload {
  username: string;
  email: string;
  firstName: string;
  firstLastName: string;
  /** A flattened STAFF `RolesEnum` value (e.g. `'doctor'`). */
  role: string;
  /** Min 8 chars; emailed to the new staff member, never returned. */
  tempPassword: string;
  secondName?: string;
  secondLastName?: string;
  phoneNumber?: string;
}

/** A flattened `RolesEnum` entry for the role-change dropdown. */
export interface RoleOption {
  /** Human-readable label, e.g. `System / Admin`. */
  label: string;
  /** The role value sent to the backend, e.g. `'admin'`. */
  value: string;
}
