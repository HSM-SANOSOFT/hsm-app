---
title: NestJS @hsm/config Joi validation fails in Jest due to dotenv conditional S3 variable conflict
date: 2026-05-06
category: test-failures
module: config
problem_type: test_failure
component: testing_framework
severity: high
symptoms:
  - "Config validation error: STRG_S3_HOST is not allowed — thrown before any test body executes"
  - Entire Jest suite fails at module import time when any service importing @hsm/config is loaded
  - Error only appears in tests, never in the running application
root_cause: config_error
resolution_type: environment_setup
tags:
  - nestjs
  - jest
  - joi
  - dotenv
  - config-validation
  - env-shim
  - s3
  - setup-files
---

# NestJS @hsm/config Joi validation fails in Jest due to dotenv conditional S3 variable conflict

## Problem

When writing unit tests for `@hsm/api`, any service that transitively imports `@hsm/config` causes the Jest test suite to fail immediately with a Joi validation error. The error fires before a single test body executes, blocking the entire suite.

## Symptoms

- `Config validation error: "STRG_S3_HOST" is not allowed` thrown at module import time
- Error fires inside `@hsm/config/src/envs.ts` during Joi schema validation
- The failing variable (`STRG_S3_HOST`) is a legitimate application env var, making the error confusing
- Error only appears in tests — the app starts normally in Docker

## What Didn't Work

Setting `STRG_S3_FORCE_PATH_STYLE=false` in `test-setup.ts` without also pre-setting `STRG_S3_HOST`:

```typescript
// ❌ Broken — sets flag to false but leaves STRG_S3_HOST unset
process.env.STRG_S3_FORCE_PATH_STYLE = 'false';
// STRG_S3_HOST intentionally omitted (we don't want path-style in tests)
```

This looks safe but triggers the conflict: `dotenv` fills in `STRG_S3_HOST` from `.env`, and Joi then sees the forbidden combination.

## Solution

In `test-setup.ts`, set `STRG_S3_FORCE_PATH_STYLE=true` and explicitly pre-set `STRG_S3_HOST`. This keeps the values internally consistent AND prevents `dotenv` from injecting the real `.env` value:

```typescript
// ✅ Correct — force_path_style=true means STRG_S3_HOST is required, not forbidden.
// Must be pre-set here: dotenv does not override existing vars but WILL inject
// STRG_S3_HOST from .env if it is absent, causing Joi to reject the combination.
process.env.STRG_S3_FORCE_PATH_STYLE = 'true';
process.env.STRG_S3_HOST = 'http://localhost:9000';
process.env.STRG_S3_HOST_EXTERNAL = 'http://localhost:9000';
```

Also ensure `test-setup.ts` is wired as `setupFiles` (not `setupFilesAfterFramework`) in the Jest config:

```json
"jest": {
  "setupFiles": ["<rootDir>/src/test-setup.ts"]
}
```

## Why This Works

`@hsm/config/src/envs.ts` begins with `import 'dotenv/config'`. When Node first resolves this module (at test module compile time), `dotenv` merges `.env` values into `process.env` for any key **not already present**. `dotenv` does not override.

The Joi schema uses a conditional: when `STRG_S3_FORCE_PATH_STYLE=false`, the `STRG_S3_HOST` field is **forbidden** (not merely optional). So:

1. `test-setup.ts` sets `STRG_S3_FORCE_PATH_STYLE=false` → the "forbidden" branch activates
2. `@hsm/config` is imported → `dotenv` runs → injects `STRG_S3_HOST` from `.env` (key was absent)
3. Joi validates → sees `force_path_style=false` AND `STRG_S3_HOST` present → rejects

The `setupFiles` vs `setupFilesAfterFramework` distinction matters because `setupFiles` runs before module resolution. Since Joi validation fires as a module import side effect, all env vars must be set before any `import` executes.

Setting `STRG_S3_FORCE_PATH_STYLE=true` and pre-setting `STRG_S3_HOST` means all S3 keys are occupied before `dotenv` runs. `dotenv` injects nothing. Joi sees consistent values and passes.

## Prevention

- Treat the Joi conditional schema in `@hsm/config` as a contract: whenever `STRG_S3_FORCE_PATH_STYLE` changes between true/false, the corresponding presence/absence of `STRG_S3_HOST` must also be consistent in `test-setup.ts`.
- When adding a new **required** env var to `@hsm/config`, add a dummy value in `test-setup.ts` at the same time. Omitting it means `dotenv` injects the real value from `.env`, which may conflict with other dummy vars already set.
- When a Jest suite starts failing with an unexpected Joi error, the first diagnostic step is: compare flag variables in `test-setup.ts` against the conditional branches in `packages/config/src/envs.ts`. The Joi `when()` chain is the source of truth.

## Related Issues

- `docs/brainstorms/api-unit-tests-requirements.md` — requirements doc that captured this pattern during planning
- See `packages/config/src/envs.ts` for the full Joi schema, particularly the `STRG_S3_HOST` conditional
- See `apps/backend/api/src/test-setup.ts` for the complete working env shim
