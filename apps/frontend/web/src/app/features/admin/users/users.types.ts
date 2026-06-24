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
}

/** Mirror of `@hsm/common` `ChangeUserRoleDto` — the PATCH body. */
export interface ChangeUserRolePayload {
  /** A flattened `RolesEnum` value (e.g. `'admin'`). */
  role: string;
}

/** A flattened `RolesEnum` entry for the role-change dropdown. */
export interface RoleOption {
  /** Human-readable label, e.g. `System / Admin`. */
  label: string;
  /** The role value sent to the backend, e.g. `'admin'`. */
  value: string;
}
