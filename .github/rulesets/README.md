# GitHub rulesets — release-train enforcement

These JSON files are the **source of truth** for branch/tag protection that enforces
the release strategy in
[`docs/brainstorms/2026-07-02-legacy-oracle-coexistence-requirements.md`](../../docs/brainstorms/2026-07-02-legacy-oracle-coexistence-requirements.md) §6–7.

| File | Target | What it enforces |
|------|--------|------------------|
| `branch-main.json` | `main` | PR required (**0 approvals while solo** — raise to 1 when a second reviewer exists), `pr-gate` status check, linear history, no direct push / force-push / deletion |
| `branch-development.json` | `development` | same, for the alpha integration branch |
| `branch-release.json` | `release/**` | same, for beta stabilization branches |
| `tags-immutable.json` | `v*` tags | no deletion, no force-update (release tags are immutable) |

**No `bypass_actors`** — automation goes through PRs too. The release-tag workflow
only *creates* tags (allowed); the back-merge workflow opens a *PR* into
`development` (allowed). Nothing pushes a protected branch directly.

## The "no direct push" rule

The `pull_request` rule on each protected branch means every change must arrive via a
merged PR. Personal branches (`feat/*`, `fix/*`, …) are unmatched by any ruleset, so
developers push those freely — exactly the intended model.

## The "main only from release/\*" rule

GitHub rulesets can't restrict a PR's *source* branch, so that rule is enforced in CI
by the `branch-policy` job in `pr-validation.yml`, which fails a PR into `main` whose
head isn't `release/*` (or `hotfix/*`). `branch-policy` feeds `pr-gate`, the required
check.

## Applying

```bash
# from repo root, authenticated as a repo admin
./scripts/apply-github-rulesets.sh
```

The script is idempotent — it updates a ruleset in place if one with the same name
already exists, otherwise creates it. Edit the JSON and re-run to change protection.
