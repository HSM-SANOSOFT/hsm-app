---
title: "TypeORM synchronize fails to add enum values when enum lives in non-public PostgreSQL schema"
date: 2026-05-12
category: database-issues
module: "@hsm/database"
problem_type: database_issue
component: database
severity: high
symptoms:
  - "QueryFailedError: operator does not exist: <schema>.<enum>_enum = <schema>.<enum>_enum_old"
  - "App crashes on start:dev immediately after adding new values to a TypeScript enum"
  - "TypeORM logs show three DDL steps (rename, create, ALTER COLUMN) with the third failing"
root_cause: wrong_api
resolution_type: migration
tags: [typeorm, postgresql, enum, synchronize, schema-qualified, nestjs, alter-type]
---

# TypeORM synchronize fails to add enum values when enum lives in non-public PostgreSQL schema

## Problem

When adding new values to a TypeScript enum whose corresponding PostgreSQL type lives in a **non-public schema**, TypeORM's `synchronize: true` crashes on startup with a PostgreSQL operator-resolution error (code 42883). The app cannot start until the enum values are added manually.

## Symptoms

- `QueryFailedError: operator does not exist: templates.templates_category_enum = templates.templates_category_enum_old`
- Crash occurs on `start:dev` immediately after adding new values to a TypeScript enum whose PostgreSQL counterpart lives in a non-`public` schema (e.g., schema `templates`)
- TypeORM logs show a three-step DDL sequence that fails on step 3 and rolls back:

```
[DEBUG] ALTER TYPE "templates"."templates_category_enum" RENAME TO "templates_category_enum_old"   ← succeeds
[DEBUG] CREATE TYPE "templates"."templates_category_enum" AS ENUM('BASE', ..., 'SMS_INTERNAL', 'SMS_EXTERNAL')  ← succeeds
[ERROR] ALTER TABLE "templates"."templates" ALTER COLUMN "category" TYPE "templates"."templates_category_enum"
        USING "category"::"text"::"templates"."templates_category_enum"                            ← FAILS
[DEBUG] ROLLBACK  ← DB is back to original state
```

## What Didn't Work

No code change or TypeORM configuration can prevent this — the crash is in TypeORM's internal `synchronize` path for enums. The only workarounds are manual SQL or a full DB reset.

## Solution

Add the new enum values directly using PostgreSQL's `ALTER TYPE ... ADD VALUE` DDL **before restarting the app**. This modifies the existing type in-place without renaming it, so TypeORM's three-step migration never runs.

```sql
-- Run against the dev database (Postgres is at localhost:10003 / postgres:5432 inside Docker)
ALTER TYPE "templates"."templates_category_enum" ADD VALUE IF NOT EXISTS 'SMS_INTERNAL';
ALTER TYPE "templates"."templates_category_enum" ADD VALUE IF NOT EXISTS 'SMS_EXTERNAL';
```

Run from a host terminal:

```bash
PGPASSWORD=postgres psql -h localhost -p 10003 -U postgres -d hsm -c \
  "ALTER TYPE templates.templates_category_enum ADD VALUE IF NOT EXISTS 'SMS_INTERNAL';
   ALTER TYPE templates.templates_category_enum ADD VALUE IF NOT EXISTS 'SMS_EXTERNAL';"
```

Or from inside the app container:

```bash
docker exec -it hsm-app-be-api sh -c \
  "PGPASSWORD=postgres psql -h postgres -U postgres -d hsm -c \
   \"ALTER TYPE templates.templates_category_enum ADD VALUE IF NOT EXISTS 'SMS_INTERNAL';
     ALTER TYPE templates.templates_category_enum ADD VALUE IF NOT EXISTS 'SMS_EXTERNAL';\""
```

After running these statements, `start:dev` detects the DB enum already contains all expected values and skips the migration.

**Alternative for dev**: drop and recreate the Postgres container and volume entirely. A fresh `synchronize` creates the enum from scratch and the three-step rename path never executes.

```bash
docker stop hsm-app-postgres-1 && docker rm hsm-app-postgres-1 && docker volume rm hsm-app-postgres-data
docker compose -f docker/docker-compose.yaml up postgres -d
```

## Why This Works

TypeORM's enum synchronize strategy for an outdated enum is:

1. Rename the existing type to `<name>_old`
2. Create a new type with the updated enum values
3. `ALTER TABLE ... ALTER COLUMN ... TYPE <new_type> USING "col"::"text"::"schema"."new_type"`

Step 3 requires PostgreSQL to compare existing column values against the old type to confirm they are valid casts. Internally PG needs an equality operator (`=`) between the old and new types. When the enum is in the `public` schema, the default `search_path` exposes this operator automatically. When both types are schema-qualified under a **non-public schema** (`templates.templates_category_enum_old` and `templates.templates_category_enum`), the operator resolver fails with error 42883: `operator does not exist`.

`ALTER TYPE ... ADD VALUE` sidesteps the entire rename-create-cast flow. It mutates the existing type object in-place — no `_old` type is ever created, no cross-type operator resolution is needed. The `IF NOT EXISTS` guard makes it idempotent (safe to re-run).

## Prevention

### In development

Keep a `scripts/add-enum-values.sql` or Makefile target alongside each enum addition. Treat it as a local migration step:

```sql
-- Run after adding new values to TemplateCategoriesEnum
ALTER TYPE "templates"."templates_category_enum" ADD VALUE IF NOT EXISTS 'NEW_VALUE';
```

Run it before the first `start:dev` after the enum change.

### In production

`synchronize: true` is already disabled in production (see `packages/database/CLAUDE.md`). Use explicit TypeORM migration files. When adding values to a non-public-schema enum in a migration, **always use `ADD VALUE`**:

```typescript
// TypeORM migration
export class AddSmsCategories1715000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "templates"."templates_category_enum" ADD VALUE IF NOT EXISTS 'SMS_INTERNAL'`);
    await queryRunner.query(`ALTER TYPE "templates"."templates_category_enum" ADD VALUE IF NOT EXISTS 'SMS_EXTERNAL'`);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL does not support removing enum values.
    // A down migration would need to recreate the entire type, with caution.
  }
}
```

**Never rely on TypeORM's auto-generated enum migration** (`RENAME` + `CREATE` + `ALTER COLUMN TYPE`) for enums in non-public schemas — it will always fail at step 3.

### General rule

For any PostgreSQL enum in a schema other than `public`, always use additive `ALTER TYPE ... ADD VALUE`. Enum values cannot be removed or reordered this way, so design enums as append-only or handle removals through a carefully-tested, explicit migration.

## Related Issues

- `docs/solutions/runtime-errors/typeorm-entity-circular-import-silent-drop-2026-05-04.md` — different TypeORM gotcha in the same `@hsm/database` package (circular import causing entity groups to drop from `forFeature` registration). Not the same problem, but both are TypeORM startup failures in the templates domain.
