---
title: "TypeORM entity group silently absent from forFeature registration due to circular import"
date: 2026-05-04
category: docs/solutions/runtime-errors/
module: "@hsm/database"
problem_type: runtime_error
component: database
symptoms:
  - "UnknownDependenciesException: Nest can't resolve dependencies of the TemplatesService (?, hsm-db-postgresDataSource)"
  - "App crashes at startup before reaching DB connection phase despite successful build"
  - "New entity group completely absent from databasePostgresEntities at runtime — Object.values(entityBarrel) === []"
root_cause: logic_error
resolution_type: code_fix
severity: high
tags:
  - nestjs
  - typeorm
  - circular-dependency
  - webpack
  - entity-registration
  - dynamic-module
  - forFeature
related_components:
  - tooling
---

# TypeORM entity group silently absent from forFeature registration due to circular import

## Problem

Adding a new entity group to `@hsm/database` and a corresponding service that injects its repositories causes the app to crash at startup with `UnknownDependenciesException`, even though the build succeeds and the entities appear to be correctly declared with `@Entity()` decorators.

## Symptoms

- `UnknownDependenciesException: Nest can't resolve dependencies of the TemplatesService (?, hsm-db-postgresDataSource)` at startup
- `build` (TypeScript compilation) succeeds — the error is runtime-only
- Only the new entity group fails; previously registered entity groups continue to work
- Debug logging in `database-postgres.entities.ts` reveals: `Object.values(newEntityBarrel) === []`

## What Didn't Work

**Adding `TypeOrmModule.forFeature` to each feature module** (`TemplatesModule`, `ComsModule`, etc.) — this is the correct NestJS fix for ordinary setups but violates the established pattern in this codebase, where `DatabasePostgresModule` centrally registers all entities via `forFeature(databasePostgresEntities, ...)` and exports `TypeOrmModule` globally. The real issue is why the entity group drops out of `databasePostgresEntities`.

## Solution

Two changes needed:

### 1. Remove the circular re-export from `sources/postgres/index.ts`

```ts
// packages/database/src/sources/postgres/index.ts

// BEFORE (broken — creates circular dep)
export * from './database-postgres.schemas';
export * from './database-postgres.entities';

// AFTER (correct — schemas only)
export * from './database-postgres.schemas';
```

`databasePostgresEntities` is only consumed by `database-postgres.module.ts` via a direct relative import, so it does not need to appear on this index.

### 2. Add the new domain barrel to the parent entities index

```ts
// packages/database/src/entities/modules/core/index.ts

// BEFORE (missing template domain)
export * from './docs';
export * from './users';

// AFTER
export * from './docs';
export * from './template';   // ← add the new domain barrel
export * from './users';
```

### 3. Import entities via root path in app code

```ts
// CORRECT — import from root path
import { TemplatesEntity, TemplateParseLogEntity } from '@hsm/database/entities';

// WRONG — deep subpath imports trigger the same circular timing issue
// import { TemplatesEntity } from '@hsm/database/entities/modules/core/template';
```

## Why This Works

**The circular dep:** webpack evaluates CommonJS modules synchronously. `database-postgres.entities.ts` imports entity barrels → each entity file imports `DatabasePostgresSchemasEnum` from `@hsm/database/sources/postgres` → that index was re-exporting `./database-postgres.entities` → circular.

**Why it silently corrupts rather than errors:** when a service that injects the new entities (e.g. `TemplatesService`) is loaded *before* `database-postgres.entities.ts` finishes evaluating, webpack triggers `database-postgres.entities.ts` mid-evaluation. It tries to load the entity barrel, but the barrel is already in the module cache being evaluated, so webpack returns its current (empty) exports. `Object.values(entityBarrel) === []`, so `databasePostgresEntities` is computed and cached with that entity group absent. The global `forFeature` call in `DatabasePostgresModule` therefore never registers those repositories, and NestJS DI fails.

User/docs/auth entities worked because their barrels happened to be triggered by `database-postgres.entities.ts` itself (not by an app-code service importing a deep subpath), so evaluation order was safe.

Removing the re-export from `sources/postgres/index.ts` breaks the cycle. Importing via the root `@hsm/database/entities` path instead of deep subpaths avoids triggering the barrel before `database-postgres.entities.ts` is ready.

The missing `export * from './template'` in `core/index.ts` was a separate bug: it meant template entities were unreachable via the root import path even after fixing the circular dep.

## Prevention

- **Always add a new domain barrel to its parent index** — when adding `entities/modules/core/<new-domain>/`, immediately add `export * from './<new-domain>'` to `entities/modules/core/index.ts`. Forgetting this makes the entities unreachable via `@hsm/database/entities`.
- **Never re-export `database-postgres.entities` or `database-oracle.entities` from their source index** — the source index (`sources/postgres/index.ts`) must export schemas only.
- **Always import entities via root path** — use `from '@hsm/database/entities'` everywhere in app code. Deep subpath imports (`@hsm/database/entities/modules/core/<domain>`) can trigger the circular timing bug if a service using them loads before the entities module is ready.
- **Run `start:dev` after any entity change** — `build` does not surface DI registration failures. Only runtime startup reveals them.

**Debug recipe if this recurs:** add `console.log(Object.values(entityGroupBarrel))` immediately inside `database-postgres.entities.ts` after the entities are computed. An empty array `[]` confirms the circular dep fired for that group.

## Related Issues

- See `packages/database/CLAUDE.md` — "Adding a Postgres entity" and "Entity import rules" sections document the required steps and the invariant for `sources/postgres/index.ts`.
