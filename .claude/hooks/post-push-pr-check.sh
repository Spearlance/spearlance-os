#!/usr/bin/env bash
# PostToolUse hook: after git push, check if a PR exists for the current branch.
# If PR exists but auto-merge not enabled → enable it (if GraphQL available).
# If no PR → remind to create one.
# Uses REST API to avoid GraphQL rate limit exhaustion.
# Matcher: Bash — fires on every Bash tool call.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
source "${SCRIPT_DIR}/lib/json-escape.sh"
source "${SCRIPT_DIR}/lib/github-rest.sh"

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null) || COMMAND=""

# Only fire for git push commands
case "$COMMAND" in
  *"git push"*)
    ;;
  *)
    exit 0
    ;;
esac

# Get current branch
BRANCH=$(git branch --show-current 2>/dev/null) || exit 0

# Skip if on main/master — no PR needed
case "$BRANCH" in
  main|master)
    exit 0
    ;;
esac

# Check if PR exists for this branch (REST API — not GraphQL)
PR_JSON=$(gh_rest_pr_list_by_head "$BRANCH") || exit 0
PR_COUNT=$(echo "$PR_JSON" | jq 'length' 2>/dev/null) || exit 0

if [ "$PR_COUNT" = "0" ]; then
  REMINDER="No PR exists for branch '${BRANCH}'. Create one using the writing-prs skill (invoke Skill tool with skill=\"writing-prs\") or use finishing-a-development-branch."
  REMINDER_ESCAPED=$(escape_for_json "$REMINDER")

  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "${REMINDER_ESCAPED}"
  }
}
EOF
else
  # PR exists — enable auto-merge if GraphQL budget available
  PR_NUMBER=$(echo "$PR_JSON" | jq -r '.[0].number' 2>/dev/null)
  AUTO_MERGE=$(echo "$PR_JSON" | jq -r '.[0].auto_merge' 2>/dev/null)

  if [ "$AUTO_MERGE" = "null" ] || [ -z "$AUTO_MERGE" ]; then
    # Auto-merge requires GraphQL — check budget first
    if gh_graphql_available; then
      env -u GITHUB_TOKEN gh pr merge "$PR_NUMBER" --auto --squash --delete-branch 2>/dev/null || true
      MSG="Auto-merge enabled on PR #${PR_NUMBER} — will squash merge when CI passes."
      MSG_ESCAPED=$(escape_for_json "$MSG")
      cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "${MSG_ESCAPED}"
  }
}
EOF
    fi
    # If GraphQL exhausted, skip silently — auto-merge is best-effort
  fi
fi

exit 0
