# CLAUDE.md — `@hsm/config`

Frozen, Joi-validated env vars, **per app**. **Always import this instead of
touching `process.env` directly.** Each entry point validates only the vars its
app actually uses (fail-fast on its own env):

```ts
import { envs } from '@hsm/config/api';     // api: base + JWT_*, SWAGGER_FAVICON, DEFAULT_ADMIN_*, APP_BASE_URL
import { envs } from '@hsm/config/worker';  // worker: the base set
import { envs } from '@hsm/config';         // = the shared BASE — for the shared packages only
```

- **`@hsm/config` (root) = the base** — the vars the shared packages
  `@hsm/database` / `@hsm/queue` / `@hsm/storage` consume (DB_POSTGRES_*,
  DB_REDIS_*, STRG_S3_*, SMTP_*, ENVIRONMENT, SWAGGER_SITE_TITLE, COMS_*). Those
  packages are imported by BOTH apps, so they read the base, never an app config.
- **`@hsm/config/api`** = base + API-only vars.
- **`@hsm/config/worker`** = base (add worker-only vars here if they appear).
- `src/fields.ts` — `FIELDS` (one Joi rule per var) + `validateEnv(keys)`
  (validates `process.env` for a named subset). The per-app files assemble their
  subset. `base.ts` also exports `getWebhookSigningKeys()`.
- **The frontend does NOT use this** — it's Node (dotenv/process). `@hsm/web` has
  its own browser-safe config (runtime `config.json` + `ConfigService`).

## Commands

```bash
pnpm --filter @hsm/config build
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
| `DB_REDIS_*` | Redis (BullMQ) connection |
| `STRG_S3_*` | S3 / RustFS storage |

## Don't

- Don't read `process.env.X` directly — bypasses validation and freezing.
- Don't mutate `envs` at runtime.
- Don't re-export `envs` from another package; consumers should import from `@hsm/config`.
