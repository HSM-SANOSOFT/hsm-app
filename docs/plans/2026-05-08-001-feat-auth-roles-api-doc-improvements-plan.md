---
title: "feat: Auth foundation — role taxonomy, dev tokens, guard refactor, and API documentation"
type: feat
status: active
date: 2026-05-08
origin: docs/brainstorms/2026-05-08-auth-roles-api-doc-improvements-requirements.md
---

# feat: Auth foundation — role taxonomy, dev tokens, guard refactor, and API documentation

## Summary

Implements five targeted improvements to the HSM API's auth/security foundation: a 12-branch role taxonomy (40 roles) replacing the 4-branch structure, a startup-generated developer token replacing the blanket dev guard bypass, a `RolesGuard` that environment-gates the `Developer` role with a hard-deny in production, an expanded `@Roles()` decorator accepting branch-level grants, an `InsufficientRolesException` for standardised 403 responses, and an `@ApiDocumentation` decorator with always-on standard errors and opt-in additional error codes. Dev token generation lives in `AuthDevService.onModuleInit` (not `main.ts`) and uses the NestJS `Logger` class throughout.

---

## Problem Frame

The current dev bypass (`return true` in every guard) leaves `req.user` undefined in dev, breaking any controller that reads from it. The role taxonomy is incomplete and has no branch-level grant ergonomics. The `@ApiDocumentation` decorator documents the same generic error set unconditionally, and `@hsm/common/errors` has no role-access exception type. (See origin: `docs/brainstorms/2026-05-08-auth-roles-api-doc-improvements-requirements.md`)

---

## Requirements

- R1. Remove the blanket `return true` bypass from `AuthJwtAtGuard`, `AuthJwtRtGuard`, and `RolesGuard`.
- R2. Add `Developer` to `RolesSystemEnum`. Guard grants `Developer` full access only when `ENVIRONMENT === 'dev'`; in production the guard hard-denies any token carrying the Developer role.
- R3. On app startup in dev, generate an AT and RT signed with `JWT_AT_SECRET`/`JWT_RT_SECRET`, 30-day expiry. Payload: complete `IUnsignedUser` shape with `sub: 'dev'`, `email: 'dev@localhost'`, `roles: [RolesSystemEnum.Developer]`. Log to NestJS Logger (not `console.log`). Write `{ at_token, rt_token }` to `.vscode/settings.local.json`.
- R4. Write both tokens to `.vscode/settings.local.json` (gitignored). Update all `.http` files from `{{token}}` to `{{at_token}}`; `/auth/refresh` uses `{{rt_token}}`.
- R5. Replace the 4-branch role structure with 12 department branches. Remove `RolesBranchEnum` and `RolesDefaultEnum`.
- R6. 40 roles across 12 branches as specified in the origin document, plus `RolesPatientEnum` with `Patient` and `Family` (Patient is not in Clinical).
- R7. `RoleFunctionalityEnum` (Prod, Staging, Dev) is untouched.
- R8. `@Roles()` accepts both role strings and branch enum objects. Branch objects are expanded via `Object.values()` at decoration time and deduplicated.
- R9. `RoleDomains` type derives from the updated `RolesEnum` automatically.
- R10. Add `InsufficientRolesException` (extends `ForbiddenException`, message `'Insufficient permissions'`) to `packages/common/src/errors/`.
- R12. Standard errors (400, 401, 403, 500) always documented on every endpoint.
- R13. Opt-in additional errors via `{ additionalErrors: HttpStatus[] }` in `@ApiDocumentation` options.
- R14. Success response DTO remains explicit (first argument). Array of models supported for `oneOf`.
- R15. Auth header detection (Bearer AT vs RT) remains auto-detected from guard metadata.
- R16. Pagination/filter/sort flags moved into the options object, behaviour unchanged.

**Origin acceptance examples:** AE1–AE6 (covers R1–R3, R8, R12–R13)

---

## Scope Boundaries

- Client-side token refresh handling — out of scope.
- `RoleFunctionalityEnum` changes — out of scope.
- Oracle DB changes — never in scope per project constraint.
- Tests for all new roles — test coverage limited to the `AuthDevService` unit.
- A dedicated `/auth/dev-token` HTTP endpoint — dev tokens are generated at startup only.
- `@Roles()` no-arg semantic change — explicitly unchanged: no roles = any authenticated user.

---

## Context & Research

### Relevant Code and Patterns

- `apps/backend/api/src/modules/security/auth/auth.module.ts` — AuthModule, target for new `AuthDevService` provider
- `apps/backend/api/src/modules/security/auth/auth.service.ts` — `private readonly logger = new Logger(AuthService.name)` — canonical Logger pattern
- `apps/backend/api/src/modules/security/auth/auth.strategy.ts` — `validate()` maps `sub → id`; dev payload must match `IUnsignedUser` shape
- `apps/backend/worker/src/modules/core/docs/generation/generation.service.ts` — sole existing `onModuleInit` in the codebase; `@Injectable()` service pattern (not on `@Module()` class)
- `apps/backend/api/src/modules/security/auth/auth.service.spec.ts` — canonical mock array for auth tests: `JwtService` as `useValue`, named-connection tokens
- `apps/backend/api/src/modules/security/roles/roles.guard.ts` — RolesGuard, imports `InsufficientRolesException`
- `apps/backend/api/src/decorator/api-documentation.decorator.ts` — ApiDocumentation, already redesigned
- `packages/common/src/enums/roles.enum.ts` — 12-branch taxonomy, already implemented
- `packages/common/src/errors/security-roles.error.ts` — `InsufficientRolesException`, already implemented

### Institutional Learnings

- `docs/solutions/developer-experience/2026-05-06-nestjs-unit-test-mocking-patterns.md` — `JwtService` mock must use `useValue`; named-connection token requires `DatabasesEnum` arg
- `docs/solutions/developer-experience/2026-05-07-http-test-files-vscode-rest-client-convention.md` — `.vscode/settings.json` uses `at_token`/`rt_token`; `settings.local.json` is the per-developer local override file
- `docs/solutions/test-failures/2026-05-06-nestjs-config-joi-validation-dotenv-conflict.md` — new env vars added to `@hsm/config` must also be added to `apps/backend/api/src/test-setup.ts`

---

## Key Technical Decisions

- **`AuthDevService` as a dedicated `@Injectable()` provider, not `AuthModule` itself implementing `OnModuleInit`**: The codebase has zero examples of a `@Module()` class implementing lifecycle hooks. Using a dedicated service is consistent with `GenerationService` in the worker and avoids the awkward self-provision pattern. (see origin: Key Decisions)
- **NestJS `Logger` at `log` level for dev token output**: `this.logger.log()` is visible at all dev log levels and routes through NestJS's structured logger (not `console.log`). Raw token strings are included in the log message — this is dev-only and TTY-gated.
- **Dev token payload aligned with `IUnsignedUser`**: The current `main.ts` payload omits `username`, `firstName`, `firstLastName`. After `AuthJwtATStrategy.validate()` maps `sub → id`, the resulting `ISignedUser` would be missing fields. The plan specifies a complete payload matching `IUnsignedUser` shape.
- **`process.stdout.isTTY` check retained**: Guards against token output in CI/non-interactive environments. NestJS Logger is used instead of `console.log`, but the TTY gate remains.
- **Guard throws `InsufficientRolesException` instead of returning `false`**: NestJS converts `canActivate` returning `false` to a generic 403. Throwing explicitly gives control over the response message and error shape. (see origin: Key Decisions)
- **`additionalErrors: HttpStatus[]` array pattern for `@ApiDocumentation`**: Preferred over named boolean flags; no decorator changes required as new optional status codes are added. (see origin: Key Decisions)
- **Branch expansion at decoration time**: `Object.values()` is called when `@Roles(RolesEnum.Clinical)` is applied, not at request time. The guard receives a flat `RolesType[]` and requires no changes. (see origin: Key Decisions)

---

## Open Questions

### Resolved During Planning

- **Where should dev token generation live?** `AuthDevService.onModuleInit` (user-specified). `JwtService` is available via `JwtModule.register({ global: true })`.
- **What logger to use in dev token generation?** NestJS `Logger` (user-specified), `this.logger.log()`.
- **`process.cwd()` inside `onModuleInit`?** Resolves to workspace root during `pnpm start:dev` — same as the current `main.ts` behaviour. `.vscode/settings.local.json` at repo root is intentional.
- **Dev token payload shape?** Aligned with `IUnsignedUser`: `sub`, `username`, `email`, `firstName`, `firstLastName`, `roles`. Avoids a partial `ISignedUser` after `validate()` strips `sub` and maps it to `id`.
- **Patient branch location?** Separate `RolesPatientEnum` branch, not inside `RolesClinicalEnum`. Contains `Patient` and `Family`. (user-specified)
- **Developer role in production?** Guard hard-deny + token issuance rejection (user-specified, see R2).
- **502 in standard error set?** Opt-in via `additionalErrors` — not always-on (user-specified).

### Deferred to Implementation

- **`ISignedUser` interface completeness check**: If `username`/`firstName`/`firstLastName` are not in the interface, the dev payload assignment will be a type error. Implementer verifies and adjusts the interface or payload fields accordingly.

---

## Implementation Units

### U1. Role taxonomy — 12-branch `RolesEnum`

**Goal:** Replace the 4-branch enum structure with 12 department branches and 40 roles. Remove `RolesBranchEnum` and `RolesDefaultEnum`.

**Requirements:** R5, R6, R7, R9

**Dependencies:** None

**Files:**
- Modify: `packages/common/src/enums/roles.enum.ts`
- Modify: `packages/common/src/types/roles.type.ts` (verify auto-derives — no manual changes expected)

**Approach:**
- 12 named enum exports: `RolesSystemEnum`, `RolesClinicalEnum`, `RolesAdministrativeEnum`, `RolesOperationalEnum`, `RolesFinanceEnum`, `RolesMarketingEnum`, `RolesQualityEnum`, `RolesLegalEnum`, `RolesResearchEnum`, `RolesSocialWorkEnum`, `RolesHospitalityEnum`, `RolesPatientEnum`
- `RolesEnum` composite const object maps each branch name to its enum. `RolesDefaultEnum` and `RolesBranchEnum` are removed entirely
- `RoleFunctionalityEnum` is left untouched
- `RolesType` in `roles.type.ts` auto-derives via `RoleValues<(typeof RolesEnum)[keyof typeof RolesEnum]>` — verify compilation

**Patterns to follow:**
- `packages/common/src/enums/roles.enum.ts` (existing structure — keep `as const` on `RolesEnum`)

**Test scenarios:**
- Test expectation: none — pure enum data; no behavioural logic. TypeScript compilation (`pnpm --filter @hsm/api build`) is the verification gate.

**Verification:**
- `packages/common/src/enums/roles.enum.ts` exports 12 named enum types and the `RolesEnum` composite. `RolesDefaultEnum` and `RolesBranchEnum` are absent. `pnpm --filter @hsm/api build` compiles without errors. `RolesType` resolves to all 40 role string literals.

---

### U2. `InsufficientRolesException` in `@hsm/common/errors`

**Goal:** Add a standardised 403 exception class that `RolesGuard` throws when roles don't match, with a generic message that exposes no role details.

**Requirements:** R10

**Dependencies:** None

**Files:**
- Create: `packages/common/src/errors/security-roles.error.ts`
- Modify: `packages/common/src/errors/index.ts`

**Approach:**
- `InsufficientRolesException extends ForbiddenException`, constructor calls `super('Insufficient permissions')`. No exposed fields.
- Add `export * from './security-roles.error'` to the barrel.

**Patterns to follow:**
- `packages/common/src/errors/templates.error.ts` — exception class style, no inline docs

**Test scenarios:**
- Test expectation: none — trivial wrapper with no logic. Compilation is the verification gate.

**Verification:**
- `InsufficientRolesException` is importable via `@hsm/common/errors` and throws a 403 with message `'Insufficient permissions'` when constructed.

---

### U3. Remove dev bypass from AT and RT guards

**Goal:** `AuthJwtAtGuard` and `AuthJwtRtGuard` no longer return `true` in dev. They always perform real JWT validation; only `@Public()` endpoints skip it.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Modify: `apps/backend/api/src/guards/auth.guard.ts`

**Approach:**
- Remove `if (envs.ENVIRONMENT === 'dev') { return true; }` from `canActivate` in both guards
- Remove the now-unused `envs` import if it was only used for that check

**Patterns to follow:**
- Existing `@Public()` fast-path logic in both guards

**Test scenarios:**
- Test expectation: none — the behavioural proof is that the dev token (generated by U6) passes guard validation end-to-end. Unit test coverage of the guard's `canActivate` logic already exists in `auth.guard.spec.ts` if present.

**Verification:**
- `auth.guard.ts` contains no `envs.ENVIRONMENT === 'dev'` check. A valid dev JWT passes both guards without changes to the guard logic.

---

### U4. `RolesGuard` — Developer env-gating and `InsufficientRolesException`

**Goal:** `RolesGuard` env-gates the `Developer` role (full access in dev, hard-deny in production) and throws `InsufficientRolesException` instead of returning `false` on role mismatch.

**Requirements:** R1, R2, R10

**Dependencies:** U1, U2

**Files:**
- Modify: `apps/backend/api/src/modules/security/roles/roles.guard.ts`

**Approach:**
- Remove `if (envs.ENVIRONMENT === 'dev') { return true; }` bypass
- After extracting `user` from request: if `user.roles.includes(RolesEnum.System.Developer)` and `ENVIRONMENT !== 'dev'`, throw `ForbiddenException('Developer role is not permitted in this environment')`; if `ENVIRONMENT === 'dev'`, return `true`
- Replace `return requiredRoles!.some(role => user.roles.includes(role))` with: if match fails, throw `new InsufficientRolesException()`; else return `true`

**Patterns to follow:**
- `apps/backend/api/src/modules/security/roles/roles.guard.ts` (existing guard structure)

**Test scenarios:**
- Happy path: user with `roles: ['admin']` on a `@Roles('billing')` endpoint in prod → isAdmin path returns true
- Happy path: user with `roles: ['billing']` on a `@Roles(RolesEnum.Administrative.Billing)` endpoint → roles match, returns true
- Error path — InsufficientRolesException: user with `roles: ['doctor']` on a `@Roles('billing')` endpoint → `InsufficientRolesException` is thrown (not `return false`)
- Developer in dev: user with `roles: ['developer']`, `ENVIRONMENT === 'dev'` → returns `true` regardless of required roles
- Developer in prod: user with `roles: ['developer']`, `ENVIRONMENT === 'production'` → throws `ForbiddenException('Developer role is not permitted in this environment')`
- No required roles (`@Roles()` with no args): user with any roles → returns `true` (any authenticated user)

**Verification:**
- `canActivate` contains no unconditional dev bypass. A developer-role request in prod throws. Roles mismatch throws `InsufficientRolesException`. Existing test suite passes.

---

### U5. Expand `@Roles()` decorator for branch-level grants

**Goal:** `@Roles()` accepts both specific role strings and branch enum objects. A branch enum object expands to all its values at decoration time.

**Requirements:** R8

**Dependencies:** U1

**Files:**
- Modify: `apps/backend/api/src/modules/security/roles/roles.decorator.ts`

**Approach:**
- Change spread parameter type to accept `RolesType | Record<string, string>`
- For each argument: if `typeof item === 'string'`, push to flat array; else `push(...Object.values(item))`
- Deduplicate with `[...new Set(flat)]` before `SetMetadata`

**Patterns to follow:**
- `apps/backend/api/src/modules/security/roles/roles.decorator.ts` (existing shape)

**Test scenarios:**
- `Roles(RolesEnum.Clinical)` → metadata contains all 5 clinical role strings
- `Roles(RolesEnum.System.Admin)` → metadata contains `['admin']`
- `Roles(RolesEnum.Clinical, RolesEnum.Administrative.Billing)` → clinical roles + `'billing'`, deduplicated
- `Roles()` with no args → metadata is `[]`
- Duplicate: `Roles('admin', RolesEnum.System)` → `'admin'` appears once after dedup

**Verification:**
- `Reflector.getAllAndOverride(ROLES_KEY)` returns a flat deduped `RolesType[]`. `Roles(RolesEnum.Clinical)` produces 5 entries. No guard changes required.

---

### U6. `AuthDevService` — `onModuleInit`, NestJS Logger, token file write

**Goal:** Move dev token generation from `main.ts` into a dedicated `AuthDevService` that implements `OnModuleInit`. Uses NestJS `Logger`, not `console.log`. In non-dev environments `onModuleInit` is a no-op.

**Requirements:** R2, R3, R4

**Dependencies:** U1

**Files:**
- Create: `apps/backend/api/src/modules/security/auth/auth-dev.service.ts`
- Modify: `apps/backend/api/src/modules/security/auth/auth.module.ts`
- Create: `apps/backend/api/src/modules/security/auth/auth-dev.service.spec.ts`

**Approach:**
- `AuthDevService` is `@Injectable()` and implements `OnModuleInit` from `@nestjs/common`
- Constructor injects `JwtService` (available globally from `JwtModule.register({ global: true })`)
- `private readonly logger = new Logger(AuthDevService.name)`
- `async onModuleInit()`: if `envs.ENVIRONMENT !== 'dev'`, return immediately
- Dev token payload (complete `IUnsignedUser` shape):
  ```
  sub: 'dev', username: 'dev', email: 'dev@localhost',
  firstName: 'Dev', firstLastName: 'User',
  roles: [RolesSystemEnum.Developer]
  ```
- Sign AT with `JWT_AT_SECRET`, RT with `JWT_RT_SECRET`, both `expiresIn: '30d'`
- `if (process.stdout.isTTY)` → `this.logger.log('DEV AT: <token>')` and `this.logger.log('DEV RT: <token>')`
- Write `{ at_token, rt_token }` to `.vscode/settings.local.json` using `fs.mkdirSync` (recursive) then `fs.writeFileSync`
- `path.join(process.cwd(), '.vscode', 'settings.local.json')` — resolves to workspace root
- Add `AuthDevService` to `AuthModule.providers`

**Patterns to follow:**
- `apps/backend/worker/src/modules/core/docs/generation/generation.service.ts` — `OnModuleInit` on an `@Injectable()` service
- `apps/backend/api/src/modules/security/auth/auth.service.ts` — Logger declaration, `Logger(ClassName.name)` pattern
- `apps/backend/api/src/modules/security/auth/auth.service.spec.ts` — `JwtService` mock as `useValue`

**Test scenarios:**
- Happy path — dev env: `ENVIRONMENT='dev'`, `jwtService.signAsync` returns mock tokens, `process.stdout.isTTY = true` → `signAsync` called twice (AT + RT), `logger.log` called twice with token values, `fs.writeFileSync` called with correct path and `{ at_token, rt_token }` JSON
- Happy path — non-dev env: `ENVIRONMENT='production'` → `signAsync` never called, no file write, no log output
- Edge case — non-TTY: `ENVIRONMENT='dev'`, `process.stdout.isTTY = false` → tokens signed and file written, but `logger.log` token output not called
- Edge case — `.vscode/` dir creation: `fs.mkdirSync` called with `{ recursive: true }` regardless of whether dir exists

**Verification:**
- `AuthDevService` is listed in `AuthModule.providers`. `onModuleInit` completes without error when `JwtService` mock returns tokens. Non-dev env is a no-op. `pnpm --filter @hsm/api test` passes for the new spec.

---

### U7. Clean up `main.ts` — remove `generateDevTokens` and orphaned imports

**Goal:** Remove the `generateDevTokens` function and its conditional call from `main.ts`. Remove four imports that are only used by that function. Fix Biome import-sort diagnostic.

**Requirements:** R3 (implementation concern — generation lives in AuthDevService after U6)

**Dependencies:** U6

**Files:**
- Modify: `apps/backend/api/src/main.ts`

**Approach:**
- Remove `async function generateDevTokens(jwtService: JwtService)` (full function body)
- Remove the `if (envs.ENVIRONMENT === 'dev') { await generateDevTokens(app.get(JwtService)); }` call in `bootstrap`
- Remove imports: `JwtService` from `@nestjs/jwt`, `* as fs` from `fs`, `* as path` from `path`, `RolesSystemEnum` from `@hsm/common/enums`
- Run Biome format/sort to resolve the import-sort diagnostic

**Patterns to follow:**
- `apps/backend/api/src/main.ts` — existing `bootstrap` function structure

**Test scenarios:**
- Test expectation: none — pure cleanup. `pnpm --filter @hsm/api build` with no errors is the gate.

**Verification:**
- `main.ts` contains no `generateDevTokens` reference, no `fs`/`path`/`JwtService`/`RolesSystemEnum` imports. Biome lint passes (`pnpm lint`). Build passes.

---

### U8. `AuthService.generateTokens` — reject `Developer` role in non-dev

**Goal:** Token issuance rejects the Developer role when `ENVIRONMENT !== 'dev'`, providing a second production-side safeguard beyond the guard hard-deny.

**Requirements:** R2

**Dependencies:** U1

**Files:**
- Modify: `apps/backend/api/src/modules/security/auth/auth.service.ts`

**Approach:**
- At the top of `generateTokens()`, cast `user.roles` as `string[]` and check `.includes(RolesEnum.System.Developer)` with `envs.ENVIRONMENT !== 'dev'`
- Throw `ForbiddenException('Developer role cannot be assigned in this environment')` if both hold

**Patterns to follow:**
- `apps/backend/api/src/modules/security/auth/auth.service.ts` — existing early-validation pattern

**Test scenarios:**
- Error path: `generateTokens({ ..., roles: ['developer'] })` with `ENVIRONMENT='production'` → throws `ForbiddenException`
- Happy path: same call with `ENVIRONMENT='dev'` → tokens are generated normally

**Verification:**
- `generateTokens` throws when called with Developer role in non-dev. Existing auth service tests still pass.

---

### U9. `@ApiDocumentation` decorator redesign

**Goal:** Standard errors (400, 401, 403, 500) always documented. Optional additional errors via `{ additionalErrors: HttpStatus[] }` in options object. `hasPagination`/`hasFilter`/`hasSort` moved into the same options object.

**Requirements:** R12, R13, R14, R15, R16

**Dependencies:** U2

**Files:**
- Modify: `apps/backend/api/src/decorator/api-documentation.decorator.ts`

**Approach:**
- New signature: `ApiDocumentation(models?: ClassType | ClassType[], options: ApiDocumentationOptions = {})`
- `ApiDocumentationOptions`: `{ additionalErrors?: HttpStatus[], hasPagination?: boolean, hasFilter?: boolean, hasSort?: boolean }`
- Always emit: `ApiBadRequestResponse`, `ApiUnauthorizedResponse`, `ApiForbiddenResponse`, `ApiInternalServerErrorResponse`
- Conditionally emit based on `additionalErrors.includes(...)`: `ApiNotFoundResponse` (404), `ApiBadGatewayResponse` (502)
- Auth header detection logic (IS_PUBLIC_KEY, GUARDS_METADATA, refresh guard check) remains unchanged

**Patterns to follow:**
- `apps/backend/api/src/decorator/api-documentation.decorator.ts` (existing Reflector usage, decorator composition pattern)

**Test scenarios:**
- `@ApiDocumentation(UserDto)` → Swagger shows 200, 400, 401, 403, 500. No 404, no 502.
- `@ApiDocumentation(UserDto, { additionalErrors: [HttpStatus.NOT_FOUND] })` → adds 404 to the above set
- `@ApiDocumentation(UserDto, { additionalErrors: [HttpStatus.BAD_GATEWAY] })` → adds 502 to standard set
- `@ApiDocumentation(undefined, { additionalErrors: [HttpStatus.NOT_FOUND] })` → 200 (empty data), 400, 401, 403, 404, 500
- Bearer auth scheme is `access_token` on normal endpoints, `refresh_token` on `@UseGuards(AuthJwtRtGuard)` endpoints

**Verification:**
- Swagger UI at `http://localhost:10001/api` shows correct response codes per call site. `pnpm --filter @hsm/api build` passes.

---

### U10. REST client migration — `{{at_token}}` / `{{rt_token}}`

**Goal:** Update all `.http` files to reference `{{at_token}}` (AT) or `{{rt_token}}` (RT for refresh). Update `settings.json` REST Client env to declare `at_token` and `rt_token`.

**Requirements:** R4

**Dependencies:** None

**Files:**
- Modify: `.vscode/settings.json`
- Modify: `apps/backend/api/src/modules/security/auth/auth.http`
- Modify: `apps/backend/api/src/modules/core/templates/templates.http`
- Modify: `apps/backend/api/src/modules/core/users/user.http`
- Modify: `apps/backend/api/src/modules/core/coms/coms.http` (if any `{{token}}` references exist)
- Modify: `apps/backend/api/src/modules/core/docs/docs.http` (if any `{{token}}` references exist)

**Approach:**
- Replace `"token": ""` in `settings.json` `rest-client.environmentVariables.local` with `"at_token": ""` and `"rt_token": ""`
- Bulk replace `{{token}}` → `{{at_token}}` in all `.http` files
- Exception: `GET /auth/refresh` endpoint in `auth.http` uses `{{rt_token}}`

**Patterns to follow:**
- `apps/backend/api/CLAUDE.md` — REST Client shared variable convention

**Test scenarios:**
- Test expectation: none — manual test: select `local` environment in REST Client, paste dev AT token value into `at_token` in `settings.json`, send a protected request.

**Verification:**
- No `.http` file contains `{{token}}`. `settings.json` has `at_token` and `rt_token` keys. The refresh endpoint uses `{{rt_token}}`.

---

### U11. `@ApiDocumentation` call site audit — add `NOT_FOUND` where appropriate

**Goal:** Identify all endpoints that legitimately return 404 (e.g., template not found) and add `additionalErrors: [HttpStatus.NOT_FOUND]` to their `@ApiDocumentation` call. Prevents a silent documentation regression from making 404 opt-in.

**Requirements:** R13

**Dependencies:** U9

**Files:**
- Modify: `apps/backend/api/src/modules/core/templates/templates.controller.ts`
- Review (no change expected): `apps/backend/api/src/modules/security/auth/auth.controller.ts`
- Review (no change expected): `apps/backend/api/src/modules/core/users/user.controller.ts`
- Review (no change expected): `apps/backend/api/src/modules/core/coms/coms.controller.ts`
- Review (no change expected): `apps/backend/api/src/modules/core/docs/docs.controller.ts`

**Approach:**
- Templates: `TemplatesService` throws `TemplateNotFoundError` (extends `NotFoundException`) in `findByIdentifier`, `update`, `delete`, and `validate`. All five template endpoints receive `{ additionalErrors: [HttpStatus.NOT_FOUND] }`
- Auth, users, coms, docs: no 404 paths in current implementations

**Test scenarios:**
- Test expectation: none — Swagger UI verification is sufficient.

**Verification:**
- Templates controller endpoints show 404 in Swagger. Other controllers do not. `pnpm --filter @hsm/api build` passes.

---

## System-Wide Impact

- **Interaction graph:** `AuthJwtAtGuard` (global APP_GUARD) now always validates JWT — every non-`@Public()` endpoint is affected. `RolesGuard` (global APP_GUARD) now throws `InsufficientRolesException` rather than returning false — `ResponseFilter` must handle `ForbiddenException` subclasses correctly (it does, since `InsufficientRolesException extends ForbiddenException`)
- **Error propagation:** `InsufficientRolesException` propagates as a standard NestJS `ForbiddenException` (HTTP 403). `ResponseFilter` already handles `HttpException` subclasses and formats them as `ErrorResponseDto`
- **State lifecycle risks:** Dev token has no DB record (sub = 'dev'). Any controller path that performs a DB lookup keyed on `req.user.id` will fail or return empty. This is acceptable in dev (documented in origin) but implementers must be aware when using the dev token
- **API surface parity:** `@ApiDocumentation` signature change from positional `hasPagination/hasFilter/hasSort` args to `options` object. All existing call sites pass 0–1 arguments (no existing pagination/filter/sort flags in call sites) — no migration needed
- **Integration coverage:** After U6 and U7 land, run `pnpm --filter @hsm/api start:dev` and observe: dev token logged, `.vscode/settings.local.json` written, a request to a protected endpoint using the dev AT passes both guards with `req.user` populated
- **Unchanged invariants:** `@Public()` endpoints continue to skip both JWT validation and role checks. Admin role (`RolesEnum.System.Admin`) continues to bypass required-role checks. `RoleFunctionalityEnum` is untouched. `@Roles()` no-arg semantics are unchanged (any authenticated user)

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Dev token has no DB record — `req.user.id = 'dev'` fails any DB-keyed query | Document in `AuthDevService` log output; dev workflow limited to endpoints that don't require a DB user record |
| `process.cwd()` inside `onModuleInit` resolves to workspace root during `pnpm start:dev` | Confirmed correct — `.vscode/settings.local.json` at repo root is the intended location |
| Existing DB users with `roles: ['developer']` will be hard-denied in production after U4 lands | Audit DB roles before deploying; 'developer' was not assignable before this change so no existing records should have it |
| `RolesType` derivation may miss the new 40-role union if TypeScript path resolution is stale | Run `pnpm --filter @hsm/api build` after U1 as the primary type-check gate |
| `InsufficientRolesException` propagation through `ResponseFilter` | `ResponseFilter` handles all `HttpException` subclasses; confirmed compatible since `ForbiddenException` is already handled |

---

## Documentation / Operational Notes

- `.vscode/settings.local.json` is already gitignored via the `.vscode/*` rule. No `.gitignore` change needed.
- After first `pnpm --filter @hsm/api start:dev`, copy `at_token` from `.vscode/settings.local.json` into the `at_token` field in `.vscode/settings.json` to enable REST Client in VS Code.
- `JWT_AT_SECRET` and `JWT_RT_SECRET` must differ between dev and non-dev environments — a dev token must not be valid against staging/production.

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-08-auth-roles-api-doc-improvements-requirements.md](docs/brainstorms/2026-05-08-auth-roles-api-doc-improvements-requirements.md)
- Related code: `apps/backend/api/src/modules/security/auth/`
- Related code: `apps/backend/api/src/modules/security/roles/`
- Related code: `packages/common/src/enums/roles.enum.ts`
- Related code: `packages/common/src/errors/`
- Related pattern: `apps/backend/worker/src/modules/core/docs/generation/generation.service.ts` (OnModuleInit)
