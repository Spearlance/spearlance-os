#!/usr/bin/env bash
#
# verify-tdd-order.sh — Check that implementation commits have corresponding tests.
#
# Usage: verify-tdd-order.sh [base-branch]
#   base-branch: Branch to compare against (default: main)
#
# Exit codes:
#   0 — All implementation commits have tests (or no implementation commits)
#   1 — One or more commits add implementation without tests
#   2 — Error (not in a git repo, base branch not found, etc.)

set -euo pipefail

BASE="${1:-main}"

# Find merge-base
MERGE_BASE=$(git merge-base HEAD "$BASE" 2>/dev/null) || {
  echo "ERROR: Cannot find merge-base with '$BASE'. Are you on a feature branch?" >&2
  exit 2
}

# Get commits since merge-base (oldest first)
COMMITS=$(git rev-list --reverse "$MERGE_BASE"..HEAD)

if [ -z "$COMMITS" ]; then
  echo "PASS: No commits since $BASE."
  exit 0
fi

# File classification patterns
is_test_file() {
  local f="$1"
  # Common test file patterns
  [[ "$f" == *.test.* ]] && return 0
  [[ "$f" == *_test.* ]] && return 0
  [[ "$f" == *.spec.* ]] && return 0
  # test_ prefix (e.g., test_utils.py)
  local basename="${f##*/}"
  [[ "$basename" == test_*.* ]] && return 0
  # In a tests/ or __tests__/ directory
  [[ "$f" == tests/* ]] && return 0
  [[ "$f" == __tests__/* ]] && return 0
  [[ "$f" == .claude/tests/* ]] && return 0
  return 1
}

is_implementation_file() {
  local f="$1"
  # Skip non-code files
  case "$f" in
    *.md|*.json|*.yml|*.yaml|*.toml|*.lock|*.css|*.html|*.svg|*.png|*.jpg|*.gif|*.ico) return 1 ;;
    *.gitignore|*.env*|LICENSE*|Makefile|Dockerfile|*.dockerignore) return 1 ;;
    .claude/docs/*|.claude/skills/*/SKILL.md) return 1 ;;
  esac
  # Skip test files
  is_test_file "$f" && return 1
  # Everything else with a code extension is implementation
  case "$f" in
    *.js|*.ts|*.jsx|*.tsx|*.py|*.go|*.rs|*.java|*.rb|*.sh|*.bash|*.zsh) return 0 ;;
  esac
  return 1
}

violations=0
total_commits=0
test_seen=0  # Track whether a test has been seen that hasn't been "used" yet

while IFS= read -r commit; do
  [ -z "$commit" ] && continue
  total_commits=$((total_commits + 1))

  # Get files changed in this commit
  files=$(git diff-tree --no-commit-id --name-only -r "$commit" 2>/dev/null)

  has_impl=false
  has_test=false
  impl_files=""

  while IFS= read -r file; do
    [ -z "$file" ] && continue
    if is_test_file "$file"; then
      has_test=true
    fi
    if is_implementation_file "$file"; then
      has_impl=true
      impl_files="${impl_files}    ${file}\n"
    fi
  done <<< "$files"

  # If commit has a test, mark test as seen
  if $has_test; then
    test_seen=1
  fi

  # Check for violations: impl without test in same commit and no prior unseen test
  if $has_impl && ! $has_test; then
    if [ "$test_seen" -eq 1 ]; then
      # A prior test covers this impl; consume it
      test_seen=0
    else
      # No test before this impl — violation
      violations=$((violations + 1))
      short=$(git rev-parse --short "$commit")
      msg=$(git log --format='%s' -1 "$commit")
      echo "VIOLATION: $short ($msg)"
      echo -e "  Implementation files without preceding test:"
      echo -e "$impl_files"
    fi
  fi

  # If commit has both test and impl in same commit, that's fine
  # Reset test_seen since the test was "consumed" by the co-located impl
  if $has_impl && $has_test; then
    test_seen=0
  fi

done <<< "$COMMITS"

echo ""
echo "Checked $total_commits commits."

if [ "$violations" -gt 0 ]; then
  echo "FAIL: $violations TDD violation(s) found."
  exit 1
else
  echo "PASS: All implementation commits have corresponding tests."
  exit 0
fi
