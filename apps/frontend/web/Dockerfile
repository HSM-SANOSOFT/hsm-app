# Build context: monorepo root.
#
# Containerizes the @hsm/web app: build the Angular bundle, then serve the
# static output. No turbo prune — @hsm/web consumes @hsm/common via a tsconfig
# source path-map (../../../packages/common/src), not a workspace dependency,
# so a prune would drop packages/common and the build would fail.

# ── Builder: compile the Angular app ──────────────────────────────────────────
FROM node:24-bookworm-slim AS builder

RUN corepack enable
WORKDIR /app
COPY . .

# Install only @hsm/web's dependency closure — avoids the api/worker native
# deps (e.g. oracledb) that would otherwise need the Oracle client at build time.
RUN pnpm install --frozen-lockfile --filter @hsm/web...
RUN pnpm --filter @hsm/web build

# ── Runtime: serve the static bundle ──────────────────────────────────────────
FROM node:24-bookworm-slim AS runtime

RUN npm install -g serve
WORKDIR /app
# Angular application builder emits the client bundle under dist/browser.
COPY --from=builder /app/apps/frontend/web/dist/browser ./dist

EXPOSE 4200
# -s serves the SPA: unknown routes fall back to index.html for the Angular router.
CMD ["serve", "-s", "dist", "-l", "4200"]
