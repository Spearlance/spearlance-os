#!/usr/bin/env bash
# PostToolUse hook: enforces TDD commit order.
# After a Bash tool call that runs `git commit` with a feat: or fix: message,
# checks that a test: commit exists on the branch. If not, blocks with exit 2.
# Escape hatch: ARMADILLO_SKIP_TDD=1
# Matcher: Bash — fires on every Bash tool call (PostToolUse).

set -eu

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")

# Only care about git commit commands
case "$COMMAND" in
  *"git commit"*)
    ;;
  *)
    exit 0
    ;;
esac

# Extract commit message — check if it's a feat: or fix: commit
if ! echo "$COMMAND" | grep -qE '(feat|fix)(\([^)]*\))?!?:'; then
  exit 0
fi

# Escape hatch
if [ "${ARMADILLO_SKIP_TDD:-0}" = "1" ]; then
  exit 0
fi

# Check if any test: commit exists on this branch since diverging from main
BASE_SHA=$(git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null || echo "")
if [ -n "$BASE_SHA" ]; then
  TEST_COMMITS=$(git log "$BASE_SHA"..HEAD --oneline --grep="^test" 2>/dev/null | grep -E "^[a-f0-9]+ test[:(]" || echo "")
else
  TEST_COMMITS=$(git log -20 --oneline --grep="^test" 2>/dev/null | grep -E "^[a-f0-9]+ test[:(]" || echo "")
fi

if [ -z "$TEST_COMMITS" ]; then
  echo "TDD requires a test: commit before feat:/fix: commits. Write the failing test first, commit with 'test: ...' prefix, then implement." >&2
  exit 2
fi

exit 0
