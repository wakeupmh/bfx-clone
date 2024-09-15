#!/bin/bash

set -euxo pipefail

set -- node "$@" \
  "-b" "127.0.0.1" \
  "--dp" "$GRAPE_DP" \
  "--aph" "$GRAPE_APH" \
  "--bn" "$GRAPE_BIND:$GRAPE_BN"

exec "$@"
