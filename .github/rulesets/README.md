# GitHub rulesets — branch protection

Source of truth for branch protection. Applied with
[`scripts/apply-github-rulesets.sh`](../../scripts/apply-github-rulesets.sh) (needs repo-admin).

| File | Target | What it enforces |
|------|--------|------------------|
| `branch-main.json` | `main` | PR required (0 approvals while solo), linear history, no direct push / force-push / deletion |
| `branch-development.json` | `development` | same, for the default integration branch |

**Deliberately simple right now.** No required status checks — the CI pipelines are still being
reworked, so they run informationally and do **not** gate merges. Add a
`required_status_checks` rule (context `pr-gate`) back to each file once the pipelines are final.

**Model:** `development` is the default branch. Work on a personal branch (`feat/*`, `fix/*` —
unprotected, push freely) → PR into `development` → PR `development` → `main`. Direct pushes to
`main`/`development` are blocked; everything lands via PR.

Raise `required_approving_review_count` to `1` when a second reviewer exists.

## Applying

```bash
# from repo root, authenticated as a repo admin
./scripts/apply-github-rulesets.sh
```

Idempotent — updates a ruleset in place if one with the same name exists, else creates it.
