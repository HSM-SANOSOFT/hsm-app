# CLAUDE.md — `@hsm/web`

Angular web app. **Not yet initialized** — `package.json` is a placeholder.

## Status

The workspace slot exists so Turborepo and pnpm pick it up, but there is no Angular project here yet. `build` and `dev` scripts just print TODOs.

## When initializing

- Use Angular (called out in repo-root `CLAUDE.md`).
- Keep the package name `@hsm/web` and the workspace path `apps/frontend/web`.
- Talk to the API at host port **10001** in dev (`/v1/...` routes, Swagger at `/api`).
- Do not bypass the global response wrapper — expect every successful API body as `SuccessResponseDto` and every error as `ErrorResponseDto`.
- Reuse shared DTOs/enums from `@hsm/common` instead of duplicating types.
- Lint/format with the repo's Biome config (single quotes, 2-space indent, trailing commas) — don't introduce ESLint or Prettier.

Update this file once the app is scaffolded.
