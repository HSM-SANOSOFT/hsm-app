#!/bin/sh
set -eu

"$(dirname "$0")/install-claude.sh"

pnpm install --force
pnpm dlx puppeteer browsers install chrome-headless-shell
