---
title: Move template parsing from @hsm/api to @hsm/worker
type: refactor
status: completed
date: 2026-05-04
---

# Move template parsing from @hsm/api to @hsm/worker

## Summary

Relocate Handlebars parse + parse-log persistence from `@hsm/api`'s `TemplatesService` into `@hsm/worker`'s `TemplatesService`. API keeps template CRUD plus a new pre-enqueue `validate()` path (schema + Handlebars syntax). Worker queue consumers (`EmailService`, future `DocsService`) parse on demand by calling `TemplatesService.parse(...)`. Job payloads stay small (template identifier + data), so Redis no longer carries rendered HTML.

---

## Problem Frame

Today `apps/backend/api/src/modules/core/templates/templates.service.ts` exposes a `parse()` that compiles Handlebars and returns HTML. The intended flow had `ComsService` / `DocsService` on the API call `parse()` first and enqueue the rendered HTML to BullMQ. Rendered HTML for emails and documents can be large (hundreds of KB) and would be serialized into Redis as job payload, then deserialized in the worker only to be passed straight to nodemailer / Puppeteer. That bloats Redis memory, slows job pickup, and duplicates compile work the worker is better positioned to do.

The worker module tree already mirrors API (`ComsModule`, `DocsModule`, `TemplatesModule` exist as scaffolds in `apps/backend/worker/src/modules/core/`), and `EmailService` already injects a placeholder `TemplateService` and currently emits hardcoded `subject` / `html`. The infrastructure is in place; the parse stack just needs to live on the consumer side.

---

## Requirements

- R1. Job payloads on the `coms` and `document` queues carry template identifier + data only. No rendered HTML in Redis.
- R2. Worker `TemplatesService` implements `parse(input)` with the same semantics as today's API `parse()`, including `template_parse_logs` persistence.
- R3. API `TemplatesService` retains CRUD (`findByIdentifier`, `create`, `update`, `delete`) and Handlebars syntax precompile checks during create/update.
- R4. API exposes a synchronous validation endpoint that, given `{identifier, data}`, confirms the template exists, the data matches the template schema, and the template's content compiles. It does NOT return rendered HTML.
- R5. Worker `EmailService.sendEmail` produces final `subject` and `html` by calling `TemplatesService.parse(...)` for body and resolving the email template's stored `subject` (Handlebars compile of the subject string with the same data).
- R6. Template version drift policy: worker resolves the current template at process time (no version pinning, no snapshot in payload).
- R7. Existing API `POST /v1/templates/parse` endpoint is retired. Its replacement is `POST /v1/templates/validate` returning a validation verdict, not HTML.

---

## Scope Boundaries

- Not implementing the worker-side document generation flow end-to-end (Puppeteer wiring beyond what already exists). Doc-side parse wiring is set up so future `DocsService` consumers can call it, but no new doc job processor lands here.
- Not introducing a template versioning column or any version-pinning mechanism. Latest-at-process-time is the chosen policy (R6).
- Not adding a Redis or DB pub/sub channel between API template updates and worker compile cache. Worker drops the in-memory `compiledCache` instead.
- Not changing `SendEmailPayloadDto` or other queue payload DTOs. They already carry `emailTemplate` (identifier) + `data`.
- Not touching authentication / Roles / throttling for the new validate endpoint beyond mirroring the existing parse endpoint's `@Roles()` decorator.

### Deferred to Follow-Up Work

- Worker-side document generation pipeline (queue consumer for `document` queue that calls `TemplatesService.parse` then `GenerationService.generatePDF` then S3 upload): separate plan.
- Re-introducing a compile cache in the worker, keyed on `template.id + template.updatedAt`, if profiling shows compile cost matters: future iteration.
- SMS template parsing path: currently SMS service is a stub; will follow same pattern as email when implemented.

---

## Context & Research

### Relevant Code and Patterns

- [apps/backend/api/src/modules/core/templates/templates.service.ts](apps/backend/api/src/modules/core/templates/templates.service.ts) — current parse stack at lines 224–304 (`parse`), 369–375 (`assertHandlebarsCompiles`), 428–436 (`getCompiled`), 438–467 (`writeLog`).
- [apps/backend/api/src/modules/core/templates/templates.controller.ts](apps/backend/api/src/modules/core/templates/templates.controller.ts) — `POST /parse` at lines 66–82 to be replaced.
- [apps/backend/worker/src/modules/core/templates/templates.service.ts](apps/backend/worker/src/modules/core/templates/templates.service.ts) — empty class, target for the moved logic.
- [apps/backend/worker/src/modules/core/coms/email/email.service.ts](apps/backend/worker/src/modules/core/coms/email/email.service.ts) — already injects placeholder `TemplateService`; lines 53–56 contain hardcoded `subject` / `html` to replace.
- [apps/backend/worker/src/modules/core/coms/template/template.service.ts](apps/backend/worker/src/modules/core/coms/template/template.service.ts) — empty stub `TemplateService` to delete (replaced by worker `TemplatesService` from the templates module).
- [packages/database/src/entities/modules/core/template/](packages/database/src/entities/modules/core/template/) — `TemplatesEntity`, `TemplateParseLogEntity`, `TemplateComEmailEntity`, `TemplateDocEntity` already shared via `@hsm/database`. Both apps inject repos with `@InjectRepository(Entity, DatabasesEnum.HsmDbPostgres)`.
- [packages/common/src/utils/](packages/common/src/utils/) — `validateAgainstTemplateSchema`, `isWellFormedTemplateSchema` reused on both sides.
- [packages/common/src/enums/core-templates.enum.ts](packages/common/src/enums/core-templates.enum.ts) — `TemplateParseTriggerEnum`, `TemplateParseErrorCodeEnum` reused.
- [packages/queue/src/queue.worker-host.ts](packages/queue/src/queue.worker-host.ts) — base class `QueueWorkerHost`; thrown errors from `handle()` already trigger BullMQ retry (3 attempts, 1s delay, 2s backoff per `queue.module.ts`).

### Institutional Learnings

- `@hsm/api`'s `CLAUDE.md` rule: "To enqueue jobs, inject `@InjectQueue('<queue>')` from `@hsm/queue` — actual processing lives in `@hsm/worker`." This refactor enforces that boundary; today's plan to call `parse()` on API before enqueue would have violated it.
- `@hsm/worker`'s `CLAUDE.md` rule: "Only the worker has Puppeteer (`docs/generation`). Keep PDF/headless-browser code on this side — never add it to the API." Same logic extends to Handlebars rendering: parsing belongs next to consumers.
- `@hsm/queue`'s `CLAUDE.md` defaults: 3 attempts, 1s delay, 2s backoff. A parse error in the worker will retry. If the underlying issue is a template content bug (deterministic), all 3 attempts will fail and the job ends in `failed` state — acceptable for now; alerting belongs in a future iteration.

### External References

- Not used. Local patterns are direct and well-established (parse logic exists; it just moves between two NestJS apps already wired the same way).

---

## Key Technical Decisions

- **No compile cache in the worker (initial).** Today's `compiledCache` Map on the API process keyed on `template.id` cannot survive a "latest at process time" model without invalidation, and BullMQ workers can scale horizontally — every replica would maintain its own stale cache. Drop the cache and recompile per parse. Handlebars compile of typical templates is sub-millisecond; the cache was premature optimization. If profiling later shows it matters, key it on `template.id + template.updatedAt` so updates self-invalidate.
- **API `validate()` performs three checks atomically: existence, schema, syntax precompile.** It does NOT execute the compiled template against the data, so it does not return HTML and does not write to `template_parse_logs`. Cheap, synchronous, fail-fast at request time. Schema/handlebars failures return structured `valid:false + issues` rather than throwing — caller decides whether to surface as form error.
- **`template_parse_logs` writes move to the worker.** The log's purpose is post-mortem of actual rendering attempts, which now happen in the worker. API validate failures are not logged to that table — they are user-facing validation responses, not parse attempts.
- **Worker `TemplatesService` reuses the same Postgres data source.** `DatabaseModule` is already `@Global()` and registered in worker `WorkerModule`; entities are shared via `@hsm/database`. No new connection or migration needed.
- **`triggeredBy` on log rows.** API used to set `Http` for `/parse` and `Internal` for service-to-service. Going forward all worker parses default to `Internal`; the new API `validate()` endpoint does not log. The `Http` enum value remains in the codebase for backward compatibility of historic rows but no new code path emits it. (No migration needed — it's still a valid enum value in the column.)
- **`ParseTemplateInput` / `ParseTemplateResult` / `ParseTemplateContext` types live in `@hsm/common/types`.** They were defined inline in the API service today; relocating them to common lets the worker import them and lets the API expose typed `validate()` input without redefining shapes.
- **Worker `coms/template/` stub deleted, not promoted.** The empty `TemplateService` under `coms/template/` is replaced by importing the proper worker `TemplatesModule` (which exports the real `TemplatesService`) into `ComsModule`. Avoids two parallel template services in the worker.

---

## Open Questions

### Resolved During Planning

- Template version drift: latest at process time. (User decision in Phase 0.)
- API pre-validation depth: schema + Handlebars precompile syntax check, no rendering. (User decision in Phase 0.)
- `template_parse_logs` location: moved to worker. (User decision in Phase 0.)
- Compile cache: drop initially. See Key Technical Decisions.
- Subject rendering: worker `EmailService` compiles `template.comEmail.subject` with Handlebars at send time using the same `data`. (Mirrors body-render semantics; subject often contains merge vars like `{{patientName}}`.)
- Existing `/templates/parse` endpoint: retired and replaced with `/templates/validate`, not just renamed-with-html-stripped, so the response shape change is explicit.

### Deferred to Implementation

- Whether the new API `validate()` should also assert that the data only contains keys declared in the template schema (strict mode) or merely that all required keys are present (loose). `validateAgainstTemplateSchema` behavior governs this; check current util on implementation and match its existing semantics. Document in code comment if non-obvious.
- Exact subject-template error path in worker `EmailService`: if subject compile throws but body succeeds, the job currently has no atomic guarantee. Decide at implementation whether to compile subject first (fail before body), or wrap both in a single try/catch. Default suggestion: compile subject first.

---

## High-Level Technical Design

> *This illustrates the intended flow and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```text
                  ┌──────────────────────── @hsm/api ────────────────────────┐
  HTTP client ──> │ TemplatesController                                      │
                  │   POST /v1/templates           → TemplatesService.create │
                  │   PUT  /v1/templates/:id       → TemplatesService.update │
                  │   GET  /v1/templates/:id       → TemplatesService.findByIdentifier │
                  │   DELETE /v1/templates/:id     → TemplatesService.delete │
                  │   POST /v1/templates/validate  → TemplatesService.validate (new) │
                  │                                                          │
                  │ ComsController                                           │
                  │   POST /v1/coms/send/email     → ComsService.sendEmail   │
                  │     └─ comsQueue.add('send-email', { emailTemplate, data, toEmails, ... }) │
                  │                                                          │
                  │ (no parse, no Handlebars compile, no parse-log writes)   │
                  └──────────────────────────────────────────────────────────┘
                                         │
                                         │ Redis (BullMQ)
                                         │ payload size = O(small): ids, recipients, vars
                                         ▼
                  ┌────────────────────── @hsm/worker ───────────────────────┐
                  │ ComsService @Processor('coms') handles 'send-email'      │
                  │   → EmailService.sendEmail(payload)                      │
                  │       ├─ TemplatesService.parse({ identifier, data })  ── compiles body html
                  │       ├─ Handlebars.compile(template.comEmail.subject)(data) ── subject
                  │       └─ smtpClient.sendMail({ subject, html, attachments })
                  │                                                          │
                  │ TemplatesService                                         │
                  │   parse(input):                                          │
                  │     1. findByIdentifier (with baseTemplate)              │
                  │     2. validateAgainstTemplateSchema → log+throw on fail │
                  │     3. compile child + (optional base wrap) → html       │
                  │     4. writeLog success/failure to template_parse_logs   │
                  └──────────────────────────────────────────────────────────┘
```

---

## Implementation Units

- U1. **Promote shared parse types into `@hsm/common/types`**

**Goal:** Make `ParseTemplateInput`, `ParseTemplateResult`, `ParseTemplateContext` importable from `@hsm/common/types` so both API and worker reference one source.

**Requirements:** R2, R4

**Dependencies:** None

**Files:**
- Create: `packages/common/src/types/core-templates.ts`
- Modify: `packages/common/src/types/index.ts` (add re-export)
- Modify: `apps/backend/api/src/modules/core/templates/templates.service.ts` (replace inline interface declarations with imports — transitional; service still has parse() at this point)

**Approach:**
- Move the three interfaces verbatim to `packages/common/src/types/core-templates.ts`.
- Follow `@hsm/common` convention: file named `<domain>-<feature>.<kind>` → here `core-templates.ts` under `types/`. Add to `types/index.ts` barrel.
- Import in API service from `@hsm/common/types` (subpath, never deep). API parse() still runs unchanged in this unit.

**Patterns to follow:**
- [packages/common/src/types/core-coms.ts](packages/common/src/types/core-coms.ts) — existing type file in same dir.

**Test scenarios:**
- Test expectation: none — pure type relocation, no runtime behavior change. API existing `templates.service.spec.ts` must still pass unchanged after the import swap.

**Verification:**
- `pnpm lint` clean.
- `pnpm --filter @hsm/api build` succeeds.
- `pnpm --filter @hsm/api test` passes unchanged.

---

- U2. **Implement worker `TemplatesService.parse` with parse-log persistence**

**Goal:** Worker `TemplatesService` owns `parse()` end-to-end: schema validation, child + base Handlebars compile, `template_parse_logs` write, error mapping.

**Requirements:** R2, R6

**Dependencies:** U1

**Files:**
- Modify: `apps/backend/worker/src/modules/core/templates/templates.service.ts`
- Modify: `apps/backend/worker/src/modules/core/templates/templates.module.ts` (register entities, export service)
- Modify: `apps/backend/worker/src/modules/core/templates/templates.service.spec.ts` (replace placeholder with real coverage)
- Test: `apps/backend/worker/src/modules/core/templates/templates.service.spec.ts`

**Approach:**
- Inject `TemplatesEntity` and `TemplateParseLogEntity` repos via `@InjectRepository(Entity, DatabasesEnum.HsmDbPostgres)`. `DatabaseModule` is global so no module imports needed beyond `TypeOrmModule.forFeature(...)` in `templates.module.ts`.
- Reuse `validateAgainstTemplateSchema` from `@hsm/common/utils`.
- Reuse `TemplateNotFoundError`, `TemplateSchemaValidationError`, `TemplateInvalidHandlebarsError` from `@hsm/common/errors`.
- Default `triggeredBy = TemplateParseTriggerEnum.Internal` when context is absent.
- Drop the `compiledCache` from today's API service. Per-parse `Handlebars.compile`. (See Key Technical Decisions.)
- Same base-template wrap semantics: if `template.category !== BASE && template.baseTemplate`, render child first, then `baseCompiled({ ...data, body: childHtml })`.
- `writeLog` errors must be swallowed and logged (not propagated) — same defensive pattern as today's API `writeLog`. Logging failure must not turn a successful send into a job retry.

**Patterns to follow:**
- [apps/backend/api/src/modules/core/templates/templates.service.ts](apps/backend/api/src/modules/core/templates/templates.service.ts) — lines 224–304 for parse flow, 438–467 for log writer; copy semantics, do not import.

**Test scenarios:**
- Happy path: parse with valid identifier + data on a non-BASE EMAIL template that has a base — returns `{ html, templateId }`, html includes child rendered inside base wrap, parse log row written with `success=true`, `outputLength=html.length`, `errorCode=null`.
- Happy path: parse a BASE-category template — child is rendered alone (no base wrap), log written with success=true.
- Edge case: identifier passed as template name (non-UUID) — resolves via `name` lookup. Identifier passed as UUID — resolves via `id` OR `name`.
- Edge case: missing `context` argument — `triggeredBy` defaults to `Internal`, `userId` defaults to `null`.
- Error path: identifier does not exist — throws `TemplateNotFoundError`, no parse log row written (cannot reference an unknown templateId).
- Error path: schema validation fails — throws `TemplateSchemaValidationError`, log row written with `success=false`, `errorCode=SCHEMA`, `errorMessage` joins issues with `; `.
- Error path: Handlebars compile/runtime throws (e.g. helper missing) — throws `TemplateInvalidHandlebarsError`, log row written with `errorCode=HBS_RUNTIME`, `outputLength=null`.
- Integration: parse-log write itself failing (e.g. DB error) — service swallows and logs via Nest `Logger`; original `parse()` outcome (success or thrown error) is preserved unchanged.

**Verification:**
- `pnpm --filter @hsm/worker test -- --testPathPattern=templates.service` passes.
- `pnpm --filter @hsm/worker build` succeeds.

---

- U3. **Wire worker `TemplatesModule` into `ComsModule` and `DocsModule`; delete obsolete `coms/template/` stub**

**Goal:** Make the worker `TemplatesService` injectable from `EmailService` and `GenerationService` paths. Eliminate the duplicate empty `TemplateService` in `coms/template/`.

**Requirements:** R5

**Dependencies:** U2

**Files:**
- Modify: `apps/backend/worker/src/modules/core/coms/coms.module.ts` (drop `TemplateModule` import from `coms/template/`, add `TemplatesModule` import from `core/templates/`)
- Modify: `apps/backend/worker/src/modules/core/coms/email/email.module.ts` (import `TemplatesModule` so `EmailService` can inject `TemplatesService`)
- Modify: `apps/backend/worker/src/modules/core/docs/docs.module.ts` (import `TemplatesModule` so future doc consumers can inject)
- Delete: `apps/backend/worker/src/modules/core/coms/template/template.service.ts`
- Delete: `apps/backend/worker/src/modules/core/coms/template/template.service.spec.ts`
- Delete: `apps/backend/worker/src/modules/core/coms/template/template.module.ts`

**Approach:**
- `TemplatesModule` (worker) must `exports: [TemplatesService]` (set in U2) so consumer modules see it.
- Update any import of the deleted `TemplateService` in `email.service.ts` to point at the worker `TemplatesService` from `@hsm/...` relative path. (Email service currently injects placeholder `TemplateService`; that injection target swaps in U4.)

**Patterns to follow:**
- Existing module-import pattern: see how `coms.module.ts` imports `EmailModule` / `SmsModule` and how `docs.module.ts` imports `GenerationModule`.

**Test scenarios:**
- Integration: `Test.createTestingModule({ imports: [ComsModule] })` resolves without missing-provider errors and `EmailService`'s `TemplatesService` dep is satisfied.
- Integration: `coms/template/` directory no longer exists (`fs.existsSync` check in test or simply build-time confirmation — agent picks one).

**Verification:**
- `pnpm --filter @hsm/worker build` succeeds.
- `pnpm --filter @hsm/worker test` passes (no broken module specs).

---

- U4. **Hook worker `EmailService` to `TemplatesService` for subject + html**

**Goal:** Replace the hardcoded `subject` / `html` block in `EmailService.sendEmail` with real renders driven by the email template's stored content.

**Requirements:** R5

**Dependencies:** U2, U3

**Files:**
- Modify: `apps/backend/worker/src/modules/core/coms/email/email.service.ts`
- Modify: `apps/backend/worker/src/modules/core/coms/email/email.service.spec.ts`
- Test: `apps/backend/worker/src/modules/core/coms/email/email.service.spec.ts`

**Approach:**
- Constructor injects worker `TemplatesService` (replaces the deleted placeholder `TemplateService`).
- In `sendEmail`:
  1. Fetch the template via `templatesService` parse path (returns html); separately resolve the subject string. Two reasonable shapes — pick at implementation:
     - **a)** `parse()` already loads the entity; expose a sibling `parseEmail(identifier, data)` on worker `TemplatesService` that returns `{ subject, html, templateId }` by resolving `template.comEmail.subject`, compiling it with Handlebars, and reusing parse semantics for the body. Keeps email-specific concern in templates module.
     - **b)** Caller-side: `EmailService` calls `templatesService.parse(...)` for body, then `findByIdentifier({ withChildren: true })` for the subject template, then compiles subject manually.
  - Recommend **a)** to keep Handlebars usage out of `EmailService`. Implementation may choose **b)** if cleaner; document the choice in a single-line comment if non-obvious.
  3. Pass `{ subject, html }` into the existing `nodemailer.SendMailOptions` block; keep existing attachment / `documents` flow untouched.
- Subject compile error path: surface as a thrown error so BullMQ retries (matches body-parse failure semantics).
- Drop the inline `{ subject: '...', html: '<p>This is a test email...</p>' }` block at lines 53–56.

**Patterns to follow:**
- [apps/backend/worker/src/modules/core/coms/email/email.service.ts](apps/backend/worker/src/modules/core/coms/email/email.service.ts) — current method shape; preserve attachment-handling block above the new render call.

**Test scenarios:**
- Happy path: `sendEmail({ emailTemplate: 'welcome', data: { userName: 'X' }, toEmails: ['a@b.c'] })` calls `templatesService.parse(...)` (or `parseEmail`), then calls `smtpClient.sendMail` with `subject` + `html` derived from the template + data, not from hardcoded strings.
- Edge case: `documents` undefined or empty — no S3 fetch invoked; `sendMail` called with `attachments: []` and rendered html still flows through.
- Error path: `templatesService.parse` throws `TemplateNotFoundError` — error propagates from `sendEmail`, BullMQ retry kicks in (verified by absence of try/catch swallowing or by mock of `templatesService.parse` rejecting and the spec asserting the rejection bubbles).
- Error path: subject compile throws — same: error propagates, no email sent (`smtpClient.sendMail` not called).
- Integration: with documents present, attachments are still added to `mailOptions.attachments` AND the rendered html (not the hardcoded one) is the body — confirms attachment path and parse path don't interfere.

**Verification:**
- `pnpm --filter @hsm/worker test -- --testPathPattern=email.service` passes.
- Manual smoke (optional): enqueue a `send-email` job from API with a known template and verify the worker delivers the rendered email via the dev SMTP target.

---

- U5. **Strip parse from API `TemplatesService`; add `validate()` and replace `/parse` endpoint with `/validate`**

**Goal:** Remove rendering responsibilities from the API. Provide a synchronous validation endpoint that fails fast on bad input but does NOT render. Keep create/update Handlebars syntax checks.

**Requirements:** R3, R4, R7

**Dependencies:** U1, U2 (worker takes over rendering before this lands so no consumer is broken)

**Files:**
- Modify: `apps/backend/api/src/modules/core/templates/templates.service.ts`
- Modify: `apps/backend/api/src/modules/core/templates/templates.controller.ts`
- Modify: `apps/backend/api/src/modules/core/templates/templates.service.spec.ts`
- Modify: `apps/backend/api/src/modules/core/templates/templates.controller.spec.ts`
- Modify: `packages/common/src/dtos/core-templates.dto.ts` — add `ValidateTemplatePayloadDto` (likely identical shape to `ParseTemplatePayloadDto`; reuse it directly if shape matches) and `ValidateTemplateResponseDto` (`valid: boolean`, `templateId?: string`, `issues?: SchemaIssue[]`).
- Modify: `packages/common/src/dtos/index.ts` — add new DTO export.
- Test: `apps/backend/api/src/modules/core/templates/templates.service.spec.ts`, `apps/backend/api/src/modules/core/templates/templates.controller.spec.ts`

**Approach:**
- Remove from `TemplatesService`: `parse()`, `getCompiled()`, `writeLog()`, `compiledCache` field, `parseLogs` repo injection, `TemplateParseLogEntity` import, runtime `Handlebars.compile` usage.
- Keep `Handlebars` import only for `precompile` inside `assertHandlebarsCompiles` (used by `create` and `update`).
- Add `async validate(input: { identifier: string; data: Record<string, unknown> }): Promise<{ valid: boolean; templateId?: string; issues?: SchemaIssue[] }>`:
  1. `findByIdentifier(input.identifier)` — if missing, throw `TemplateNotFoundError` (router responds 404, same as today's parse endpoint).
  2. `validateAgainstTemplateSchema(template.schema, input.data)` — if `!valid`, return `{ valid: false, templateId: template.id, issues }`.
  3. `Handlebars.precompile(template.content)` — if it throws, return `{ valid: false, templateId: template.id, issues: [{ path: 'content', expected: 'compilable Handlebars', received: '<error message>' }] }` (or matching the `SchemaIssue` shape used elsewhere).
  4. Otherwise return `{ valid: true, templateId: template.id }`.
- Controller change: delete `@Post('parse')` block; add `@Post('validate')` mirroring `@Roles()` auth and using `ValidateTemplatePayloadDto` / `ValidateTemplateResponseDto`.
- Module: drop `TypeOrmModule.forFeature(...)` registration of `TemplateParseLogEntity` if it was per-module (otherwise it's global at `DatabaseModule` and no change needed — verify).
- Specs: delete `parse()` spec coverage, add `validate()` spec coverage matching scenarios below. Update controller spec to assert the new route and the absence of the old.

**Patterns to follow:**
- API service shape: `findByIdentifier`, error throwing for not-found, `dataSource.transaction` patterns left untouched.
- DTO conventions: see [packages/common/src/dtos/core-templates.dto.ts](packages/common/src/dtos/core-templates.dto.ts) for `ApiSchema`, `ApiProperty`, class-validator decorators on DTO class fields.

**Test scenarios:**
- Service happy path: `validate({ identifier: 'welcome', data: { userName: 'X' } })` on a template whose schema accepts `userName: string` → `{ valid: true, templateId: '<uuid>' }`. No DB write to `template_parse_logs`.
- Service edge: identifier passed as UUID and as name both resolve.
- Service error path: identifier not found → throws `TemplateNotFoundError`.
- Service validation failure: data missing required field → `{ valid: false, templateId, issues: [...] }` returned (NOT thrown).
- Service syntax failure: template content is malformed Handlebars (e.g. unclosed `{{#if}}`) → `{ valid: false, templateId, issues: [{ path: 'content', ... }] }`. (This is unusual since create/update already gate via precompile, but it can happen if seed data was bypassed or future hand-edits to the DB.)
- Service no-side-effect check: confirm `parseLogs.save` is NOT called by `validate` (mock the repo and assert no calls). Also confirm `Handlebars.compile` (runtime, not precompile) is NOT invoked.
- Service: `parse`, `getCompiled`, `writeLog` symbols are gone from the class (TypeScript-level — covered by build success). Existing CRUD specs (`create`, `update`, `delete`, `findByIdentifier`) pass unchanged.
- Controller: `POST /v1/templates/validate` with valid body → 200, response body matches `ValidateTemplateResponseDto`.
- Controller: `POST /v1/templates/parse` → 404 Not Found (route removed).
- Controller: `validate` route honors `@Roles()` guard the same way `parse` did.

**Verification:**
- `pnpm --filter @hsm/api build` succeeds.
- `pnpm --filter @hsm/api test` passes including new validate cases.
- `pnpm --filter @hsm/api test:e2e` passes (if e2e covers templates routes; otherwise add a smoke for `/validate`).
- Swagger UI at `http://localhost:10001/api` lists `POST /v1/templates/validate` and not `POST /v1/templates/parse`.

---

## System-Wide Impact

- **Interaction graph:** API CRUD endpoints unchanged. API `/templates/parse` endpoint deleted; replaced by `/templates/validate` returning a different shape. Any frontend or external consumer hitting `/parse` for HTML preview must be updated separately (no known callers in repo at time of plan; verify before merge).
- **Error propagation:** Worker `TemplatesService.parse` throws → `EmailService` does NOT catch → `QueueWorkerHost.process` logs via `QueueService.workerFailed` and rethrows → BullMQ schedules retry per default options (3 attempts). Permanent template failures fail the job after retries with a logged stack.
- **State lifecycle risks:** Latest-at-process-time means a template update between job enqueue and job pickup will use the newer version. If a job retries after a template edit, the retry uses the new version. Acceptable per R6.
- **API surface parity:** `POST /v1/templates/parse` is a breaking change for external clients. Frontend not yet built (see repo-root `CLAUDE.md`: "Angular coming"), so risk is contained. Note in commit / PR message.
- **Integration coverage:** Worker `EmailService` spec must mock `TemplatesService.parse` to assert the integration shape; an end-to-end test (queue → worker → SMTP-test-target) is recommended but not required by this plan.
- **Unchanged invariants:** `SendEmailPayloadDto` and other queue payload DTOs unchanged. `template_parse_logs` schema unchanged. `TemplatesEntity` / child entities unchanged. `DatabaseModule`, `QueueModule`, `StorageModule` unchanged. CRUD endpoints (`GET / POST / PUT / DELETE /v1/templates...`) preserve current shape and behavior.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Frontend or test fixture relies on `POST /v1/templates/parse` returning HTML for preview. | Grep repo + frontend (when present) for the route before deletion. If a preview UI is needed later, add a worker-side `parse-preview` queue OR a thin API endpoint that calls worker via RPC. Out of scope here. |
| Removing `compiledCache` regresses performance under high parse volume. | Handlebars compile is sub-millisecond for typical templates. If profiling shows hotspot, re-add an LRU keyed on `template.id + template.updatedAt` in worker `TemplatesService` (deferred). |
| Template update mid-job causes inconsistent rendering across a retry. | Documented and accepted per R6. Future versioning can pin if needed. |
| Worker's `template_parse_logs` writes increase DB load on the worker DB connection. | Same single Postgres data source already shared with API; no new connections. Volume of writes equals today's `parse()` call rate — unchanged in aggregate, just relocated. |
| `EmailService` currently emits hardcoded `subject` / `html`; downstream tests / dashboards may assert on those exact strings. | Update specs in U4. Greppable strings: `'Email from }'`, `'<p>This is a test email from.</p>'`. |

---

## Documentation / Operational Notes

- Update [apps/backend/api/CLAUDE.md](apps/backend/api/CLAUDE.md) module-tree note: API `TemplatesModule` description should drop "Handlebars rendering" responsibility.
- Update [apps/backend/worker/CLAUDE.md](apps/backend/worker/CLAUDE.md) Queues-consumed table: clarify that `TemplatesModule` is now the parsing engine for `coms` and `document` consumers, not just the `templates` queue.
- Swagger UI auto-updates from controllers; no manual edit needed.
- No DB migration. Schema unchanged.
- No env var changes.
- Rollout is a single deploy of both `@hsm/api` and `@hsm/worker`. They can deploy in either order because:
  - If worker is updated first: API still has its own parse path; no behavioral overlap (API parses are direct HTTP responses, not queue-feeding).
  - If API is updated first: API loses `/parse` and gains `/validate`; worker still has empty `TemplatesService` until next deploy. As long as no new `send-email` jobs are enqueued in the gap, nothing breaks. If they are, jobs fail and BullMQ retries — by the time worker deploys, retries succeed.
- Recommend deploying worker first to keep email delivery path intact during the brief overlap.

---

## Sources & References

- Related code:
  - [apps/backend/api/src/modules/core/templates/templates.service.ts](apps/backend/api/src/modules/core/templates/templates.service.ts)
  - [apps/backend/api/src/modules/core/templates/templates.controller.ts](apps/backend/api/src/modules/core/templates/templates.controller.ts)
  - [apps/backend/worker/src/modules/core/templates/templates.service.ts](apps/backend/worker/src/modules/core/templates/templates.service.ts)
  - [apps/backend/worker/src/modules/core/coms/email/email.service.ts](apps/backend/worker/src/modules/core/coms/email/email.service.ts)
  - [packages/common/src/dtos/core-templates.dto.ts](packages/common/src/dtos/core-templates.dto.ts)
  - [packages/database/src/entities/modules/core/template/](packages/database/src/entities/modules/core/template/)
  - [packages/queue/src/queue.worker-host.ts](packages/queue/src/queue.worker-host.ts)
- Repo-root and per-workspace conventions: [CLAUDE.md](CLAUDE.md), [apps/backend/api/CLAUDE.md](apps/backend/api/CLAUDE.md), [apps/backend/worker/CLAUDE.md](apps/backend/worker/CLAUDE.md), [packages/queue/CLAUDE.md](packages/queue/CLAUDE.md), [packages/common/CLAUDE.md](packages/common/CLAUDE.md).
