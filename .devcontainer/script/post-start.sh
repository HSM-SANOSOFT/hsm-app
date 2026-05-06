#!/bin/sh
set -eu

"$(dirname "$0")/get-secrets-infisical.sh"

echo "Post-start script executed successfully."
