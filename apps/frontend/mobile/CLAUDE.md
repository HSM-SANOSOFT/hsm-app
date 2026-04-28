# CLAUDE.md — `@hsm/mobile`

Mobile app. **Not yet initialized** — `package.json` is a placeholder.

## Status

Workspace slot only. No framework picked yet (root `CLAUDE.md` just says "Mobile (not yet initialized)"). `build` and `dev` scripts print TODOs.

## When initializing

- Confirm the framework choice with the user before scaffolding (e.g. React Native, Ionic, NativeScript, Flutter-via-pnpm-workspace, etc.) — the repo doesn't pin one yet.
- Keep the package name `@hsm/mobile` and the workspace path `apps/frontend/mobile`.
- Point at the API the same way the web app does — base URL configurable, dev defaults to host port **10001**.
- Reuse `@hsm/common` for DTOs/enums instead of redefining them.
- Lint/format with the repo's Biome config — don't add ESLint/Prettier.

Update this file once the app is scaffolded.
