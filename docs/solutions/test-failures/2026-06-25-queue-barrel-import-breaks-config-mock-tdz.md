---
title: Barrel import of a NestJS module eagerly reads env at import time, crashing config-mocked Jest specs (TDZ)
date: 2026-06-25
category: test-failures
module: "@hsm/queue"
problem_type: test_failure
component: testing_framework
symptoms:
  - "ReferenceError: Cannot access 'mockEnvs' before initialization — the whole Jest suite fails to run (0 tests)"
  - "Stack runs through queue.module.ts -> @hsm/queue index barrel -> users.service.ts -> the spec's @hsm/config mock"
  - "Triggered by adding @InjectQueue(QueueEnum.Coms) to UsersService and importing QueueEnum from the @hsm/queue barrel"
  - "A sibling spec (coms.service.spec) was unaffected because it mocks @hsm/config with a plain object literal, not a lazy getter"
root_cause: config_error
resolution_type: code_fix
severity: medium
tags:
  - barrel-import
  - temporal-dead-zone
  - nestjs
  - bullmq
  - config-mock
  - jest
  - leaf-import
  - import-side-effects
related_components:
  - "@hsm/config"
  - "@hsm/api"
---

# Barrel import of a NestJS module eagerly reads env at import time, crashing config-mocked Jest specs (TDZ)

## Problem

Adding `@InjectQueue(QueueEnum.Coms)` to `UsersService` required importing `QueueEnum`. Pulling it from the package barrel (`@hsm/queue`) transitively imported `queue.module.ts`, whose `BullModule.forRoot` reads `envs` at import time — crashing an unrelated Jest spec that mocks `@hsm/config` with a lazy getter.

## Symptoms

The entire `admin-seed.service.spec.ts` suite failed to even run (0 tests executed), with:

```
ReferenceError: Cannot access 'mockEnvs' before initialization
```

thrown from the spec's `@hsm/config` mock. The import chain:

```
queue.module.ts:12
  → @hsm/queue (index barrel)
    → users.service.ts
      → admin-seed.service.ts
        → admin-seed.service.spec.ts   ← @hsm/config mock evaluated here
```

A sibling suite (`coms.service.spec.ts`) did **not** fail — it mocks `@hsm/config` with a plain object literal (no getter, no TDZ window), so the eager read just returned the mock.

## What Didn't Work

The error pointed at the config mock and looked like a textbook TDZ ordering bug, which sent attention the wrong way:

- **Reordering / hoisting `mockEnvs`** above the `jest.mock('@hsm/config', ...)` call — this treats the symptom, not the cause. The getter is *invoked* during an unrelated module's import-time evaluation; no reordering inside the spec changes the fact that something reads `envs` the instant the queue barrel loads.
- **Blaming the spec's mock style alone** — because the sibling `coms.service.spec` (plain-object mock) didn't crash, the lazy getter looked like the sole culprit. In reality the getter only *exposed* the real trigger: a transitive barrel import that performs an eager import-time `envs` read.

The real trigger was the **import graph**, not the spec.

## Solution

Import the enum from its side-effect-free **leaf** module instead of the barrel:

```ts
// before — barrel re-exports queue.module.ts, which reads envs at import time
import { QueueEnum } from '@hsm/queue';

// after — pure enum file: no module, no decorators, no envs in the import graph
import { QueueEnum } from '@hsm/queue/queue.enum';
```

The leaf is a plain enum:

```ts
// packages/queue/src/queue.enum.ts
export enum QueueEnum {
  Coms = 'coms',
  Document = 'document',
  Notification = 'notification',
  Templates = 'templates',
}
```

The `@hsm/queue/queue.enum` subpath resolves via the tsconfig `@hsm/queue/*` path mapping (and the matching Jest `moduleNameMapper`), so no package-exports or build changes were needed. `@InjectQueue` only needs the string value and `Queue` is typed from `bullmq`, so the leaf import is fully sufficient. Result: build green, all API tests pass.

## Why This Works

The barrel (`packages/queue/src/index.ts`) re-exports `queue.module.ts`. A NestJS `@Module({...})` decorator's argument object is **evaluated when the file is loaded** — and `BullModule.forRoot` reads `envs` right there in that object literal:

```ts
// packages/queue/src/queue.module.ts
@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: { host: envs.DB_REDIS_HOST, port: envs.DB_REDIS_PORT /* ... */ },
      //            ^ read at IMPORT time, the moment the file is loaded
    }),
    BullModule.registerQueue(...Object.values(QueueEnum).map((name) => ({ name }))),
  ],
})
export class QueueModule {}
```

So importing *anything* from the barrel forces `queue.module.ts` to load, which forces the eager `envs` read, which fires the spec's `get envs()` getter before `mockEnvs` is initialized → TDZ `ReferenceError`. The leaf import never pulls `queue.module.ts` into the graph, so nothing reads `envs` at import time and the suite loads cleanly.

This is the same *family* of bug as importing `@hsm/config` directly into a spec and tripping its Joi validation at import time (see Related) — an **import-time side effect** firing before any test body runs. Here the side effect is reached one level removed, through a barrel that re-exports a config-reading module.

## Prevention

**1. Import pure enums / constants / types from their leaf path, not the barrel,** whenever the barrel re-exports a NestJS module (or anything else) that reads config/env at import time.

```ts
import { QueueEnum } from '@hsm/queue/queue.enum';   // leaf — no side effects
// not:
import { QueueEnum } from '@hsm/queue';              // barrel — drags in the module
```

**2. Defer env reads to DI-init with `forRootAsync` + `useFactory`** so `envs` is read when the module initializes, not when the file is imported:

```ts
// import-time read (fragile):
BullModule.forRoot({ connection: { host: envs.DB_REDIS_HOST, port: envs.DB_REDIS_PORT } })

// DI-init read (robust — factory runs at module init, not import):
BullModule.forRootAsync({
  useFactory: () => ({
    connection: { host: envs.DB_REDIS_HOST, port: envs.DB_REDIS_PORT },
  }),
})
```

**3. Mock `@hsm/config` with a plain object literal in specs,** not a lazy getter that closes over a later-declared const, so an eager import-time read can't hit a TDZ window:

```ts
// fragile — getter fires during transitive import-time reads, before mockEnvs exists → TDZ
jest.mock('@hsm/config', () => ({ get envs() { return mockEnvs; } }));
const mockEnvs = { /* ... declared later ... */ };

// safe — value exists eagerly, no TDZ window
jest.mock('@hsm/config', () => ({
  envs: { DB_REDIS_HOST: 'localhost', DB_REDIS_PORT: 6379 /* ... */ },
}));
```

## Related Issues

- [`test-failures/2026-05-06-nestjs-config-joi-validation-dotenv-conflict.md`](2026-05-06-nestjs-config-joi-validation-dotenv-conflict.md) — closest sibling: a spec crashes at module-import time because importing `@hsm/config` triggers Joi validation of `envs` before any test runs. Same root-cause family (import-time eager env evaluation breaking specs); different reach (direct config import) and fix (env-shim in `test-setup.ts`).
- [`runtime-errors/2026-05-04-typeorm-entity-circular-import-silent-drop.md`](../runtime-errors/2026-05-04-typeorm-entity-circular-import-silent-drop.md) — same *family* (barrel re-export causing wrong-time module evaluation), different symptom (entity barrel evaluates to `[]` → runtime DI crash). The general rule "import from the side-effect-free leaf path, not the barrel" applies to both.
- `packages/database/CLAUDE.md` → "Entity import rules (circular dependency hazard)" — the canonical statement of the barrel/leaf-import rule in this repo.
- `docs/solutions/developer-experience/2026-05-06-nestjs-unit-test-mocking-patterns.md` — **stale example**: its `getQueueToken` snippet imports `QueueEnum` from the `@hsm/queue` barrel, the exact import this learning shows is hazardous under a mocked `@hsm/config`. Worth updating to the leaf path.
