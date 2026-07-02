---
title: "fix: API documentation decorator accuracy"
type: fix
status: active
date: 2026-05-12
origin: docs/brainstorms/2026-05-12-api-documentation-accuracy-requirements.md
---

# fix: API documentation decorator accuracy

## Summary

Four accuracy fixes to `@ApiDocumentation`, all contained in a single decorator file. Path examples become endpoint-specific via route metadata derivation, the duplicate Authorization header field is removed so the global Swagger "Authorize" button works correctly, error response examples get status-code-specific neutral defaults instead of auth-specific hardcoded values, and the `success: true` bug on all error responses is corrected.

---

## Problem Frame

The `@ApiDocumentation` decorator auto-generates Swagger documentation — useful, but currently produces inaccurate output in four ways: every endpoint shows the same `/v1/example/resource` path, every error response shows `success: true`, every error response shows `AUTH_INVALID_CREDENTIALS` regardless of the endpoint's domain, and the Swagger UI's global "Authorize" button is decoupled from a duplicate per-endpoint `Authorization` parameter field. See origin document for full problem narrative.

---

## Requirements

- R1. `metadata.path` example in all response schemas reflects the actual endpoint path, derived from route metadata at decoration time. (see origin: `docs/brainstorms/2026-05-12-api-documentation-accuracy-requirements.md`)
- R2. `ApiHeader({ name: 'Authorization' })` calls removed; `ApiBearerAuth` remains as the sole auth link to the global Swagger security scheme. (see origin)
- R3. `success ? success : true` replaced with `success ?? true` in `metadataSchema()` so error responses correctly show `success: false`. (see origin)
- R4. Error response `issue` examples use status-code-specific neutral values (`VALIDATION_ERROR` for 400, `UNAUTHORIZED` for 401, `FORBIDDEN` for 403, `INTERNAL_SERVER_ERROR` for 500) instead of the auth-specific hardcoded values from `IssueDto`. *(Added during planning — user decision from brainstorm session, deliberately overriding the origin document's initial deferral of this feature. No origin AE maps to R4; test scenarios in U1 are the acceptance criteria.)*

**Origin acceptance examples:** AE1 (covers R1), AE2 (covers R1), AE3 (covers R2), AE4 (covers R3)

---

## Scope Boundaries

- Per-endpoint custom error code overrides via decorator options — out of scope; status-code-specific neutral defaults (R4) are the fix.
- Changes to `MetadataDto`, `IssueDto`, `UnsuccessResponseDto`, or any `@hsm/common` files — not needed; all example overrides happen inside the decorator's schema building.
- Call-site annotation changes — no existing `@ApiDocumentation(...)` usages require modification.
- `@Version()` version prefix derivation for the auto-derived path — hardcoded `/v1` prefix only; multi-version path derivation is deferred.

### Deferred to Follow-Up Work

- `@Version('2')` endpoints will still show `/v1/...` in path examples until version metadata derivation is added.
- Per-endpoint custom error examples (e.g. `DOCS_NOT_FOUND` on a specific endpoint) — would require an `errors` option field; can be added later without breaking this plan's output.

---

## Context & Research

### Relevant Code and Patterns

- `apps/backend/api/src/decorator/api-documentation.decorator.ts` — sole file being modified
- `GUARDS_METADATA` is already imported from `@nestjs/common/constants` — `PATH_METADATA` is importable from the same source (confirmed value: `'path'` in NestJS v11.1.19)
- `Reflect.getMetadata(GUARDS_METADATA, ...)` pattern already used in the decorator — the same pattern applies for `PATH_METADATA`
- No existing spec file for the decorator — the plan introduces one
- `apps/backend/api/src/decorator/public.decorator.ts` — minimal decorator for reference on spec structure

### Institutional Learnings

- `docs/solutions/developer-experience/2026-05-06-nestjs-unit-test-mocking-patterns.md` — NestJS unit test mocking patterns; relevant when structuring the new spec file

---

## Key Technical Decisions

- **`PATH_METADATA` constant over string literal `'path'`**: importing the named constant makes a future NestJS rename a compile error rather than a silent wrong value.
- **`success ?? true` over ternary**: nullish coalescing treats only `null`/`undefined` as "no value" — `false` passes through correctly. The ternary `success ? success : true` evaluates `false` as falsy, always returning `true`.
- **Derived path passed into `metadataSchema()` as a new parameter**: the function already accepts `success`, `code`, `message`; adding `path` extends the same pattern. All response schemas (200 and all errors) call the same function, so path derivation happens once and flows through.
- **Issue example override inside `unsuccessSchema()`**: the existing `allOf` + `properties` override pattern already overrides `metadata`; adding `issue` alongside it keeps the approach consistent without touching `IssueDto` or `UnsuccessResponseDto`.
- **U1 and U3 both modify `metadataSchema()`** — implement together (or U1 first, then U3 adds the `path` parameter) to avoid in-file conflicts.

---

## Implementation Units

### U1. Fix `success` truthiness bug and add status-code-specific error examples

**Goal:** Make all error response examples factually accurate: `success: false` and issue examples that reflect the actual HTTP status code semantics rather than auth-specific values.

**Requirements:** R3, R4

**Dependencies:** None

**Files:**
- Modify: `apps/backend/api/src/decorator/api-documentation.decorator.ts`
- Test: `apps/backend/api/src/decorator/api-documentation.decorator.spec.ts` (new)

**Approach:**
- Replace `success ? success : true` with `success ?? true` in `metadataSchema()`
- In `unsuccessSchema()`, add `issue` property override alongside the existing `metadata` override; include a per-status-code example object (keyed on the `code` parameter). Each code gets neutral, semantically accurate values — no auth-specific wording outside the 401 case

**Patterns to follow:**
- `metadataSchema()` `allOf` + `properties` override already in the decorator
- The same override shape is already applied to `metadata`; apply the same to `issue`

**Test scenarios:**
- Happy path: `metadataSchema()` called with no args → `success` example property is `true`
- Edge case: `metadataSchema()` called with `success = false` → `success` example property is `false` (regression guard for the truthiness bug)
- Happy path: 400 schema `issue` example has `code: "VALIDATION_ERROR"` and no `AUTH_INVALID_CREDENTIALS`
- Happy path: 401 schema `issue` example has `code: "UNAUTHORIZED"`
- Happy path: 403 schema `issue` example has `code: "FORBIDDEN"`
- Happy path: 500 schema `issue` example has `code: "INTERNAL_SERVER_ERROR"`

**Verification:**
- All test scenarios pass; Swagger UI error examples no longer show `AUTH_INVALID_CREDENTIALS` on non-auth endpoints; `success: false` appears on all 4xx/5xx examples

---

### U2. Remove duplicate Authorization header parameter

**Goal:** Eliminate the redundant `ApiHeader({ name: 'Authorization' })` from the decorator so the global Swagger "Authorize" button is the sole auth mechanism — no per-endpoint re-entry required.

**Requirements:** R2

**Dependencies:** None

**Files:**
- Modify: `apps/backend/api/src/decorator/api-documentation.decorator.ts`
- Test: `apps/backend/api/src/decorator/api-documentation.decorator.spec.ts`

**Approach:**
- Remove both `ApiHeader({ name: 'Authorization', description: 'Bearer <access_token>', required: true })` calls — the one inside the `usesRefreshGuard` branch and the one in the `else` branch
- `ApiBearerAuth('access_token')` and `ApiBearerAuth('refresh_token')` remain untouched — these correctly link to the global security scheme registered in `main.ts`

**Patterns to follow:**
- `ApiBearerAuth` usage already in the decorator

**Test scenarios:**
- Integration: decorating an authenticated endpoint (no `@Public()`, no refresh guard) — produced decorators include `ApiBearerAuth('access_token')` but do not include an `ApiHeader` with `name: 'Authorization'`
- Integration: decorating an endpoint with `@UseGuards(AuthJwtRtGuard)` — produced decorators include `ApiBearerAuth('refresh_token')` and no `ApiHeader` with `name: 'Authorization'`
- Integration: decorating a `@Public()` endpoint — produced decorators include neither `ApiBearerAuth` nor an `ApiHeader` with `name: 'Authorization'`

**Verification:**
- Swagger UI at `http://localhost:10001/api` shows no `Authorization` parameter field in any endpoint's Parameters section; setting the token via the global Authorize button is sufficient

---

### U3. Auto-derive endpoint path from route metadata

**Goal:** Replace the static `/v1/example/resource` path example with the actual endpoint path in every response schema.

**Requirements:** R1

**Dependencies:** Coordinate with U1 — both modify `metadataSchema()`; implement U3 after U1 so the `path` parameter addition targets the already-corrected function

**Files:**
- Modify: `apps/backend/api/src/decorator/api-documentation.decorator.ts`
- Test: `apps/backend/api/src/decorator/api-documentation.decorator.spec.ts`

**Approach:**
- Import `PATH_METADATA` from `@nestjs/common/constants` alongside the existing `GUARDS_METADATA` import
- At decoration time, read `Reflect.getMetadata(PATH_METADATA, target.constructor)` for the controller prefix and `Reflect.getMetadata(PATH_METADATA, descriptor.value)` for the method path segment
- Construct the example path as `/v1/${controllerPath}/${methodPath}` with duplicate slash collapsing (e.g. split, filter empty, rejoin with `/`)
- Add `path` as a parameter to `metadataSchema()` and include it as a `path` property override so all response schemas (success and errors) show the correct endpoint path

**Patterns to follow:**
- Existing `Reflect.getMetadata(GUARDS_METADATA, [descriptor.value, target.constructor])` pattern in the decorator
- `PATH_METADATA` from `@nestjs/common/constants`

**Test scenarios:**
- Covers AE1: controller path `auth`, method path `login` → all response schemas include `path` example `"/v1/auth/login"`
- Covers AE2: controller path `docs`, method path `:id` → path example `"/v1/docs/:id"`
- Edge case: controller path `''` and method path `''` → path example `"/v1"` without double or trailing slashes
- Edge case: `PATH_METADATA` not set on the method (returns `undefined`) → graceful default to empty string, path constructs without crashing

**Verification:**
- No endpoint's response schema example shows `/v1/example/resource`; each shows its own actual path

---

## System-Wide Impact

- **Unchanged invariants:** All existing `@ApiDocumentation(...)` call sites across all controllers remain syntactically and functionally unchanged. The decorator's public signature (`models`, `options`) is not modified by any of these fixes.
- **API surface parity:** None — only Swagger documentation output changes. Runtime request/response behavior is unaffected.
- **Integration coverage:** The `ApiHeader` removal and `ApiBearerAuth` linking should be verified manually in Swagger UI (`http://localhost:10001/api`) with a real login token to confirm the global Authorize button populates correctly for authenticated endpoints.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `PATH_METADATA` internal key changes in a future NestJS major version | Import from `@nestjs/common/constants` (not a hardcoded string) — a rename produces a compile error rather than a silently wrong path |
| `@Version('2')` endpoints show `/v1/...` in path example | Documented scope boundary and deferred follow-up; not a regression since all endpoints currently show the same wrong path |

---

## Sources & References

- **Origin document:** [`docs/brainstorms/2026-05-12-api-documentation-accuracy-requirements.md`](docs/brainstorms/2026-05-12-api-documentation-accuracy-requirements.md)
- Decorator under modification: `apps/backend/api/src/decorator/api-documentation.decorator.ts`
- NestJS v11 constants: `@nestjs/common/constants` — `PATH_METADATA = 'path'`, `GUARDS_METADATA = '__guards__'`
- NestJS unit test patterns: `docs/solutions/developer-experience/2026-05-06-nestjs-unit-test-mocking-patterns.md`
