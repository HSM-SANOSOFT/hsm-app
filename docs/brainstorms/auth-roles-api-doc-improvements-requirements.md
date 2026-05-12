---
date: 2026-05-08
topic: auth-roles-api-doc-improvements
---

# Auth, Roles & API Documentation Improvements

## Summary

Five targeted improvements to the auth/security foundation: replace the blanket dev bypass with a startup-generated developer token, lock in a complete department-based role taxonomy with branch-level grouping support, add a proper forbidden-role error to common, and redesign the `@ApiDocumentation` decorator API so standard errors are always documented and endpoint-specific ones are opt-in.

---

## Problem Frame

The current dev bypass (`return true` with no user injected into the request) causes `req.user` to be `undefined` in dev, breaking any controller that reads from it. There is also no practical way to test role-based access in dev since everything is let through unconditionally.

The role taxonomy is incomplete — only four branches exist (Default, System, Clinical, Administrative) — and there is no way to reference an entire branch as a group in `@Roles()`. As the system expands to cover all hospital departments, roles need to be locked in now so every feature built on top of them starts from a stable foundation.

The `@ApiDocumentation` decorator documents the same generic set of errors for every endpoint regardless of whether they apply, and requires callers to think about which errors to include rather than defaulting to the universal set. The `@hsm/common/errors` package is nearly empty, meaning role-access errors are not standardised across the system.

---

## Requirements

**Dev authentication**

- R1. Remove the blanket `return true` bypass from `AuthJwtAtGuard`, `AuthJwtRtGuard`, and `RolesGuard`. Bypassing without injecting a user makes `req.user` undefined in dev — endpoints that read it break silently.
- R2. Add `Developer` to `RolesSystemEnum`. The guard grants `Developer` full access (equivalent to `Admin`) only when `ENVIRONMENT === 'dev'`. Guard execution path: after JWT validation populates `req.user`, `RolesGuard` checks `req.user.roles.includes('developer') && ENVIRONMENT === 'dev'`; if both hold, `canActivate` returns `true`. In production the `Developer` role receives no special treatment — a token containing it is evaluated as any other role string, and a `Developer`-only `@Roles()` call would deny access normally.
- R3. On app startup in dev, generate an AT and an RT signed with the app's JWT secrets (`JWT_AT_SECRET`, `JWT_RT_SECRET`). The token payload must include at minimum: `sub` (set to a fixed sentinel value, e.g. `'dev'`), `email` (e.g. `'dev@localhost'`), `roles: [RolesSystemEnum.Developer]`, `iat`, and `exp` (30-day expiry from startup time). No database write. Both tokens are logged to the console at startup **only when stdout is a TTY** (i.e. suppressed in CI/non-interactive environments). `JWT_AT_SECRET` and `JWT_RT_SECRET` must be set to values that differ from any non-dev environment — never share secrets across environments.
- R4. Write both tokens to `.vscode/settings.local.json` (which must be gitignored — never `.vscode/settings.json`) as separate variables `at_token` and `rt_token` so all `.http` files can reference them. Existing `.http` files currently use `{{token}}`; those references must be updated to `{{at_token}}` as part of this work.

**Role taxonomy**

- R5. Replace the current four-branch role structure with eleven department branches. Each branch is its own enum. The `RolesEnum` composite is updated to include all branches. `RolesType` derives automatically from `RolesEnum` — no manual type changes needed.
- R6. Final locked role list:

  | Branch | Roles |
  |---|---|
  | System | Admin, Developer, Integration, Auditor |
  | Clinical | Doctor, Nurse, Technician, Therapist, Pharmacist, Patient |
  | Administrative | Admission, Billing, Scheduling, HumanResources |
  | Operational | Maintenance, Housekeeping, Security, IT |
  | Finance | Accountant, Payroll, FinancialAnalyst, InsuranceSpecialist |
  | Marketing | CommunityManager, Designer, CRMSpecialist |
  | Quality | QualityOfficer, ComplianceOfficer, ProcessAnalyst |
  | Legal | LegalCounsel, Paralegal |
  | Research | ClinicalResearcher, ResearchCoordinator, DataAnalyst |
  | SocialWork | SocialWorker, CaseManager, PatientAdvocate |
  | Hospitality | GuestRelations, PatientServices |

  **Migration note:** This table is the complete final state. The existing `RolesDefaultEnum` is removed — `Auditor` migrates to `RolesSystemEnum` (System branch), and `User` is dropped entirely. `RolesBranchEnum` is also removed (see Scope Boundaries). All other roles not present in the current `roles.enum.ts` — Technician, Therapist, Pharmacist, HumanResources, Developer, and all roles in the Operational, Finance, Marketing, Quality, Legal, Research, SocialWork, and Hospitality branches — are net-new additions.

- R7. `RoleFunctionalityEnum` (Prod, Staging, Dev) is untouched — it is integration-token-specific, not a user role.
- R8. The `Roles()` decorator accepts both specific role strings and branch enum objects. When a branch enum object is passed, the decorator calls `Object.values()` on it and stores the resulting flat `RolesType[]` strings in metadata via `SetMetadata` — the guard always receives a flat array of role strings and requires no changes. Mixed calls are valid: `@Roles(RolesEnum.Clinical, RolesEnum.Administrative.Billing)` — duplicate role values across arguments are deduplicated before storage. This enables:
  - `@Roles(RolesEnum.Administrative.Admission)` — grants access to a specific role
  - `@Roles(RolesEnum.Administrative)` — grants access to all administrative roles
  - `@Roles(RolesEnum.Clinical, RolesEnum.Administrative.Billing)` — all clinical roles plus billing
- R9. `RoleDomains` in `packages/common/src/types/roles.type.ts` derives the branch key union from the updated `RolesEnum` automatically (already handled by `keyof typeof RolesEnum`).

**Forbidden-role error**

- R10. Add an `InsufficientRolesException` (or `ForbiddenRoleException`) class to `packages/common/src/errors/` following the existing error file conventions. It represents a 403 response when a user's roles do not meet the endpoint's requirement. The exception response body must use a generic message (e.g. `'Insufficient permissions'`) — it must not expose the caller's current roles or the endpoint's required roles in the API response. Internal logging of those details is acceptable.
- R11. *Informational:* The 403 response that `@ApiDocumentation` always documents (per R12) should use the `InsufficientRolesException` error schema shape so Swagger reflects what the guard actually throws. No additional decorator registration is required beyond R12 — this is a documentation-schema alignment concern for the planner.

**`@ApiDocumentation` decorator redesign**

- R12. Standard errors (400 Bad Request, 401 Unauthorized, 403 Forbidden, 500 Internal Server Error, 502 Bad Gateway) are always auto-documented on every endpoint. Callers do not configure them.
- R13. Endpoint-specific errors are opt-in via named flags in an options object. Initially: `hasNotFound` (404). Additional flags (e.g. `hasConflict` for 409) can be added as features require them. **Migration note:** The current decorator already emits `ApiNotFoundResponse` unconditionally on every endpoint. Making 404 opt-in means existing call sites that legitimately return 404 will lose that documentation unless `{ hasNotFound: true }` is added. A one-time codebase audit of all `@ApiDocumentation` call sites to identify endpoints that return 404 is required before or during implementation to avoid a silent documentation regression.
- R14. The success response DTO remains explicit — passed as the first argument. Single-model is the primary API. Array (for OpenAPI `oneOf`) remains supported for endpoints that legitimately return two shapes (e.g. a login that returns either a user token or an integration token).
- R15. Auth header detection (Bearer access vs refresh token) remains auto-detected from guard metadata — no change to current behaviour.
- R16. Pagination / filter / sort flags remain as-is.

**`@Roles()` no-arg semantic**

- R17. No behaviour change. `@Roles()` with no arguments, or no `@Roles()` decorator at all, means any authenticated user can access the endpoint. This is intentional and consistent with the current guard logic.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3.** Given `ENVIRONMENT=dev`, the app has just started, and stdout is a TTY: both AT and RT are logged to the console in the form `DEV_AT=<token>` / `DEV_RT=<token>`. When a developer copies the AT into the REST client and sends a request to a protected endpoint, `AuthJwtAtGuard` validates the JWT signature normally, the strategy extracts `{ id: 'dev', email: 'dev@localhost', roles: ['developer'] }` into `req.user`, and `RolesGuard` sees `ENVIRONMENT==='dev'` + `roles.includes('developer')` and returns `true`. The endpoint handler receives a populated `req.user`.
- AE2. **Covers R2.** Given `ENVIRONMENT=production` and a token with payload `{ sub: 'dev', roles: ['developer'] }`: when a request arrives at an endpoint decorated with `@Roles(RolesEnum.System.Admin)`, `RolesGuard` does not enter the dev branch. It evaluates `requiredRoles.some(role => user.roles.includes(role))` — `['admin'].some(r => ['developer'].includes(r))` returns `false` — and access is denied with 403.
- AE3. **Covers R8.** Given `@Roles(RolesEnum.Clinical)` applied to an endpoint: at decoration time the decorator calls `Object.values(RolesClinicalEnum)` → `['doctor', 'nurse', 'technician', 'therapist', 'pharmacist', 'patient']` and stores that flat array via `SetMetadata`. When a user with `roles: ['nurse']` makes a request, `RolesGuard` evaluates `['doctor','nurse',...].some(r => ['nurse'].includes(r))` → `true` → access granted.
- AE4. **Covers R8.** Same endpoint as AE3. When a user with `roles: ['accountant']` makes a request, `RolesGuard` evaluates the same expanded array — `accountant` is not in `RolesClinicalEnum` — returns `false` → access denied with 403.
- AE5. **Covers R12, R13.** Given `@ApiDocumentation(UserDto)` on a `GET /users` endpoint with no options object: the Swagger UI shows response schemas for 200 (UserDto), 400, 401, 403, 500, 502. There is no 404 entry.
- AE6. **Covers R13.** Given `@ApiDocumentation(UserDto, { hasNotFound: true })` on a `GET /users/:id` endpoint: the Swagger UI shows 200 (UserDto), 400, 401, 403, **404**, 500, 502.

---

## Success Criteria

- A developer can start the API in dev mode, observe the AT logged to the console, copy it into the REST client, and immediately call any protected endpoint with the correct `req.user` populated — no database user creation required.
- All 38 roles across 11 departments are defined in `packages/common/src/enums/roles.enum.ts` and consumed via `RolesType` without manual type maintenance.
- `@Roles(RolesEnum.Clinical)` grants access to all clinical roles and is a valid call-site pattern.
- `@ApiDocumentation(SuccessDto)` on a new endpoint auto-documents the full standard error set with no additional configuration.
- A planner picking up this document can derive the complete scope of changes needed in `@hsm/common`, `@hsm/api`, and `.vscode/` without inventing any product behaviour.

---

## Scope Boundaries

- Client-side token refresh handling — the client implements the 401 → /auth/refresh → retry cycle; the server does not auto-refresh.
- Server-side auto-refresh (sending RT on every request) — rejected; RT exposure increases attack surface without meaningful benefit.
- `RoleFunctionalityEnum` changes — out of scope, integration-specific.
- `RolesBranchEnum` and `RolesDefaultEnum` — **in scope for removal** as part of R5/R6. Both become redundant: `RolesEnum` replaces the branch index, and `RolesDefaultEnum`'s roles are either migrated (Auditor → System) or dropped (User).
- Oracle DB changes — never in scope per project constraint.
- Tests for the new roles or decorator — out of scope for this brainstorm; planner decides test strategy.
- Changing `@Roles()` no-arg semantic — explicitly kept as current behaviour.
- A dedicated `/auth/dev-token` HTTP endpoint — dev tokens are generated at startup, not on demand.

---

## Key Decisions

- **`Developer` role is env-gated in the guard, not in the token:** The token payload is the same shape in all environments; the special behaviour lives in the guard's `canActivate` check. This keeps token issuance simple and avoids environment-specific token signing.
- **`Roles()` decorator handles branch expansion, not the guard:** Expanding a branch enum to its values happens at decoration time (when `@Roles(RolesEnum.Clinical)` is applied), not at request time in the guard. The guard continues to receive a flat array of role strings — no guard changes needed for branch grouping. **Implication:** branch expansion is static — it captures the enum values at the time the module loads. If a new role is later added to a branch enum, every endpoint decorated with that branch's `@Roles()` call automatically grants access to the new role without any code change. This is a deliberate, ergonomic property; teams adding a role to a branch should audit existing branch-level `@Roles()` usages to confirm the new access grant is appropriate at each call site.
- **Standard errors always included, opt-in for endpoint-specific:** Reversing the current implicit model (caller must know which errors apply) reduces configuration surface and makes new endpoints correct by default.
- **`RolesEnum` composite style kept (`RolesEnum.Administrative.Admission`):** Preferred over a `RolesBranchEnum` key-enum pattern — more readable at call sites, consistent with existing code.

---

## Dependencies / Assumptions

- Dev token generation requires `JWT_AT_SECRET` and `JWT_RT_SECRET` to be set in the dev environment — already required for the app to start.
- Dev secrets (`JWT_AT_SECRET`, `JWT_RT_SECRET`) must differ from any non-dev environment secret. Sharing secrets across environments would make a logged dev token valid against staging or production.
- The `Roles()` decorator type signature change (accepting enum objects alongside role strings) must remain compatible with the existing `RolesType` — planner verifies TypeScript signature.
- `InsufficientRolesException` follows the same class-validator / NestJS exception pattern as `templates.error.ts` in `packages/common/src/errors/`.
- The role taxonomy in R6 reflects the implementer's best judgment of the hospital org structure. It has not been formally validated against the hospital's HR or access control data. Implementers should verify role naming with operational stakeholders (at least one clinical and one administrative representative) before shipping.
- Controllers or services that perform database lookups keyed on `req.user.id` (or `req.user.sub`) will fail in dev because the startup-generated token has `sub: 'dev'` with no corresponding database record. Either seed a matching DB record for this sentinel identity, or document that dev-mode runs cannot exercise DB-keyed flows using the dev token.
- `.vscode/settings.local.json` must be added to `.gitignore` if not already present. This file stores generated dev tokens and must never be committed.
- An audit of all endpoints with no `@Roles()` decorator is recommended before shipping, given the expanded role surface. With 38 roles across departments, "any authenticated user" encompasses a much broader population than the original four-branch taxonomy — confirm that undecorated endpoints are intentionally open to all roles.

---

## Outstanding Questions

### Resolve Before Planning

- None.

### Deferred to Planning

- [Affects R3][Technical] Where exactly does dev token generation live — `AuthModule.onModuleInit`, `AuthService`, or app bootstrap in `main.ts`? Planner decides based on DI availability.
- [Affects R8][Technical] TypeScript signature for the expanded `Roles()` decorator — how to type the overload that accepts `typeof RolesEnum.Clinical` alongside `RolesType` string values without losing type safety.
- [Affects R10][Technical] Exact class name and HTTP status mapping for the new error — `InsufficientRolesException` vs `ForbiddenRoleException`; planner checks existing error conventions in the codebase.

### From doc review — Resolve Before Planning

- [Affects R6][Product] **Patient in Clinical branch:** `Patient` is listed alongside clinical staff (`Doctor`, `Nurse`, etc.) in `RolesClinicalEnum`. A branch-level grant `@Roles(RolesEnum.Clinical)` automatically includes `Patient`. In a hospital system, patients are service recipients with fundamentally different identity and access requirements from clinical staff. Should `Patient` be moved to its own branch (e.g. `PatientPortal`) so clinical-staff grants never implicitly include patient access? Or is Patient intentionally in Clinical for a specific reason?
- [Affects R2, R3][Security] **Developer role — sole production control:** The guard env-check (`ENVIRONMENT === 'dev'`) is the only production-side safeguard against Developer role elevation. The token issuance path (login, refresh) does not strip or reject the `Developer` role in non-dev environments. Should the token issuance service also reject `Developer` as an assignable role when `ENVIRONMENT !== 'dev'`? Should the guard additionally hard-deny `Developer` tokens in production rather than treating them as ordinary role strings?
- [Affects R12][Product] **502 always-on applicability:** R12 includes 502 Bad Gateway in the always-documented standard error set. 502 is a proxy/gateway error meaningful only when the API sits behind a reverse proxy that can independently return it. Does the HSM API topology guarantee that 502 is applicable to every endpoint? If not, 502 should be moved to opt-in (like 404) or removed from the standard set.
- [Affects R5, R6][Data] **Existing role string migration:** R5 replaces the current four-branch role structure. If any database records, seed data, or live JWT tokens contain old role strings (e.g. `'user'`, `'auditor'` in their current `RolesDefaultEnum` values), they will break or behave unexpectedly after this change. Are there live records with existing role values that need migration or invalidation?

### From doc review — Deferred to Planning

- [Affects R13][Technical] **Opt-in flag scalability:** The named-boolean-flag pattern (`hasNotFound`, `hasConflict`) accumulates one flag per HTTP status code. An alternative is `additionalErrors: HttpStatus[]` which accepts an array of additional status codes, requiring no further decorator changes as new error types emerge. Planner evaluates whether the flag pattern is sufficient given the number of endpoint-specific errors expected across the codebase.
