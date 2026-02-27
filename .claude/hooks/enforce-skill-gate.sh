#!/usr/bin/env bash
# PreToolUse hook: blocks `gh pr create` and `gh pr merge` unless the right skill was invoked.
# Matcher: Bash — fires on every Bash tool call.
#
# Skill flag files (created by skills, consumed here):
#   /tmp/.armadillo-pr-skill-active    → writing-prs
#   /tmp/.armadillo-merge-skill-active → finishing-a-development-branch

set -eu

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")

# Determine which gate applies (if any)
case "$COMMAND" in
  *"gh pr create"*|*"gh api"*"/pulls"*"--method POST"*)
    FLAG="/tmp/.armadillo-pr-skill-active"
    SKILL="writing-prs"
    ;;
  *"gh pr merge"*|*"gh api"*"/pulls/"*"/merge"*)
    FLAG="/tmp/.armadillo-merge-skill-active"
    SKILL="finishing-a-development-branch"
    ;;
  *)
    exit 0
    ;;
esac

if [ -f "$FLAG" ]; then
  # Skill was invoked — allow through and consume the flag
  rm -f "$FLAG"
  exit 0
else
  echo "Blocked: ${COMMAND%% *}... requires the ${SKILL} skill. Invoke it first: use the Skill tool with skill=\"${SKILL}\"" >&2
  exit 2
fi
