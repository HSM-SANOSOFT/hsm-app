#!/bin/sh
set -eu

echo "Logging in to Infisical and fetching secrets..."

INFISICAL_TOKEN=$(infisical login \
  --method=universal-auth \
  --client-id="$INFISICAL_MACHINE_CLIENT_ID" \
  --client-secret="$INFISICAL_MACHINE_CLIENT_SECRET" \
  --plain --silent)

SECRETS_DOTENV=$(infisical export \
  --token "$INFISICAL_TOKEN" \
  --projectId "$PROJECT_ID" \
  --domain "$INFISICAL_API_URL" \
  --path "$SECRET_PATH" \
  --env dev \
  --format dotenv)

WORKSPACE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# @hsm/config does `import 'dotenv/config'`, which reads .env from process.cwd().
# pnpm -F runs scripts from each app's package dir, so write per-app .env files.
printf '%s\n' "$SECRETS_DOTENV" > "$WORKSPACE_DIR/apps/backend/api/.env"
printf '%s\n' "$SECRETS_DOTENV" > "$WORKSPACE_DIR/apps/backend/worker/.env"

echo "Wrote $WORKSPACE_DIR/apps/backend/api/.env"
echo "Wrote $WORKSPACE_DIR/apps/backend/worker/.env"
echo "Restart your dev server to pick up changes."
