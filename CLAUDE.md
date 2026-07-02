# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Per-workspace context

Each app and package has its own `CLAUDE.md`. **Always read it before working in that directory** — it covers commands, conventions, module wiring, and gotchas.

| Workspace | File |
| --------- | ---- |
| `@hsm/api` | [`apps/backend/api/CLAUDE.md`](apps/backend/api/CLAUDE.md) |
| `@hsm/worker` | [`apps/backend/worker/CLAUDE.md`](apps/backend/worker/CLAUDE.md) |
| `@hsm/web` | [`apps/frontend/web/CLAUDE.md`](apps/frontend/web/CLAUDE.md) |
| `@hsm/common` | [`packages/common/CLAUDE.md`](packages/common/CLAUDE.md) |
| `@hsm/config` | [`packages/config/CLAUDE.md`](packages/config/CLAUDE.md) |
| `@hsm/database` | [`packages/database/CLAUDE.md`](packages/database/CLAUDE.md) |
| `@hsm/queue` | [`packages/queue/CLAUDE.md`](packages/queue/CLAUDE.md) |
| `@hsm/storage` | [`packages/storage/CLAUDE.md`](packages/storage/CLAUDE.md) |

## Monorepo commands (run from repo root, inside container)

```bash
# Start full stack (api + worker + postgres + redis + minio)
docker compose -f docker/docker-compose.yaml up

# Start only infra (no app containers)
docker compose -f docker/docker-compose.yaml up postgres redis minio

# Exec into running containers
docker exec -it hsm-app-be-api sh
docker exec -it hsm-app-be-worker sh

# Install deps (regenerates pnpm-lock.yaml)
pnpm install

# Lint / format
pnpm lint
pnpm lint:fix
pnpm check:fix   # lint + format together

# Build everything via Turborepo
pnpm build
```

### Port map

| Service | Host port |
| --------- | ----------- |
| API | 10001 |
| Worker | 10002 |
| Postgres | 10003 |
| Redis | 10004 |
| MinIO (S3) | 10005 |
| MinIO console | 10006 |
| RedisInsight | 10007 |
| pgAdmin | 10008 |

## Run & test locally (inside the dev container)

The everyday dev loop does **not** use the app images. Only the external
services run as compose containers; `@hsm/api`, `@hsm/worker`, and `@hsm/web`
run directly inside the dev container via pnpm:

```bash
# Infra only (the dev container's runServices already starts these)
docker compose -f docker/docker-compose.yaml up -d postgres redis minio

# Apps — run locally, each in its own terminal
pnpm --filter @hsm/api start:dev     # API on :3000  (wait for "Seeded default admin user")
pnpm --filter @hsm/worker start:dev
pnpm --filter @hsm/web dev           # Angular dev server on :4200
```

The dev container forwards **3000** (API) and **4200** (web) to the host, so the
browser reaches the API at `localhost:3000` and the app at `localhost:4200`.
**The Port map above is the `docker compose up` (full-stack) mapping, not the
local-run model** — in local-run the frontend dev env
(`apps/frontend/web/src/environments/environment.development.ts`) targets
`http://localhost:3000/v1`.

**Log in** with the seeded default admin: username `admin` (username-based — not
the email) plus the `DEFAULT_ADMIN_PASSWORD` value from `apps/backend/api/.env`.
After running `.devcontainer/script/get-secrets-infisical.sh`, **restart
`start:dev`** so dotenv reloads the new `.env`. Full walkthrough:
`docs/solutions/developer-experience/2026-06-25-dev-container-local-run-and-login.md`.

## Documented solutions

`docs/solutions/` — past bugs, best practices, and workflow patterns, organized by category with YAML frontmatter (`module`, `tags`, `problem_type`). Relevant when debugging, adding entities, or working in an area that may have prior incidents.

## Oracle database constraint

The Oracle database (`DB_ORACLE_*`) is the **production legacy system**. You may only issue `SELECT` or `UPDATE` queries against it. **Never issue `DELETE`, `DROP`, `ALTER`, `CREATE`, or any DDL/destructive statement** against Oracle. No schema changes, no new tables, no migrations targeting Oracle.
