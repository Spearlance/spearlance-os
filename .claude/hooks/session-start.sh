#!/usr/bin/env bash
# SessionStart hook for armadillo
# Injects skill awareness + runtime context (SWARM-STATE, agent-memory summary) at session start.

set -eu

ARMADILLO_DIR="$CLAUDE_PROJECT_DIR/.claude"
source "$ARMADILLO_DIR/hooks/lib/json-escape.sh"

# Check if legacy skills directory exists and build warning
warning_message=""
legacy_skills_dir="${HOME}/.config/armadillo/skills"
if [ -d "$legacy_skills_dir" ]; then
    warning_message="\n\n<important-reminder>IN YOUR FIRST REPLY AFTER SEEING THIS MESSAGE YOU MUST TELL THE USER:⚠️ **WARNING:** Armadillo now uses Claude Code's skills system. Custom skills in ~/.config/armadillo/skills will not be read. Move custom skills to ~/.claude/skills instead. To make this message go away, remove ~/.config/armadillo/skills</important-reminder>"
fi

# Read armadillo-shepherd content
shepherd_content=$(cat "$ARMADILLO_DIR/skills/armadillo-shepherd/SKILL.md" 2>&1 || echo "Error reading armadillo-shepherd skill")

shepherd_escaped=$(escape_for_json "$shepherd_content")
warning_escaped=$(escape_for_json "$warning_message")

# --- Runtime context injection ---
# Inject SWARM-STATE.md if it exists (agent coordination state)
swarm_context=""
swarm_file="$ARMADILLO_DIR/context/SWARM-STATE.md"
if [ -f "$swarm_file" ]; then
    swarm_content=$(cat "$swarm_file" 2>/dev/null || true)
    swarm_escaped=$(escape_for_json "$swarm_content")
    swarm_context="\\n\\n<swarm-state>\\nActive agent coordination state — read before dispatching parallel agents:\\n${swarm_escaped}\\n</swarm-state>"
fi

# Inject recent error log summary if it exists (last 20 lines)
error_context=""
error_file="$ARMADILLO_DIR/context/error-log.txt"
if [ -f "$error_file" ]; then
    error_recent=$(tail -20 "$error_file" 2>/dev/null || true)
    if [ -n "$error_recent" ]; then
        error_escaped=$(escape_for_json "$error_recent")
        error_context="\\n\\n<error-log-summary>\\nRecent errors from previous sessions (last 20 lines of error-log.txt):\\n${error_escaped}\\n</error-log-summary>"
    fi
fi

# Inject agent-memory summary — list which MEMORY.md files exist so Claude knows to read them
memory_context=""
memory_dir="$ARMADILLO_DIR/agent-memory"
if [ -d "$memory_dir" ]; then
    memory_list=$(find "$memory_dir" -name "MEMORY.md" 2>/dev/null | sed "s|$ARMADILLO_DIR/||" | sort | tr '\n' ', ' | sed 's/, $//')
    if [ -n "$memory_list" ]; then
        memory_escaped=$(escape_for_json "$memory_list")
        memory_context="\\n\\n<agent-memory>\\nAgent memory files exist — read the relevant MEMORY.md before starting domain work:\\n${memory_escaped}\\n</agent-memory>"
    fi
fi

# Inject fresh-project re-entry prompt if flow is incomplete
fresh_project_context=""
fresh_project_file="$ARMADILLO_DIR/fresh-project.json"
if [ -f "$fresh_project_file" ]; then
    build_status=$(jq -r '.build // "pending"' "$fresh_project_file" 2>/dev/null || echo "pending")
    if [ "$build_status" != "complete" ]; then
        current_phase=$(jq -r '.phase // "unknown"' "$fresh_project_file" 2>/dev/null || echo "unknown")
        fp_escaped=$(escape_for_json "Active fresh-project flow detected. Current phase: ${current_phase}. Read .claude/fresh-project.json for state. Offer to resume: 'picked up where you left off — [phase description]. ready to continue?'")
        fresh_project_context="\\n\\n<fresh-project-resume>\\n${fp_escaped}\\n</fresh-project-resume>"
    fi
fi

# Set session-fresh flag — cleared when first Skill is invoked (clear-skill-flag.sh)
# Used by enforce-debug-before-fix.sh to remind about skill-first on first code edit
touch /tmp/.armadillo-no-skill-yet

# Inject armadillo greeting at session start
greeting_context="\\n\\n<armadillo-greeting>Start your first reply with: \\\"your friendly armadillo is here to serve you\\\" — then get straight to work.</armadillo-greeting>"

# === VERSION CHECK (once per day, skippable via ARMADILLO_SKIP_VERSION_CHECK=1) ===
update_notice=""

if [ "${ARMADILLO_SKIP_VERSION_CHECK:-0}" != "1" ]; then
  VERSION_CHECK_FILE="$ARMADILLO_DIR/context/armadillo-version-check.txt"
  TODAY=$(date +%Y-%m-%d)
  LAST_CHECK=$(cat "$VERSION_CHECK_FILE" 2>/dev/null || echo "")

  # Test overrides — inject mock versions without hitting GitHub or reading manifest
  if [ -n "${ARMADILLO_TEST_LOCAL_VERSION:-}" ] && [ -n "${ARMADILLO_TEST_REMOTE_VERSION:-}" ]; then
    LOCAL_VERSION="${ARMADILLO_TEST_LOCAL_VERSION}"
    REMOTE_VERSION="${ARMADILLO_TEST_REMOTE_VERSION}"
  elif [ "$LAST_CHECK" != "$TODAY" ]; then
    echo "$TODAY" > "$VERSION_CHECK_FILE" 2>/dev/null || true
    LOCAL_VERSION=$(jq -r '.version // ""' "$ARMADILLO_DIR/.armadillo-manifest.json" 2>/dev/null || echo "")
    # Fetch remote version: gh api preferred, curl fallback for teams without gh
    if command -v gh &>/dev/null; then
      REMOTE_VERSION=$(env -u GITHUB_TOKEN gh api repos/filenamedotexe/armadillo/contents/package.json \
        --jq '.content' 2>/dev/null | base64 -d 2>/dev/null | \
        jq -r '.version // ""' 2>/dev/null || echo "")
    elif command -v curl &>/dev/null; then
      REMOTE_VERSION=$(curl -sf "https://raw.githubusercontent.com/filenamedotexe/armadillo/main/package.json" \
        2>/dev/null | jq -r '.version // ""' 2>/dev/null || echo "")
    else
      REMOTE_VERSION=""
    fi
  else
    LOCAL_VERSION=""
    REMOTE_VERSION=""
  fi

  if [ -n "$LOCAL_VERSION" ] && [ -n "$REMOTE_VERSION" ] && [ "$REMOTE_VERSION" != "$LOCAL_VERSION" ]; then
    update_notice="\\n\\n<armadillo-update>⚠ armadillo ${REMOTE_VERSION} available (you have ${LOCAL_VERSION}) — say \\\"update armadillo\\\" to upgrade.</armadillo-update>"
  fi
fi

# === BYPASS MODE DETECTION ===
bypass_warning=""
SETTINGS_FILE="$ARMADILLO_DIR/settings.json"
if [ -f "$SETTINGS_FILE" ]; then
  DEFAULT_MODE=$(jq -r '.permissions.defaultMode // ""' "$SETTINGS_FILE" 2>/dev/null || echo "")
  if [ "$DEFAULT_MODE" = "bypassPermissions" ]; then
    bypass_warning="\\n\\n<bypass-warning>🛡 BYPASS MODE ACTIVE — all non-deny-listed Bash commands auto-approved.\\nDeny-list still enforced (force-push, reset --hard, rm -rf blocked).\\nTo return to safe mode: set defaultMode to \\\"acceptEdits\\\" in .claude/settings.json</bypass-warning>"
  fi
fi

# === BYPASS MODE NUDGE (when NOT on bypassPermissions) ===
bypass_nudge=""
if [ -f "$SETTINGS_FILE" ]; then
  NUDGE_MODE=$(jq -r '.permissions.defaultMode // ""' "$SETTINGS_FILE" 2>/dev/null || echo "")
  if [ "$NUDGE_MODE" != "bypassPermissions" ] && [ -n "$NUDGE_MODE" ]; then
    bypass_nudge="\\n\\n<bypass-nudge>💡 armadillo works best with bypassPermissions mode — say \\\"/updating-armadillo\\\" to toggle. deny-list still blocks catastrophic commands.</bypass-nudge>"
  fi
fi

# Output context injection as JSON
cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "<EXTREMELY_IMPORTANT>\nYou have armadillo skills.\n\n**Below is the full content of your 'armadillo:armadillo-shepherd' skill - your routing table for all skills. Use the 'Skill' tool to invoke them:**\n\n${shepherd_escaped}\n\n${warning_escaped}\n</EXTREMELY_IMPORTANT>${update_notice}${bypass_warning}${bypass_nudge}${swarm_context}${error_context}${memory_context}${fresh_project_context}${greeting_context}"
  }
}
EOF

exit 0
