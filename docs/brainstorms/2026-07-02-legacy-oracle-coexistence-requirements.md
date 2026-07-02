---
title: Legacy → New App Migration & Release Strategy
status: draft — awaiting review
created: 2026-07-02
updated: 2026-07-02
authors: Raul Santamaria (+ Claude)
supersedes: the earlier "Legacy Oracle ⇄ Coexistence / Legacy Bridge" draft of this file
related:
  - docs/migration/2026-06-29-legacy-system-audit.md
  - docs/migration/2026-06-29-legacy-modules-detail.md
  - docs/migration/2026-06-29-legacy-audit-instructions.md
  - docs/roadmap/2026-06-26-hospital-platform-build-tracker.md
---

# Legacy → New App Migration & Release Strategy

> **Direction change (2026-07-02).** An earlier version of this doc designed a
> runtime *Legacy Bridge* (live read-through from Oracle, resolve-or-hydrate, UUID
> ⇄ legacy-key mirroring). **That approach is dropped.** The new app stands on its
> own: **pure pg-native, no runtime connection to Oracle at all.** This doc records
> the replacement model and the branch/release strategy that ships it.

## 1. Problem & context

We are rebuilding **SanoSoft** (server-rendered PHP + Oracle, system of record
`10.1.1.10/SMARIA`) as a new platform (`@hsm/api` NestJS + TypeORM + Postgres,
`@hsm/web` Angular). Constraints:

- The legacy app **stays in production** and keeps writing Oracle the whole time.
- We are **not allowed to modify the legacy codebase or Oracle** (SELECT/UPDATE
  only per CLAUDE.md — no DDL, no triggers).
- **Panacea (SQL Server)** is a *double migration*: Panacea is itself being folded
  into legacy, and legacy is then being rebuilt into the new app. Panacea → legacy
  → new app. It is **not** a separate coexistence problem to solve at runtime; it
  collapses into the same one-time data migration at cutoff (§5).

### The framing decision

The earlier draft assumed the new app had to **read live legacy data at request
time** and therefore needed a bridge into Oracle. We reject that. Reasons:

- **Everything in legacy is interconnected.** You cannot meaningfully wire one
  entity to live Oracle without dragging in its whole dependency graph.
- A runtime coupling makes the new app forever dependent on the very system we are
  trying to retire, and it re-introduces the Oracle-at-boot fragility.
- We would rather the new app **owns its own data and schema completely**, and
  proves each subsystem greenfield, than mirror a "badly-configured, outdated"
  legacy schema.

So the model is: **build every module greenfield and complete, run the new app as a
standalone beta with its own data, and integrate with legacy only once — as a
one-time bulk data migration at cutoff.**

## 2. The core model

### 2.1 pg-native is primordial
Every module is rebuilt as a **full greenfield module**: complete
**create / read / update / delete** against Postgres, with **unit and integration
tests**. Not a read-only mirror — the real thing. Postgres is the source of truth
for the new app from day one. The new app has **no Oracle datasource, no bridge, no
read-through.** Dev and CI need only Postgres. (This dissolves the old `ORA-12170`
boot problem entirely — there is nothing to connect to.)

### 2.2 "Module" means a whole subsystem (HAS), with its dependencies
A *module* here is a legacy **HAS / subsystem**, not a small folder. Modules are
**interconnected**, and that dependency graph is load-bearing:

> **Facturación (FAC)** needs **Paciente** data. Migrating FAC in isolation buys
> nothing if Paciente isn't there. You port the cluster, not the leaf.

So scope work by **dependency cluster**: a subsystem plus everything it reads. The
plan (`/ce-plan`) must sequence build waves along this graph, using the audits to
enumerate each subsystem's dependencies.

### 2.3 Coexistence during the build = parallel, not wired together
While we build, the two systems run **side by side but independent**:

| | Legacy (SanoSoft) | New app (@hsm) |
|---|---|---|
| Role | System of record, real users | Greenfield beta, small validation team |
| Data | Live Oracle | Own Postgres (seed / test / dev data) |
| Writes | **The only writer** of legacy-owned data, until cutoff | Writes its own pg-native data |
| Runtime link | — | **None.** No Oracle connection |

The new app is **not** a live reader of legacy. The single point of contact between
the two systems is the **cutoff data migration**, and nothing before it.

### 2.4 The one write, until cutoff
Until a subsystem is cut over, the **legacy app remains the one place production
data is written** for that subsystem — because it's the system real staff use.
The new app implements the *full* read/write/delete functionality regardless; it
just isn't the production writer of that subsystem's live data yet. Cutoff is what
promotes it to writer.

### 2.5 Auth stays greenfield
Legacy login *is* an Oracle account; passwords cannot be migrated. The new app keeps
its **own credential store** (the JWT/roles stack already built). User roster is
**seeded once** from legacy `PERSONAL` (read-only, name/email/cédula/`CODIGO`/
`CARGO`) into passwordless users; each user sets credentials via an invite/reset
flow. Roles are the new data-driven RBAC; `CARGO` is a seeding hint, not a carried
structure.

### 2.6 Hexagonal architecture (ports & adapters)
The app is built **hexagonally**: domain/business logic sits at the center and depends only
on **ports** (interfaces). Everything external is a swappable **adapter**, so any provider —
**including the database** — can be replaced without touching the logic. We already do this
with the ORM (persistence is a driven adapter behind a repository port).

- **Driven (secondary) adapters** — persistence (Postgres via TypeORM), SRI e-invoice signing,
  payment gateway, email/SMS, Orthanc PACS, Panacea SQL Server (only at cutoff), citizen
  lookup, biometric, WhatsApp. Each hides behind a port; swapping one never edits domain code.
- **Driving (primary) adapters** — the REST controllers. **The backend *is* the API**: each
  module exposes REST endpoints as its public port, and the backend runs **with or without a
  frontend**. The Angular app is just one client of those endpoints — no different from an
  external integrator (auth-scoped by session vs API token). There is no separate "API layer,"
  no "internal vs external" API, and no patient-facing backend.
- This is why dropping Oracle (§2.1) is clean: **Oracle was just a driven adapter** — removing
  it leaves the domain untouched. The same seam later hosts the one-time cutoff-migration
  adapter (§5).

**Corollaries for module structure:** because the backend is the API, the legacy `Api/*` apps
are just **normal module endpoints** — each lives in the module that owns its data (Pagos →
billing, AutoAdmisión → admissions, Resultados → lab/imaging). There's nothing to "fold into a
layer"; the endpoints simply belong to their module. **Patient-facing is frontend** (Angular
calling those same module endpoints), never a backend of its own.

## 3. Module states

| State | Meaning | Writes | Oracle at runtime |
|-------|---------|--------|-------------------|
| **greenfield (building)** | Being built pg-native; validated by the small team against seed data | Yes (to PG) | No |
| **ported** | Feature-complete pg-native with unit + integration tests; ready, but legacy is still the production writer | Yes (to PG, non-prod) | No |
| **cutover** | Data migrated from Oracle; new app is the production writer; legacy retired for this subsystem | Yes (to PG, prod) | No |

Note there is **no "legacy-owned read-through" state** anymore. A subsystem is
either being built, ported-and-waiting, or fully cut over. Oracle is never in the
request path in any state.

## 4. Identity & data model

The new app **owns its identity scheme.** It does **not** permanently carry legacy
keys as live foreign relations (the old UUID ⇄ legacy-key mirroring idea is **not**
adopted — it was an idea, now dropped in favor of standing on our own).

- Use whatever PK fits each entity (time-ordered UUIDs are a fine default; small
  reference catalogs can keep natural `code` PKs). References point at the new app's
  own keys.
- Legacy natural keys (cédula, HC, …) may be stored as **plain attributes** where
  useful for humans/search — but they are **not** the linkage mechanism and not
  required to be present (newborns, foreigners, unidentified ER patients have none).
- The **only** place legacy ids matter is the **cutoff migration** (§5), where a
  one-time mapping table translates Oracle rows into new-app rows. That mapping is
  migration scaffolding, not a permanent runtime coupling.

## 5. Cutoff — the one-time migration (final stage)

This is the *only* stage where Oracle (and SQL Server / Panacea) data touches the
new app, and it happens **per dependency-cluster**, only once that whole cluster is
ported and validated:

1. **All interconnected functionality ported.** Every subsystem in the cluster is
   feature-complete pg-native, with unit + integration tests green. Cutoff is the
   *final* part — you don't cut over a leaf while its dependencies still live in
   legacy.
2. **Bulk data migration.** One-time extract from Oracle (and Panacea's data, folded
   in — the double migration) → transform into the new schema → load into Postgres.
   Reconcile counts, spot-check.
3. **Sync only if needed.** A short sync/hydration window is a **fallback for the
   migration itself** — e.g. catching rows the legacy app writes during the
   migration window — **not** a permanent runtime service. If a clean freeze-and-load
   is possible, we skip it. (This is the only place "sync/hydration" appears; the
   earlier draft over-weighted it.)
4. **Prove the PG tables end-to-end** on migrated data — the pre-production gate.
5. **Go live.** New app becomes the production writer for the cluster; legacy is
   retired for it. Repeat per cluster until legacy is fully replaced → **v2 GA.**

**Honest dependency:** a cluster is only *safe* to cut over once the legacy app is no
longer the required writer for it — a business/rollout decision, external to the
code. The architecture makes the switch clean; the timing is organizational.

## 6. Release strategy — branches, PRs, tags

We ship this as a **release train** with three long-lived branches and short-lived
personal branches. **The whole point: nothing reaches a shared branch except through
a PR that passes CI/CD.**

### 6.1 Branches

| Branch | Purpose | Release channel | Who writes it |
|--------|---------|-----------------|---------------|
| `feat/*`, `fix/*`, … (personal) | A developer's own work | — | **The only branch you may push to directly** |
| `development` | Integration of finished work | **alpha** (`v2-beta.N`… see tags) | PR only, from a personal branch |
| `release/vX.Y` | Cut from `development` at a milestone; stabilization | **beta** | PR only, from a personal branch (fixes) |
| `main` | Stable, production | **stable** | PR only, from a `release/*` candidate |

### 6.2 Flow

```
 feat/my-work ──PR+CI──▶ development ──cut──▶ release/vX.Y ──PR(candidate)──▶ main
      ▲  (direct push OK, personal only)            │                          │
      │                                             └──PR+CI (fixes)           │
      └──────────────── back-merge (cascade) ◀──────────────────── main ───────┘
                         main → development so trunk never falls behind stable
```

- A personal branch merges into **`development`** or a **`release/*`** branch via
  **PR + CI**. Merges to `development` cut **alpha** builds; merges to `release/*`
  cut **beta** builds.
- **`main` only ever receives a release candidate** — a PR whose head is a
  `release/*` branch. No feature branch merges to main.
- After a release lands on `main`, it **cascades back down**: an automatic
  back-merge PR `main → development` keeps the trunk from drifting behind stable.

### 6.3 Hard rules (enforced by rulesets, §7)

1. **No direct push to `development`, `release/*`, or `main`.** Ever. Only personal
   branches accept direct pushes.
2. **Every merge requires a PR that passes CI/CD** (lint + build + unit + integration
   tests) and at least one approval.
3. **`main` PRs must originate from a `release/*` branch** (enforced by a CI policy
   check, since GitHub rulesets can't restrict a PR's source branch).
4. **Linear history** on the protected branches; no force-push, no branch deletion.

### 6.4 Tags / release channels

Tags are the release artifacts; they are **immutable** (protected against deletion
and overwrite):

| Channel | Branch | Tag pattern | Example |
|---------|--------|-------------|---------|
| alpha | `development` | `vX.Y.Z-alpha.N` | `v2.0.0-alpha.14` |
| beta | `release/vX.Y` | `vX.Y.Z-beta.N` | `v2.0.0-beta.3` |
| stable | `main` | `vX.Y.Z` | `v2.0.0` |

During the build the product ships publicly as **`v2-beta.x`** (e.g. the email
template + document functionality goes out as a beta) until every cluster is cut
over and we tag the first stable **`v2.0.0`** GA.

## 7. Enforcement — CI/CD & GitHub rulesets

Committed in this repo:

- **`.github/workflows/pr-validation.yml`** — the required check on every PR into
  `development`, `release/*`, and `main`: lint → build → test (unit + integration).
  Includes the **`main`-only-from-`release/*`** policy gate.
- **`.github/workflows/release-tag.yml`** — cuts the channel tag/prerelease on push
  to `development` (alpha), `release/*` (beta), and `main` (stable).
- **`.github/workflows/back-merge.yml`** — opens the cascade PR `main → development`
  after a stable release.
- **`.github/rulesets/*.json`** — GitHub repository rulesets (branch + tag
  protection) matching §6.3/§6.4. Apply with **`scripts/apply-github-rulesets.sh`**
  (needs repo-admin). See `.github/rulesets/README.md`.

## 8. Testing strategy

- **Every module: unit + integration tests, pg-native, no Oracle.** This is the bar
  for calling a subsystem "ported."
- **Integration tests** exercise real read/write/delete against a Postgres test DB
  (the cluster's own behavior), independent of legacy.
- **Cutoff migration** gets its own validation: row-count reconciliation, spot
  checks, and an end-to-end pass on migrated data before go-live (§5.4).
- **CI gate:** `pr-validation` must be green before any protected-branch merge.

## 9. Non-goals / out of scope

- **No runtime Legacy Bridge / read-through / resolve-or-hydrate.** (Dropped.)
- **No dual-write, ever.** The new app never writes Oracle.
- **No permanent UUID ⇄ legacy-key runtime coupling.** (Dropped; mapping exists only
  during the cutoff migration.)
- **No Oracle datasource in the app at all** — not lazy, not optional, none.
- **No changes to legacy code or Oracle/SQL Server schema** (no DDL, no triggers).
- **No log-based CDC / GoldenGate.**
- **No Oracle password migration** — auth is re-provisioned (§2.5).

## 10. Open questions / follow-ups

1. **Cluster sequencing** — which dependency-cluster to build & cut over first
   (Paciente is a prerequisite for most; likely wave 1).
2. **Migration tooling** — built per cluster at cutoff (§5.2); Panacea's data folds
   in here (the double migration).
3. **Migration-window sync** — decide per cluster whether a freeze-and-load is
   feasible or a short catch-up sync (§5.3) is needed.
4. **Versioning source** — where `vX.Y.Z` is authored (root `package.json` vs a
   dedicated VERSION) and how alpha/beta counters increment.
5. **Reference-code & shared services** — identity/RBAC, reference-code dictionary,
   atomic numbering: shared across clusters, sequenced early.
