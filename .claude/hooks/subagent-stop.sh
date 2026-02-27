#!/usr/bin/env bash
# SubagentStop hook — fires when a subagent finishes.
# Blocks stopping when incomplete work detected — uses decision/reason per Claude Code schema.

set -euo pipefail

input=$(cat)

# 1. Check stop_hook_active first — exit immediately to prevent infinite loops
stop_hook_active=$(echo "$input" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("stop_hook_active", False))' 2>/dev/null || echo "False")

if [ "$stop_hook_active" = "True" ] || [ "$stop_hook_active" = "true" ]; then
  exit 0
fi

# 2. Read fields from JSON input
agent_type=$(echo "$input" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("agent_type", "unknown"))' 2>/dev/null || echo "unknown")
agent_id=$(echo "$input" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("agent_id", "unknown"))' 2>/dev/null || echo "unknown")
last_message=$(echo "$input" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("last_assistant_message", ""))' 2>/dev/null || echo "")

# 3. Check for signs of incomplete work (case-insensitive)
lower_message=$(echo "$last_message" | tr '[:upper:]' '[:lower:]')

incomplete=false
for pattern in "could not" "unable to" "failed to" "error" "blocked" "couldn't" "timed out"; do
  if echo "$lower_message" | grep -qF "$pattern"; then
    incomplete=true
    break
  fi
done

# 4. Output block decision if incomplete, otherwise exit 0 silently
if [ "$incomplete" = "true" ]; then
  python3 -c '
import json, sys
agent_type = sys.argv[1]
agent_id = sys.argv[2]
output = {
    "decision": "block",
    "reason": "Subagent " + agent_type + " (" + agent_id + ") may have incomplete work. Review its output before proceeding."
}
print(json.dumps(output))
' "$agent_type" "$agent_id"
fi

exit 0
