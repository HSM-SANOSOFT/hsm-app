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
| U1 | Unwire Oracle datasource (keep files) | 👀 |
| U2 | Remove `DB_ORACLE_*` from config | 👀 |
| U3 | CI: API boots Oracle-free (+ redis/minio) | 👀 |
| U4 | Land & activate release train | ✅ |
| U5 | Progress tracking dashboard | ✅ |

**U1–U3 notes:** implemented on `feat/pg-native-foundation` (commits `246c576`,
`4e44e10`, `e5898b7`); backend unit suites green (api 380/380) and api+worker build
Oracle-free. In review via PR into `development` — flip each to ✔️ once `pr-gate`
(incl. the now-gated `integration-tests` Oracle-free boot job) is green on merge.
Full host-side e2e boot was not reproducible off the dev container (workspace/deps
resolution), so the CI `integration-tests` job is the authoritative boot gate.

**U4 notes:** rulesets applied (4 active); `required_approving_review_count` set to **0**
while solo (re-raise to 1 when a second reviewer exists). Auto-firing `release-tag` /
`back-merge` workflows were intentionally dropped (`14e92c2`); re-add with a PAT when a
stable `main` release cadence begins.

## Roadmap — waves

| Wave | Subsystem | State |
|------|-----------|:-----:|
| W0 | Foundation (this plan) | 🟡 |
| W1 | Platform core (SIS/TIC shared services) | ☐ |
| W2 | HIS — clinical | ☐ |
| W3 | HAS — business/ERP | ☐ |
| W4 | SGI — governance | ☐ |
