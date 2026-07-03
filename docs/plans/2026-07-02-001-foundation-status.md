# Foundation status — live tracker

Canonical stage tracker for
[`2026-07-02-001-feat-standalone-pg-native-foundation-plan.md`](2026-07-02-001-feat-standalone-pg-native-foundation-plan.md)
(plan R5 / U5). Visual companion: [`docs/dashboards/foundation-status.html`](../dashboards/foundation-status.html).

**Update rule:** each unit's Verification step flips its row on merge. Manual-edit-on-merge
(matches `docs/roadmap/2026-06-26-hospital-platform-build-tracker.md`).

**Legend:** ☐ not-started · 🟡 in-progress · ⛔ blocked · 👀 in-review · ✅ done · ✔️ verified

_Last updated: 2026-07-03_

## This plan — units (W0)

| Unit | What | State |
|------|------|:-----:|
| U1 | Unwire Oracle datasource (keep files) | ✔️ |
| U2 | Remove `DB_ORACLE_*` from config | ✔️ |
| U3 | CI: API boots Oracle-free (+ redis/minio) | ✔️ |
| U4 | Land & activate release train | ✔️ |
| U5 | Progress tracking dashboard | ✅ |

**U1–U3:** implemented on `feat/pg-native-foundation` (PR #12 into `development`) and
**CI-verified** — `pr-validation` is fully green for the first time: `branch-policy`,
`lint`, `build`, `unit-tests`, and `integration-tests` (the gated Oracle-free boot job,
booting api+worker against postgres+redis+minio with no Oracle) all pass, so `pr-gate`
is green. Backend unit suites 380/380 (api) + 64/64 (worker).

**U4 — release train now proven enforcing.** Getting a green `pr-gate` required fixing
the release-train CI, which had never run green: `@types/node`+`multer` missing at root
(every `tsc` build failed `TS2688`) → added as root devDeps; `pnpm/action-setup version:10`
vs `packageManager pnpm@11.9.0` conflict → dropped the override; pre-existing biome lint
errors; worker had no jest `test-setup` (unit tests only passed locally via `.env`); the
e2e configs lacked the `@hsm/*` `moduleNameMapper` and asserted a stale `GET /` route.
Rulesets applied (4 active); `required_approving_review_count` **0** while solo (raise to 1
with a second reviewer). Auto-firing `release-tag`/`back-merge` intentionally dropped
(`14e92c2`) — re-add with a PAT at stable-release cadence.

## Roadmap — waves

| Wave | Subsystem | State |
|------|-----------|:-----:|
| W0 | Foundation (this plan) | 👀 |
| W1 | Platform core (SIS/TIC shared services) | ☐ |
| W2 | HIS — clinical | ☐ |
| W3 | HAS — business/ERP | ☐ |
| W4 | SGI — governance | ☐ |
