#!/usr/bin/env bash
# PostToolUse hook: warns when written content contains hardcoded secrets.
# Matcher: Write|Edit — fires on file writes and edits.
# Exit 0 always (warning only, never blocking).
# Self-silences when: envNinja: false, .env files, test files.

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null) || FILE_PATH=""

# No file path → nothing to check
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Determine project root
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"

# Check envNinja toggle — if explicitly false, exit silently
SETTINGS_FILE="${PROJECT_DIR}/.claude/settings.json"
if [ -f "$SETTINGS_FILE" ]; then
  ENV_SETTING=$(jq -r 'if .envNinja == false then "false" elif .envNinja == true then "true" else "unset" end' "$SETTINGS_FILE" 2>/dev/null) || ENV_SETTING="unset"
  if [ "$ENV_SETTING" = "false" ]; then
    exit 0
  fi
fi

# Skip .env files — secrets belong there
BASENAME=$(basename "$FILE_PATH")
case "$BASENAME" in
  .env|.env.*|*.env) exit 0 ;;
esac

# Skip non-source files
case "$FILE_PATH" in
  */node_modules/*|*/.git/*|*/dist/*|*/build/*|*/.next/*|*/.astro/*|*/__pycache__/*) exit 0 ;;
  *.png|*.jpg|*.jpeg|*.gif|*.svg|*.ico|*.woff|*.woff2|*.ttf|*.eot|*.map|*.lock) exit 0 ;;
  *package-lock.json|*yarn.lock|*pnpm-lock.yaml) exit 0 ;;
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

MATCHES=""

# Pattern 1: Database URLs with credentials
if echo "$CONTENT" | grep -qE '(postgres[a-z]*|mysql|mongodb(\+srv)?|redis)://[^[:space:]@]+:[^[:space:]@]+@'; then
  MATCHES="${MATCHES}\n  ▪ database URL with credentials → use process.env.DATABASE_URL"
fi

# Pattern 2: Stripe live/test secret keys
if echo "$CONTENT" | grep -qE '(sk_live_|rk_live_|sk_test_)[A-Za-z0-9]{10,}'; then
  MATCHES="${MATCHES}\n  ▪ Stripe secret key → use process.env.STRIPE_SECRET_KEY"
fi

# Pattern 3: AWS access key IDs
if echo "$CONTENT" | grep -qE 'AKIA[0-9A-Z]{16}'; then
  MATCHES="${MATCHES}\n  ▪ AWS access key → use process.env.AWS_ACCESS_KEY_ID"
fi

# Pattern 4: JWT tokens (three base64url segments)
if echo "$CONTENT" | grep -qE 'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'; then
  # Skip if it's inside a process.env or import.meta.env reference
  if ! echo "$CONTENT" | grep -qE 'process\.env\.|import\.meta\.env\.'; then
    MATCHES="${MATCHES}\n  ▪ JWT token → use process.env.JWT_TOKEN or appropriate env var"
  fi
fi

# Pattern 5: PEM private keys
if echo "$CONTENT" | grep -qE -- '-----BEGIN.*(PRIVATE KEY|RSA|EC|DSA)'; then
  MATCHES="${MATCHES}\n  ▪ private key → store in env var or file, not source code"
fi

# Pattern 6: Generic "secret"/"key"/"token"/"password" assignments with long values
if echo "$CONTENT" | grep -qEi '(api[_-]?key|secret[_-]?key|auth[_-]?token|password|api[_-]?secret|access[_-]?token|private[_-]?key|client[_-]?secret)\s*[=:]\s*["\x27][A-Za-z0-9+/=_-]{20,}'; then
  # Don't flag if it references process.env or import.meta.env
  if ! echo "$CONTENT" | grep -qE 'process\.env\.|import\.meta\.env\.'; then
    MATCHES="${MATCHES}\n  ▪ possible hardcoded secret → use an environment variable"
  fi
fi

if [ -n "$MATCHES" ]; then
  echo "⚠ ENV-Ninja: possible hardcoded secret in $(basename "$FILE_PATH"):" >&2
  echo -e "$MATCHES" >&2
  echo "  Use environment variables instead of hardcoding secrets." >&2
fi

exit 0
