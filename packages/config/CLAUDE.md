# CLAUDE.md — `@hsm/config`

Single export: `envs` — frozen, Joi-validated env vars. **Always import this instead of touching `process.env` directly.**

```ts
import { envs } from '@hsm/config';

const port = envs.DB_POSTGRES_PORT;
```

## How it works

`src/envs.ts`:

1. Loads `dotenv/config` at module load.
2. Defines an `EnvVars` TypeScript interface.
3. Validates `process.env` against a Joi schema (`EnvSchema`).
4. Throws on validation error at import time — failures are caught at boot, not at first use.
5. Exports the validated object as `envs`.

## When adding a new env var

1. Add the field to the `EnvVars` interface.
2. Add the matching Joi rule to `EnvSchema` (mark required vs. defaulted explicitly).
3. Document the var in `.env.example` / docker compose env passthrough if other devs need it.
4. Reference it as `envs.YOUR_VAR` from app code.

## Naming groups

Already-used prefixes — extend rather than invent new ones unless the domain truly is new:

| Prefix | Purpose |
| ------ | ------- |
| `ENVIRONMENT` | `dev` / `prod` switch |
| `SWAGGER_*` | Swagger UI customization |
| `SMTP_*` | Email transport |
| `JWT_AT_*` / `JWT_RT_*` | Access / refresh JWT secrets |
| `DB_POSTGRES_*` | Postgres connection |
| `DB_ORACLE_*` | Oracle connection |
| `DB_REDIS_*` | Redis (BullMQ) connection |
| `STRG_S3_*` | S3 / MinIO storage |

## Don't

- Don't read `process.env.X` directly — bypasses validation and freezing.
- Don't mutate `envs` at runtime.
- Don't re-export `envs` from another package; consumers should import from `@hsm/config`.
