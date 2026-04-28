# CLAUDE.md — `@hsm/queue`

Global `QueueModule`. BullMQ wired to Redis. Used as a **producer** in `@hsm/api` and a **consumer** in `@hsm/worker`.

## What's exported

```ts
import { QueueModule, QueueService, QueueEnum, WorkerHost } from '@hsm/queue';
```

- `QueueModule` — `@Global()`, registers all queues from `QueueEnum`.
- `QueueService` — convenience helpers on top of BullMQ.
- `QueueEnum` — single source of truth for queue names.
- `WorkerHost` (`queue.worker-host.ts`) — base class for processors in the worker app.

## Queues

Defined in `src/queue.enum.ts`:

```ts
export enum QueueEnum {
  Coms         = 'coms',
  Document     = 'document',
  Notification = 'notification',
  Templates    = 'templates',
}
```

Every value is registered with `BullModule.registerQueue` at module load — adding a new queue means adding an enum value and (in the worker) a processor.

## Connection + defaults

From `queue.module.ts`:

- Redis host/port/credentials come from `envs.DB_REDIS_*`.
- Prefix: `hsm-app-be-queue` (all keys in Redis live under this).
- Default job options: **3 attempts, 1s delay, 2s backoff**.

Override per-job at enqueue time when needed (e.g. `removeOnComplete`, custom `backoff`).

## Producer pattern (API side)

```ts
constructor(@InjectQueue(QueueEnum.Coms) private comsQueue: Queue) {}

await this.comsQueue.add('send-email', payload);
```

## Consumer pattern (worker side)

Live in `apps/backend/worker/src/modules/core/<domain>/`. Use a `@Processor(QueueEnum.X)` class — extend `WorkerHost` from this package if you want the shared lifecycle hooks.

## Don't

- Don't hardcode queue name strings — always use `QueueEnum`.
- Don't open standalone BullMQ connections; reuse `QueueModule` so prefix and connection stay consistent.
- Don't add HTTP-side processing here. Producers enqueue, the worker app consumes.
