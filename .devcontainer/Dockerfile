FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    git \
    curl \
    unzip \
    libaio1 \
    libnsl2 \
    ca-certificates \
    gnupg \
    fonts-liberation \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    python3 \
    python3-pip \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libnspr4 \
    libnss3 \
    libx11-6 \
    libxext6 \
  && rm -rf /var/lib/apt/lists/*

# Infisical CLI — https://infisical.com/docs/cli/overview#debianubuntu
RUN curl -1sLf 'https://artifacts-cli.infisical.com/setup.deb.sh' | bash \
  && apt-get update \
  && apt-get install -y --no-install-recommends infisical \
  && rm -rf /var/lib/apt/lists/*

COPY docker/oracle /tmp/oracle
RUN bash /tmp/oracle/install_oracle_client.sh && rm -rf /tmp/oracle

ARG USER_UID=1000
ARG USER_GID=1000

RUN if getent group ${USER_GID} >/dev/null 2>&1; then \
      groupmod -n vscode $(getent group ${USER_GID} | cut -d: -f1); \
    else \
      groupadd --gid ${USER_GID} vscode; \
    fi \
  && if getent passwd ${USER_UID} >/dev/null 2>&1; then \
      usermod -l vscode -d /home/vscode -m $(getent passwd ${USER_UID} | cut -d: -f1); \
    else \
      useradd --uid ${USER_UID} --gid ${USER_GID} -m --shell /bin/bash vscode; \
    fi

ENV PATH="/home/vscode/.local/bin:${PATH}"

RUN corepack enable

RUN mkdir -p /home/vscode/.claude && chown -R vscode:vscode /home/vscode/.claude

WORKDIR /workspace
RUN chown vscode:vscode /workspace

