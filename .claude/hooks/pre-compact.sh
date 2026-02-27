#!/usr/bin/env bash
# PreCompact hook — saves context summary before automatic compaction
# This ensures critical state (current task, branch, recent decisions) survives compaction.
# Also preserves runtime context (SWARM-STATE.md, error-log, progress) as snapshot files.

set -euo pipefail

ARMADILLO_DIR="$CLAUDE_PROJECT_DIR/.claude"
PROJECT_ROOT="$(git -C "$ARMADILLO_DIR" rev-parse --show-toplevel 2>/dev/null || echo "$CLAUDE_PROJECT_DIR")"
source "$ARMADILLO_DIR/hooks/lib/json-escape.sh"

DATE=$(date +%Y%m%d-%H%M%S)
SNAPSHOT_DIR="${ARMADILLO_DIR}/progress/snapshots"

# Preserve runtime context/ snapshots if directory exists
if [ -d "${ARMADILLO_DIR}/context" ]; then
    mkdir -p "$SNAPSHOT_DIR"

    # Preserve SWARM-STATE.md (agent coordination)
    if [ -f "${ARMADILLO_DIR}/context/SWARM-STATE.md" ]; then
        cp "${ARMADILLO_DIR}/context/SWARM-STATE.md" \
           "${SNAPSHOT_DIR}/swarm-state-pre-compact-${DATE}.md"
    fi

    # Preserve error log — last 50 lines only
    if [ -f "${ARMADILLO_DIR}/context/error-log.txt" ]; then
        tail -50 "${ARMADILLO_DIR}/context/error-log.txt" \
            > "${SNAPSHOT_DIR}/error-log-pre-compact-${DATE}.txt"
    fi
fi

# Preserve progress.txt if it exists
if [ -f "${ARMADILLO_DIR}/progress/progress.txt" ]; then
    mkdir -p "$SNAPSHOT_DIR"
    cp "${ARMADILLO_DIR}/progress/progress.txt" \
       "${SNAPSHOT_DIR}/progress-pre-compact-${DATE}.txt"
fi

# Save recent git log for context continuity
git -C "$PROJECT_ROOT" log --oneline -10 \
    > "${SNAPSHOT_DIR}/git-log-pre-compact-${DATE}.txt" 2>/dev/null || true

# Gather current context for JSON output
branch=$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
recent_commits=$(git -C "$PROJECT_ROOT" log --oneline -5 2>/dev/null || echo "none")
recent_commits_escaped=$(escape_for_json "$recent_commits")

# Inject SWARM-STATE.md summary into compaction context if it exists
swarm_context=""
if [ -f "${ARMADILLO_DIR}/context/SWARM-STATE.md" ]; then
    swarm_raw=$(head -30 "${ARMADILLO_DIR}/context/SWARM-STATE.md" 2>/dev/null || true)
    swarm_escaped=$(escape_for_json "$swarm_raw")
    swarm_context="\\n\\nActive SWARM-STATE (agent coordination — top 30 lines):\\n${swarm_escaped}"
fi

cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreCompact",
    "additionalContext": "Pre-compaction snapshot saved.\\nBranch: ${branch}\\nRecent commits:\\n${recent_commits_escaped}${swarm_context}\\n\\nReminder: After compaction, check TaskList for current progress and read any in-progress task descriptions before continuing work."
  }
}
EOF

exit 0
