---
title: Legacy Oracle ⇄ New App Coexistence Architecture
status: draft — awaiting review
created: 2026-07-02
authors: Raul Santamaria (+ Claude)
related:
  - docs/migration/legacy-system-audit.md
  - docs/migration/modules-detail.md
  - docs/migration/legacy-audit-instructions.md
  - docs/roadmap/hospital-platform-build-tracker.md
---

# Legacy Oracle ⇄ New App Coexistence Architecture

## 1. Problem & context

We are rebuilding the legacy hospital system **SanoSoft** (server-rendered PHP + Oracle,
system of record `10.1.1.10/SMARIA`) as a new platform (`@hsm/api` NestJS + TypeORM +
Postgres, `@hsm/web` Angular). The rebuild is **incremental and long-running**: the legacy
app stays in production and keeps writing Oracle the entire time, and we are **not allowed
to modify the legacy codebase**.

Two hard requirements drive this design:

1. **Dev must not require Oracle.** The new app currently fails to boot when the Oracle host
   is unreachable (`ORA-12170` at startup). Local development and CI must run against the new
   Postgres tables alone, with no Oracle dependency.
2. **The new app must still read live legacy data** — in both dev (opt-in) and prod — because
   most entities (patients, encounters, billing, …) live only in Oracle until their module is
   ported.

A critical framing fact discovered during design: **the new app is not used by floor staff
for Oracle-tied modules.** Those modules are rebuilt and *validated* by a small team (the
developers + a few users). Only the **greenfield modules — coms, documents, templates, auth —
are genuinely "live"**, and even those serve a limited user set. This is what makes the design
tractable: the new app is effectively a **reader** of legacy-owned data and a **writer** only
of its own greenfield data, until each module is deliberately cut over.

## 2. Module archetypes

Every module falls into exactly one of three states at any given time:

| State | Meaning | Source of truth | New app can write? | Oracle consulted? |
|-------|---------|-----------------|--------------------|-------------------|
| **pg-native** | Greenfield; data originates in the new app | Postgres | Yes | No |
| **legacy-owned** | Exists & is transacted live in legacy | Oracle | **No** (read-only mirror) | Yes (read-through) |
| **cutover** | Formerly legacy-owned; data migrated + validated; legacy no longer uses it | Postgres | Yes | No |

- **pg-native today:** coms, documents, templates, auth/users, and any brand-new module.
- **legacy-owned today:** patients, encounters/HCU, orders/lab, pharmacy, billing/SRI, admissions, etc.
- **cutover** is a *destination*, reached per-module via the process in §8.

## 3. The four load-bearing decisions

These were settled during brainstorming and anchor everything below.

### D1 — Write model: one-directional, no dual-write
The new app **never writes Oracle.** Sync flows **Oracle → Postgres only**. There is no
dual-write and no field/record-level split ownership. This is safe precisely because staff do
not edit legacy-owned data in the new app. It also honors the CLAUDE.md Oracle constraint
(SELECT-only; never DELETE/DDL) by construction — the bridge issues **only `SELECT`**.

### D2 — Read model: live read-through, but Oracle is lazy/optional
The new app reads legacy data **live at request time** (read-through), but **Oracle
connectivity is a runtime capability, not a boot requirement**:

- The Oracle datasource initializes **lazily** and **never blocks startup** (this fixes the
  `ORA-12170` boot stall directly — the stall exists only because the connection is eager).
- A single flag `LEGACY_ORACLE_ENABLED` (default derived from creds presence) gates it:
  - **dev default: off** → pure Postgres; work against new tables + seed/mirror data.
  - **dev opt-in: on** → developer points at read-only Oracle when a task needs live legacy reads.
  - **prod: on** → live read-through always.

### D3 — Identity: UUIDv7 PKs + legacy key as a nullable attribute
- Every entity that needs a PK uses a **UUID (v7, time-ordered)** primary key — stable across
  the migration, independent of Oracle sequences/composite keys, and preserved through the
  eventual data transfer. (Junction tables may use composite UUID PKs; small reference catalogs
  may keep a natural `code` PK — don't dogmatically UUID everything.)
- The **legacy natural key is stored as a plain, nullable attribute** on the mirror entity
  (e.g. `patients.national_id`, `patients.hc`), with **partial unique indexes** (`WHERE key IS
  NOT NULL`). Nullable because newborns, foreigners, and unidentified ER patients have no cédula
  — the surrogate UUID is exactly what saves us here.
- **All references point at the PG UUID, never at the legacy id.** The legacy key lives *once*,
  on the entity's own row; nothing else carries it. This avoids scattering legacy ids across
  tables and rewriting them at cutover.

### D4 — Auth: fully greenfield, re-provision users
Legacy login *is* an Oracle account (`oci_connect`; `ALTER USER` for password changes; the
`PERSONAL.PASSWORD_HASH` column is vestigial and unusable). Passwords **cannot** be migrated.
Therefore:
- The new app has its **own independent credential store** (the JWT/roles stack already built).
- User **identity/roster** is seeded from legacy `PERSONAL` (read-only): name, email, cédula,
  `CODIGO`, `CARGO` → new-app users **with no password**.
- Users set credentials via an **invite/reset flow**. Migration happens **user by user** as they
  are onboarded to the new app.
- Roles are the new data-driven RBAC registry; legacy `CARGO` (decoded via `CG_REF_CODES`) is a
  *seeding hint*, not a carried-over structure.

## 4. Architecture — the Legacy Bridge

All Oracle access is encapsulated in one seam so the rest of the app never imports OCI/Oracle
concepts. Proposed unit: a `LegacyBridge` module in `@hsm/api` (backed by the existing
read-only Oracle datasource, `DatabasesEnum.HsmDbOracle`).

```
                         ┌─────────────────────────────────────────────┐
   request (PG UUID or   │                 New app (@hsm/api)           │
   legacy natural key)   │                                             │
        ──────────────►  │   Feature module (coms / patient / …)       │
                         │        │                                    │
                         │        ▼                                    │
                         │   ResolveOrHydrateService                   │
                         │        │ 1. Postgres lookup ────────────►  Postgres (source of
                         │        │ 2. miss + Oracle available ─┐      truth for pg-native
                         │        │                             │      + cutover; mirror for
                         │        ▼                             │      legacy-owned)
                         │   LegacyAvailabilityService (gate)   │
                         │        │ ok                          │
                         │        ▼                             │
                         │   Legacy<Entity>Adapter  ──SELECT──► Oracle (read-only, lazy)
                         │        │ translate Oracle row → new  │
                         │        ▼ entity shape, mint UUIDv7   │
                         │   upsert mirror row ─────────────────┘
                         └─────────────────────────────────────────────┘
```

Components (each independently testable):

- **`LegacyOracleDataSource`** — lazy, optional, **read-only** TypeORM datasource. Never
  eager-connects; boot never depends on it. Issues only `SELECT`.
- **`LegacyAvailabilityService`** — a small circuit-breaker: is Oracle configured *and*
  currently reachable? Cheap health check + short-lived cache so a downed Oracle doesn't add
  latency to every request. When it reports "unavailable," the bridge degrades gracefully.
- **`Legacy<Entity>Adapter`** (one per mirrored entity, e.g. `LegacyPatientAdapter`) — the
  *only* place that knows Oracle's schema/dialect for that entity. Maps an Oracle row
  (`PACIENTES`, Oracle idioms, composite keys) → the new entity shape. This is where translation
  of the "outdated, badly-configured" legacy schema happens.
- **`ResolveOrHydrateService`** — the generic idempotent pattern (see §5).

The bridge exposes intent-named methods (`resolvePatientByNationalId`, `resolveStaffByCodigo`,
…), not raw Oracle queries. Feature modules depend on the bridge interface, not on Oracle.

## 5. Core flow — resolve-or-hydrate (idempotent)

Given a legacy natural key, return a stable PG UUID, hydrating on demand:

```
resolvePatientByNationalId(cedula):
  1. row = SELECT * FROM patients WHERE national_id = cedula          -- Postgres
  2. if row exists:
        if legacy-owned AND Oracle available AND stale(row) beyond TTL:
            re-hydrate row from Oracle (refresh fields, bump legacy_synced_at)
        return row.id                                                 -- the UUID
  3. if no row:
        if Oracle available:
            oracleRow = LegacyPatientAdapter.fetchByCedula(cedula)    -- SELECT only
            if oracleRow:
                row = INSERT patients (id = uuidv7(), national_id = cedula,
                                       …translated fields…, legacy_synced_at = now())
                return row.id
        return NotAvailable   -- graceful: caller shows "not synced yet", never crashes
```

Guarantees:
- **The UUID is minted once and is permanent** — the same legacy patient always maps to the
  same UUID, so references never break.
- **Oracle is only touched on miss or staleness**, and only via `SELECT`.
- **Oracle down ⇒ degraded, not broken** — pg-native features keep working; legacy-owned reads
  serve whatever is already mirrored, or return `NotAvailable`.

### Freshness policy (legacy-owned entities)
Because D2 wants "live" reads but we also cache in the mirror, legacy-owned reads use a
**configurable TTL** (e.g. a few minutes): serve the mirror if fresh; re-hydrate from Oracle if
stale and Oracle is up. Backstopped by the **nightly sync** (§6). pg-native and cutover entities
are never subject to this — they are the source of truth.

## 6. Sync / hydration jobs (one-directional)

Runs in `@hsm/worker`. **Never writes Oracle.**

- **Nightly full refresh (02:00):** for each mirrored (legacy-owned) entity, re-read the legacy
  rows the mirror already tracks (and optionally newly-appeared rows) and upsert into Postgres.
  Keeps the mirror from drifting for entities the legacy app keeps mutating.
- **On-demand hydrate/refresh:** a triggerable job ("sync this entity now") for when someone
  needs a just-created legacy row immediately — covers the freshness gap without putting Oracle
  in every request.
- **Incremental where possible:** use legacy audit columns / timestamps when they exist; fall
  back to bounded full pulls where they don't (many legacy tables lack reliable change markers —
  see audit §4.4 / Open Questions).

We deliberately **do not** build log-based CDC / GoldenGate. It's heavy, and adding Oracle
triggers would be DDL — forbidden by the Oracle constraint. SELECT-based sync is sufficient for
a dev-validated, incrementally-cutover system.

## 7. Data model conventions (new tables)

1. **PK:** `id uuid` default UUIDv7, on every entity needing a PK.
2. **Legacy correlation:** nullable `national_id` / `hc` / `codigo` columns on mirror entities;
   partial unique indexes `WHERE col IS NOT NULL`.
3. **Provenance:** `legacy_synced_at timestamptz NULL` on mirror entities (null ⇒ born in new app).
4. **References:** always the target's PG UUID.
5. **Polymorphic attachments** (coms/docs): `(subject_type text, subject_id uuid)`. No DB FK is
   possible across types — integrity is **app-enforced**. If a table only ever targets a small,
   stable set, prefer separate nullable typed FKs (`patient_id`, `user_id`) instead.

Worked example:

```sql
CREATE TABLE patients (
  id               uuid PRIMARY KEY DEFAULT uuidv7(),
  national_id      text,          -- cédula (legacy handle) — nullable
  hc               text,          -- historia clínica       — nullable
  -- …patient fields, translated from Oracle on hydration…
  legacy_synced_at timestamptz
);
CREATE UNIQUE INDEX ux_patients_national_id ON patients(national_id) WHERE national_id IS NOT NULL;
CREATE UNIQUE INDEX ux_patients_hc          ON patients(hc)          WHERE hc          IS NOT NULL;

CREATE TABLE documents (
  id           uuid PRIMARY KEY DEFAULT uuidv7(),
  subject_type text NOT NULL,     -- 'patient' | 'user' | …
  subject_id   uuid NOT NULL,     -- → patients.id (the UUID, NOT the cédula)
  -- …document fields…
);
```

(If Postgres lacks a native `uuidv7()`, generate v7 in the app layer or via a small SQL function;
the point is time-ordered UUIDs, not a specific built-in.)

## 8. Cutover process (per module)

Moving a module from **legacy-owned → cutover**:

1. **Build** the new schema + module; entities modeled cleanly (not 1:1 with Oracle).
2. **Mirror & validate:** run read-through + nightly sync; the team validates the new module
   against live legacy data.
3. **Bulk migrate:** one-time Oracle → Postgres migration that *translates* into the new schema,
   preserving/minting UUIDs consistently with any rows already hydrated (reuse the same
   national_id → UUID mapping so nothing is duplicated). Reconcile counts/spot-check.
4. **Prove the PG tables work** end-to-end on migrated data (the pre-production gate).
5. **Flip state → cutover:** stop consulting Oracle for that module; Postgres becomes the writer.

**Honest dependency:** because we cannot touch legacy, a module is only *safe* to cut over once
the legacy app is no longer writing that data — a rollout/business decision per module, external
to the code. Until then the module stays `legacy-owned` (read-only mirror). The architecture
supports the switch; the timing is organizational.

## 9. Dev vs prod behavior (summary)

| | Boot needs Oracle? | Legacy reads | New (pg-native) modules |
|---|---|---|---|
| **Dev (default)** | No | Off — use new tables + seed/mirror | Fully functional |
| **Dev (opt-in)** | No | Read-only Oracle when flag on | Fully functional |
| **Prod** | No (lazy) | Live read-through + sync | Fully functional |

The invariant: **the request path reads Postgres; Oracle is reached only through the bridge, only
via SELECT, and never at boot.**

## 10. Non-goals / out of scope

- **No dual-write, ever.** No writing Oracle from the new app.
- **No Oracle password migration.** Auth is re-provisioned (D4).
- **No changes to the legacy codebase or Oracle schema** (no DDL, no triggers).
- **No log-based CDC / GoldenGate.**
- **SQL Server (Panacea accounting, citizen lookup, token service)** coexistence is a *separate*
  problem (a second heterogeneous DBMS) — noted in the audit, not solved here.
- **Reimplementing legacy PL/SQL business logic** (billing/AR/credit-note/close/kardex) is
  required eventually for the *write* side of those modules at cutover, but is per-module work,
  not part of this coexistence layer.

## 11. Testing strategy

- **pg-native modules:** standard unit/integration tests, no Oracle.
- **Adapters:** unit-test each `Legacy<Entity>Adapter` translation against fixture Oracle rows
  (no live DB).
- **ResolveOrHydrate:** integration tests for both paths — Oracle **off** (graceful
  `NotAvailable`, no crash) and Oracle **on** (hydrate + mint stable UUID + idempotent on repeat).
- **Boot-without-Oracle guarantee:** a CI check that the API boots and serves a pg-native
  endpoint with `LEGACY_ORACLE_ENABLED=off` and no Oracle host reachable. This is the regression
  test for goal #1 and the `ORA-12170` stall.

## 12. Open questions / follow-ups (not blocking this design)

1. **Per-entity freshness TTLs** — tune per legacy-owned entity (patients vs slowly-changing
   catalogs).
2. **First entities to mirror** — patients + `PERSONAL` (for user-roster seeding) are the
   likely first adapters.
3. **Change-marker availability** — which legacy tables have reliable timestamps for incremental
   sync vs need bounded full pulls (audit Open Q #1/#2; the 7 MB `SIS/query/archivo.sql` and
   PL/SQL bodies are the source for the eventual write-side reimplementation).
4. **Bulk-migration tooling** — built per module at cutover (§8.3), out of scope here.
5. **Polymorphic vs typed FKs** — decided case-by-case per new module (§7.5).
```
