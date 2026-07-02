# GitHub rulesets — branch & tag protection

Source of truth for repo protection, mirroring the ScoutSportTechnology pattern
(`sst-cam-proto` / `-firmware` / `-app`). Applied with
[`scripts/apply-github-rulesets.sh`](../../scripts/apply-github-rulesets.sh) (needs repo-admin).

| File | Ruleset | Target | Approvals | Required check |
|------|---------|--------|:---------:|----------------|
| `branch-main.json` | `main` | `refs/heads/main` | **1** | `pr-gate` |
| `branch-development.json` | `development` | `refs/heads/development` | 0 | `pr-gate` |
| `branch-release.json` | `release-branches` | `refs/heads/release/**` | 0 | `pr-gate` |
| `release-tags.json` | `Release Tags` | `refs/tags/v*` | — | — |

**Every ruleset bypasses for `OrganizationAdmin` (`always`)** — org admins can override, so a
solo maintainer is never deadlocked while normal contributors still go through PR + CI.

**Branch rules:** PR required, no direct push, no force-push, no deletion, `dismiss_stale_reviews_on_push`.
Status checks are **required but not strict** (`strict=false` → no rebase-up-to-date churn).
**No linear-history requirement** — merge/squash/rebase all allowed.

**Tags:** `v*` are immutable (no delete / update / force) and must match semver
`^v\d+\.\d+\.\d+(-…)?(\+…)?$`.

**Model:** personal branch (`feat/*`, `fix/*` — unprotected) → PR → `development` (default) →
PR → `main`; `release/**` for stabilization. The required `pr-gate` check comes from
`pr-validation.yml`; admins can bypass while the pipelines are still being finalized.

## Applying

```bash
# from repo root, authenticated as a repo admin
./scripts/apply-github-rulesets.sh
```

Idempotent — updates a ruleset in place if one with the same name exists, else creates it.
