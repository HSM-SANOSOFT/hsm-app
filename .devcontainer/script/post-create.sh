#!/bin/sh
set -eu

pnpm install --force
pnpm dlx puppeteer browsers install chrome-headless-shell
