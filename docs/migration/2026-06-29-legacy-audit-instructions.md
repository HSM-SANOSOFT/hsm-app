---
title: Legacy Codebase Audit — Instruction Set
audience: a Claude Code session pointed at the LEGACY repository
produces: docs/migration/2026-06-29-legacy-system-audit.md (in the legacy repo, or copied back here)
status: ready to run
created: 2026-06-29
---

# Legacy Codebase Audit — Instruction Set

## 0. How to use this file

This is **not** documentation of the legacy app. It is a **prompt / playbook**.
Open a Claude Code session **with the legacy codebase as its working directory**
and give it this file with an instruction like:

> "Read `2026-06-29-legacy-audit-instructions.md` and follow it. Produce
> `2026-06-29-legacy-system-audit.md`. Ask me for anything you can't determine from the code."

The Claude session running this audit will be referred to below as **"you"**.

Your single deliverable is one markdown file: **`2026-06-29-legacy-system-audit.md`**,
following the template in §8. Everything else in this document tells you how to
fill that template accurately.

---

## 1. Why this audit exists (the migration context)

The legacy application is being **rebuilt** as a new platform (NestJS + TypeORM +
Postgres on the backend, Angular on the frontend). The legacy app's database is
an **Oracle** instance and is the current **system of record**.

The end state is a migration **off Oracle onto Postgres**. Until then, the
transition plan is:

1. **Dev must not depend on Oracle being reachable.** The new app currently fails
   to boot when the Oracle host is unreachable — that has to stop.
2. **Dual-write during transition.** For tables that already exist in the legacy
   Oracle schema ("old tables"), data must be written to **both** Oracle and
   Postgres so the two stay in sync while features are ported. **New** tables
   introduced by the new app are **Postgres-only**.
3. Eventually Oracle is retired and Postgres becomes the sole system of record.

**Therefore this audit must be precise about the data layer.** The single most
valuable output is an accurate **table inventory** (§4) — which tables exist,
their columns/keys/relationships, which module owns them, and whether they hold
data that will need dual-write. Module and tech-stack maps are important context,
but the table inventory is what the migration plan is built on.

---

## 2. Operating rules (read this before touching anything)

- **READ-ONLY on code.** Do not modify, refactor, "fix", or reformat any legacy
  source file. You are documenting, not changing. The only file you create is the
  audit output (and scratch notes if you need them).
- **Oracle is production. SELECT only.** If you connect to the Oracle DB to read
  schema metadata, issue **`SELECT` statements only**. Never `INSERT`, `UPDATE`,
  `DELETE`, or any DDL (`CREATE`/`ALTER`/`DROP`/`TRUNCATE`). Reading
  `ALL_TABLES`, `ALL_TAB_COLUMNS`, `ALL_CONSTRAINTS`, etc. is fine; writing
  anything is not. Prefer reading schema from **source/migration files** over
  connecting to the live DB at all.
- **Evidence over inference.** Every claim in the output must be traceable to a
  file. Cite `path/to/file.ext:line` (or a filename) next to non-obvious claims.
  When you infer rather than read something directly, **mark it `INFERRED`**.
- **Don't guess silently.** If something can't be determined from the code
  (e.g. an external system's purpose, an undocumented column), list it in the
  **Open Questions** section (§8) rather than inventing an answer.
- **No secrets in the output.** If you find credentials, connection strings,
  API keys, or tokens, record *that they exist and where* (`config/db.xml` has a
  DB password) — **never copy the secret value** into the audit.
- **Breadth first, then depth.** Get the whole map before going deep on any one
  module. A shallow-but-complete inventory beats a deep-but-partial one.

---

## 3. Discovery procedure (work in these phases)

Do a first pass that is wide and cheap, then deepen. Use search/listing tools;
don't read every file end-to-end.

### Phase A — Orient (tech stack & shape)
1. Read the repo root: `README*`, top-level folders, and any build/dependency
   manifests. Identify language(s), framework(s), and build tooling from the
   manifest files that actually exist, e.g.:
   - Java: `pom.xml`, `build.gradle`, `web.xml`, `*.war`
   - .NET: `*.sln`, `*.csproj`, `web.config`, `packages.config`
   - PHP: `composer.json`, `*.php`, framework folders (Laravel/Symfony)
   - Node: `package.json`
   - Python: `requirements.txt`, `pyproject.toml`, `manage.py` (Django)
   - Ruby: `Gemfile`
   - Oracle-native: `*.pks`/`*.pkb` (PL/SQL packages), Oracle Forms/Reports
     (`*.fmb`/`*.rdf`), APEX exports
2. Pin **versions** where declared (language runtime, framework, key libs).
3. Identify the **app type**: server-rendered MVC, SPA + API, desktop, batch,
   Oracle Forms/APEX, or a mix. Note the entry points (main class, front
   controller, router, `index.*`).

### Phase B — Map modules / features
4. Derive the module list from **structure**: top-level packages/namespaces/
   folders, route/controller groupings, menu definitions, or a `modules/`-style
   directory. Cross-check against any UI navigation/menu config — that often
   names the real business modules better than the folder layout.
5. For each module capture: name, what it does (1–2 lines), its main entry
   points (controllers/services/screens), and the **tables it reads/writes**
   (this links Phase B to Phase C — keep notes as you go).

### Phase C — Map the data layer (the priority)
6. Find **how the app talks to the database**: raw SQL, an ORM/data-mapper
   (Hibernate/JPA, Entity Framework, Eloquent, Django ORM, MyBatis…), stored
   procedures, or Oracle Forms data blocks. Note the connection config location
   (without copying secrets) and the driver.
7. Build the **table inventory** (§4). Prefer, in order:
   a. ORM entity/model classes or annotations (richest: types + relationships).
   b. Migration / schema definition files checked into the repo.
   c. A `CREATE TABLE` DDL dump if present.
   d. Live Oracle metadata via **read-only** `SELECT` against the data
      dictionary (`ALL_TABLES`, `ALL_TAB_COLUMNS`, `ALL_CONSTRAINTS`,
      `ALL_CONS_COLUMNS`, `ALL_SEQUENCES`, `ALL_TRIGGERS`) — only if the schema
      isn't recoverable from source.
8. Capture **stored procedures, packages, triggers, sequences, and views** — in
   Oracle legacy apps, real business logic frequently lives in PL/SQL, not the
   app tier. Flag any of these that mutate data, because they affect dual-write.

### Phase D — Cross-cutting concerns
9. **Auth & identity:** how users authenticate, where roles/permissions live
   (tables? LDAP? app config?), session handling.
10. **Integrations:** external systems, APIs, message queues, file drops,
    scheduled jobs/cron, report generators, payment/lab/PACS/HL7 interfaces, etc.
11. **Background work:** batch jobs, schedulers, ETL.
12. **Config & environments:** where config lives, what's environment-specific,
    how Oracle connection details are supplied.

### Phase E — Synthesize
13. Fill the §8 template. Resolve what you can; push the rest to Open Questions.
14. Sanity-check coverage with §7 before declaring done.

---

## 4. Table inventory — required format

This is the heart of the deliverable. Produce **one row per table**. Group rows
by the owning module where possible. For each table:

| Column | Meaning |
|--------|---------|
| `Table` | Oracle table name (and schema if multiple schemas exist) |
| `Owning module` | The business module that owns it (from Phase B) |
| `Purpose` | One line: what it stores |
| `PK` | Primary key column(s) |
| `Key FKs` | Foreign keys → referenced table (the relationship graph) |
| `Approx columns` | Column count, or "see detail" if you expand it below |
| `Row volume` | Rough scale if knowable (small / large / unknown) |
| `Written by` | App tier, PL/SQL, trigger, batch job (matters for dual-write) |
| `Migration class` | `OLD` (exists in Oracle → needs dual-write) — every table you find here is `OLD` by definition; note any that look **append-only**, **reference/lookup**, or **transactional**, since that changes dual-write strategy |
| `Notes` | Quirks: composite keys, soft-deletes, audit columns, denormalization, Oracle-specific types (`CLOB`, `RAW`, `NUMBER` precision), sequences/triggers feeding the PK |

For the **most important / highest-traffic tables** (the ones the first ported
modules will touch), expand a full **column list** (name, type, nullable, default,
meaning) below the summary table. You don't need full column detail for every
table on the first pass — but you must list **every table** at summary level.

Also produce a **relationship overview**: either a short adjacency list or a
Mermaid `erDiagram` of the core entities and their FKs, so the new-app data model
can be checked against it.

---

## 5. What "good" looks like

- A new engineer (or a Claude planning session) could read `2026-06-29-legacy-system-audit.md`
  **without opening the legacy code** and know: what the app is built with, what
  modules it has, every table and who owns it, where business logic hides
  (app vs PL/SQL), and what the risky/unknown areas are.
- The table inventory is **complete** (every table listed) even where detail is
  shallow. Completeness of the list matters more than depth on any one table.
- Every non-obvious claim cites a file. Inferences are marked `INFERRED`.
- Migration-relevant facts are called out explicitly: which tables are
  write-heavy, which are touched by triggers/PL/SQL (dual-write hazards), which
  use Oracle-specific features that won't port cleanly to Postgres
  (`SYS_GUID()`, sequences+triggers, `CONNECT BY`, `MERGE`, `ROWNUM`, packages,
  `VARCHAR2` semantics, `DATE` vs `TIMESTAMP`, `NUMBER` without scale).

---

## 6. Explicitly out of scope (do not do these)

- Do **not** propose the migration plan, the dual-write design, or the new schema.
  That happens later in the new repo. This audit only *describes the legacy app*.
- Do **not** modify legacy code or the Oracle database in any way.
- Do **not** copy secret values.
- Do **not** attempt to run or build the legacy app unless explicitly asked.

---

## 7. Pre-flight coverage checklist (run before declaring done)

- [ ] Tech stack: language(s), framework(s), versions, build tooling — all cited.
- [ ] App type and entry points identified.
- [ ] Every module listed with purpose + entry points + tables touched.
- [ ] **Every table listed** in the inventory; FKs/relationships captured.
- [ ] Core tables expanded to column-level detail.
- [ ] Relationship diagram / adjacency list produced.
- [ ] Stored procedures / packages / triggers / sequences / views inventoried,
      with data-mutating ones flagged.
- [ ] Auth/roles model documented (and where roles live).
- [ ] Integrations, scheduled jobs, and external interfaces listed.
- [ ] Config/connection locations noted (no secret values copied).
- [ ] Oracle-specific features that complicate a Postgres port flagged.
- [ ] Open Questions section filled with everything unresolved.
- [ ] Every non-obvious claim cites a file; inferences marked `INFERRED`.

---

## 8. Output template — `2026-06-29-legacy-system-audit.md`

Copy this skeleton into the deliverable and fill it in.

```markdown
# Legacy System Audit

> Generated by reading the legacy codebase at <repo path / commit>.
> Read-only audit. Inferences are marked INFERRED. No secrets reproduced.

## 1. Executive summary
- What the app is, in 3–5 sentences.
- Primary tech stack + versions.
- Number of modules, number of tables.
- Top 3 migration risks at a glance.

## 2. Tech stack
| Layer | Technology | Version | Evidence (file) |
|-------|-----------|---------|-----------------|
| Language | | | |
| Framework | | | |
| ORM / data access | | | |
| Build / packaging | | | |
| Frontend | | | |
| Runtime / server | | | |
| Database | Oracle | | |
| Other notable libs | | | |

App type: <MVC / SPA+API / Forms / APEX / batch / mix>
Entry points: <files>

## 3. Module map
For each module:
### <Module name>
- Purpose:
- Entry points (controllers/services/screens):
- Tables touched: <list>
- Notes / business logic of interest:

## 4. Database — table inventory
(Summary table per §4, grouped by module. Every table listed.)

### 4.1 Summary
| Table | Owning module | Purpose | PK | Key FKs | Cols | Written by | Class | Notes |
|-------|--------------|---------|----|---------|------|-----------|-------|-------|

### 4.2 Core tables — column detail
(Full column lists for the highest-value tables.)

### 4.3 Relationships
(Adjacency list or Mermaid erDiagram of core entities.)

### 4.4 PL/SQL, triggers, sequences, views
| Object | Type | Tables affected | Mutates data? | Purpose |
|--------|------|-----------------|---------------|---------|

## 5. Auth & roles
- Authentication mechanism:
- Where roles/permissions live (tables/LDAP/config):
- Session handling:

## 6. Integrations & background work
| System / job | Type | Direction | Trigger/schedule | Purpose | Evidence |
|--------------|------|-----------|------------------|---------|----------|

## 7. Configuration & environments
- Where config lives:
- How Oracle connection is configured (location only, no secrets):
- Environment-specific concerns:

## 8. Oracle-specific features that complicate a Postgres port
- (sequences+triggers, packages, CONNECT BY, MERGE, ROWNUM, data types, etc.)

## 9. Open questions / could-not-determine
- (Everything unresolved, for the human to answer.)

## 10. Coverage notes
- What was fully covered vs. sampled vs. skipped, and why.
```

---

## 9. A note to the human running this

Point Claude at the legacy repo and let it do Phase A–E. Expect it to come back
with **Open Questions** — those are the things only you know (what an external
system is for, which tables are dead, business rules behind a cryptic column).
Answering them is what turns this audit into a migration-ready document.
