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
# Single bundle (runtime i18n via Transloco): one dist/browser with the app +
# public assets (incl. /i18n/{es,en}.json). `-s` gives SPA fallback to
# index.html for client-side routes.
COPY --from=builder /app/apps/frontend/web/dist/browser ./dist
# gen-config writes config.json from WEB_* env at container start (runtime
# config, no rebuild). The base image ships node, so run it before serving.
COPY --from=builder /app/apps/frontend/web/scripts/gen-config.mjs ./gen-config.mjs

EXPOSE 4200
CMD ["sh", "-c", "node gen-config.mjs dist/config.json && serve -s dist -l 4200"]
