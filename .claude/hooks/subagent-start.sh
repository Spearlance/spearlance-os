#!/usr/bin/env bash
# SubagentStart hook — injects coding standards and output style into subagent context.
# Fires whenever a Task tool call spawns a subagent.
# Subagents don't inherit the parent session's loaded rules, so this bridges the gap.

set -euo pipefail

ARMADILLO_DIR="$CLAUDE_PROJECT_DIR/.claude"
source "$ARMADILLO_DIR/hooks/lib/json-escape.sh"

# Load coding standards and output style
STANDARDS_CONTEXT=""

coding_standards="${ARMADILLO_DIR}/rules/coding-standards.md"
if [ -f "$coding_standards" ]; then
  content=$(cat "$coding_standards" 2>/dev/null || true)
  escaped=$(escape_for_json "$content")
  STANDARDS_CONTEXT="<coding-standards>\n${escaped}\n</coding-standards>"
fi

output_style="${ARMADILLO_DIR}/rules/output-style.md"
if [ -f "$output_style" ]; then
  content=$(cat "$output_style" 2>/dev/null || true)
  escaped=$(escape_for_json "$content")
  STANDARDS_CONTEXT="${STANDARDS_CONTEXT}\n\n<output-style>\n${escaped}\n</output-style>"
fi

# Inject test failure warning if flag exists
TEST_FAIL_FLAG="${ARMADILLO_DIR}/context/.tests-failing"
if [ -f "$TEST_FAIL_FLAG" ]; then
  STANDARDS_CONTEXT="${STANDARDS_CONTEXT}\n\n<test-failure-warning>Tests are currently failing in this project. Use the systematic-debugging skill (invoke Skill tool with skill=\\\"systematic-debugging\\\") before writing implementation code.</test-failure-warning>"
fi

if [ -z "$STANDARDS_CONTEXT" ]; then
  exit 0
fi

cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SubagentStart",
    "additionalContext": "${STANDARDS_CONTEXT}"
  }
}
EOF

exit 0
