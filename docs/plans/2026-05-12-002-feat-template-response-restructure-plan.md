---
title: "feat: Template response restructure and SMS support"
type: feat
status: completed
date: 2026-05-12
origin: docs/brainstorms/template-response-restructure-requirements.md
---

# feat: Template response restructure and SMS support

## Summary

Introduces an explicit DTO mapper in the API `TemplatesService` — the first mapping layer in the codebase — that converts raw entity output into a consistent `{ template, baseTemplate }` response shape. Adds SMS as a first-class template category alongside the existing email and document categories, with corresponding DTO, enum, seed, and worker support throughout.

---

## Problem Frame

The API's template endpoints currently return raw `TemplatesEntity` objects, meaning the `TemplateResponseDto` is purely decorative (Swagger only) and the actual wire shape contains entity-level names like `comEmail` instead of the DTO-declared `email`. There is no `baseTemplate` object in the response — only a `baseTemplateId` string — forcing callers to make a second request. Type-specific fields (`email`, `doc`) are scattered as separate optional top-level keys with no consistent shape across categories. SMS templates have a DB entity but no DTO, enum category, or usable API surface.

---

## Requirements

- R1. All template-returning endpoints return `{ data: { template: {…}, baseTemplate: {…}|null } }` — the requested template and its full base object in one response.
- R2. Type-specific data (email fields, doc fields, SMS fields) lives in a single `metadata` field: a typed object for non-BASE categories, `null` for BASE.
- R3. SMS is a complete first-class category: enum values, request/response DTOs, create/update/delete lifecycle, worker parsing, and seed data.
- R4. `TemplateResponseDto` (decorative-only, never the real wire shape) is replaced by the new DTOs.
- R5. The validate endpoint continues to function correctly after `findByIdentifier` changes return type.
- R6. All existing and new behavior is covered by updated specs: service spec (API), controller spec (API), worker spec.
- R7. Seeds reflect the new mapper correctly; `base_layout` schema is updated to be descriptive.

---

## Scope Boundaries

- Delete endpoint returns `{ id }` — not changed.
- Worker service keeps returning raw `TemplatesEntity` from `findByIdentifier` internally (it needs entity fields for parsing); only the API service's `findByIdentifier` changes return type.
- DB migrations are out of scope — `synchronize: true` handles dev; production migration for the new SMS enum values is a follow-up ops task.
- Validate endpoint **response shape** is unchanged (`{ valid, templateId?, issues? }`); only its internal read of `findByIdentifier`'s return value is updated.

### Deferred to Follow-Up Work

- Production migration for `SMS_INTERNAL` / `SMS_EXTERNAL` enum values in the Postgres `category` column: separate ops/migration PR.

---

## Context & Research

### Relevant Code and Patterns

- Current DTOs: `packages/common/src/dtos/templates.dto.ts`
- Enums: `packages/common/src/enums/templates.enum.ts`
- API service: `apps/backend/api/src/modules/core/templates/templates.service.ts`
- API controller: `apps/backend/api/src/modules/core/templates/templates.controller.ts`
- API service spec: `apps/backend/api/src/modules/core/templates/templates.service.spec.ts`
- API controller spec: `apps/backend/api/src/modules/core/templates/templates.controller.spec.ts`
- HTTP test file: `apps/backend/api/src/modules/core/templates/templates.http`
- Worker service: `apps/backend/worker/src/modules/core/templates/templates.service.ts`
- Worker spec: `apps/backend/worker/src/modules/core/templates/templates.service.spec.ts`
- SMS entity: `packages/database/src/entities/modules/core/template/template-com-sms.entity.ts` — fields: `provider`, `templateName`, `from`
- Seeds: `packages/database/src/seeder/modules/core/template/templates.seed.ts`, `template-com-email.seed.ts`
- Seed registry: `packages/database/src/seeder/seeder.seeds.ts`, `packages/database/src/seeder/modules/core/template/index.ts`
- Response interceptor: `apps/backend/api/src/interceptors/response.interceptor.ts` — already wraps everything in `{ metadata, data: T }`; controllers must not wrap manually

### Institutional Learnings

- `docs/solutions/runtime-errors/typeorm-entity-circular-import-silent-drop-2026-05-04.md` — entity circular import silently drops entity group; always import entities via `@hsm/database/entities` root path, never deep subpaths; run `start:dev` after any entity/module change to catch DI failures build alone won't surface.
- `docs/solutions/developer-experience/nestjs-unit-test-mocking-patterns-2026-05-06.md` — use `getRepositoryToken(Entity, DatabasesEnum.HsmDbPostgres)` composite token (not plain entity class); re-apply `mockResolvedValue` in `beforeEach` after `jest.clearAllMocks()`.
- `docs/solutions/developer-experience/http-test-files-vscode-rest-client-convention-2026-05-07.md` — use bracket notation `[variable]` (not `{{variable}}`) in `.http` file example bodies to avoid VS Code REST Client false-positive variable substitution.

---

## Key Technical Decisions

- **Mapper in API service, not `@hsm/common`**: The mapper depends on `TemplatesEntity` from `@hsm/database`, which `@hsm/common` must not import (would create a cross-package dependency). A private method on the API's `TemplatesService` is the right home.
- **Worker `findByIdentifier` keeps `TemplatesEntity` return type**: The worker needs the raw entity for Handlebars compilation and field access (`template.comEmail.subject`, `template.baseTemplate`). Changing it to the response DTO shape would add unnecessary indirection. Only the API service's return type changes.
- **`TemplateResponseDto` replaced entirely**: It was never the real wire shape — purely Swagger decoration. Keeping it alongside the new DTOs would create confusion. It is removed and all `@ApiDocumentation` references updated to `TemplateWithBaseResponseDto`.
- **`metadata` type union**: `EmailTemplateFieldsDto | DocTemplateFieldsDto | SmsTemplateFieldsDto | null`. BASE templates always yield `null`; non-BASE yield the typed object for their category. The field is always present in the response (never absent/undefined).
- **SMS categories as `SMS_INTERNAL` / `SMS_EXTERNAL`**: Mirrors the email naming convention (`EMAIL_INTERNAL` / `EMAIL_EXTERNAL`) for consistency. The entity's `comSms` relation name stays unchanged.
- **`base_layout` seed schema updated to `{ body: "string" }`**: The template already uses `{{{body}}}` in its content; the schema should describe that accurately. This is a data correction, not a behavioral change.

---

## Open Questions

### Resolved During Planning

- **Where does the mapper live?** — API service private method. (see above)
- **Does the worker need the new DTO shape?** — No; worker uses entities internally for Handlebars parsing. Worker changes are limited to loading `comSms` and adding `parseSms`.
- **Do seed files need data format changes?** — Only `base_layout` schema and a new SMS seed row; no structural format changes.

### Deferred to Implementation

- **Seeder execution order**: Verify the new `templateComSmsSeed` can be appended after existing seeds without FK conflicts (the SMS template references `base_layout` by UUID, which must exist first).

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
findByIdentifier(id, { withChildren: true, withBase: true })
  └─ returns TemplatesEntity with relations:
       .comEmail, .doc, .comSms (when withChildren)
       .baseTemplate (when withBase)

toDetailDto(entity: TemplatesEntity): TemplateDetailDto
  ├─ picks scalars: id, category, name, isActive, schema, content, description
  └─ resolves metadata:
       EMAIL_INTERNAL | EMAIL_EXTERNAL → picks from entity.comEmail
       DOCS                            → picks from entity.doc
       SMS_INTERNAL | SMS_EXTERNAL     → picks from entity.comSms
       BASE                            → null

TemplateWithBaseResponseDto
  ├─ template:      toDetailDto(entity)
  └─ baseTemplate:  entity.baseTemplate ? toDetailDto(entity.baseTemplate) : null
```

Response envelope (unchanged, added by `ResponseInterceptor`):
```
{ metadata: { ... }, data: TemplateWithBaseResponseDto }
```

---

## Implementation Units

### U1. DTOs and enum additions in `@hsm/common`

**Goal:** Add `SmsTemplateFieldsDto`, `TemplateDetailDto`, `TemplateWithBaseResponseDto`; add `SMS_INTERNAL` / `SMS_EXTERNAL` to `TemplateCategoriesEnum`; add `sms?` field to request DTOs; remove `TemplateResponseDto`.

**Requirements:** R1, R2, R3, R4

**Dependencies:** None

**Files:**
- Modify: `packages/common/src/dtos/templates.dto.ts`
- Modify: `packages/common/src/enums/templates.enum.ts`

**Approach:**
- `SmsTemplateFieldsDto` wraps the three `TemplateComSmsEntity` columns: `provider`, `templateName`, `from` — all required strings, all with `@ApiProperty`.
- `TemplateDetailDto` has the template scalars plus `metadata: EmailTemplateFieldsDto | DocTemplateFieldsDto | SmsTemplateFieldsDto | null`. Swagger `@ApiProperty` for metadata uses `oneOf` or a union description.
- `TemplateWithBaseResponseDto` has `template: TemplateDetailDto` and `baseTemplate: TemplateDetailDto | null`.
- `CreateTemplatePayloadDto` gains `sms?: SmsTemplateFieldsDto` with `@ValidateIf` requiring it when `category === SMS_INTERNAL || SMS_EXTERNAL` and forbidding it for other non-SMS categories (mirror the existing `email` field pattern).
- `TemplateResponseDto` is removed; any other file referencing it will surface a compile error that guides the remaining updates.

**Patterns to follow:**
- `EmailTemplateFieldsDto` and `DocTemplateFieldsDto` in the same file — mirror their `@ApiProperty` and validator decorator style.
- `@ValidateIf` usage on `email?` in `CreateTemplatePayloadDto` — extend the same pattern for `sms?`.

**Test scenarios:**
- Test expectation: none — pure shape declarations; behavioral coverage lives in the service spec (U4).

**Verification:**
- `pnpm --filter @hsm/common build` passes without errors.
- No TypeScript errors in consuming files after removing `TemplateResponseDto` (compile errors in other units guide U2, U3 fixes).

---

### U2. API service — mapper, SMS lifecycle, updated return types

**Goal:** Introduce the `toDetailDto` private mapper; update `findByIdentifier` return type to `TemplateWithBaseResponseDto`; complete SMS category support across the full create/update/delete lifecycle; fix `validate` to read from `result.template`.

**Requirements:** R1, R2, R3, R5

**Dependencies:** U1

**Files:**
- Modify: `apps/backend/api/src/modules/core/templates/templates.service.ts`

**Approach:**
- Add `comSms: withChildren` to the `relations` object in `findByIdentifier`.
- Add `TemplateComSmsEntity` import (via `@hsm/database/entities` root path).
- `toDetailDto(entity: TemplatesEntity): TemplateDetailDto` — private method. Maps scalars, resolves `metadata` via category switch. For `baseTemplate`, recursively calls `toDetailDto(entity.baseTemplate)` when not null (one level only; BASE templates have no parent).
- `findByIdentifier` wraps its loaded entity in `TemplateWithBaseResponseDto` before returning.
- `create` and `update` already call `findByIdentifier` at the end — their return types update naturally once `findByIdentifier` does.
- `validate`: rename the local `template` variable to `result` and update all four property accesses that follow — `result.template.schema`, `result.template.content`, and both uses of `result.template.id` (one in the schema-fail return and one in the success return). These accesses are the silent-failure risk: `TemplateWithBaseResponseDto` has no top-level `schema`/`content`/`id`, so a missed rename produces `undefined` at runtime rather than a compile error. Note: `validate` currently calls `findByIdentifier` without `withChildren` or `withBase`, which is correct — it only needs schema/content/id.
- `assertCategoryShape`: add SMS branch (requires `sms` block + `baseTemplateId`; forbids `email`/`doc` blocks; mirrors email/doc branches).
- `persistChild`: add SMS branch creating `TemplateComSmsEntity`.
- `upsertChildOnUpdate`: add SMS branch.
- `delete`: add SMS branch deleting `TemplateComSmsEntity`.

**Patterns to follow:**
- Existing `assertCategoryShape`, `persistChild`, `upsertChildOnUpdate`, and `delete` SMS-adjacent branches for email/docs — extend, don't restructure.

**Test scenarios:** (covered in U4)

**Verification:**
- `pnpm --filter @hsm/api build` passes.
- `pnpm --filter @hsm/api start:dev` reaches DB connection phase with no DI errors.

---

### U3. Controller — Swagger annotation updates

**Goal:** Update all template-returning endpoint decorators to reference `TemplateWithBaseResponseDto`.

**Requirements:** R4

**Dependencies:** U1, U2

**Files:**
- Modify: `apps/backend/api/src/modules/core/templates/templates.controller.ts`

**Approach:**
- Replace `TemplateResponseDto` with `TemplateWithBaseResponseDto` in `@ApiDocumentation` (or equivalent Swagger decorator) on GET, POST, and PUT handlers.
- No business logic changes.

**Patterns to follow:**
- Existing decorator usage on the same controller for the other endpoints.

**Test scenarios:**
- Test expectation: none — annotation-only; behavioral coverage in U5.

**Verification:**
- Swagger UI at `http://localhost:10001/api` shows the new nested shape for GET/POST/PUT template endpoints.

---

### U4. API service spec — mapper coverage and updated assertions

**Goal:** Update all happy-path assertions to match the new `{ template, baseTemplate }` shape and add full mapper coverage including SMS.

**Requirements:** R6

**Dependencies:** U2

**Files:**
- Modify: `apps/backend/api/src/modules/core/templates/templates.service.spec.ts`

**Approach:**
- Update mock entity return values to include the entity relations the mapper reads (`comEmail`, `doc`, `comSms`, `baseTemplate` with its own sub-fields).
- Update `create` happy-path: assert `result.template.id`, `result.template.metadata` (null for BASE), `result.baseTemplate` (null for BASE).
- Add EMAIL happy-path: assert `result.template.metadata` contains `subject`, `fromEmail`, `fromName`, `cc`, `bcc`, `hasAttachment`; `result.baseTemplate` is a `TemplateDetailDto` with `metadata: null`.
- Add DOCS happy-path: assert `result.template.metadata` contains `documentCode`, `format`, `size`, `orientation`.
- Add SMS happy-path: assert `result.template.metadata` contains `provider`, `templateName`, `from`.
- Update `validate` tests: `findByIdentifier` mock returns `{ template: {...}, baseTemplate: null }` shape; assert `templateId` in response still matches `result.template.id`.
- Add SMS category paths for `assertCategoryShape` (valid SMS create, missing `sms` block, BASE with `sms` block, SMS without `baseTemplateId`).
- Add SMS `delete` test (verifies `TemplateComSmsEntity` delete is called).

**Patterns to follow:**
- `docs/solutions/developer-experience/nestjs-unit-test-mocking-patterns-2026-05-06.md` — `getRepositoryToken` composite token, `beforeEach` mock reset.
- Existing `toMatchObject` assertions in the same file.

**Test scenarios:**
- Happy path: BASE create returns `{ template: { id, category: BASE, metadata: null }, baseTemplate: null }`.
- Happy path: EMAIL_INTERNAL create returns `{ template: { metadata: { subject, fromEmail, ... } }, baseTemplate: { id, category: BASE, metadata: null } }`.
- Happy path: DOCS create returns `{ template: { metadata: { documentCode, format, size, orientation } }, baseTemplate: { ... } }`.
- Happy path: SMS_INTERNAL create returns `{ template: { metadata: { provider, templateName, from } }, baseTemplate: { ... } }`.
- Edge case: validate with valid data reads `result.template.schema` correctly and returns `{ valid: true, templateId: <template id> }`.
- Error path: SMS_INTERNAL create without `sms` block throws `TemplateInvalidShapeError`.
- Error path: BASE create with `sms` block throws `TemplateInvalidShapeError`.
- Error path: SMS_INTERNAL create without `baseTemplateId` throws `TemplateInvalidShapeError`.
- Happy path: delete of SMS_INTERNAL template calls delete on `TemplateComSmsEntity`.

**Verification:**
- `pnpm --filter @hsm/api test -- --testPathPattern=templates.service` passes with no skipped tests.

---

### U5. API controller spec — response shape assertions

**Goal:** Add assertions that GET, POST, and PUT return the `{ template, baseTemplate }` shape (not the raw entity).

**Requirements:** R6

**Dependencies:** U2, U4

**Files:**
- Modify: `apps/backend/api/src/modules/core/templates/templates.controller.spec.ts`

**Approach:**
- Update mock service return values to return `TemplateWithBaseResponseDto`-shaped objects (use a minimal fixture with `template.id` and `baseTemplate: null`).
- Add assertions on the controller method's return value: `result.template.id` equals the fixture's id; `result.baseTemplate` equals null (for the BASE fixture).
- Existing delegation assertions (that service methods are called with the right args) stay unchanged.

**Patterns to follow:**
- Existing `jest.Mocked<TemplatesService>` setup in the same file.

**Test scenarios:**
- Happy path: GET `/templates/:identifier` return value has `template.id` matching mock fixture.
- Happy path: POST `/templates` return value has `template.id` matching mock fixture.
- Happy path: PUT `/templates/:id` return value has `template.id` matching mock fixture.

**Verification:**
- `pnpm --filter @hsm/api test -- --testPathPattern=templates.controller` passes.

---

### U6. Worker service — SMS support and spec review

**Goal:** Load `comSms` relation when `withChildren: true`; add `parseSms` method mirroring `parseEmail`; update spec.

**Requirements:** R3, R6

**Dependencies:** U1

**Files:**
- Modify: `apps/backend/worker/src/modules/core/templates/templates.service.ts`
- Modify: `apps/backend/worker/src/modules/core/templates/templates.service.spec.ts`

**Approach:**
- Add `comSms: withChildren` to the `relations` object in worker's `findByIdentifier`.
- Add `parseSms(identifier, data)` method: loads template with `{ withChildren: true, withBase: true }`, checks `template.comSms` exists (throws if not an SMS template), then calls `parse({ identifier, data })` and returns `{ provider, from, html, templateId }` (or whatever the SMS dispatch shape requires — at minimum `html` and `templateId` for the queue consumer).
- Worker `findByIdentifier` return type stays `TemplatesEntity` — no mapping needed here.
- Update spec: add `parseSms` happy-path test (SMS template with `comSms` loaded) and error path (template is not SMS category).

**Patterns to follow:**
- `parseEmail` method in the same file — same guard / compile / delegate-to-parse pattern.

**Test scenarios:**
- Happy path: `parseSms` with valid SMS template returns `{ html, templateId }`.
- Error path: `parseSms` called on a template without a `comSms` relation throws an error. The error type should be a semantic one (category/shape mismatch), not `TemplateInvalidHandlebarsError` — the implementer should choose the right error class and the test should assert that type. (Note: `parseEmail` reuses `TemplateInvalidHandlebarsError` for this guard; SMS should either match that precedent for consistency or use a more accurate error. Decide and test both paths the same way.)
- Integration: existing `parse` and `parseEmail` tests still pass after adding `comSms` to relation loading.

**Verification:**
- `pnpm --filter @hsm/worker test -- --testPathPattern=templates.service` passes with no regressions.

---

### U7. Seeds — `base_layout` schema and SMS seed

**Goal:** Update `base_layout` schema to `{ body: "string" }` to accurately describe its content; add an SMS_INTERNAL seed template and its `TemplateComSmsEntity` row; register the new seed.

**Requirements:** R3, R7

**Dependencies:** U1

**Files:**
- Modify: `packages/database/src/seeder/modules/core/template/templates.seed.ts`
- Create: `packages/database/src/seeder/modules/core/template/template-com-sms.seed.ts`
- Modify: `packages/database/src/seeder/modules/core/template/index.ts`
- Modify: `packages/database/src/seeder/seeder.seeds.ts`

**Approach:**
- In `templates.seed.ts`: change `base_layout` row `schema` from `{}` to `{ body: 'string' }`. Add an SMS_INTERNAL seed row (`sms_appointment_reminder`) referencing `TEMPLATE_BASE_LAYOUT_ID`, with schema `{ patientName: 'string' }` and Handlebars content.
- Create `template-com-sms.seed.ts`: define `templateComSmsSeed` for the new SMS row with `provider`, `templateName`, `from` values.
- Update `index.ts` barrel to export `templateComSmsSeed`.
- Append `templateComSmsSeed` to `ALL_SEEDS` in `seeder.seeds.ts` (after `templatesSeed` so the parent row exists).

**Patterns to follow:**
- `template-com-email.seed.ts` structure — same `SeedDefinition<T>` shape.

**Test scenarios:**
- Test expectation: none — seed data; verify by running the seeder against a clean DB and checking that `GET /v1/templates/sms_appointment_reminder` returns the new shape with `metadata: { provider, templateName, from }`.

**Verification:**
- Seeder runs without FK errors: `base_layout` and parent SMS template row exist before `templateComSmsSeed` inserts.
- `GET /v1/templates/base_layout` returns `schema: { body: "string" }`.

---

### U8. HTTP test file updates

**Goal:** Update `templates.http` to show the new `{ template, baseTemplate }` response shape in all example comments.

**Requirements:** R1, R2

**Dependencies:** U2, U3

**Files:**
- Modify: `apps/backend/api/src/modules/core/templates/templates.http`

**Approach:**
- Update response example comments for GET, POST, PUT to reflect the new `data.template` / `data.baseTemplate` structure.
- Ensure any Handlebars expressions in request body examples use bracket notation `[variable]` not `{{variable}}` (per institutional learning).
- Add a request block for SMS_INTERNAL create (POST with `category: SMS_INTERNAL`, `sms` block, `baseTemplateId`).

**Patterns to follow:**
- `docs/solutions/developer-experience/http-test-files-vscode-rest-client-convention-2026-05-07.md` — bracket notation for Handlebars in body examples.

**Test scenarios:**
- Test expectation: none — manual test file; no automated coverage needed.

**Verification:**
- VS Code REST Client shows no variable-substitution warnings on any `.http` block.
- Manual GET request against a seeded template returns the expected `{ data: { template, baseTemplate } }` structure.

---

## System-Wide Impact

- **Interaction graph:** `ResponseInterceptor` wraps all controller returns — no change needed; the interceptor accepts any object as `data`. The `template` key in `TemplateWithBaseResponseDto` does not trigger the interceptor's slim-mode shortcut (which only fires when the return value has a top-level `data` key).
- **Error propagation:** Unchanged — `TemplateNotFoundError`, `TemplateInvalidShapeError`, etc. are thrown before any mapping and caught by the global `ResponseFilter` as before.
- **State lifecycle risks:** Mapper is read-only; no mutation risk. The recursive `toDetailDto` call for `baseTemplate` is one level deep only (BASE templates have no parent), so no infinite recursion risk.
- **API surface parity:** Worker's `parseSms` is new — the queue consumer (`ComsModule`) will need to call it for SMS jobs when that flow is built. This is not wired in this plan.
- **Integration coverage:** The seeder's ordering dependency (parent template row before child `comSms` row) must hold in `ALL_SEEDS`. Validate by running seeder on a fresh DB.
- **Unchanged invariants:** Delete endpoint (`{ id }`), validate endpoint response shape (`{ valid, templateId?, issues? }`), worker `findByIdentifier` return type (`TemplatesEntity`), and all existing entity schemas and migrations are unchanged.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Postgres `category` enum requires `ALTER TYPE` for new SMS values | `synchronize: true` handles dev automatically; document as follow-up ops/migration for production deployment |
| `toDetailDto` recursion on `baseTemplate.baseTemplate` if a non-BASE template is miscategorized as a base | BASE category is enforced by DB constraint + `assertCategoryShape`; mapper can add a guard asserting `baseTemplate.category === BASE` to fail loudly in dev if invariant breaks |
| `validate` calling `findByIdentifier` without `withChildren` returns `metadata: null` in the mapped result | This is correct — validate only needs `schema`/`content`/`id` from `template`; `metadata: null` in the validate-internal result is never exposed to the caller |
| TypeORM entity circular import fires silently if `TemplateComSmsEntity` import path is wrong | Always import via `@hsm/database/entities` root; run `start:dev` after adding the import to surface any DI failure early |

---

## Sources & References

- **Origin document:** [docs/brainstorms/template-response-restructure-requirements.md](docs/brainstorms/template-response-restructure-requirements.md)
- Entity: `packages/database/src/entities/modules/core/template/`
- Seeder registry: `packages/database/src/seeder/seeder.seeds.ts`
- Institutional learnings: `docs/solutions/runtime-errors/typeorm-entity-circular-import-silent-drop-2026-05-04.md`, `docs/solutions/developer-experience/nestjs-unit-test-mocking-patterns-2026-05-06.md`, `docs/solutions/developer-experience/http-test-files-vscode-rest-client-convention-2026-05-07.md`
