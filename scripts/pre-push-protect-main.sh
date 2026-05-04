#!/usr/bin/env bash
# Git pre-push hook: blocks direct pushes to main/master.
# All work must go through PRs since GitHub Pro is required for
# server-side branch protection on private repos.
#
# Install (handled automatically by scripts/install-git-hooks.mjs via npm prepare):
#   cp scripts/pre-push-protect-main.sh .git/hooks/pre-push
#   chmod +x .git/hooks/pre-push
#
# Bypass (use sparingly — only for emergencies or release commits):
#   git push --no-verify ...
#
# Stdin format (one line per ref being pushed):
#   <local ref> <local sha> <remote ref> <remote sha>

set -eu

PROTECTED_REFS="refs/heads/main refs/heads/master"

while read -r local_ref local_sha remote_ref remote_sha; do
  [ -z "${remote_ref:-}" ] && continue

  for protected in $PROTECTED_REFS; do
    if [ "$remote_ref" = "$protected" ]; then
      echo "" >&2
      echo "🛑 PRE-PUSH BLOCKED" >&2
      echo "" >&2
      echo "  Direct push to $remote_ref is not allowed." >&2
      echo "  All changes must go through a pull request." >&2
      echo "" >&2
      echo "  Workflow:" >&2
      echo "    1. Create a feature branch: git checkout -b feat/your-change" >&2
      echo "    2. Push it:                  git push origin feat/your-change" >&2
      echo "    3. Open a PR via gh api or web UI" >&2
      echo "    4. Squash-merge the PR" >&2
      echo "" >&2
      echo "  Bypass (emergencies only): git push --no-verify" >&2
      echo "" >&2
      exit 1
    fi
  done
done

exit 0
