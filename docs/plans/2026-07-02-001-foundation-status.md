# Foundation status — live tracker

Canonical stage tracker for
[`2026-07-02-001-feat-standalone-pg-native-foundation-plan.md`](2026-07-02-001-feat-standalone-pg-native-foundation-plan.md)
(plan R5 / U5). Visual companion: [`docs/dashboards/foundation-status.html`](../dashboards/foundation-status.html).

**Update rule:** each unit's Verification step flips its row on merge. Manual-edit-on-merge
(matches `docs/roadmap/2026-06-26-hospital-platform-build-tracker.md`).

**Legend:** ☐ not-started · 🟡 in-progress · ⛔ blocked · 👀 in-review · ✅ done · ✔️ verified

_Last updated: 2026-07-02_

## This plan — units (W0)

| Unit | What | State |
|------|------|:-----:|
| U1 | Unwire Oracle datasource (keep files) | ☐ |
| U2 | Remove `DB_ORACLE_*` from config | ☐ |
| U3 | CI: API boots Oracle-free (+ redis/minio services) | ☐ |
| U4 | Land & activate release train | 🟡 |
| U5 | Progress tracking dashboard | ✅ |

**U4 notes:** rulesets applied (4 active); `required_approving_review_count` set to **0**
while solo (re-raise to 1 when a second reviewer exists). Back-merge PAT still to wire
(`GITHUB_TOKEN`-opened PRs don't trigger CI) — only matters after a stable `main` release.

## Roadmap — waves

| Wave | Subsystem | State |
|------|-----------|:-----:|
| W0 | Foundation (this plan) | 🟡 |
| W1 | Platform core (SIS/TIC shared services) | ☐ |
| W2 | HIS — clinical | ☐ |
| W3 | HAS — business/ERP | ☐ |
| W4 | SGI — governance | ☐ |
