# HTTP Files Per Controller — Requirements

**Date:** 2026-05-07
**Status:** Ready for planning

## Problem

There is no systematic way to manually test API endpoints from within the IDE. Some controllers already have co-located `.http` files (`auth.http`, `coms.http`, `docs.http`), but the pattern is incomplete: `templates.controller.ts`, `user.controller.ts`, and `main.controller.ts` are uncovered, and `auth.http` is missing two endpoints.

## Goal

Every controller in `apps/backend/api` has a co-located `.http` file that covers all of its endpoints, enabling manual testing from VS Code (REST Client extension) without leaving the IDE. Shared variables are centralized in `.vscode/settings.json` so each `.http` file contains only requests — no repeated headers.

## Scope

### In scope

- Add `rest-client.environmentVariables` to `.vscode/settings.json` with a `local` environment defining `host`, `contentType`, and `token`
- Update existing `.http` files (`auth.http`, `coms.http`, `docs.http`) to remove their local `@variable = value` headers and rely on the shared environment
- Fill the gap in `auth.http`: add `POST /v1/auth/pin/generate` and `POST /v1/auth/pin/validate`
- Create `apps/backend/api/src/modules/core/templates/templates.http` covering all 5 template endpoints
- Create `apps/backend/api/src/modules/core/users/user.http` covering all 3 user endpoints
- Create `apps/backend/api/src/main.http` covering `GET /v1/health`
- Document the convention in `apps/backend/api/CLAUDE.md`

### Out of scope

- A second environment (staging, prod) — add when needed
- Clinical module controllers (none exist yet)

## Convention (to be documented)

The rule mirrors the test file rule:
- **New endpoint** → add a request block to the `.http` file of that controller's module
- **New controller** → create a co-located `.http` file covering all its endpoints at creation time

## Centralized environment variables

Shared variables live in `.vscode/settings.json` under `rest-client.environmentVariables`. Select the active environment with `Ctrl+Alt+E` in VS Code.

```json
"rest-client.environmentVariables": {
  "local": {
    "host": "http://127.0.0.1:3000/v1",
    "contentType": "application/json",
    "token": ""
  }
}
```

Update `token` in one place after login — all `.http` files pick it up automatically.

## File format

Each `.http` file contains only request blocks — no variable declarations:

```http
### Endpoint Name
METHOD {{host}}/path
Content-Type: {{contentType}}
Authorization: Bearer {{token}}   (only for authenticated endpoints)

{ "body": "here" }
```

- Public endpoints (`@Public()`) omit the `Authorization: Bearer {{token}}` header
- Each endpoint gets a `### Endpoint Name` separator comment

## Acceptance criteria

1. `rest-client.environmentVariables` with a `local` environment is present in `.vscode/settings.json`
2. All existing `.http` files have their `@variable = value` headers removed
3. Every controller in `apps/backend/api/src/` (including `src/main.controller.ts`) has a co-located `.http` file
4. Every endpoint declared in a controller has a corresponding request block in its `.http` file
5. `auth.http` includes `pin/generate` and `pin/validate` request blocks
6. `apps/backend/api/CLAUDE.md` documents the convention and the centralized env variable approach
