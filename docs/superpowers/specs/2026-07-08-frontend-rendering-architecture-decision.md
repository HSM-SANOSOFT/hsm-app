---
title: Frontend rendering architecture — client SPA vs server-side (decision input)
date: 2026-07-08
status: open — deferred to a dedicated brainstorm
module: apps/frontend/web
tags: [architecture, frontend, ssr, config, angular]
problem_type: architecture-decision
---

# Frontend rendering architecture: client SPA vs server-side

> **Status:** OPEN. This document is **input for a future brainstorm**, not a
> decision. It captures why the question came up, the facts that constrain it,
> and the options — so the brainstorm starts from context instead of scratch.

## How we got here

While making `@hsm/web` config env-driven (like the backend), we hit friction:
the browser has **no `process.env`**. To feed the API URL to the app we added a
runtime `config.json` (written from env at container start, fetched at boot) plus
a build-time `version.json` (git SHA). That works, but it felt like fighting the
platform — generator scripts, two fetched files, an app-initializer.

The realization: **the friction is a symptom of a client-side design.** The code
runs on the user's device, so config, versioning, and compute all have to be
shipped or fetched to a machine we don't control. The stated preference is the
opposite — **infrastructure should drive the app, not the client** — because we
can size/standardize server resources but not the client's device.

## Key facts (clear up the misconception)

- **No browser framework reads `process.env` at runtime.** Not Next.js, Vite,
  Vue, or Svelte. What they do is **build-time injection**: at build they read
  `.env` and string-replace values into the bundle (`import.meta.env.VITE_*`,
  `process.env.NEXT_PUBLIC_*`). To change a value you **rebuild**.
- **Angular can do the same build-time `.env` baking** — it just lacks the sugar
  by default. `@ngx-env/builder` gives `import.meta.env.NG_APP_*` from `.env`
  (Vite-like), or Angular's native `define`. So "Angular can't use `.env`" is a
  DX gap, not a capability gap.
- **Runtime swap without rebuild** (one image → many environments) requires a
  runtime-config pattern (our `config.json`) in **any** SPA framework. No
  framework gives that for free.
- **Angular is not client-only.** `@angular/ssr` renders on a Node server that
  *has* `process.env`; config is read server-side and passed to the client via
  transfer state — no `config.json`. Angular 19+ adds incremental hydration and
  server routes, moving toward server-driven.

## Options (the real decision)

| Option | Server-driven? | Env config | Keep Angular? | Cost |
|---|---|---|---|---|
| Angular SPA + `config.json` (current) | no — client | runtime file | yes | done |
| **Angular SSR** (`@angular/ssr`) | yes — server renders, client hydrates | server env, native | yes | moderate: add SSR server |
| Next.js / RSC | yes — server components | server env, native | no (React) | rewrite, less NestJS-like |
| Thin client (Nest + HTMX/templates) | most | server env, native | no SPA | biggest rethink |

**Leaning:** Angular SSR — it removes the env/config friction (server has env),
moves compute to controlled infrastructure, and keeps the Angular ↔ NestJS
symmetry the team values. To be confirmed in brainstorm.

## Requirements / constraints surfaced (carry into brainstorm)

- **API base URL = host only** (e.g. `http://localhost:4201`); the **version is
  per-endpoint** (`/v1`, `/v2` chosen per call) — the app may hit multiple API
  versions. (The current `config.json` bakes `/v1` into the base — wrong.)
- **UI version comes from an endpoint/file (git SHA at build)**, NOT an env var —
  symmetric with the API's `/v1/health/version`. (`WEB_APP_VERSION` env was wrong.)
- `WEB_PRODUCTION` env is unused (service-worker toggle uses `!isDevMode()`) — drop it.
- Infrastructure drives config/resources; client stays thin. Predictable across
  varied client devices.
- Keep Angular's structure + NestJS similarity if possible.

## Open questions for the brainstorm

- SEO / first-paint requirements? (drives SSR vs SPA)
- Client device constraints (low-end hospital hardware)? offline / PWA needs?
- Deploy model: one image → many envs (runtime config) vs build-per-env (baked)?
- Auth/session model under SSR (cookies vs tokens, server-side guards)?
- Team appetite for React (Next) vs staying Angular?
- Migration cost: SSR-ify the existing app vs rebuild.

## Current state of the config work (context for whoever picks this up)

- **Landed** (feature branch → development): backend `@hsm/config` per-app split
  (`@hsm/config` = base, `/api`, `/worker`) and the frontend runtime `config.json`
  + `ConfigService` + Transloco i18n. Tested: api 391, worker 64, web 264.
- **Discarded uncommitted:** a half-done rework (apiBaseUrl → host-only,
  version-per-endpoint, drop `WEB_PRODUCTION`, `version.json`) — left broken and
  superseded by whatever this brainstorm decides. Its *intent* is captured in the
  requirements above.
