---
title: "HTTP test files: co-location convention and VS Code REST Client setup"
date: 2026-05-07
category: docs/solutions/developer-experience/
module: "@hsm/api"
problem_type: developer_experience
component: tooling
severity: low
applies_when:
  - Adding a new endpoint to any controller in apps/backend/api
  - Creating a new NestJS controller
  - Writing a .http request body that includes Handlebars template content
  - Onboarding a new developer who needs to manually test endpoints
tags:
  - http-files
  - rest-client
  - vscode
  - handlebars
  - manual-testing
---

# HTTP test files: co-location convention and VS Code REST Client setup

## Context

Before this convention was established there was no enforced workflow for manually testing API endpoints during development. Developers had to recall endpoint shapes from source code or Swagger on every test run. A secondary friction: when someone needed to update the target host or rotate an auth token they had to edit every `.http` file individually, since each file declared its own `@host`, `@contentType`, and `@token` variables.

A third issue emerged during implementation: VS Code REST Client treats **any** `{{expression}}` in a request body as a variable reference. When a `.http` file included example Handlebars template content — for instance `"content": "<p>Hola {{patientName}}</p>"` — REST Client reported a "variable not found" diagnostic error on every open of the file.

These three problems prompted a unified convention covering file placement, variable centralization, and a Handlebars syntax workaround.

## Guidance

### Rule 1 — Co-locate a `.http` file with every controller

Every controller gets a `.http` file in the same directory. The filename mirrors the controller (e.g., `auth.controller.ts` → `auth.http`).

- **New endpoint** → add a request block to that controller's existing `.http` file
- **New controller** → create the co-located `.http` file at the same time, covering all endpoints

This mirrors the already-established rule for `.spec.ts` files and is enforced in `apps/backend/api/CLAUDE.md`.

### Rule 2 — Centralize shared variables in `.vscode/settings.json`

Do not put `@host = ...`, `@contentType = ...`, or `@token = ...` at the top of individual `.http` files. Declare them once in `.vscode/settings.json`:

```jsonc
"rest-client.environmentVariables": {
  "local": {
    "host": "http://127.0.0.1:3000/v1",
    "contentType": "application/json",
    "token": ""
  }
}
```

Select the active environment with `Ctrl+Alt+E` in VS Code. After login, paste the JWT into `token` once — every `.http` file picks it up automatically.

### Rule 3 — Use `[variable]` bracket notation when example bodies contain Handlebars syntax

VS Code REST Client has no escape mechanism for `{{...}}`. Any double-brace expression is treated as a variable reference, including ones inside string literals. When a request body field illustrates Handlebars template content, use bracket notation `[variable]` instead:

```http
# Before — triggers "patientName is not found" diagnostic error
"content": "<p>Hola {{patientName}}</p>"

# After — no error, still readable as a placeholder
"content": "<p>Hola [patientName]</p>"
```

This applies only to `.http` example bodies. The actual template source files (`.hbs`, HTML) must still use `{{variable}}` — they are processed by Handlebars at runtime, not by REST Client.

## Why This Matters

**Co-location** keeps the manual testing artifact discoverable and in sync with its controller. There is no separate "requests" directory to remember or let go stale.

**Centralized variables** mean one edit propagates everywhere. Rotating a token or switching a host port is a single change in `settings.json`, not a multi-file find-and-replace. It also makes environment switching (`local` vs. `staging`) a single `Ctrl+Alt+E` command.

**The Handlebars conflict** is not a project bug — it is a fundamental behavior of the REST Client extension. Left unaddressed, the false-positive error appears as a red diagnostic underline and can silently block the "Send Request" interaction. Using `[variable]` in example bodies eliminates the error with no impact on readability or the actual API contract.

## When to Apply

- Adding any new endpoint → add a request block to the controller's `.http` file
- Creating any new controller → create its `.http` file in the same directory at the same time
- Writing a `.http` body that includes example Handlebars template content → use `[variable]` instead of `{{variable}}` in those content fields
- Onboarding a new developer → point them to `.vscode/settings.json` to set their local `token`; no `.http` file needs editing to get started

Does **not** apply to:
- Template source files (`.hbs`, HTML) served by the backend — those must use `{{variable}}` syntax
- Worker or other non-API packages that do not expose HTTP endpoints

## Examples

### `.http` file format — no per-file variable declarations

```http
### Log in
POST {{host}}/auth/login
Content-Type: {{contentType}}

{
  "username": "rsantamaria",
  "password": "RSFutbol2001@"
}

### Profile
GET {{host}}/auth/profile
Authorization: Bearer {{token}}
```

No `@host`, `@contentType`, or `@token` preamble. Variables resolve from the active environment in `.vscode/settings.json`.

### Minimal `.http` file for a public endpoint

```http
### Health Check
GET {{host}}/health
```

No `Authorization` header — the endpoint uses `@Public()` in the controller.

### Authentication workflow

1. Send `POST {{host}}/auth/login` with credentials
2. Copy the `access_token` from the response
3. Paste it into `"token": ""` in `.vscode/settings.json` and save
4. All subsequent requests using `Authorization: Bearer {{token}}` are authenticated

### Handlebars conflict — before and after

```http
# Before (causes "patientName is not found" diagnostic)
{
  "category": "EMAIL_EXTERNAL",
  "name": "welcome_email",
  "content": "<p>Hola {{patientName}}</p>"
}

# After (no error)
{
  "category": "EMAIL_EXTERNAL",
  "name": "welcome_email",
  "content": "<p>Hola [patientName]</p>"
}
```

See `apps/backend/api/src/modules/core/templates/templates.http` line 19 for the live example.

### Co-location directory structure

```
src/
  main.http                            ← MainController
  modules/
    security/
      auth/
        auth.controller.ts
        auth.http                      ← co-located
    core/
      coms/
        coms.controller.ts
        coms.http
      templates/
        templates.controller.ts
        templates.http
      docs/
        docs.controller.ts
        docs.http
      users/
        user.controller.ts
        user.http
```

## Related

- Convention documented in `apps/backend/api/CLAUDE.md` — `## HTTP test files` section
- VS Code REST Client extension: `humao.rest-client`
- Related solution: `docs/solutions/developer-experience/nestjs-unit-test-mocking-patterns-2026-05-06.md` (same DX category, different topic)
