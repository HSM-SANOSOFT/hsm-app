---
title: "feat: HTTP test files for every API controller"
type: feat
status: completed
date: 2026-05-07
origin: docs/brainstorms/http-files-per-controller-requirements.md
---

# feat: HTTP test files for every API controller

## Summary

Establishes a complete, consistent set of co-located `.http` files for every controller in `apps/backend/api`, enabling manual endpoint testing from VS Code (REST Client extension) without leaving the IDE. Shared variables (`host`, `contentType`, `token`) are centralized once in `.vscode/settings.json` via `rest-client.environmentVariables`, eliminating the repeated `@variable` header blocks currently duplicated in `auth.http`, `coms.http`, and `docs.http`. Missing files are created for the `templates`, `user`, and `main` controllers; two missing endpoints are backfilled in `auth.http`; and the convention is documented in the API's `CLAUDE.md`.

---

## Requirements

- R1. `rest-client.environmentVariables` with a `local` environment (`host`, `contentType`, `token`) is present in `.vscode/settings.json`
- R2. All existing `.http` files (`auth.http`, `coms.http`, `docs.http`) have their inline `@variable = value` headers removed and rely on the shared environment
- R3. Every controller in `apps/backend/api/src/` has a co-located `.http` file
- R4. Every endpoint declared in a controller has a corresponding request block in its `.http` file
- R5. `auth.http` includes `pin/generate` and `pin/validate` request blocks
- R6. `apps/backend/api/CLAUDE.md` documents the `.http` convention and the centralized env variable approach

*(see origin: docs/brainstorms/http-files-per-controller-requirements.md)*

---

## Scope Boundaries

- A second environment (`staging`, `prod`) is not included — add when needed
- Clinical module controllers (`PatientsModule`, `AppointmentsModule`) are not covered — no controllers exist yet; convention applies when they are created
- A gitignored private env file for token override is not included — empty `token` default matches current posture (existing files already store JWTs in tracked files)

---

## Context & Research

### Relevant Code and Patterns

- Format reference — existing `.http` files:
  - `apps/backend/api/src/modules/security/auth/auth.http`
  - `apps/backend/api/src/modules/core/coms/coms.http`
  - `apps/backend/api/src/modules/core/docs/docs.http`
- Controllers to cover:
  - `apps/backend/api/src/main.controller.ts` (`GET /health`, `@Public()`)
  - `apps/backend/api/src/modules/security/auth/auth.controller.ts` (9 endpoints)
  - `apps/backend/api/src/modules/core/templates/templates.controller.ts` (5 endpoints)
  - `apps/backend/api/src/modules/core/users/user.controller.ts` (3 stub endpoints)
- DTOs for new request bodies:
  - `packages/common/src/dtos/security-auth.dto.ts` — `PinGenerationPayloadDto` (`purpose: PinPurposeEnum`, `target: string`), `PinValidationPayloadDto` (adds `code: number`)
  - `packages/common/src/dtos/core-templates.dto.ts` — `CreateTemplatePayloadDto`, `UpdateTemplatePayloadDto`, `ParseTemplatePayloadDto`, `GetTemplateRequestDto`
- Relevant enum values:
  - `PinPurposeEnum`: `email_verification`, `password_reset`, `identity_verification`, `integration_approval`
  - `TemplateCategoriesEnum`: `BASE`, `EMAIL_INTERNAL`, `EMAIL_EXTERNAL`, `DOCS`
- VS Code workspace config: `.vscode/settings.json`

### Institutional Learnings

- No directly applicable `docs/solutions/` entries for `.http` file conventions.

---

## Key Technical Decisions

- **Centralize via `rest-client.environmentVariables`**: The VS Code REST Client extension resolves `{{variable}}` interpolations from the active environment defined in `.vscode/settings.json`. This is the idiomatic approach and avoids any per-file repetition. Users select the active environment with `Ctrl+Alt+E`.
- **`token` defaults to empty string**: The user pastes their JWT once after login. Empty default keeps git history clean while preserving the single-place-to-update goal.
- **Strip headers + add missing auth endpoints in one unit**: Both changes target `auth.http` and are logically related cleanup. Combining avoids a spurious intermediate state where headers exist but pin endpoints don't.
- **`user.http` stubs are included now**: The endpoints have no implementation yet (all TODO), but creating the `.http` file now documents the intended interface and avoids a gap when implementation lands.

---

## Implementation Units

### U1. Centralize REST Client environment variables in settings.json

**Goal:** Add `rest-client.environmentVariables` to `.vscode/settings.json` so all `.http` files can reference `{{host}}`, `{{contentType}}`, and `{{token}}` without file-level variable declarations.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Modify: `.vscode/settings.json`

**Approach:**
- Merge a `"rest-client.environmentVariables"` key into the existing JSON object — do not replace or reformat the file
- Define one environment `"local"` with three keys:
  - `"host"`: `"http://127.0.0.1:3000/v1"` (container-internal port, consistent with existing files)
  - `"contentType"`: `"application/json"`
  - `"token"`: `""` (user fills this in after login)

**Patterns to follow:**
- Existing `.vscode/settings.json` key style — plain JSON, no comments

**Test scenarios:**
Test expectation: none — pure VS Code configuration change; no automated test coverage is possible.

**Verification:**
- `.vscode/settings.json` parses as valid JSON with `rest-client.environmentVariables.local` present
- Opening any `.http` file in VS Code and pressing `Ctrl+Alt+E` shows `local` as a selectable environment

---

### U2. Refactor existing .http files and fill auth gaps

**Goal:** Strip the `@variable = value` header blocks from the three existing `.http` files, and add the two missing auth endpoints (`pin/generate`, `pin/validate`) to `auth.http`.

**Requirements:** R2, R4, R5

**Dependencies:** U1

**Files:**
- Modify: `apps/backend/api/src/modules/security/auth/auth.http`
- Modify: `apps/backend/api/src/modules/core/coms/coms.http`
- Modify: `apps/backend/api/src/modules/core/docs/docs.http`

**Approach:**
- For each file: remove the `@host = ...`, `@contentType = ...`, and `@token = ...` lines at the top. Leave all `{{host}}`, `{{contentType}}`, and `{{token}}` interpolations in request blocks untouched — they now resolve from the shared environment.
- Add `### Generate PIN` block to `auth.http`:
  - `POST {{host}}/auth/pin/generate`
  - `Content-Type: {{contentType}}`
  - `Authorization: Bearer {{token}}` (endpoint is not `@Public()`)
  - Body: `{ "purpose": "email_verification", "target": "example@example.com" }`
- Add `### Validate PIN` block to `auth.http`:
  - `POST {{host}}/auth/pin/validate`
  - Same headers as above (also authenticated, `@Roles()`)
  - Body: `{ "purpose": "email_verification", "target": "example@example.com", "code": 123456 }`

**Patterns to follow:**
- `### Endpoint Name` separator comment pattern already used in `auth.http`

**Test scenarios:**
Test expectation: none — developer tooling files; verification is manual via VS Code REST Client.

**Verification:**
- No `@variable = value` lines remain in any of the three files
- `auth.http` contains request blocks for all 9 auth endpoints: signup, login, logout, refresh, signupIntegration, logoutIntegration, profile, pin/generate, pin/validate
- Sending any existing request in VS Code REST Client (with `local` env selected) resolves `{{host}}` correctly

---

### U3. Create templates.http

**Goal:** Create a `.http` file covering all 5 endpoints of `TemplatesController`.

**Requirements:** R3, R4

**Dependencies:** U1

**Files:**
- Create: `apps/backend/api/src/modules/core/templates/templates.http`

**Approach:**
All 5 endpoints use `@Roles()` (no `@Public()`), so every block includes `Authorization: Bearer {{token}}`.

Endpoints to cover:

1. `### Get Template` — `GET {{host}}/templates/{{identifier}}` — use a sample UUID as path placeholder; no body
2. `### Create Template` — `POST {{host}}/templates` — body from `CreateTemplatePayloadDto`:
   ```json
   { "category": "EMAIL_EXTERNAL", "name": "welcome_email", "description": "...", "schema": { "patientName": "string" }, "content": "<p>Hola {{patientName}}</p>", "baseTemplateId": "<uuid>" }
   ```
3. `### Update Template` — `PUT {{host}}/templates/:id` — body is partial `CreateTemplatePayloadDto` (any subset of fields)
4. `### Delete Template` — `DELETE {{host}}/templates/:id` — no body
5. `### Validate Template` — `POST {{host}}/templates/validate` — body from `ParseTemplatePayloadDto`: `{ "identifier": "welcome_email", "data": { "patientName": "Ada" } }`

Note: `GET :identifier` and `PUT/DELETE :id` use path parameters — the implementer should use a realistic placeholder UUID (e.g. `123e4567-e89b-12d3-a456-426614174000`) directly in the URL.

**Patterns to follow:**
- `### Endpoint Name` / `Content-Type: {{contentType}}` / `Authorization: Bearer {{token}}` pattern from `auth.http`

**Test scenarios:**
Test expectation: none — developer tooling file; no automated test coverage.

**Verification:**
- File exists at the correct co-located path
- Contains 5 request blocks, one per endpoint, with realistic sample data matching the DTOs

---

### U4. Create user.http

**Goal:** Create a `.http` file covering the 3 stub endpoints of `UserController`.

**Requirements:** R3, R4

**Dependencies:** U1

**Files:**
- Create: `apps/backend/api/src/modules/core/users/user.http`

**Approach:**
All 3 endpoints use `@Roles()` (authenticated). Since controller implementations are TODO stubs, request bodies are intentionally empty `{}` — the file documents the interface, not a specific payload shape.

Endpoints:
1. `### Create User` — `POST {{host}}/user/create` — body: `{}`
2. `### Update User` — `POST {{host}}/user/update` — body: `{}`
3. `### Delete User` — `POST {{host}}/user/delete` — body: `{}`

**Patterns to follow:**
- Same header-free format as other `.http` files after U2 refactor

**Test scenarios:**
Test expectation: none — developer tooling file; endpoints are not yet implemented.

**Verification:**
- File exists at `apps/backend/api/src/modules/core/users/user.http`
- Contains 3 request blocks matching the controller's declared routes

---

### U5. Create main.http

**Goal:** Create a `.http` file covering the single health-check endpoint of `MainController`.

**Requirements:** R3, R4

**Dependencies:** U1

**Files:**
- Create: `apps/backend/api/src/main.http`

**Approach:**
One endpoint: `GET {{host}}/health`
- Public (`@Public()`) — omit `Authorization` header entirely
- No request body

**Patterns to follow:**
- Same format; omit auth header as done for the `### Logout` block in `auth.http` which also reads no token from req body in some flows

**Test scenarios:**
Test expectation: none — developer tooling file.

**Verification:**
- File exists at `apps/backend/api/src/main.http` (co-located with `main.controller.ts`)
- Contains one `GET {{host}}/health` block with no `Authorization` header

---

### U6. Document convention in CLAUDE.md

**Goal:** Add a dedicated "HTTP test files" section to `apps/backend/api/CLAUDE.md` capturing the convention and the shared environment variable setup.

**Requirements:** R6

**Dependencies:** U1

**Files:**
- Modify: `apps/backend/api/CLAUDE.md`

**Approach:**
Add a new `## HTTP test files` section documenting:
- Co-location rule: one `.http` file per controller, in the same directory as the controller
- New endpoint rule: add a request block to that module's `.http` file
- New controller rule: create a co-located `.http` file at creation time (mirrors the test file rule)
- Environment variable setup: `rest-client.environmentVariables` in `.vscode/settings.json`; select `local` via `Ctrl+Alt+E`; update `token` once after login — all files pick it up

**Patterns to follow:**
- Existing CLAUDE.md section style — heading, brief prose, inline code snippets where useful

**Test scenarios:**
Test expectation: none — documentation update.

**Verification:**
- `apps/backend/api/CLAUDE.md` contains an `## HTTP test files` section with the co-location rule, the new-endpoint/new-controller rules, and the env variable usage instructions

---

## System-Wide Impact

- **Interaction graph:** VS Code REST Client reads `.vscode/settings.json` at workspace open; no application code, tests, or runtime behavior is touched
- **API surface parity:** Not applicable — this is developer tooling only
- **Unchanged invariants:** All existing request content in `coms.http`, `docs.http`, and `auth.http` is preserved; only the variable header declarations are stripped

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| VS Code REST Client extension not installed in the devcontainer | Mention extension ID (`humao.rest-client`) in CLAUDE.md section; optionally add to `.vscode/extensions.json` as a deferred follow-up |
| `token` in `settings.json` committed to git with a real JWT | Convention matches current posture (existing files already have JWTs); empty `""` default prevents accidental commit of real tokens |

---

## Sources & References

- **Origin document:** [docs/brainstorms/http-files-per-controller-requirements.md](docs/brainstorms/http-files-per-controller-requirements.md)
- Existing `.http` format: `apps/backend/api/src/modules/security/auth/auth.http`
- VS Code workspace config: `.vscode/settings.json`
- Pin DTOs: `packages/common/src/dtos/security-auth.dto.ts`
- Template DTOs: `packages/common/src/dtos/core-templates.dto.ts`
