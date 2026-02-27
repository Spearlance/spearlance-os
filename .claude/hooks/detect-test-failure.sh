#\!/usr/bin/env bash
# PostToolUse hook: detects test command failures and sets a flag.
# Matcher: Bash -- fires on every Bash tool call.
# When a test command produces failure output, sets .claude/context/.tests-failing.
# The systematic-debugging skill clears this flag.

set -euo pipefail

ARMADILLO_DIR="$CLAUDE_PROJECT_DIR/.claude"

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null) || COMMAND=""
RESULT=$(echo "$INPUT" | jq -r '.tool_result // empty' 2>/dev/null) || RESULT=""

# Only care about test runner commands
is_test_command=false
case "$COMMAND" in
  *"npm test"*|*"npm run test"*|*"node --test"*|*"vitest"*|*"jest"*|*"pytest"*|*"cargo test"*|*"go test"*|*"make test"*)
    is_test_command=true
    ;;
esac

if [ "$is_test_command" = false ]; then
  exit 0
fi

FLAG="${ARMADILLO_DIR}/context/.tests-failing"

# Detect pass vs fail by checking for non-zero failure counts first
has_failures=false
has_all_pass=false

# Check for non-zero failure counts: "fail 3", "3 failed", "FAIL", "ERR_ASSERTION"
if echo "$RESULT" | grep -qE '(fail [1-9]|[1-9][0-9]* fail|FAIL [a-z/]|ERR_ASSERTION|FAILED|not ok [1-9])'; then
  has_failures=true
fi

# Check for zero-failure indicators: "fail 0", "0 failed", or all-pass messages
if echo "$RESULT" | grep -qE '(fail 0|0 fail|0 failed|All tests passed)'; then
  has_all_pass=true
fi

if [ "$has_failures" = true ]; then
  touch "$FLAG"
elif [ "$has_all_pass" = true ]; then
  rm -f "$FLAG"
fi

exit 0
