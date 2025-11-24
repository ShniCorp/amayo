#!/usr/bin/env bash
# Small wrapper to run the collab test only when COLLAB_TEST=1 is set.
set -euo pipefail

if [ "${COLLAB_TEST:-0}" != "1" ]; then
  echo "This test is for collaborators only. Set COLLAB_TEST=1 to run it."
  echo "Example: COLLAB_TEST=1 ./scripts/collab-tests/dashboard/run.sh"
  exit 1
fi

node ./scripts/collab-tests/dashboard/check_dashboard_render.js
