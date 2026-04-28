# CLAUDE.md — `@hsm/worker`

BullMQ job processor. No HTTP server. See repo-root `CLAUDE.md` for monorepo-wide conventions.

## Commands

Run inside `hsm-app-be-worker` container.

```bash
pnpm --filter @hsm/worker start:dev
pnpm --filter @hsm/worker build
pnpm --filter @hsm/worker test
```

Worker container is exposed as **10002** on the host (used for debug ports / metrics, not HTTP traffic).

## Bootstrap (`src/main.ts`)

Uses `NestFactory.createApplicationContext` — **no HTTP listener**. Don't add one. Side effects come from BullMQ processors registering themselves on module init.

`enableShutdownHooks()` is on so BullMQ workers drain in-flight jobs on `SIGTERM`.

## Module tree

```
WorkerModule
├── DatabaseModule  (@hsm/database)
├── QueueModule     (@hsm/queue — consumer side)
└── CoreModule
    ├── ComsModule       (email + sms + template subdirs)
    ├── DocsModule       (generation/ — Puppeteer-based)
    └── TemplatesModule
```

Mirror of API's `CoreModule` minus `UsersModule`. The worker only needs domains it actually processes jobs for.

## Queues consumed

Defined in `@hsm/queue` (3 attempts, 1s delay, 2s backoff):

| Queue | Processor | Notes |
| ----- | --------- | ----- |
| `coms` | `ComsModule` | Email (Nodemailer) + SMS |
| `document` | `DocsModule` | PDF/doc generation via Puppeteer |
| `templates` | `TemplatesModule` | Template rendering / Handlebars |
| `notification` | (TBD) | Reserved — declared in `@hsm/queue` but no consumer yet |

## Adding a processor

1. Subdir under `src/modules/core/<domain>/` — follow `coms/email`, `docs/generation` shape.
2. `@Processor('<queue-name>')` class with `@Process()` handlers.
3. Import the feature module into the domain module (e.g. `coms.module.ts`), which is already wired into `CoreModule`.
4. Use `@hsm/database` for persistence; don't open new TypeORM connections.

## Puppeteer

Only the worker has Puppeteer (`docs/generation`). Keep PDF/headless-browser code on this side — never add it to the API.

## Test layout

`*.spec.ts` colocated with source. Same Jest config shape as the API (see `package.json`).
