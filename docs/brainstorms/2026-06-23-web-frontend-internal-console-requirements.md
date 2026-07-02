---
title: "Internal web console for the HSM backend (auth, users/admin, docs)"
date: 2026-06-23
topic: web-frontend-internal-console
---

# Internal web console for the HSM backend (auth, users/admin, docs)

## Summary

Build the `@hsm/web` Angular app from its current empty placeholder into an internal back-office console for the existing backend. The first cut ships three areas on a real auth foundation: user self-service, an admin panel (role management + live operational settings), and the full docs surface (a template-authoring editor, document generation, and uploads). The shell is structured so customer-facing and additional internal modules can be added later without reworking auth or layout.

---

## Problem Frame

The backend is already rich — JWT auth, role-based access, users, templates with base-template inheritance, document generation/upload, and email/comms — but none of it is reachable by a non-developer. `apps/frontend/web` is a workspace placeholder whose `build`/`dev` scripts only echo `TODO`. Today the only way to exercise the API is Swagger or a REST client. The app has no real users yet, so this is greenfield: no data migration, no behavior to preserve, no existing UI to stay compatible with. The cost is that everything the backend can do sits behind a developer-only interface, blocking the team from operating the product and blocking the planned customer-facing work that would sit on the same shell.

---

## Key Decisions

- **Internal-first, multi-module shell.** The app is primarily an internal console, but its routing/layout/auth are built to mount future customer-facing modules without a rebuild. This shapes how navigation and route-guarding are structured from day one.
- **Editor layout: foldable metadata bar over a code/preview split.** The template editor keeps a thin, collapsible bar for metadata and the base-template picker, and gives the main area to a side-by-side code editor and live preview. Chosen over a three-column form/code/preview layout and over a stepped wizard, to optimize the author's code↔preview loop.
- **Live settings via a DB-backed store seeded by env.** "Admin can update config at any point and it takes effect" cannot be served by `@hsm/config`, which Joi-validates and `Object.freeze`s `process.env` once at boot. So operational config moves to a backend store the app reads at runtime, with deploy-time env as the seed/fallback. Infrastructure that can't safely change on a running process (DB/Redis connection) stays deploy-only.
- **Hybrid preview with a true-preview-on-save gate.** The preview renders client-side (Handlebars in the browser) for instant feedback while authoring. On Save, the app calls a backend render endpoint and shows the real server-composed output — including base-template composition — in a confirm step before persisting, so what an author saves is what generation will produce.
- **Secrets are write-only and audited.** Secret-valued settings are shown masked and can be replaced but not read back, and every config change is recorded in an audit log so live edits to credentials are traceable.

---

## Actors

- A1. **Internal user** — a signed-in team member who authors templates, generates and uploads documents, and manages their own profile.
- A2. **Admin** — an internal user with elevated rights: manages other users' roles and edits live operational settings. A superset of A1.

---

## Requirements

### Auth and app shell

- R1. Users authenticate with email/password against the existing JWT access+refresh flow; the app holds both tokens and refreshes the access token transparently.
- R2. Unauthenticated users are redirected to login; all non-public routes are guarded.
- R3. Navigation and controls are role-gated — a non-admin never sees admin-only routes or actions.
- R4. The shell's routing, layout, and auth are structured so future modules (internal or customer-facing) mount without reworking the foundation.

### User self-service

- R5. A signed-in user can change their own password, name, and email.
- R6. A user cannot change their own role.

### Admin panel

- R7. An admin can list users, view a user, and change that user's role.
- R8. An admin can view and edit operational config across all categories: email/SMTP, webhook signing keys, storage/S3, and app-behavior toggles (e.g., rate limits, token TTLs, feature flags).
- R9. Config edits persist to the backend settings store and take effect at runtime with no restart; deploy-time env seeds the defaults when a value is unset.
- R10. Secret-valued settings (e.g., SMTP password, webhook signing keys) are masked in the UI — displayed obscured, replaceable, never read back.
- R11. Every config change is recorded in an audit log capturing who changed which setting and when; secret values are never written to the log in plaintext.

### Template authoring

- R12. The editor shows a foldable metadata bar (name, description, category, base-template selector) above a split code-editor / live-preview area.
- R13. An author may select a BASE template; if none is selected, the author writes the full template content.
- R14. The code editor edits Handlebars/HTML template content with syntax highlighting.
- R15. A sample-data panel, seeded from the template's schema, supplies the values the preview renders against; the author can edit that sample data.
- R16. The live preview renders client-side and updates as the content or the sample data changes.
- R17. On Save, the app calls the backend render endpoint and shows the true server-composed output (including base-template composition) in a confirm step; the template persists only after the author confirms.

### Document generation and library

- R18. A user can pick a template, fill in its data, generate a PDF, and download it.
- R19. Generated and uploaded documents appear in a browsable list scoped to the user.
- R20. A user can upload existing files into the document store.

### Backend prerequisites

- R21. The backend exposes a draft-render endpoint that composes a template's content + optional base template + sample data into HTML matching generation output, callable for unsaved drafts.
- R22. The backend provides a runtime settings store (seeded by env) with endpoints to read and update the config categories in R8, returning secret values as write-only and recording changes for R11's audit log.

---

## Key Flows

- F1. Author and save a template
  - **Trigger:** A1 opens the editor for a new or existing template.
  - **Actors:** A1
  - **Steps:** Author optionally picks a BASE template; edits content in the code pane; the client-side preview updates live against schema-seeded sample data; on Save, the app calls the render endpoint and shows the true server-composed output for confirmation; on confirm, the template persists.
  - **Covered by:** R12, R13, R14, R15, R16, R17, R21

- F2. Edit a live setting
  - **Trigger:** A2 opens the admin Settings screen.
  - **Actors:** A2
  - **Steps:** Admin views current config (secrets masked); edits a value; saves; the backend store updates and records the change in the audit log; the running app uses the new value without a restart.
  - **Covered by:** R8, R9, R10, R11, R22

- F3. Generate a document
  - **Trigger:** A1 chooses to generate from a template.
  - **Actors:** A1
  - **Steps:** User selects a template, fills its data, triggers generation, and downloads the resulting PDF, which then appears in the document list.
  - **Covered by:** R18, R19

---

## Acceptance Examples

- AE1. **Covers R17.** Given an author has edited template content, when they click Save, then the app shows the server-rendered output in a confirm dialog and persists nothing until they confirm; if they cancel, no changes are saved.
- AE2. **Covers R17, R16.** Given a draft whose client-side preview looked correct, when the true preview reveals a base-composition difference, then the author can cancel the save and keep editing.
- AE3. **Covers R10, R11.** Given a secret setting (e.g., SMTP password) has a stored value, when an admin opens Settings, then the field shows a masked placeholder rather than the value; saving a blank secret leaves the stored value unchanged; and any actual change is recorded in the audit log without the plaintext secret.
- AE4. **Covers R3, R6.** Given a non-admin user, when they view their profile or navigate the app, then no role-change control and no admin route is reachable.
- AE5. **Covers R15.** Given a template with a schema, when the editor opens, then the sample-data panel is pre-populated with values derived from that schema and is editable.

---

## Scope Boundaries

### Deferred for later

- Email/comms management screens (sends, batches, recipients, webhook events) — the backend supports them, but they are not in this cut.
- Customer-facing modules — the shell must not preclude them, but none ship here.
- The mobile app (`@hsm/mobile`) remains a placeholder.

### Outside this cut

- SMS features (backend is a stub).
- Editing infrastructure config that can't change on a running process (DB/Redis connection) — stays deploy-only.
- Per-file entity linking and document-content editing after upload.

---

## Dependencies / Assumptions

- The two backend prerequisites (R21 render endpoint, R22 settings store with audit logging) are server-side work that the frontend cannot deliver without. They are captured here as requirements; planning may sequence them as a separate backend track that the web work depends on.
- Stack is Angular per repo convention, talking to the API at host port `10001` (`/v1/...`), reusing DTOs/enums from `@hsm/common`, expecting `SuccessResponseDto`/`ErrorResponseDto` wrappers, and linting with the repo's Biome config (`apps/frontend/web/CLAUDE.md`).
- Client-side preview fidelity assumes the Handlebars helpers used server-side are available (or acceptably approximated) in the browser; the true-preview-on-save gate is the backstop for any divergence.

---

## Outstanding Questions

### Deferred to planning

- UI component/styling library choice for the Angular app.
- Exact code-editor component for the template editor (syntax-highlighting source).
- Whether document generation is synchronous from the user's view or surfaces async job status (backend generates via a queue/worker).

---

## Sources / Research

- `apps/frontend/web/package.json`, `apps/frontend/web/CLAUDE.md` — current placeholder state and intended conventions.
- `apps/backend/api/src/modules/core/templates/templates.controller.ts`, `templates.service.ts` — `validate` checks data against a saved template's schema and only `Handlebars.precompile`s for syntax; no draft-render endpoint exists.
- `apps/backend/worker/src/modules/core/templates/templates.service.ts` — server-side Handlebars render and base-template composition happen only during generation jobs.
- `packages/config/src/envs.ts` — env is Joi-validated and `Object.freeze`d at boot; no runtime settings store today.
- `apps/backend/api/src/guards/auth.guard.ts`, `apps/backend/api/src/modules/security/roles/` — JWT AT+RT guards and the `@Roles()` / `RolesGuard` model.
- `packages/database/src/entities/modules/core/template/templates.entity.ts` — base-template inheritance enforced by a DB CHECK constraint (BASE has no base; non-BASE requires one).
