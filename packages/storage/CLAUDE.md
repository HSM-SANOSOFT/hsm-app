# CLAUDE.md — `@hsm/storage`

S3-compatible object storage. Works against MinIO in dev and AWS S3 in prod.

## What's exported

```ts
import { StorageModule, StorageService } from '@hsm/storage';
```

`StorageModule` re-exports `S3Module`, so importing it gives you `S3Service` too.

> `StorageService` is currently a placeholder shell. The real work happens in `S3Service` (`src/s3/s3.service.ts`) — `uploadFiles`, presigned URL generation, head/get/delete via the AWS SDK v3.

## Layout

```
src/
├── storage.module.ts
├── storage.service.ts        (placeholder)
└── s3/
    ├── s3.module.ts
    ├── s3.service.ts         upload/get/head/delete + presigned URLs
    ├── s3.provider.ts        S3Client factory (also a presigned-URL client)
    ├── s3.initializer.ts     bucket bootstrapping on module init
    ├── s3.buckets.ts         bucket name constants
    └── s3.symbols.ts         DI tokens (S3_CLIENT, S3_CLIENT_PRESIGNED)
```

## Two S3 clients

- `S3_CLIENT` — internal endpoint (`STRG_S3_HOST`), used for direct ops.
- `S3_CLIENT_PRESIGNED` — external endpoint (`STRG_S3_HOST_EXTERNAL`), used so the URLs we hand to clients are reachable from outside Docker.

If you only inject one, you'll either break presigned URLs in dev or leak the internal hostname. Use the right symbol.

## Env vars (from `@hsm/config`)

| Var | Purpose |
| --- | ------- |
| `STRG_S3_ACCESS_KEY` / `STRG_S3_SECRET_KEY` | Credentials |
| `STRG_S3_HOST` | Internal endpoint (e.g. MinIO container DNS) |
| `STRG_S3_HOST_EXTERNAL` | Externally reachable endpoint (for presigned URLs) |
| `STRG_S3_REGION` | AWS region (or any value MinIO accepts) |
| `STRG_S3_FORCE_PATH_STYLE` | `true` for MinIO/self-hosted, `false` for native AWS |

## Buckets

Defined in `s3.buckets.ts`. `s3.initializer.ts` creates them on module init if they don't exist — add new buckets there, don't create them ad-hoc from feature code.

## Don't

- Don't pull in `@aws-sdk/client-s3` directly from app code — go through `S3Service`.
- Don't hand presigned URLs back from `S3_CLIENT` (internal endpoint); use `S3_CLIENT_PRESIGNED`.
- Don't let bucket names drift — keep them in `s3.buckets.ts`.
