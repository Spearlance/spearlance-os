#!/usr/bin/env bash
# PreToolUse hook: blocks destructive Supabase commands against production.
# Matcher: Bash
#
# Production project ref: chikljxwgiskyjsnjelf
#
# Block rules:
#   1. supabase db reset against prod ref          → BLOCK (always — no escape valve)
#   2. supabase db push against prod ref           → BLOCK without ARMADILLO_PROD_CONFIRMED=1
#   3. supabase db reset --linked                  → BLOCK (link could be prod)
#   4. supabase db push --linked                   → BLOCK without ARMADILLO_PROD_CONFIRMED=1
#   5. deploy-functions --env prod --all           → BLOCK without ARMADILLO_PROD_CONFIRMED=1
#   6. DROP TABLE / TRUNCATE / DELETE FROM + prod  → BLOCK
#
# Allow:
#   - db push against any non-prod ref (e.g. dev branch zlljsdaxsggkasvympku)
#   - db query (read-only) against any ref
#   - deploy-functions --env prod --function <name> (single function deploy)
#   - Anything not matching the above patterns

set -eu

PROD_REF="chikljxwgiskyjsnjelf"
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")

# Skip empty / non-Supabase commands quickly
if [ -z "$COMMAND" ]; then
  exit 0
fi

# Skip git commit commands. Commit messages are quoted strings that can
# contain dangerous-looking text (e.g. when committing this hook's own
# tests) without actually invoking those commands. The firewall would
# trip on message content otherwise.
if echo "$COMMAND" | grep -qE 'git[[:space:]]+commit[[:space:]]+-m'; then
  exit 0
fi

block() {
  echo "" >&2
  echo "🛑 PROD-FIREWALL BLOCKED" >&2
  echo "" >&2
  echo "  Command: $COMMAND" >&2
  echo "" >&2
  echo "  Reason:  $1" >&2
  echo "" >&2
  echo "  Escape valve (when you really mean it):" >&2
  echo "    1. npm run prod:confirm          # type PRODUCTION" >&2
  echo "    2. export ARMADILLO_PROD_CONFIRMED=1" >&2
  echo "    3. re-run your command in the same shell" >&2
  echo "" >&2
  echo "  (db reset against prod is NEVER allowed — no escape valve.)" >&2
  echo "" >&2
  exit 2
}

# Helpers
is_db_reset()   { echo "$COMMAND" | grep -qE 'supabase[[:space:]]+db[[:space:]]+reset'; }
is_db_push()    { echo "$COMMAND" | grep -qE 'supabase[[:space:]]+db[[:space:]]+push'; }
hits_prod_ref() { echo "$COMMAND" | grep -q "$PROD_REF"; }
uses_linked()   { echo "$COMMAND" | grep -qE -- '--linked'; }
is_deploy_all() {
  echo "$COMMAND" | grep -qE 'deploy-functions(\.mjs)?' \
    && echo "$COMMAND" | grep -qE -- '--env[[:space:]=]*prod' \
    && echo "$COMMAND" | grep -qE -- '--all'
}
has_destructive_sql() {
  echo "$COMMAND" | grep -qiE '(DROP[[:space:]]+TABLE|TRUNCATE([[:space:]]|$)|DELETE[[:space:]]+FROM)'
}

confirmed() { [ "${ARMADILLO_PROD_CONFIRMED:-0}" = "1" ]; }

# Rule 1: db reset against prod ref — always blocked, no escape valve
if is_db_reset && hits_prod_ref; then
  block "supabase db reset against PRODUCTION wipes the database. Refused unconditionally."
fi

# Rule 3: db reset --linked — blocked even without prod ref (link could be prod)
if is_db_reset && uses_linked; then
  if ! confirmed; then
    block "supabase db reset --linked is forbidden without explicit confirmation. Use --project-ref <ref> with the dev branch instead."
  fi
fi

# Rule 2: db push against prod ref — needs confirmation
if is_db_push && hits_prod_ref; then
  if ! confirmed; then
    block "supabase db push against PRODUCTION requires explicit confirmation."
  fi
fi

# Rule 4: db push --linked — needs confirmation (link could be prod)
if is_db_push && uses_linked; then
  if ! confirmed; then
    block "supabase db push --linked could target PRODUCTION if link state has drifted. Confirm or use explicit --project-ref."
  fi
fi

# Rule 5: deploy-functions --env prod --all — needs confirmation
if is_deploy_all; then
  if ! confirmed; then
    block "Mass function deploy to PRODUCTION requires explicit confirmation."
  fi
fi

# Rule 6: destructive SQL near prod ref — block
if hits_prod_ref && has_destructive_sql; then
  block "Destructive SQL (DROP/TRUNCATE/DELETE) referencing PRODUCTION ref. Refused."
fi

# All checks passed
exit 0
