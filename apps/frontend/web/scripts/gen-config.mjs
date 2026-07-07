// Generates the runtime config.json the app fetches at bootstrap, from WEB_*
// environment variables (Infisical-injected via the container env). Runs at
// container start (prod) and predev (dev). Env change -> re-run -> new config,
// no rebuild.
//
// Usage: node scripts/gen-config.mjs [outputPath]
//   dev:  node scripts/gen-config.mjs public/config.json
//   prod: node scripts/gen-config.mjs dist/config.json   (in the image entrypoint)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const out = process.argv[2] ?? 'public/config.json';

const config = {
  apiBaseUrl: process.env.WEB_API_BASE_URL ?? 'http://localhost:4201/v1',
  appVersion: process.env.WEB_APP_VERSION ?? 'dev',
  production: (process.env.WEB_PRODUCTION ?? 'false').toLowerCase() === 'true',
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(config, null, 2)}\n`);
// biome-ignore lint/suspicious/noConsole: build/entrypoint tool output
console.log(`[gen-config] wrote ${out}`, config);
