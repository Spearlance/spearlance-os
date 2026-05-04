#!/usr/bin/env bash
# Git pre-commit hook: blocks commits that contain prod secrets,
# live Stripe keys, or .env files (other than .env.example).
#
# Install:
#   cp scripts/pre-commit-secrets.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
#
# Bypass (use sparingly):
#   git commit --no-verify ...

set -eu

STAGED=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)

# Rule 1: block .env files (except .env.example) being committed
for file in $STAGED; do
  case "$file" in
    .env|.env.local|.env.production|.env.staging|.env.*.local)
      echo "" >&2
      echo "🛑 PRE-COMMIT BLOCKED" >&2
      echo "" >&2
      echo "  File:   $file" >&2
      echo "  Reason: environment files contain secrets and must not be committed." >&2
      echo "" >&2
      echo "  If this file is genuinely safe, rename to .env.example with values redacted." >&2
      echo "" >&2
      exit 1
      ;;
  esac
done

# Rule 2: block live Stripe keys in any staged content
DIFF=$(git diff --cached -U0 2>/dev/null || true)
LIVE_KEY_PATTERN='(sk|pk|rk)_live_[A-Za-z0-9]{4,}'
LIVE_VIOLATIONS=$(echo "$DIFF" | grep -E '^\+' | grep -oE "$LIVE_KEY_PATTERN" | sort -u || true)

if [ -n "$LIVE_VIOLATIONS" ]; then
  echo "" >&2
  echo "🛑 PRE-COMMIT BLOCKED — Stripe LIVE keys in staged changes" >&2
  echo "" >&2
  echo "$LIVE_VIOLATIONS" | while read -r key; do
    masked="${key:0:11}…${key: -4}"
    echo "  - $masked" >&2
  done
  echo "" >&2
  echo "  Replace with sk_test_/pk_test_ keys from:" >&2
  echo "    https://dashboard.stripe.com/test/apikeys" >&2
  echo "" >&2
  exit 1
fi

# Rule 3: block prod Supabase service-role-like material (heuristic — JWT with prod ref)
PROD_REF="chikljxwgiskyjsnjelf"
PROD_SERVICE_ROLE=$(echo "$DIFF" | grep -E '^\+' | grep -E "(SERVICE_ROLE|service_role)" | grep "$PROD_REF" || true)
if [ -n "$PROD_SERVICE_ROLE" ]; then
  echo "" >&2
  echo "🛑 PRE-COMMIT BLOCKED — Production Supabase service-role material in staged content" >&2
  echo "" >&2
  echo "  Service-role keys should never live in git. Move to environment variables." >&2
  echo "" >&2
  exit 1
fi

exit 0
