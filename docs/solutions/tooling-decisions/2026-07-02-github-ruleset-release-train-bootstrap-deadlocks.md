---
title: GitHub rulesets for a release-train — bootstrap deadlocks and the admin-bypass pattern
date: 2026-07-02
category: docs/solutions/tooling-decisions
module: github-repository-governance
problem_type: tooling_decision
component: tooling
severity: high
related_components:
  - development_workflow
applies_when:
  - "Configuring GitHub branch or tag rulesets on a solo or small-team repo"
  - "A required status check blocks even creating a protected branch"
  - "A workflow opens PRs with GITHUB_TOKEN and required checks never report"
  - "Adopting a release-train branch model (development / release / main)"
  - "CI pipelines are not finalized but you still want branch protection on"
tags:
  - github-rulesets
  - branch-protection
  - release-train
  - bypass-actors
  - required-status-checks
  - tag-ruleset
  - solo-repo
  - ci-gating
---

# GitHub rulesets for a release-train — bootstrap deadlocks and the admin-bypass pattern

## Context

`HSM-SANOSOFT/hsm-app` adopted a release-train branch model (`development` → `release/**` →
`main`, immutable `v*` tags) enforced with GitHub **repository rulesets** (`gh api
repos/OWNER/REPO/rulesets`) rather than legacy branch protection — rulesets are declarative
JSON, versionable in-repo, and layer per ref pattern.

The first-cut rulesets **deadlocked a solo maintainer** and even blocked branch creation. Five
GitHub behaviors — each real and reproducible, none an obvious config typo — produced hard
blocks with no error-time explanation:

1. **Self-approval deadlock.** A `pull_request` rule with `required_approving_review_count: 1`
   and empty `bypass_actors` means a solo maintainer can never merge anything — GitHub forbids
   approving your own PR, so the count is unsatisfiable. The PR sits green-but-unmergeable.
2. **Required status checks block branch _creation_.** A `required_status_checks` rule (e.g.
   context `pr-gate`) rejects even *creating* a matching protected branch by push:
   `remote: - Required status check "pr-gate" is expected.` The new ref has no passing check
   yet, so `git push -u origin development` fails *before the branch exists*.
3. **`GITHUB_TOKEN`-opened PRs don't trigger CI.** A workflow that opens a PR with
   `${{ github.token }}` does **not** trigger `pull_request`-triggered workflows (GitHub's
   loop-prevention). The required `pr-gate` check never reports → the PR is permanently
   unmergeable. (This is why an auto back-merge PR deadlocks.)
4. **`required_linear_history` rule ≠ repo setting.** The `required_linear_history` *rule*
   produces `GraphQL: Merge commits are not allowed on this repository` even when the repo's
   `allow_merge_commit: true`. The rule silently wins over the repo setting.
5. **`release-tag.yml` on `push:` fires on every push.** A release/tag workflow triggered on
   `push:` cuts a release on *every* push — including routine branch syncs — spraying stray
   tags (`v0.0.1`, `v0.0.1-alpha.2`, …).

## Guidance

Adopt the **ScoutSportTechnology pattern** (used across `sst-cam-proto` / `-firmware` /
`-app`): four rulesets per repo, and **an OrganizationAdmin bypass on every one of them**. That
single choice dissolves gotchas 1–3 — admins override the gate, contributors stay gated.

**The four rulesets:**

- **`development`** (`refs/heads/development`): `pull_request` `required_approving_review_count: 0`,
  `dismiss_stale_reviews_on_push: true`, `allowed_merge_methods: [merge, squash, rebase]`;
  `required_status_checks` `strict_required_status_checks_policy: false` context `pr-gate`;
  plus `deletion` and `non_fast_forward`.
- **`main`** (`refs/heads/main`): identical, but `required_approving_review_count: 1`.
- **`release-branches`** (`refs/heads/release/**`): 0 approvals + required checks.
- **`Release Tags`** (tag, `refs/tags/v*`): `deletion` + `update` + `non_fast_forward` +
  `tag_name_pattern` semver regex → immutable, semver-only tags.

**On every ruleset:**

```json
"bypass_actors": [
  { "actor_id": 1, "actor_type": "OrganizationAdmin", "bypass_mode": "always" }
]
```

It **reads back as `actor_id: null`** — expected, not drift. Don't "fix" it on re-apply.

**Deliberate omissions / settings:**

- **No `required_linear_history` rule** (gotcha 4) — so merge commits stay allowed. Keep
  `allow_merge_commit: true` at the repo level.
- **`strict_required_status_checks_policy: false`** — CI is required but branches need not be
  up-to-date before merge (no rebase-up-to-date churn).
- To avoid the branch-creation block (gotcha 2), prefer
  **`do_not_enforce_on_create: true`** on the `required_status_checks` rule; if you didn't set
  that, use the disable → push → re-enable workaround (see Examples).
- CI that opens PRs (gotcha 3) must use a **PAT / GitHub App token**, not `${{ github.token }}`
  — or rely on the admin bypass to merge.
- Trigger release/tag workflows deliberately and add **`paths-ignore: ['.github/**']`** so
  `.github`-only pushes/merges (e.g. syncing `main` ↔ `development`) skip pipelines.

**Apply idempotently:** one JSON file per ruleset under `.github/rulesets/`, plus an
`apply-github-rulesets.sh` loop (POST to create, PUT by id to update).

## Why This Matters

Every gotcha turns a reasonable-looking config into a block with no error-time cause:

- Gotcha 1 hides the reason (GitHub silently disallows self-approval) behind an unsatisfiable
  "1 approval required."
- Gotcha 2 fails the push *before the branch exists*, so people assume the ruleset is broken,
  not that it's working too early.
- Gotcha 3 is the worst: everything looks correct; the PR just never becomes mergeable because
  a check that was never invoked can't turn green.
- Gotcha 4 makes `allow_merge_commit: true` look like a lie.
- Gotcha 5 ships accidental releases from routine syncs.

The **admin-bypass-on-every-ruleset** decision is load-bearing: it keeps the maintainer
unblocked while contributors still go through PR + CI. That is exactly what you want on a solo
or small-team repo, and especially when CI isn't finalized — the gate exists but never traps
the person who has to ship.

## When to Apply

- Setting up branch/tag protection on any GitHub repo via rulesets.
- Solo or small-team repos where one maintainer must merge without a second approver.
- Repos where CI pipelines aren't final — the admin bypass keeps you unblocked while checks
  stabilize.
- Release-train / GitFlow-ish models needing per-ref-pattern enforcement.
- Any repo where automation opens PRs and you've hit the `github.token`-doesn't-trigger-CI wall.

## Examples

**Idempotent apply loop** (`scripts/apply-github-rulesets.sh`):

```bash
#!/usr/bin/env bash
set -euo pipefail
REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
existing="$(gh api "repos/$REPO/rulesets" --paginate)"
for f in "$(dirname "$0")/../.github/rulesets"/*.json; do
  name="$(jq -r .name "$f")"
  id="$(echo "$existing" | jq -r --arg n "$name" '.[]|select(.name==$n)|.id' | head -1)"
  if [ -n "$id" ] && [ "$id" != "null" ]; then
    gh api --method PUT  "repos/$REPO/rulesets/$id" --input "$f" >/dev/null   # update
  else
    gh api --method POST "repos/$REPO/rulesets"     --input "$f" >/dev/null   # create
  fi
done
```

**`development` ruleset** (`.github/rulesets/branch-development.json`) — `main` is the same with
`"required_approving_review_count": 1` and `refs/heads/main`:

```json
{
  "name": "development",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/development"], "exclude": [] } },
  "bypass_actors": [
    { "actor_id": 1, "actor_type": "OrganizationAdmin", "bypass_mode": "always" }
  ],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": true,
        "allowed_merge_methods": ["merge", "squash", "rebase"]
    }},
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": false,
        "do_not_enforce_on_create": true,
        "required_status_checks": [{ "context": "pr-gate" }]
    }}
  ]
}
```

**`Release Tags` ruleset** (`.github/rulesets/release-tags.json`) — immutable semver tags:

```json
{
  "name": "Release Tags",
  "target": "tag",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/tags/v*"], "exclude": [] } },
  "bypass_actors": [
    { "actor_id": 1, "actor_type": "OrganizationAdmin", "bypass_mode": "always" }
  ],
  "rules": [
    { "type": "deletion" },
    { "type": "update" },
    { "type": "non_fast_forward" },
    { "type": "tag_name_pattern", "parameters": {
        "operator": "regex", "negate": false, "name": "semver",
        "pattern": "^v\\d+\\.\\d+\\.\\d+(-[0-9A-Za-z.-]+)?(\\+[0-9A-Za-z.-]+)?$"
    }}
  ]
}
```

**Branch-creation workaround** (gotcha 2, if `do_not_enforce_on_create` wasn't set) — disable,
push, re-enable:

```bash
ID=$(gh api repos/OWNER/REPO/rulesets --jq '.[]|select(.name=="development").id')
jq '.enforcement="disabled"' .github/rulesets/branch-development.json \
  | gh api --method PUT repos/OWNER/REPO/rulesets/$ID --input -
git push -u origin development
gh api --method PUT repos/OWNER/REPO/rulesets/$ID --input .github/rulesets/branch-development.json
```

**Verifying admin bypass works** — a direct push to a protected branch prints the required-check
warning but still lands, because OrganizationAdmin bypasses:

```
remote: - Required status check "pr-gate" is expected.
   14e92c2..660ee99  development -> development
```

**Pipeline hygiene** (gotcha 5) — skip release/deploy on `.github`-only changes:

```yaml
on:
  push:
    branches: [main]
    paths-ignore: [".github/**"]
```

## Related

- Design origin (predates the final pattern):
  `docs/brainstorms/2026-07-02-legacy-oracle-coexistence-requirements.md` §6–7. Note its
  "at least one approval" on all protected branches was superseded — the final pattern keeps
  `main` at 1 approval but `development`/`release` at 0 (admins bypass either way).
- Plan + status: `docs/plans/2026-07-02-001-feat-standalone-pg-native-foundation-plan.md` (U4),
  `docs/plans/2026-07-02-001-foundation-status.md`.
- Live source of truth: `.github/rulesets/*.json` + `.github/rulesets/README.md` +
  `scripts/apply-github-rulesets.sh`.
- Pattern reference: ScoutSportTechnology repos `sst-cam-proto` / `-firmware` / `-app`.
