# API Unit Tests — Requirements

**Date:** 2026-05-06  
**Status:** Ready for planning

---

## Problem

The `@hsm/api` app has 11 spec files, but 9 of them are trivial NestJS-generated stubs ("should be defined" with no mock providers). Several of those stubs currently fail at runtime because they don't provide required mock dependencies. No test step exists in the CI/CD pipeline, so broken code can reach `main` and deploy.

---

## Goal

Replace all trivial stubs with real unit tests covering meaningful service logic and controller wiring. Add a test gate to the GitHub Actions pipeline so merges to `main` require passing tests.

---

## Scope

### In scope

- Unit tests for all API services: `UsersService`, `AuthService`, `ComsService`, `DocsService` (already done), `TemplatesService` (already done)
- Unit tests for all API controllers: `UserController`, `AuthController`, `ComsController`, `DocsController`, `TemplatesController`, `MainController` (already trivially done)
- Jest environment setup: a `jest.setup.ts` (added to `setupFiles`) that populates `process.env` with dummy test values so `@hsm/config` Joi validation passes without real credentials
- GitHub Actions: add a `test` job to `.github/workflows/CICD.yml` that runs `pnpm --filter @hsm/api test` before build/deploy

### Out of scope

- E2E tests (deferred)
- Worker tests (phase 2)
- Real database/Redis connections in tests (pure mocks only)
- Oracle changes of any kind
- Integration tests with testcontainers

---

## Key findings from codebase scan

| Finding | Impact |
|---------|--------|
| Oracle (`HsmDbOracle`) is **not used in API** — only worker | No Oracle mocking needed for API tests |
| `docs.service.spec.ts` and `templates.service.spec.ts` are fully implemented | These are the reference patterns to follow |
| `@hsm/config` validates all env vars via Joi at import time | Tests fail without a `setupFiles` env shim |
| GitHub Actions workflow exists (lint → build → deploy) | Just needs a `test` job inserted |
| `moduleNameMapper` already resolves `@hsm/*` workspace packages in Jest | No extra config needed |

---

## Mock strategy (unit tests)

All external dependencies are replaced with `jest.fn()` mocks injected via `@nestjs/testing`. No real DB, Redis, or S3 connection is established.

| Dependency | Mock approach |
|-----------|--------------|
| TypeORM repos (`@InjectRepository`) | `{ findOne: jest.fn(), save: jest.fn(), ... }` via `getRepositoryToken(Entity, DbEnum)` |
| TypeORM DataSource (`@InjectDataSource`) | `{ transaction: jest.fn(cb => cb(manager)) }` via `getDataSourceToken(DbEnum)` |
| BullMQ queues (`@InjectQueue`) | `{ add: jest.fn() }` via `getQueueToken(QueueEnum.X)` |
| `S3Service` | `{ generatePresignedUrls: jest.fn(), deleteFiles: jest.fn() }` |
| `JwtService` | `{ sign: jest.fn(), verify: jest.fn() }` |
| `ConfigService` / `envs` | `process.env` set in `jest.setup.ts` before module import |
| bcrypt | Real bcrypt (it's pure compute, no I/O — fine in tests) |

---

## Env vars for CI/CD

Unit tests need `@hsm/config` to pass Joi validation, but they don't need real credentials — all external services are mocked.

**Solution:** Add `apps/backend/api/src/test-setup.ts` as a jest `setupFiles` entry. It sets `process.env` with dummy values (not real secrets) before any module is imported. These dummy values are committed to the repo since they're not real credentials.

In CI (GitHub Actions), no secrets are required for unit tests. The `test` job sets the same dummy env vars inline in the workflow, or relies on the `test-setup.ts` shim.

---

## CI/CD pipeline change

Add a `test` job to `.github/workflows/CICD.yml` between `lint` and `build`:

```
lint → test → build → deploy
```

The `test` job runs `pnpm --filter @hsm/api test` on the GitHub Actions runner (no Docker required for unit tests — just Node + pnpm).

Branch protection on `main` should require the `test` job to pass before merge. This is configured in GitHub repository settings (branch protection rules), not in the workflow file itself.

---

## Files to create / modify

| File | Action |
|------|--------|
| `apps/backend/api/src/test-setup.ts` | Create — sets dummy `process.env` values for Joi validation |
| `apps/backend/api/package.json` | Add `setupFiles: ['<rootDir>/src/test-setup.ts']` to jest config |
| `apps/backend/api/src/modules/core/users/users.service.spec.ts` | Replace stub with real tests |
| `apps/backend/api/src/modules/core/users/user.controller.spec.ts` | Replace stub with real tests |
| `apps/backend/api/src/modules/security/auth/auth.service.spec.ts` | Replace stub with real tests |
| `apps/backend/api/src/modules/security/auth/auth.controller.spec.ts` | Replace stub with real tests |
| `apps/backend/api/src/modules/core/coms/coms.service.spec.ts` | Replace stub with real tests |
| `apps/backend/api/src/modules/core/coms/coms.controller.spec.ts` | Replace stub with real tests |
| `apps/backend/api/src/modules/core/docs/docs.controller.spec.ts` | Replace stub with real tests |
| `apps/backend/api/src/modules/core/templates/templates.controller.spec.ts` | Replace stub with real tests |
| `.github/workflows/CICD.yml` | Add `test` job |

`docs.service.spec.ts` and `templates.service.spec.ts` are already complete — do not modify.

---

## Success criteria

- `pnpm --filter @hsm/api test` passes with zero failures locally
- All spec files have at least one meaningful assertion beyond "should be defined"
- Service specs cover: happy path, not-found, validation error, and any auth/permission edge cases per service
- Controller specs verify: correct service method called, correct HTTP response shape, guard/decorator wiring
- The `test` job runs and passes in GitHub Actions on every push
- No real database, Redis, or S3 connection is required to run tests

---

## Assumptions

- Oracle is not introduced into the API layer before this work is done
- Infisical / real secrets are not required for unit tests (confirmed by mock strategy above)
- Branch protection rules will be configured in GitHub repo settings separately from this implementation
