#!/usr/bin/env bash
set -euo pipefail

# PostToolUseFailure hook — provides corrective guidance on tool failures
# Receives JSON on stdin with: tool_name, tool_input, error, is_interrupt

input="$(cat)"

# Skip user interrupts
is_interrupt="$(echo "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('is_interrupt', False))" 2>/dev/null || echo "False")"
if [[ "$is_interrupt" == "True" ]]; then
  exit 0
fi

tool_name="$(echo "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name', ''))" 2>/dev/null || echo "")"
error="$(echo "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error', ''))" 2>/dev/null || echo "")"
command="$(echo "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input', {}).get('command', ''))" 2>/dev/null || echo "")"

guidance=""

if [[ "$tool_name" == "Bash" ]]; then
  # Test command failures
  if echo "$command" | grep -qE '(npm test|npx vitest|npx jest|pytest|node --test)'; then
    guidance="Test command failed. Use the systematic-debugging skill to diagnose: invoke Skill tool with skill=\"systematic-debugging\". Trace the root cause — determine if it's a CODE BUG, CODE GAP, TEST BUG, or ENV issue before making any changes."

  # git push failures
  elif echo "$command" | grep -qE 'git push'; then
    guidance="git push failed. Check: (1) Authentication — prefix with \`env -u GITHUB_TOKEN git push\` to use keyring token with full scopes. (2) Branch protection — direct pushes to main are blocked; open a PR instead. (3) Pre-push hooks — run \`cat .git/hooks/pre-push\` to see what's enforced. Error: $error"

  # npm install/ci failures
  elif echo "$command" | grep -qE '(npm install|npm ci|npm i )'; then
    guidance="npm install/ci failed. Check: (1) Node version — run \`node -v\` and compare to engines field in package.json. (2) Lockfile conflicts — delete node_modules and package-lock.json then retry. (3) Network — verify registry access with \`npm ping\`. Error: $error"
  fi

elif [[ "$tool_name" == "Write" || "$tool_name" == "Edit" ]]; then
  guidance="File operation failed. Check: (1) Permissions — run \`ls -la\` on the target path. (2) Path existence — parent directory must exist before writing a new file. (3) For Edit failures — the old_string must match the file content exactly (whitespace, indentation, and all). Error: $error"
fi

if [[ -z "$guidance" ]]; then
  exit 0
fi

python3 -c "
import json, sys
print(json.dumps({
  'hookSpecificOutput': {
    'hookEventName': 'PostToolUseFailure',
    'additionalContext': sys.argv[1]
  }
}))
" "$guidance"
