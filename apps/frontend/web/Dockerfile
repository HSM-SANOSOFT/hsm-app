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
# The localized build (`ng build --localize`) emits one client bundle per locale
# under dist/browser/{es,en}. Copy them plus serve.json, which owns the root
# redirect (/ -> /es/) and the per-locale SPA fallback — so we DON'T pass `-s`
# (that would force a single top-level index.html and defeat the per-locale
# rewrites).
COPY --from=builder /app/apps/frontend/web/dist/browser ./dist
COPY --from=builder /app/apps/frontend/web/serve.json ./dist/serve.json
# The localized build emits no bundle at the site root; ship the client-side
# locale chooser (honours persisted hsm.lang) as ./dist/index.html — serve.json
# routes / and any non-locale-prefixed path to it.
COPY --from=builder /app/apps/frontend/web/serve-root/index.html ./dist/index.html

EXPOSE 4200
CMD ["serve", "dist", "-l", "4200"]
