#!/usr/bin/env bash
# PostToolUse async hook — runs typecheck/lint after Write or Edit.
# async: true in hooks.json — Claude is NOT blocked while this runs.
# Results arrive as systemMessage on next conversation turn.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
source "${SCRIPT_DIR}/lib/json-escape.sh"

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null) || FILE_PATH=""

# Skip non-source files
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

case "$FILE_PATH" in
  *.md|*.json|*.sh|*.txt|*.yaml|*.yml|*.toml|*.lock) exit 0 ;;
esac

run_check() {
  # TypeScript — tsc
  if [ -f "tsconfig.json" ] && command -v npx >/dev/null 2>&1; then
    npx tsc --noEmit 2>&1
    return $?
  fi

  # Deno
  if command -v deno >/dev/null 2>&1 && [ -f "deno.json" ]; then
    deno check "$FILE_PATH" 2>&1
    return $?
  fi

  # Python — mypy if available
  if [[ "$FILE_PATH" == *.py ]] && command -v mypy >/dev/null 2>&1; then
    mypy "$FILE_PATH" --ignore-missing-imports 2>&1
    return $?
  fi

  return 0
}

OUTPUT=$(run_check) && EXIT_CODE=0 || EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  TRIMMED=$(echo "$OUTPUT" | head -15)
  ESCAPED=$(escape_for_json "$TRIMMED")
  FILENAME=$(basename "$FILE_PATH")
  echo "{\"systemMessage\": \"Type errors after editing ${FILENAME}: ${ESCAPED}\"}"
fi

exit 0
