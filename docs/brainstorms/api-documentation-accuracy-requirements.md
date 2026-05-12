---
date: 2026-05-12
topic: api-documentation-accuracy
---

# API Documentation Accuracy Fixes

## Summary

Three targeted fixes to `@ApiDocumentation` decorator in `apps/backend/api/src/decorator/api-documentation.decorator.ts`:

1. The `metadata.path` example is hardcoded to `/v1/example/resource` for every endpoint — replace with the actual endpoint path derived from NestJS route metadata at decoration time.
2. The decorator adds both `ApiBearerAuth` and a manual `ApiHeader({ name: 'Authorization' })` — the duplicate explicit header is not linked to the global Swagger "Authorize" button, so setting auth globally does not populate it. Remove the `ApiHeader` calls.
3. `metadataSchema()` uses `success ? success : true` — a JavaScript truthiness bug that evaluates `false` as falsy, so all error response examples show `"success": true`. Fix with `success ?? true`.

---

## Problem Frame

The `@ApiDocumentation` decorator generates Swagger response documentation automatically, which is good. But three accuracy problems make the generated docs misleading:

**Problem 1 — Static path example:** Every endpoint's 200/4xx/5xx schema shows `"path": "/v1/example/resource"` regardless of the actual route. A developer reading the Swagger docs for `POST /auth/login` sees the wrong path in the example response.

**Problem 2 — Duplicate Authorization:** The decorator applies `ApiBearerAuth('access_token')` (correct — links to the global scheme) AND `ApiHeader({ name: 'Authorization' })` (wrong — adds a separate, unlinked header parameter). In Swagger UI, the global "Authorize" button fills the `ApiBearerAuth` scheme but does NOT populate the explicit header parameter field. The developer must set auth twice, and the two fields are independent.

**Problem 3 — `success: true` on error examples:** In `metadataSchema(success?, code?, message?)`, the expression `success ? success : true` is truthy-evaluated. When called with `success = false` for error responses, `false ? false : true` evaluates to `true`. Every 4xx and 5xx Swagger example shows `"success": true`, contradicting the actual runtime behaviour.

---

## Requirements

**R1 — Auto-derive path from route metadata**

The decorator reads the controller path prefix and method path segment using `Reflect.getMetadata('path', ...)` at decoration time and constructs the example path. The version prefix defaults to `v1` (the app's configured default version). No call-site changes — existing `@ApiDocumentation(...)` usages are unaffected.

Derivation logic:
- `controllerPath = Reflect.getMetadata('path', target.constructor) ?? ''`
- `methodPath = Reflect.getMetadata('path', descriptor.value) ?? ''`
- Combine as `/v1/${controllerPath}/${methodPath}` with duplicate slashes collapsed

Parameterised segments (e.g. `:id`) are preserved as-is — `/v1/docs/:id` is a valid and informative example path.

**R2 — Remove duplicate ApiHeader for Authorization**

Remove both `ApiHeader({ name: 'Authorization', ... })` calls from the decorator (the `usesRefreshGuard` branch and the `else` branch). Keep `ApiBearerAuth('access_token')` / `ApiBearerAuth('refresh_token')` — these correctly link the endpoint to the global security scheme defined in `main.ts` via `addBearerAuth`. After this fix, one click on the global "Authorize" button applies to all endpoints with no per-endpoint re-entry required.

**R3 — Fix `success` truthiness bug**

In `metadataSchema()`, replace:
```ts
example: success ? success : true
```
with:
```ts
example: success ?? true
```

This preserves the default of `true` when `success` is `undefined` (success responses), while correctly passing `false` through for error responses.

---

## Acceptance Examples

**AE1 — Covers R1.** Given `@ApiDocumentation(TokensDto)` on `POST /v1/auth/login`: the 200 response schema example shows `"path": "/v1/auth/login"`. The 401 response schema example also shows `"path": "/v1/auth/login"`.

**AE2 — Covers R1.** Given `@ApiDocumentation()` on `GET /v1/docs/:id`: the response schema examples show `"path": "/v1/docs/:id"`.

**AE3 — Covers R2.** For any endpoint decorated with `@ApiDocumentation`: the Swagger UI shows no `Authorization` header parameter field in the endpoint's Parameters section. Setting the token via the global "Authorize" button causes the bearer token to be sent on "Try it out" requests for that endpoint.

**AE4 — Covers R3.** The 400 response schema example for any endpoint shows `"success": false`. The 401, 403, 500, and 502 examples also show `"success": false`. The 200 example continues to show `"success": true`.

---

## Success Criteria

- Swagger UI at `http://localhost:10001/api` shows the correct actual path in every endpoint's response examples.
- Setting auth once via the global "Authorize" button is sufficient — no per-endpoint Authorization field exists.
- All error response examples show `"success": false`.
- No existing `@ApiDocumentation(...)` call sites require modification.

---

## Scope Boundaries

- Error code/message examples (e.g. `AUTH_INVALID_CREDENTIALS` appearing on non-auth endpoints) — deferred. The structure is correct; per-endpoint error example customisation is a separate concern.
- Changes to `MetadataDto` in `packages/common` — not needed. Path derivation happens inside the decorator and overrides the base schema example inline.
- Version override (`@Version('2')`) on individual controllers or methods — deferred to planning; the planner should check whether NestJS stores version metadata under a readable key and handle it if feasible, or document the limitation.
- Auth endpoints that use `@UseGuards(AuthJwtRtGuard)` — R2 applies to both branches (access token and refresh token); both `ApiHeader` calls are removed.

---

## Key Decisions

- **Auto-derive over explicit option:** Passing `path` manually would require call-site updates and could drift. Reading from route metadata at decoration time is zero-maintenance and always accurate for the standard case.
- **`??` over ternary:** `success ?? true` uses the nullish coalescing operator, which treats only `null`/`undefined` as "no value provided" — not `false`. This is the correct intent: default to `true` when omitted, pass through the explicit value otherwise.

---

## Dependencies / Assumptions

- NestJS stores the route path on method descriptors via `Reflect.getMetadata('path', descriptor.value)` and on controller classes via `Reflect.getMetadata('path', target.constructor)`. This is an internal NestJS convention — stable across NestJS v9/v10 but not a public API. Planner should verify against the installed NestJS version.
- The app uses URI versioning with default version `v1` (`main.ts:54`). The derived path hardcodes `/v1` as the prefix. If endpoints ever use `@Version('2')`, the example path will still show `v1` until version derivation is added.
