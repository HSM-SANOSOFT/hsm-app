#!/bin/sh
set -eu

# Node is provided by the base image (node:24-bookworm-slim) — no install needed.

# --- Python ---
if ! command -v python3 >/dev/null 2>&1; then
  echo "[install] python3 not found — installing..."
  apt-get update -qq && apt-get install -y --no-install-recommends python3 python3-pip
  echo "[install] python3 installed."
else
  echo "[install] python3 ok ($(python3 --version))"
fi

# --- Claude Code ---
if ! command -v claude >/dev/null 2>&1; then
  echo "[install] claude not found — installing..."
  npm install -g @anthropic-ai/claude-code
  echo "[install] claude installed."
else
  echo "[install] claude ok ($(claude --version 2>/dev/null || echo 'unknown version'))"
fi
