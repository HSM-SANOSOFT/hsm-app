# Build context: monorepo root

FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash git curl unzip libaio1 libnsl2 ca-certificates gnupg \
    fonts-liberation libatk-bridge2.0-0 libatk1.0-0 libcups2 \
    libdbus-1-3 libdrm2 libgbm1 libnspr4 libnss3 libx11-6 libxext6 \
  && rm -rf /var/lib/apt/lists/*

# Infisical CLI — https://infisical.com/docs/cli/overview#debianubuntu
RUN curl -1sLf 'https://artifacts-cli.infisical.com/setup.deb.sh' | bash \
  && apt-get update \
  && apt-get install -y --no-install-recommends infisical \
  && rm -rf /var/lib/apt/lists/*

COPY docker/oracle /tmp/oracle
RUN bash /tmp/oracle/install_oracle_client.sh && rm -rf /tmp/oracle

COPY .devcontainer/script/install-claude.sh /tmp/install-claude.sh
RUN bash /tmp/install-claude.sh && rm /tmp/install-claude.sh

ENV PATH="/root/.local/bin:${PATH}"

RUN corepack enable
