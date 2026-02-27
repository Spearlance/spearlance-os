#!/usr/bin/env bash
# TaskCompleted hook — blocks task completion if tests fail.
# Fires when any agent calls TaskUpdate(status: "completed").
# Detects test runner automatically. Exits 0 (allow) if no tests found.

set -euo pipefail

INPUT=$(cat)
TASK_SUBJECT=$(echo "$INPUT" | jq -r '.task_subject // empty' 2>/dev/null) || TASK_SUBJECT=""
TASK_DESCRIPTION=$(echo "$INPUT" | jq -r '.task_description // empty' 2>/dev/null) || TASK_DESCRIPTION=""

# Skip test suite for non-code tasks (research, exploration, audits, planning)
COMBINED="${TASK_SUBJECT} ${TASK_DESCRIPTION}"
COMBINED_LOWER=$(echo "$COMBINED" | tr '[:upper:]' '[:lower:]')
SKIP_PATTERNS="research|explor|audit|investigat|analyz|review context|read.*file|check.*status|gather|understand|plan|design|brainstorm|document"
if echo "$COMBINED_LOWER" | grep -qE "$SKIP_PATTERNS"; then
  exit 0
fi

# Detect test runner and run tests with a 60s timeout
run_tests() {
  # TypeScript/JavaScript — vitest
  if [ -f "vitest.config.ts" ] || [ -f "vitest.config.js" ]; then
    npx vitest run --reporter=verbose 2>&1
    return $?
  fi

  # TypeScript/JavaScript — jest
  if [ -f "jest.config.ts" ] || [ -f "jest.config.js" ] || [ -f "jest.config.mjs" ]; then
    npx jest --passWithNoTests 2>&1
    return $?
  fi

  # package.json with test script
  if [ -f "package.json" ]; then
    TEST_SCRIPT=$(node -e "const p=require('./package.json');process.stdout.write(p.scripts&&p.scripts.test?p.scripts.test:'')" 2>/dev/null)
    if [ -n "$TEST_SCRIPT" ] && [ "$TEST_SCRIPT" != "echo \"Error: no test specified\" && exit 1" ]; then
      npm test 2>&1
      return $?
    fi
  fi

  # Python — pytest
  if [ -f "pytest.ini" ] || { [ -f "pyproject.toml" ] && grep -q "\[tool.pytest" pyproject.toml 2>/dev/null; }; then
    python -m pytest -q 2>&1
    return $?
  fi

  # No test runner found — allow completion
  return 0
}

OUTPUT=$(run_tests) && EXIT_CODE=0 || EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  TRIMMED=$(echo "$OUTPUT" | tail -20)
  echo "i may be an armadillo but i'll be damned if i let bad code slide" >&2
  echo "" >&2
  echo "Tests failing — fix before completing '${TASK_SUBJECT}':" >&2
  echo "$TRIMMED" >&2
  exit 2
fi

# TDD commit-order audit (warning only — commit-order hook is the hard block)
BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "master" ]; then
  BASE_SHA=$(git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null || echo "")
  if [ -n "$BASE_SHA" ]; then
    FEAT_FIX=$(git log "$BASE_SHA"..HEAD --oneline --grep="^feat\|^fix" 2>/dev/null | wc -l | tr -d ' ')
    TEST_COMMITS=$(git log "$BASE_SHA"..HEAD --oneline --grep="^test:" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$FEAT_FIX" -gt 0 ] && [ "$TEST_COMMITS" -eq 0 ]; then
      echo "⚠ TDD audit: ${FEAT_FIX} feat/fix commits but 0 test: commits on this branch. Write tests first next time." >&2
    fi
  fi
fi

exit 0
