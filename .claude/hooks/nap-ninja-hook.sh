#!/usr/bin/env bash
# PostToolUse hook: warns when written content contains hardcoded values from business.json.
# Matcher: Write|Edit — fires on file writes and edits.
# Exit 0 always (warning only, never blocking).
# Self-silences when: no business.json, napNinja: false, test files, short values.

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null) || FILE_PATH=""

# No file path → nothing to check
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Determine project root
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"

# Check napNinja toggle — if explicitly false, exit silently
SETTINGS_FILE="${PROJECT_DIR}/.claude/settings.json"
if [ -f "$SETTINGS_FILE" ]; then
  NAP_SETTING=$(jq -r 'if .napNinja == false then "false" elif .napNinja == true then "true" else "unset" end' "$SETTINGS_FILE" 2>/dev/null) || NAP_SETTING="unset"
  if [ "$NAP_SETTING" = "false" ]; then
    exit 0
  fi
fi

# Check business.json exists
BUSINESS_JSON="${PROJECT_DIR}/business.json"
if [ ! -f "$BUSINESS_JSON" ]; then
  exit 0
fi

# Skip business.json itself
BASENAME=$(basename "$FILE_PATH")
if [ "$BASENAME" = "business.json" ]; then
  exit 0
fi

# Skip non-source files
case "$FILE_PATH" in
  */node_modules/*|*/.git/*|*/dist/*|*/build/*|*/.next/*|*/.astro/*|*/__pycache__/*) exit 0 ;;
  *.png|*.jpg|*.jpeg|*.gif|*.svg|*.ico|*.woff|*.woff2|*.ttf|*.eot|*.map|*.lock) exit 0 ;;
esac

# Skip test files
case "$FILE_PATH" in
  */__tests__/*|*.test.*|*.spec.*|*/test_*|*/tests/*) exit 0 ;;
esac

# Get the written content — try content (Write) then new_string (Edit)
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty' 2>/dev/null) || CONTENT=""
if [ -z "$CONTENT" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty' 2>/dev/null) || CONTENT=""
fi

if [ -z "$CONTENT" ]; then
  exit 0
fi

# Normalize phone: strip +, -, (, ), spaces, dots → just digits
normalize_phone() {
  echo "$1" | tr -d '+() ./-' | sed 's/^1//'
}

# Extract all string values from business.json (flatten nested objects)
MATCHES=""
while IFS= read -r line; do
  KEY=$(echo "$line" | cut -d'=' -f1)
  VALUE=$(echo "$line" | cut -d'=' -f2-)

  # Skip empty or short values (< 4 chars → too many false positives)
  if [ ${#VALUE} -lt 4 ]; then
    continue
  fi

  # Check exact match
  if echo "$CONTENT" | grep -qF "$VALUE"; then
    MATCHES="${MATCHES}\n  ▪ '${VALUE}' → use business.json field: ${KEY}"
    continue
  fi

  # For phone-like values, also check normalized form
  NORMALIZED=$(normalize_phone "$VALUE")
  if [ ${#NORMALIZED} -ge 10 ]; then
    CONTENT_NORMALIZED=$(normalize_phone "$CONTENT")
    if echo "$CONTENT_NORMALIZED" | grep -qF "$NORMALIZED"; then
      MATCHES="${MATCHES}\n  ▪ '${VALUE}' (normalized) → use business.json field: ${KEY}"
    fi
  fi
done < <(jq -r '
  paths(scalars) as $p |
  "\($p | join("."))=\(getpath($p))"
' "$BUSINESS_JSON" 2>/dev/null | grep -v '^\[' || true)

if [ -n "$MATCHES" ]; then
  echo "⚠ NAP-Ninja: hardcoded business data in $(basename "$FILE_PATH"):" >&2
  echo -e "$MATCHES" >&2
  echo "  Reference business.json instead of hardcoding." >&2
fi

exit 0
