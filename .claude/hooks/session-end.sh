#!/usr/bin/env bash
# SessionEnd hook for armadillo
# Fires when a session terminates. No decision control — used for cleanup only.

set -euo pipefail

# ── 1. Clean up /tmp/.armadillo-* flag files ────────────────────────────────
rm -f \
  /tmp/.armadillo-no-skill-yet \
  /tmp/.armadillo-skill-reminder-shown \
  /tmp/.armadillo-debug-session \
  /tmp/.armadillo-tests-failing

# ── 2. Rotate old pre-compact snapshots ─────────────────────────────────────
SNAPSHOTS_DIR="${CLAUDE_PROJECT_DIR:-}/.claude/progress/snapshots"

if [ -d "$SNAPSHOTS_DIR" ]; then
  KEEP=10

  for prefix in swarm-state error-log progress git-log; do
    # List files matching this prefix, sorted newest first (by modification time)
    mapfile -t files < <(ls -t "$SNAPSHOTS_DIR"/${prefix}-* 2>/dev/null || true)

    count=${#files[@]}
    if [ "$count" -gt "$KEEP" ]; then
      # Delete everything after the 10th entry
      for file in "${files[@]:$KEEP}"; do
        rm -f "$file"
      done
    fi
  done
fi

exit 0
