#!/usr/bin/env bash
# PreToolUse hook: blocks Edit/Write when tests are failing until systematic-debugging clears the flag.
# Matcher: Edit|Write -- fires on every Edit or Write tool call.
# Checks for .claude/context/.tests-failing flag set by detect-test-failure.sh.

set -eu

ARMADILLO_DIR="$CLAUDE_PROJECT_DIR/.claude"
source "$ARMADILLO_DIR/hooks/lib/json-escape.sh"

FLAG="${ARMADILLO_DIR}/context/.tests-failing"
SESSION_FLAG="/tmp/.armadillo-no-skill-yet"

# Gate 1: Tests are failing -- must debug first
if [ -f "$FLAG" ]; then
  echo "Blocked: Tests are failing. Use the systematic-debugging skill before editing code. Invoke it: use the Skill tool with skill=\"systematic-debugging\"" >&2
  exit 2
fi

# Gate 2: No skill invoked yet this session -- one-time reminder (soft, not blocking)
if [ -f "$SESSION_FLAG" ]; then
  rm -f "$SESSION_FLAG"
  REMINDER="First code edit this session -- have you invoked the right skill? New feature -> brainstorming. Bug fix -> systematic-debugging. Executing a plan -> executing-plans. TDD -> test-driven-development."
  REMINDER_ESCAPED=$(escape_for_json "$REMINDER")
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "additionalContext": "${REMINDER_ESCAPED}"
  }
}
EOF
fi

exit 0
