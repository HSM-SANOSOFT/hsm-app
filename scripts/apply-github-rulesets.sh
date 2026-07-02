#!/usr/bin/env bash
# Apply (create or update) the GitHub repository rulesets in .github/rulesets/*.json.
# Idempotent: matches an existing ruleset by `name` and PUTs it, else POSTs a new one.
#
# Requires: gh CLI authenticated as a repo admin (token scope: repo).
# Usage:    ./scripts/apply-github-rulesets.sh [owner/repo]
#           (defaults to the current repo's origin)
set -euo pipefail

REPO="${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.github/rulesets" && pwd)"

echo "Applying rulesets to: $REPO"
echo "From: $DIR"
echo

# Map of existing ruleset name -> id
existing_json="$(gh api "repos/$REPO/rulesets" --paginate)"

for f in "$DIR"/*.json; do
  name="$(jq -r .name "$f")"
  id="$(echo "$existing_json" | jq -r --arg n "$name" '.[] | select(.name==$n) | .id' | head -1)"

  if [ -n "$id" ] && [ "$id" != "null" ]; then
    echo "↻ updating '$name' (id $id)"
    gh api --method PUT "repos/$REPO/rulesets/$id" --input "$f" >/dev/null
  else
    echo "＋ creating '$name'"
    gh api --method POST "repos/$REPO/rulesets" --input "$f" >/dev/null
  fi
done

echo
echo "Done. Current rulesets:"
gh api "repos/$REPO/rulesets" --jq '.[] | "  - \(.name)  [\(.target), \(.enforcement)]"'
