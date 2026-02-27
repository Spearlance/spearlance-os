#!/usr/bin/env bash
# Stop hook — fires when Claude finishes responding.
# Blocks stopping when completion language detected — forces verification.
# Uses decision: "block" with reason per Claude Code Stop hook schema.

set -euo pipefail

INPUT="$(cat)"

# Guard: if stop_hook_active is true, exit immediately to prevent infinite loops
STOP_HOOK_ACTIVE="$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(str(d.get('stop_hook_active', False)).lower())" 2>/dev/null || echo "false")"

if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
  exit 0
fi

# Extract last_assistant_message
LAST_MSG="$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('last_assistant_message', ''))" 2>/dev/null || echo "")"

# Normalize to lowercase for matching
LOWER_MSG="$(echo "$LAST_MSG" | tr '[:upper:]' '[:lower:]')"

# Check for completion-like phrases
COMPLETION_DETECTED=false
PATTERNS=(
  "done"
  "complete"
  "completed"
  "finished"
  "shipped"
  "merged"
  "all tests pass"
  "tests pass"
  "ahh, that felt good"
)

for PATTERN in "${PATTERNS[@]}"; do
  if echo "$LOWER_MSG" | grep -qF "$PATTERN"; then
    COMPLETION_DETECTED=true
    break
  fi
done

if [ "$COMPLETION_DETECTED" = "true" ]; then
  printf '{"decision": "block", "reason": "Verification reminder: Before claiming completion, confirm tests pass and no regressions introduced. Use verification-before-completion skill if applicable."}\n'
fi

exit 0
