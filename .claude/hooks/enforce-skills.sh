#!/usr/bin/env bash
# PreToolUse hook: blocks Plan and Explore Task agent dispatches.
# Matcher: Task — fires on every Task tool call.
# Reads tool_input.subagent_type from stdin JSON.

set -euo pipefail

INPUT=$(cat)
AGENT_TYPE=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // empty' 2>/dev/null) || AGENT_TYPE=""

case "$AGENT_TYPE" in
  Plan)
    echo "Blocked: Plan agent is disabled. Use the writing-plans skill instead: invoke Skill tool with skill=\"writing-plans\"" >&2
    exit 2
    ;;
  Explore)
    echo "Blocked: Explore agents are disabled. Use the Skill tool to invoke armadillo-shepherd — it routes to the right skill for any request." >&2
    exit 2
    ;;
  *)
    exit 0
    ;;
esac
