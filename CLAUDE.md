# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Per-workspace context

Each app and package has its own `CLAUDE.md`. **Always read it before working in that directory** — it covers commands, conventions, module wiring, and gotchas.

| Workspace | File |
| --------- | ---- |
| `@hsm/api` | [`apps/backend/api/CLAUDE.md`](apps/backend/api/CLAUDE.md) |
| `@hsm/worker` | [`apps/backend/worker/CLAUDE.md`](apps/backend/worker/CLAUDE.md) |
| `@hsm/web` | [`apps/frontend/web/CLAUDE.md`](apps/frontend/web/CLAUDE.md) |
| `@hsm/mobile` | [`apps/frontend/mobile/CLAUDE.md`](apps/frontend/mobile/CLAUDE.md) |
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

## Documented solutions

`docs/solutions/` — past bugs, best practices, and workflow patterns, organized by category with YAML frontmatter (`module`, `tags`, `problem_type`). Relevant when debugging, adding entities, or working in an area that may have prior incidents.

## Oracle database constraint

The Oracle database (`DB_ORACLE_*`) is the **production legacy system**. You may only issue `SELECT` or `UPDATE` queries against it. **Never issue `DELETE`, `DROP`, `ALTER`, `CREATE`, or any DDL/destructive statement** against Oracle. No schema changes, no new tables, no migrations targeting Oracle.
