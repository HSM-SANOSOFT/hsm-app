/**
 * Feature-local mirrors of the user self-service wire shapes (U10).
 *
 * The canonical definitions live in `@hsm/common`
 * (`packages/common/src/dtos/`: `UpdateOwnProfileDto`, `ChangePasswordDto`).
 * Per `apps/frontend/web/CLAUDE.md`, those DTO classes carry NestJS/Swagger
 * decorators and server-only transitive imports that the Angular build cannot
 * consume, so we re-declare the over-the-wire JSON shapes here as plain
 * interfaces — kept 1:1 with the backend field names — instead of editing the
 * shared `core/api/response.ts`.
 *
 * Keep these in lockstep with the `@hsm/common` source if the contract changes.
 */

/**
 * Mirror of `@hsm/common` `UpdateOwnProfileDto`.
 *
 * Self-service profile update — name/email only. There is intentionally NO
 * role field here: role is immutable from self-service (R6 / AE4).
 */
export interface UpdateOwnProfilePayload {
  firstName?: string;
  email?: string;
}

/** Mirror of `@hsm/common` `ChangePasswordDto`. */
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
