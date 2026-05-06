---
title: NestJS unit test mocking patterns for TypeORM, BullMQ, DataSource, and bcrypt
date: 2026-05-06
category: developer-experience
module: testing
problem_type: developer_experience
component: testing_framework
severity: medium
applies_when:
  - Writing unit tests for NestJS services with TypeORM repositories on named DB connections
  - Testing services that inject BullMQ queues via @nestjs/bullmq
  - Testing services that open explicit transactions via DataSource.createQueryRunner()
  - Testing services that use bcrypt for password hashing
tags:
  - nestjs
  - jest
  - typeorm
  - bullmq
  - unit-testing
  - mocking
  - repository-pattern
  - query-runner
  - bcrypt
  - testing-framework
---

# NestJS unit test mocking patterns for TypeORM, BullMQ, DataSource, and bcrypt

## Context

`@hsm/api` uses TypeORM with multiple named database connections (`DatabasesEnum`), BullMQ queues identified by `QueueEnum`, and bcrypt for password hashing. NestJS resolves providers by token identity — for named connections and queues, the token is a composite key. Using the wrong helper or omitting the connection name produces a `Nest can't resolve dependencies` error that can be misleading to diagnose. These patterns establish the canonical approach for mocking each dependency inside `Test.createTestingModule()`.

## Guidance

### TypeORM repositories with named connections

When a service injects a repository on a named connection, the provider token includes both the entity and the `DatabasesEnum` value. Pass both to `getRepositoryToken`:

```typescript
import { getRepositoryToken } from '@nestjs/typeorm';
import { DatabasesEnum } from '@hsm/database/sources';

const mockUserRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

providers: [
  UsersService,
  { provide: getRepositoryToken(UserEntity, DatabasesEnum.HsmDbPostgres), useValue: mockUserRepo },
]
```

Omitting the `DatabasesEnum` argument generates a different token from the one the service resolves. Result: `Nest can't resolve dependencies of UsersService`.

### BullMQ queues

Use `getQueueToken` from `@nestjs/bullmq` with the `QueueEnum` string value:

```typescript
import { getQueueToken } from '@nestjs/bullmq';
import { QueueEnum } from '@hsm/queue';

const mockComsQueue = { add: jest.fn() };

providers: [
  ComsService,
  { provide: getQueueToken(QueueEnum.Coms), useValue: mockComsQueue },
]
```

### TypeORM DataSource with QueryRunner

For services that open explicit transactions via `DataSource.createQueryRunner()`, mock the full QueryRunner chain and provide the DataSource by its named-connection token:

```typescript
import { getDataSourceToken } from '@nestjs/typeorm';

const mockManager = { save: jest.fn(), update: jest.fn() };
const mockQueryRunner = {
  connect: jest.fn().mockResolvedValue(undefined),
  startTransaction: jest.fn().mockResolvedValue(undefined),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  rollbackTransaction: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
  manager: mockManager,
};
const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
};

providers: [
  AuthService,
  { provide: getDataSourceToken(DatabasesEnum.HsmDbPostgres), useValue: mockDataSource },
]
```

In `beforeEach`, reset the manager mocks so each test starts clean:
```typescript
beforeEach(() => {
  jest.clearAllMocks();
  mockManager.save.mockResolvedValue({});
  mockManager.update.mockResolvedValue({ affected: 1 });
  mockQueryRunner.connect.mockResolvedValue(undefined);
  // ... other QueryRunner methods
});
```

### bcrypt module mock

`bcrypt` is a native module mocked at the top of the test file via `jest.mock`. Because `jest.clearAllMocks()` resets call counts but NOT `mockResolvedValue` implementations, re-apply defaults in `beforeEach`:

```typescript
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-value'),
  compare: jest.fn().mockResolvedValue(true),
}));

import * as bcrypt from 'bcrypt';

beforeEach(() => {
  jest.clearAllMocks();
  // Re-apply defaults: clearAllMocks strips implementations.
  (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-value');
  (bcrypt.compare as jest.Mock).mockResolvedValue(true);
});
```

### The clearAllMocks / mockResolvedValue pitfall

`jest.clearAllMocks()` resets call history and instances but does NOT restore `mockResolvedValue` implementations. Any test that overrides an implementation via `mockResolvedValueOnce` or `mockResolvedValue` will silently pollute subsequent tests unless the default is explicitly restored in `beforeEach`. Always pair module-level mocks with implementation resets.

## Why This Matters

NestJS resolves providers by token identity. For named TypeORM connections and BullMQ queues, the token is a composite key. Using the plain entity class or a bare string generates a different token — the module compiles but the service's constructor injection fails at `module.compile()` time.

The `clearAllMocks` / `mockResolvedValue` interaction is a non-obvious Jest behavior that produces flaky tests: one test that overrides a return value silently corrupts later tests that assume the default, with no immediate error message.

## When to Apply

- Any service injecting `@InjectRepository(Entity, DatabasesEnum.X)` → use `getRepositoryToken(Entity, DatabasesEnum.X)`
- Any service injecting `@InjectQueue('name')` or using `QueueEnum` → use `getQueueToken(QueueEnum.X)`
- Any service injecting `@InjectDataSource(DatabasesEnum.X)` → use `getDataSourceToken(DatabasesEnum.X)`
- Any test file mocking `bcrypt` → apply `jest.mock` + `beforeEach` re-application
- Whenever module-level mock objects are shared across tests → reset implementations in `beforeEach`

## Examples

A complete provider array for `AuthService` (uses repository, DataSource, JwtService, and bcrypt):

```typescript
providers: [
  AuthService,
  { provide: UsersService, useValue: mockUsersService },
  { provide: JwtService, useValue: mockJwtService },
  {
    provide: getRepositoryToken(RefreshTokenUserEntity, DatabasesEnum.HsmDbPostgres),
    useValue: refreshTokenUserRepo,
  },
  {
    provide: getRepositoryToken(RefreshTokenUserIntegrationEntity, DatabasesEnum.HsmDbPostgres),
    useValue: refreshTokenUserIntegrationRepo,
  },
  {
    provide: getDataSourceToken(DatabasesEnum.HsmDbPostgres),
    useValue: mockDataSource,
  },
  // bcrypt is mocked at file scope via jest.mock — no provider entry needed
]
```

Reference implementation: `apps/backend/api/src/modules/security/auth/auth.service.spec.ts` and `apps/backend/api/src/modules/core/docs/docs.service.spec.ts`.

## Related

- `docs/brainstorms/api-unit-tests-requirements.md` — requirements doc that captured this pattern during planning
- `docs/solutions/test-failures/nestjs-config-joi-validation-dotenv-conflict-2026-05-06.md` — the env shim setup required before these patterns work
- `apps/backend/api/src/test-setup.ts` — env shim that makes `@hsm/config` importable in tests
