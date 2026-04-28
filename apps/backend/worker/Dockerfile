# Build context: monorepo root

# ── Pruner: strip workspace to only worker + its @hsm/* deps ──────────────────
FROM node:24-bookworm-slim AS pruner

RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm dlx turbo prune @hsm/worker --docker

# ── Builder: install worker-only deps + compile ───────────────────────────────
FROM node:24-bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    unzip libaio1 libnsl2 ca-certificates \
    fonts-liberation libatk-bridge2.0-0 libatk1.0-0 libcups2 \
    libdbus-1-3 libdrm2 libgbm1 libnspr4 libnss3 libx11-6 libxext6 \
  && rm -rf /var/lib/apt/lists/*

COPY docker/oracle /tmp/oracle
RUN bash /tmp/oracle/install_oracle_client.sh && rm -rf /tmp/oracle

RUN corepack enable

WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
RUN pnpm dlx puppeteer browsers install chrome-headless-shell
COPY --from=pruner /app/out/full/ .
RUN pnpm --filter @hsm/worker build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:24-bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash libaio1 libnsl2 ca-certificates \
    fonts-liberation libatk-bridge2.0-0 libatk1.0-0 libcups2 \
    libdbus-1-3 libdrm2 libgbm1 libnspr4 libnss3 libx11-6 libxext6 \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/lib/oracle                 /usr/lib/oracle
RUN echo "/usr/lib/oracle/12.1/client64/lib" \
      > /etc/ld.so.conf.d/oracle-instantclient.conf && ldconfig

COPY --from=builder /root/.cache/puppeteer          /root/.cache/puppeteer
COPY --from=builder /app/node_modules               /app/node_modules
COPY --from=builder /app/apps/backend/worker/dist   /app/dist

WORKDIR /app
CMD ["node", "dist/main"]
