#!/bin/sh
set -eu

"$(dirname "$0")/get-secrets-infisical.sh"
"$(dirname "$0")/setup-claude.sh"

echo "Post-start script executed successfully."
