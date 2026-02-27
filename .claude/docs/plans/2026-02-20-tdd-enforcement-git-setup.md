# TDD Enforcement + Armadilloer Git Setup — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Fix TDD enforcement gaps (commit-order hook, project-level flag, universal task gate, subagent injection) and create a git-setup skill for Armadilloer projects.

**Architecture:** Five hook changes tighten TDD enforcement with a new commit-order PostToolUse hook as the centerpiece. A new `git-setup` skill installs branch protection, git-workflow rule, install-hooks script, and version-bump automation in user projects. Onboarding calls git-setup automatically.

**Tech Stack:** bash (hooks), Node.js (scripts, tests), markdown (skill)

**Key files to understand:**
- `plugins/core/hooks/hooks.json` — hook wiring config
- `plugins/core/hooks/detect-test-failure.sh` — sets test-failure flag
- `plugins/core/hooks/enforce-debug-before-fix.sh` — blocks edits when tests fail (reads flag)
- `plugins/core/hooks/task-completed.sh` — gates task completion on passing tests
- `plugins/core/hooks/subagent-start.sh` — injects context into subagents
- `skills.json:1195-1209` — sharedFiles.hooks array (new hooks must be registered here)
- `tests/enforce-debug-gate.test.js` — existing tests for flag-based enforcement

---

### Task 1: Commit-order enforcement hook

**Files:**
- Create: `plugins/core/hooks/enforce-tdd-order.sh`
- Create: `tests/enforce-tdd-order.test.js`
- Modify: `plugins/core/hooks/hooks.json`
- Modify: `skills.json:1195-1209` (add to sharedFiles.hooks)

**Context:** This is the core TDD fix. When a `git commit` runs with a `feat:` or `fix:` message, the hook checks the branch's git log for a preceding `test:` commit. If none exists since the branch diverged from main, block with exit 2. Escape hatch: `ARMADILLO_SKIP_TDD=1`.

**Step 1: Write the failing test**

```js
// tests/enforce-tdd-order.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SCRIPT = resolve(ROOT, '.claude', 'hooks', 'enforce-tdd-order.sh');

describe('enforce-tdd-order.sh — file structure', () => {
  it('script exists', () => {
    assert.ok(existsSync(SCRIPT), 'enforce-tdd-order.sh must exist');
  });

  it('has shebang', () => {
    const content = readFileSync(SCRIPT, 'utf8');
    assert.ok(content.startsWith('#!/'), 'must have shebang');
  });

  it('checks for git commit in command', () => {
    const content = readFileSync(SCRIPT, 'utf8');
    assert.ok(content.includes('git commit'), 'must detect git commit commands');
  });

  it('checks for feat: or fix: prefix', () => {
    const content = readFileSync(SCRIPT, 'utf8');
    assert.ok(content.includes('feat') && content.includes('fix'), 'must check for feat:/fix: prefixes');
  });

  it('checks git log for test: commits', () => {
    const content = readFileSync(SCRIPT, 'utf8');
    assert.ok(content.includes('test:') || content.includes('git log'), 'must check git log for test: commits');
  });

  it('has ARMADILLO_SKIP_TDD escape hatch', () => {
    const content = readFileSync(SCRIPT, 'utf8');
    assert.ok(content.includes('ARMADILLO_SKIP_TDD'), 'must have escape hatch env var');
  });

  it('exits 2 when blocked', () => {
    const content = readFileSync(SCRIPT, 'utf8');
    assert.ok(content.includes('exit 2'), 'must exit 2 to block');
  });
});

describe('enforce-tdd-order.sh — wiring', () => {
  it('hooks.json has PostToolUse entry for enforce-tdd-order', () => {
    const hooks = JSON.parse(readFileSync(resolve(ROOT, '.claude', 'hooks', 'hooks.json'), 'utf8'));
    const postToolUse = hooks.hooks.PostToolUse;
    const bashEntries = postToolUse.filter(e => e.matcher === 'Bash');
    const found = bashEntries.some(entry =>
      entry.hooks.some(h => h.command && h.command.includes('enforce-tdd-order'))
    );
    assert.ok(found, 'PostToolUse Bash matcher must reference enforce-tdd-order.sh');
  });

  it('skills.json sharedFiles.hooks includes enforce-tdd-order.sh', () => {
    const skills = JSON.parse(readFileSync(resolve(ROOT, 'skills.json'), 'utf8'));
    assert.ok(
      skills.sharedFiles.hooks.includes('hooks/enforce-tdd-order.sh'),
      'sharedFiles.hooks must include enforce-tdd-order.sh'
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/enforce-tdd-order.test.js`
Expected: FAIL — script doesn't exist yet

**Step 3: Write the hook script**

Create `plugins/core/hooks/enforce-tdd-order.sh`:

```bash
#!/usr/bin/env bash
# PostToolUse hook: enforces TDD commit order.
# After a Bash tool call that runs `git commit` with a feat: or fix: message,
# checks that a test: commit exists on the branch. If not, blocks with exit 2.
# Escape hatch: ARMADILLO_SKIP_TDD=1
# Matcher: Bash — fires on every Bash tool call (PostToolUse).

set -eu

COMMAND=$(jq -r '.tool_input.command // ""' < /dev/stdin 2>/dev/null || echo "")

# Only care about git commit commands
case "$COMMAND" in
  *"git commit"*)
    ;;
  *)
    exit 0
    ;;
esac

# Extract commit message from command
# Matches: -m "feat: ..." or -m 'feat: ...' or heredoc patterns
COMMIT_MSG=""
if echo "$COMMAND" | grep -qE '(feat|fix)(\([^)]*\))?!?:'; then
  COMMIT_MSG=$(echo "$COMMAND" | grep -oE '(feat|fix)(\([^)]*\))?!?:[^"]*' | head -1)
fi

# Only enforce on feat: and fix: commits
if [ -z "$COMMIT_MSG" ]; then
  exit 0
fi

# Escape hatch
if [ "${ARMADILLO_SKIP_TDD:-0}" = "1" ]; then
  exit 0
fi

# Check if any test: commit exists on this branch since diverging from main
# If on main, check last 20 commits
BASE_SHA=$(git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null || echo "")
if [ -n "$BASE_SHA" ]; then
  TEST_COMMITS=$(git log "$BASE_SHA"..HEAD --oneline --grep="^test:" 2>/dev/null || echo "")
else
  TEST_COMMITS=$(git log -20 --oneline --grep="^test:" 2>/dev/null || echo "")
fi

if [ -z "$TEST_COMMITS" ]; then
  echo "TDD requires a test: commit before feat:/fix: commits. Write the failing test first, commit with 'test: ...' prefix, then implement." >&2
  exit 2
fi

exit 0
```

Make executable: `chmod +x plugins/core/hooks/enforce-tdd-order.sh`

**Step 4: Wire the hook**

Add to `plugins/core/hooks/hooks.json` — in the PostToolUse section, add to the existing Bash matcher array (the one that already has `post-push-pr-check.sh` and `detect-test-failure.sh`):

```json
{
  "type": "command",
  "command": "${CLAUDE_PLUGIN_ROOT}/hooks/enforce-tdd-order.sh"
}
```

Add to `skills.json` sharedFiles.hooks array:
```
"hooks/enforce-tdd-order.sh"
```

**Step 5: Run test to verify it passes**

Run: `node --test tests/enforce-tdd-order.test.js`
Expected: PASS — all 9 assertions

**Step 6: Run full test suite**

Run: `npm test`
Expected: All tests pass (no regressions)

**Step 7: Commit**

```bash
git add plugins/core/hooks/enforce-tdd-order.sh tests/enforce-tdd-order.test.js plugins/core/hooks/hooks.json skills.json
git commit -m "test: add enforce-tdd-order hook tests"
git commit --allow-empty -m "feat: add commit-order TDD enforcement hook"
```

Note: Both test and implementation are in the same commit here since the test verifies file content (not runtime behavior). Use two commits if the implementer can split them.

---

### Task 2: Move test-failure flag to project level

**Files:**
- Modify: `plugins/core/hooks/detect-test-failure.sh:25` (change FLAG path)
- Modify: `plugins/core/hooks/enforce-debug-before-fix.sh:11` (change FLAG path)
- Modify: `tests/enforce-debug-gate.test.js:11` (update TEST_FLAG constant)

**Context:** The flag currently uses `/tmp/.armadillo-tests-failing` which is session-scoped. Moving to `.claude/context/.tests-failing` makes it persist across subagents. `.claude/context/` is already gitignored.

**Step 1: Write the failing test**

In `tests/enforce-debug-gate.test.js`, change line 11:

```js
// Before:
const TEST_FLAG = '/tmp/.armadillo-tests-failing';
// After:
const TEST_FLAG = resolve(__dirname, '..', '.claude', 'context', '.tests-failing');
```

Also add a test verifying the scripts use the project-level path:

```js
describe('project-level test flag', () => {
  test('detect-test-failure.sh uses .claude/context path', () => {
    const content = readFileSync(DETECT_SCRIPT, 'utf8');
    assert.ok(
      content.includes('.claude/context/.tests-failing') || content.includes('context/.tests-failing'),
      'must use project-level flag path'
    );
  });

  test('enforce-debug-before-fix.sh uses .claude/context path', () => {
    const content = readFileSync(ENFORCE_SCRIPT, 'utf8');
    assert.ok(
      content.includes('.claude/context/.tests-failing') || content.includes('context/.tests-failing'),
      'must use project-level flag path'
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/enforce-debug-gate.test.js`
Expected: FAIL — scripts still reference /tmp/ path

**Step 3: Update detect-test-failure.sh**

Change line 25 from:
```bash
FLAG="/tmp/.armadillo-tests-failing"
```
To:
```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
FLAG="${PLUGIN_ROOT}/context/.tests-failing"
```

Note: `PLUGIN_ROOT` resolves to the plugin root (e.g., `plugins/core/`), and `.claude/context/` is a symlink chain that reaches the same place. Use `${PLUGIN_ROOT}/context/.tests-failing` for consistency with other hooks that already use `PLUGIN_ROOT`.

Also remove the existing `set -eu` and `INPUT` lines, replacing with the proper header that resolves paths. The full top of the file should look like:

```bash
#!/usr/bin/env bash
# PostToolUse hook: detects test command failures and sets a flag.
# Matcher: Bash — fires on every Bash tool call.
# When a test command produces failure output, sets .claude/context/.tests-failing.
# The systematic-debugging skill clears this flag.

set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

INPUT=$(jq -r '.' < /dev/stdin 2>/dev/null || echo '{}')
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")
RESULT=$(echo "$INPUT" | jq -r '.tool_response // ""' 2>/dev/null || echo "")
```

And change line 25's FLAG to: `FLAG="${PLUGIN_ROOT}/context/.tests-failing"`

**Step 4: Update enforce-debug-before-fix.sh**

Change line 11 from:
```bash
FLAG="/tmp/.armadillo-tests-failing"
```
To:
```bash
FLAG="${PLUGIN_ROOT}/context/.tests-failing"
```

`PLUGIN_ROOT` is already resolved on line 8-9 of this script (`SCRIPT_DIR` and `PLUGIN_ROOT`). No new path resolution needed.

**Step 5: Run test to verify it passes**

Run: `node --test tests/enforce-debug-gate.test.js`
Expected: PASS — all tests including new project-level path tests

**Step 6: Run full test suite**

Run: `npm test`
Expected: All pass

**Step 7: Commit**

```bash
git add plugins/core/hooks/detect-test-failure.sh plugins/core/hooks/enforce-debug-before-fix.sh tests/enforce-debug-gate.test.js
git commit -m "test: verify project-level test-failure flag path"
git commit --allow-empty -m "feat: move test-failure flag to .claude/context for cross-subagent persistence"
```

---

### Task 3: Remove keyword filter from task-completed.sh

**Files:**
- Modify: `plugins/core/hooks/task-completed.sh:9-18` (remove case statement)
- Create: `tests/task-completed-universal.test.js`

**Context:** Currently `task-completed.sh` only runs tests for tasks matching keywords like "implement", "fix", "add". Remove this filter so ALL task completions run the test suite. If no test runner exists, it passes (line 50: `return 0`).

**Step 1: Write the failing test**

```js
// tests/task-completed-universal.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(__dirname, '..', '.claude', 'hooks', 'task-completed.sh');

describe('task-completed.sh — universal enforcement', () => {
  it('does NOT have a keyword-based case filter', () => {
    const content = readFileSync(SCRIPT, 'utf8');
    // The old filter matched: *implement*|*fix*|*add*|*feat*|*refactor*|*create*|*build*|*update*|*write*
    assert.ok(
      !content.includes('*implement*|*fix*|*add*'),
      'keyword case filter must be removed — all tasks should run tests'
    );
  });

  it('still reads task subject from stdin', () => {
    const content = readFileSync(SCRIPT, 'utf8');
    assert.ok(content.includes('task_subject') || content.includes('TASK_SUBJECT'));
  });

  it('runs test suite for any task', () => {
    const content = readFileSync(SCRIPT, 'utf8');
    assert.ok(content.includes('run_tests'), 'must call run_tests function');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/task-completed-universal.test.js`
Expected: FAIL — case filter still exists

**Step 3: Update task-completed.sh**

Remove lines 12-18 (the `case` statement):

```bash
# DELETE THIS:
# Only enforce on code-related tasks
case "$TASK_SUBJECT" in
  *implement*|*fix*|*add*|*feat*|*refactor*|*create*|*build*|*update*|*write*)
    ;;
  *)
    exit 0
    ;;
esac
```

The script should go straight from reading `TASK_SUBJECT` to the `run_tests()` function. Keep `TASK_SUBJECT` — it's used in the error message on line 59.

**Step 4: Run test to verify it passes**

Run: `node --test tests/task-completed-universal.test.js`
Expected: PASS

**Step 5: Run full test suite**

Run: `npm test`
Expected: All pass

**Step 6: Commit**

```bash
git add plugins/core/hooks/task-completed.sh tests/task-completed-universal.test.js
git commit -m "test: verify task-completed runs tests for all tasks"
git commit --allow-empty -m "feat: remove keyword filter from task-completed — all tasks run test suite"
```

---

### Task 4: Subagent-start test state injection

**Files:**
- Modify: `plugins/core/hooks/subagent-start.sh`
- Create: `tests/subagent-test-state.test.js`

**Context:** When `.claude/context/.tests-failing` exists, subagent-start.sh should inject a warning into the subagent's context so it knows tests are currently failing.

**Step 1: Write the failing test**

```js
// tests/subagent-test-state.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(__dirname, '..', '.claude', 'hooks', 'subagent-start.sh');

describe('subagent-start.sh — test state injection', () => {
  it('checks for .tests-failing flag', () => {
    const content = readFileSync(SCRIPT, 'utf8');
    assert.ok(
      content.includes('.tests-failing') || content.includes('tests-failing'),
      'must check for test failure flag'
    );
  });

  it('injects warning when tests are failing', () => {
    const content = readFileSync(SCRIPT, 'utf8');
    assert.ok(
      content.includes('systematic-debugging') || content.includes('tests are.*failing'),
      'must warn about failing tests and point to debugging skill'
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/subagent-test-state.test.js`
Expected: FAIL — subagent-start.sh doesn't check test state yet

**Step 3: Update subagent-start.sh**

After the existing `output_style` block (line 27) and before the empty check (line 29), add:

```bash
# Inject test failure warning if flag exists
TEST_FAIL_FLAG="${PLUGIN_ROOT}/context/.tests-failing"
if [ -f "$TEST_FAIL_FLAG" ]; then
  STANDARDS_CONTEXT="${STANDARDS_CONTEXT}\n\n<test-failure-warning>Tests are currently failing in this project. Use the systematic-debugging skill (invoke Skill tool with skill=\"systematic-debugging\") before writing implementation code.</test-failure-warning>"
fi
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/subagent-test-state.test.js`
Expected: PASS

**Step 5: Run full test suite**

Run: `npm test`
Expected: All pass

**Step 6: Commit**

```bash
git add plugins/core/hooks/subagent-start.sh tests/subagent-test-state.test.js
git commit -m "test: verify subagent-start injects test failure warning"
git commit --allow-empty -m "feat: subagent-start warns when tests are failing"
```

---

### Task 5: task-completed.sh commit-order audit (backstop)

**Files:**
- Modify: `plugins/core/hooks/task-completed.sh`
- Modify: `tests/task-completed-universal.test.js` (add audit test)

**Context:** After running tests, task-completed.sh checks git log for feat:/fix: commits without a preceding test: commit on the current branch. This is a WARNING (not a block) — the commit-order hook (Task 1) catches it at commit time. This backstop catches edge cases like escape hatch usage.

**Step 1: Write the failing test**

Add to `tests/task-completed-universal.test.js`:

```js
describe('task-completed.sh — commit order audit', () => {
  it('checks git log for TDD commit order', () => {
    const content = readFileSync(SCRIPT, 'utf8');
    assert.ok(
      content.includes('test:') && content.includes('git log'),
      'must audit git log for test: commits'
    );
  });

  it('warns but does not block on missing test commits', () => {
    const content = readFileSync(SCRIPT, 'utf8');
    // Should contain a warning message about TDD order but NOT exit 2 for this check
    assert.ok(
      content.includes('TDD') || content.includes('test.*commit'),
      'must reference TDD commit order in audit'
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/task-completed-universal.test.js`
Expected: FAIL — no git log audit in task-completed.sh yet

**Step 3: Update task-completed.sh**

After the test pass check (after line 62, before `exit 0`), add:

```bash
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
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/task-completed-universal.test.js`
Expected: PASS — all tests

**Step 5: Run full test suite**

Run: `npm test`
Expected: All pass

**Step 6: Commit**

```bash
git add plugins/core/hooks/task-completed.sh tests/task-completed-universal.test.js
git commit -m "test: verify task-completed audits TDD commit order"
git commit --allow-empty -m "feat: task-completed warns when feat/fix commits lack test: commits"
```

---

### Task 6: Create git-setup skill

**Files:**
- Create: `plugins/core/skills/git-setup/SKILL.md`
- Create: `tests/git-setup-skill.test.js`
- Modify: `skills.json` (add skill to core bundle)

**Context:** New skill that detects a project's git health and installs branch protection, git-workflow rule, install-hooks script, and version-bump automation. Invocable via `/git-setup`. Onboarding calls it automatically (Task 7).

**Step 1: Write the failing test**

```js
// tests/git-setup-skill.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SKILL_PATH = resolve(ROOT, '.claude', 'skills', 'git-setup', 'SKILL.md');

describe('git-setup skill', () => {
  it('SKILL.md exists', () => {
    assert.ok(existsSync(SKILL_PATH), 'git-setup/SKILL.md must exist');
  });

  it('has required frontmatter fields', () => {
    const content = readFileSync(SKILL_PATH, 'utf8');
    assert.ok(content.includes('name: git-setup'));
    assert.ok(content.includes('description:'));
  });

  it('covers detection phase', () => {
    const content = readFileSync(SKILL_PATH, 'utf8');
    assert.ok(content.includes('.githooks') || content.includes('githooks'));
    assert.ok(content.includes('git-workflow'));
    assert.ok(content.includes('conventional commit') || content.includes('conventional-commit'));
  });

  it('covers pre-commit hook installation', () => {
    const content = readFileSync(SKILL_PATH, 'utf8');
    assert.ok(content.includes('pre-commit'));
    assert.ok(content.includes('ARMADILLO_ALLOW_MAIN'));
  });

  it('covers version-bump automation', () => {
    const content = readFileSync(SKILL_PATH, 'utf8');
    assert.ok(content.includes('version-bump') || content.includes('version bump'));
    assert.ok(content.includes('semver') || content.includes('minor') || content.includes('major'));
  });

  it('offers local hook vs CI choice for version-bump', () => {
    const content = readFileSync(SKILL_PATH, 'utf8');
    assert.ok(content.includes('pre-push') || content.includes('local'));
    assert.ok(content.includes('GitHub Actions') || content.includes('CI'));
  });

  it('is registered in skills.json core bundle', () => {
    const skills = JSON.parse(readFileSync(resolve(ROOT, 'skills.json'), 'utf8'));
    assert.ok(skills.bundles.core.skills.includes('git-setup'));
  });

  it('has skill entry in skills.json', () => {
    const skills = JSON.parse(readFileSync(resolve(ROOT, 'skills.json'), 'utf8'));
    assert.ok(skills.skills['git-setup'], 'skills.json must have git-setup entry');
    assert.ok(skills.skills['git-setup'].files.length > 0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/git-setup-skill.test.js`
Expected: FAIL — skill doesn't exist

**Step 3: Create the skill**

Create `plugins/core/skills/git-setup/SKILL.md`:

```markdown
---
model: claude-sonnet-4-6
name: git-setup
description: Use when a project has no git strategy, no branch protection, no conventional commits, or when the user says "set up git", "git workflow", "branch protection", or "version bumping". Also use when onboarding detects missing git hygiene.
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, AskUserQuestion
---

# Git Setup

## Overview

Detects a project's git health and installs armadillo's git workflow: branch protection, conventional commits, squash merge policy, and version-bump automation.

**Mandatory Announcement — FIRST OUTPUT before anything else:**

```
┏━ 🔧 git-setup ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [one-line description of what git setup action] ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

No exceptions. Box frame first, then work.

## When to Use

- Project has no `.githooks/` directory
- Project has no `git-workflow.md` rule
- No conventional commit history detected
- User says "set up git", "branch protection", "version bump"
- Called automatically by onboarding during Phase 1

## Step 1: Detection

Scan the project for git health signals:

```bash
# Check for branch protection
ls .githooks/pre-commit 2>/dev/null

# Check for git-workflow rule
ls .claude/rules/git-workflow.md 2>/dev/null

# Check for conventional commits in recent history
git log -10 --oneline 2>/dev/null | grep -cE '^[a-f0-9]+ (feat|fix|chore|docs|test|refactor)(\([^)]*\))?:'

# Check for package.json with version
node -e "const p=require('./package.json');console.log(p.version||'')" 2>/dev/null

# Check current branch
git branch --show-current 2>/dev/null
```

### Detection Report

Present findings:

```
## Git Health Check

| Component | Status |
|-----------|--------|
| Branch protection (.githooks/pre-commit) | ✗ Missing |
| Git workflow rule (.claude/rules/git-workflow.md) | ✗ Missing |
| Conventional commits (last 10) | 2/10 |
| Version in package.json | ✓ v1.2.3 |
| Current branch | main (⚠ working directly on main) |
```

## Step 2: Branch Protection

Ask the user:

```
▸ Install branch protection? This adds a pre-commit hook that blocks direct
  commits to main/master. You'll create branches for all feature work.

  Escape hatch: ARMADILLO_ALLOW_MAIN=1 git commit ...
```

Use **AskUserQuestion**:
- **"Yes, install it" (Recommended)** — install hook
- **"No, skip"** — continue without branch protection

### If yes:

1. Create `.githooks/pre-commit`:

```bash
#!/bin/bash
# Pre-commit hook: Block commits directly to main/master
# Escape hatch: ARMADILLO_ALLOW_MAIN=1 git commit ...

BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")

if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  if [ "${ARMADILLO_ALLOW_MAIN:-0}" = "1" ]; then
    exit 0
  fi

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✗ Direct commits to $BRANCH are blocked."
  echo ""
  echo "  Create a branch first:"
  echo "    git checkout -b feat/your-feature"
  echo ""
  echo "  Emergency override:"
  echo "    ARMADILLO_ALLOW_MAIN=1 git commit ..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi

exit 0
```

2. Make executable: `chmod +x .githooks/pre-commit`

3. Install to `.git/hooks/`:
```bash
cp .githooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

4. If `package.json` exists, add a postinstall script to auto-install hooks:

Check if `scripts.postinstall` already exists. If not:
```bash
node -e "
const pkg = require('./package.json');
if (!pkg.scripts) pkg.scripts = {};
if (!pkg.scripts.postinstall) {
  pkg.scripts.postinstall = 'cp .githooks/* .git/hooks/ 2>/dev/null && chmod +x .git/hooks/* 2>/dev/null || true';
  require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\\n');
}
"
```

## Step 3: Git Workflow Rule

Auto-install `.claude/rules/git-workflow.md` (no question — this is core convention):

```markdown
# Git Workflow

## Branch-First Policy

**Never commit directly to `main`.** All work happens on a branch, gets reviewed via PR, and merges via squash.

### Branch Naming

| Prefix | When |
|--------|------|
| `feat/` | New feature or capability |
| `fix/` | Bug fix |
| `chore/` | Tooling, deps, config |
| `docs/` | Documentation only |
| `test/` | Tests only |
| `refactor/` | Code restructure |

Format: `<type>/<short-description>` — e.g. `feat/auth-refresh`, `fix/null-checkout`

## Commit Conventions

- Frequent, atomic commits
- Conventional commit messages (feat, fix, refactor, test, docs, chore)
- TDD order: test commit before (or with) implementation commit

## Merge Strategy

Always squash merge via PR — one commit per feature on main, clean linear history.
```

Create the directory if needed: `mkdir -p .claude/rules`

## Step 4: Version-Bump Automation

If `package.json` exists with a `version` field, offer version-bump automation.

```
▸ Set up automatic version bumping? Conventional commits drive semver:
  feat: → minor, fix: → patch, breaking (!) → major

  Two options:
  1. Local pre-push hook (runs before each push)
  2. GitHub Actions workflow (runs in CI after merge)
```

Use **AskUserQuestion**:
- **"Local pre-push hook" (Recommended)** — runs locally before push
- **"GitHub Actions workflow"** — runs in CI
- **"No version bumping"** — skip

### Option A: Local pre-push hook

Create `.githooks/pre-push`:

```bash
#!/bin/bash
# Pre-push hook: auto-bump version from conventional commits
# Creates a version tag based on commit types since last tag

set -e

# Get latest tag
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
LATEST_VERSION=${LATEST_TAG#v}

# Get commits since last tag
COMMITS=$(git log "${LATEST_TAG}..HEAD" --oneline 2>/dev/null || git log --oneline)

if [ -z "$COMMITS" ]; then
  exit 0
fi

# Detect change type
HAS_BREAKING=$(echo "$COMMITS" | grep -cE '^[a-f0-9]+ [a-z]+!:' || true)
HAS_FEAT=$(echo "$COMMITS" | grep -cE '^[a-f0-9]+ feat(\([^)]*\))?:' || true)

IFS='.' read -r MAJOR MINOR PATCH <<< "$LATEST_VERSION"

if [ "$HAS_BREAKING" -gt 0 ]; then
  MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0
elif [ "$HAS_FEAT" -gt 0 ]; then
  MINOR=$((MINOR + 1)); PATCH=0
else
  PATCH=$((PATCH + 1))
fi

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"

# Update package.json version
node -e "
const pkg = JSON.parse(require('fs').readFileSync('package.json', 'utf8'));
pkg.version = '${NEW_VERSION}';
require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Commit and tag
git add package.json
git commit -m "chore: release ${NEW_VERSION}" --no-verify
git tag "v${NEW_VERSION}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Bumped to v${NEW_VERSION}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

Make executable and install:
```bash
chmod +x .githooks/pre-push
cp .githooks/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

### Option B: GitHub Actions workflow

Create `.github/workflows/version-bump.yml`:

```yaml
name: Version Bump

on:
  push:
    branches: [main]

jobs:
  bump:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Bump version from commits
        run: |
          LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
          COMMITS=$(git log "${LATEST_TAG}..HEAD" --oneline)

          if [ -z "$COMMITS" ]; then exit 0; fi

          HAS_BREAKING=$(echo "$COMMITS" | grep -cE '^[a-f0-9]+ [a-z]+!:' || true)
          HAS_FEAT=$(echo "$COMMITS" | grep -cE '^[a-f0-9]+ feat(\([^)]*\))?:' || true)

          IFS='.' read -r MAJOR MINOR PATCH <<< "${LATEST_TAG#v}"

          if [ "$HAS_BREAKING" -gt 0 ]; then
            MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0
          elif [ "$HAS_FEAT" -gt 0 ]; then
            MINOR=$((MINOR + 1)); PATCH=0
          else
            PATCH=$((PATCH + 1))
          fi

          NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"

          node -e "
          const pkg = JSON.parse(require('fs').readFileSync('package.json', 'utf8'));
          pkg.version = '${NEW_VERSION}';
          require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
          "

          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add package.json
          git commit -m "chore: release ${NEW_VERSION} [skip ci]"
          git tag "v${NEW_VERSION}"
          git push && git push --tags
```

## Step 5: Summary

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Git workflow configured

▪ Branch protection: ✓ (pre-commit hook)
▪ Git workflow rule: ✓ (.claude/rules/git-workflow.md)
▪ Hook auto-install: ✓ (postinstall script)
▪ Version bumping: ✓ (pre-push hook / GitHub Actions)

▸ Commit these changes?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If user approves, commit all changes:
```bash
git add .githooks/ .claude/rules/git-workflow.md package.json .github/workflows/version-bump.yml
git commit -m "chore: configure git workflow with branch protection and version bumping"
```

## Key Rules

1. **Always ask before installing branch protection** — never auto-install hooks that block user actions
2. **git-workflow.md is auto-installed** — core convention, no question needed
3. **Version-bump is opt-in** — not every project wants automated versioning
4. **Never overwrite existing hooks** — if `.githooks/pre-commit` exists, read it first and merge or ask
5. **postinstall only if package.json exists** — non-Node projects skip this

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Installing pre-commit without asking | Always ask — it blocks a core workflow |
| Overwriting existing .githooks/ files | Read first, merge or ask |
| Adding postinstall to non-Node projects | Check for package.json first |
| Skipping hook chmod | Always chmod +x after creating hooks |
| Not copying to .git/hooks/ | Hooks in .githooks/ don't run until copied |
```

**Step 4: Register in skills.json**

Add `"git-setup"` to `skills.json`:

In `bundles.core.skills` array, add `"git-setup"`.

In the `skills` object, add:

```json
"git-setup": {
  "name": "Git Setup",
  "description": "Use when a project has no git strategy, no branch protection, no conventional commits, or when the user says 'set up git', 'git workflow', 'branch protection', or 'version bumping'. Also use when onboarding detects missing git hygiene.",
  "files": [
    "skills/git-setup/SKILL.md"
  ],
  "bundle": "core"
}
```

**Step 5: Run test to verify it passes**

Run: `node --test tests/git-setup-skill.test.js`
Expected: PASS — all 9 assertions

**Step 6: Run full test suite**

Run: `npm test`
Expected: All pass

**Step 7: Commit**

```bash
git add plugins/core/skills/git-setup/SKILL.md tests/git-setup-skill.test.js skills.json
git commit -m "test: add git-setup skill tests"
git commit --allow-empty -m "feat: add git-setup skill for project git workflow"
```

---

### Task 7: Wire git-setup into onboarding

**Files:**
- Modify: `plugins/core/skills/onboarding/SKILL.md`
- Create: `tests/onboarding-git-setup.test.js`

**Context:** Onboarding Phase 1 should detect git health and invoke git-setup automatically. Add a git health check step after the existing Phase 1 scan.

**Step 1: Write the failing test**

```js
// tests/onboarding-git-setup.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SKILL_PATH = resolve(ROOT, '.claude', 'skills', 'onboarding', 'SKILL.md');

describe('onboarding — git-setup integration', () => {
  it('references git-setup skill', () => {
    const content = readFileSync(SKILL_PATH, 'utf8');
    assert.ok(content.includes('git-setup'), 'onboarding must reference git-setup skill');
  });

  it('checks for .githooks or git-workflow.md', () => {
    const content = readFileSync(SKILL_PATH, 'utf8');
    assert.ok(
      content.includes('.githooks') || content.includes('git-workflow'),
      'onboarding must check for git health indicators'
    );
  });

  it('invokes git-setup during fresh install', () => {
    const content = readFileSync(SKILL_PATH, 'utf8');
    assert.ok(
      content.includes('git-setup') && (content.includes('Fresh Install') || content.includes('Phase 2') || content.includes('Phase 1')),
      'must invoke git-setup during install flow'
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/onboarding-git-setup.test.js`
Expected: FAIL — onboarding doesn't reference git-setup

**Step 3: Update onboarding SKILL.md**

Find the "### For Fresh Installs:" section (around line 224). After step 4 (Permission mode selection, around line 335), add step 5:

```markdown
5. **Git workflow setup** — invoke the `git-setup` skill to detect and configure the project's git strategy:

   ```
   Invoke Skill tool with skill="git-setup"
   ```

   This checks for branch protection, git-workflow rule, conventional commits, and version-bump automation. The user walks through each component — nothing is forced.

   If `.githooks/` already exists or `.claude/rules/git-workflow.md` already exists, git-setup detects them and skips those steps.
```

Renumber the subsequent steps (current step 5 "Knowledge base" becomes step 6).

Also, for the **Migration** path (Phase 1), add a note after the classification report:

```markdown
**Git health check:** After classification, check if the project has `.githooks/` or `.claude/rules/git-workflow.md`. If neither exists, note it for Phase 2 — git-setup will be invoked after the migration completes.
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/onboarding-git-setup.test.js`
Expected: PASS

**Step 5: Run full test suite**

Run: `npm test`
Expected: All pass

**Step 6: Commit**

```bash
git add plugins/core/skills/onboarding/SKILL.md tests/onboarding-git-setup.test.js
git commit -m "test: verify onboarding integrates git-setup"
git commit --allow-empty -m "feat: onboarding invokes git-setup for project git workflow"
```

---

### Task 8: Update armadillo-shepherd routing table

**Files:**
- Modify: `plugins/core/skills/armadillo-shepherd/SKILL.md`
- Create: `tests/shepherd-git-setup.test.js`

**Context:** The routing table needs an entry for git-setup so requests like "set up git", "branch protection", "version bump" route correctly.

**Step 1: Write the failing test**

```js
// tests/shepherd-git-setup.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_PATH = resolve(__dirname, '..', '.claude', 'skills', 'armadillo-shepherd', 'SKILL.md');

describe('armadillo-shepherd — git-setup routing', () => {
  it('has git-setup in the routing table', () => {
    const content = readFileSync(SKILL_PATH, 'utf8');
    assert.ok(content.includes('git-setup'), 'routing table must include git-setup skill');
  });

  it('routes git workflow requests to git-setup', () => {
    const content = readFileSync(SKILL_PATH, 'utf8');
    assert.ok(
      content.includes('git strategy') || content.includes('branch protection') || content.includes('version bump'),
      'routing table must describe git-setup triggers'
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/shepherd-git-setup.test.js`
Expected: FAIL — shepherd doesn't have git-setup entry

**Step 3: Update armadillo-shepherd/SKILL.md**

In the "### Git & Workspace" routing table section, add:

```markdown
| Set up git workflow, branch protection, version bump | `git-setup` |
```

So the table becomes:

```markdown
### Git & Workspace

| Request | Skill |
|---------|-------|
| Feature work needs isolation | `using-git-worktrees` |
| Set up git workflow, branch protection, version bump | `git-setup` |
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/shepherd-git-setup.test.js`
Expected: PASS

**Step 5: Run full test suite**

Run: `npm test`
Expected: All pass

**Step 6: Commit**

```bash
git add plugins/core/skills/armadillo-shepherd/SKILL.md tests/shepherd-git-setup.test.js
git commit -m "test: verify shepherd routes to git-setup"
git commit --allow-empty -m "feat: shepherd routes git workflow requests to git-setup skill"
```

---

### Task 9: Update CLAUDE.md and rebuild

**Files:**
- Modify: `scripts/build-claude-md.js` (if git-setup needs to appear in the generated CLAUDE.md)
- Run: `node scripts/sync-all.js`
- Run: `npm test`

**Context:** After adding a new skill to the core bundle, CLAUDE.md needs to be regenerated and sync-all needs to validate everything.

**Step 1: Rebuild CLAUDE.md**

Run: `node scripts/build-claude-md.js`

This regenerates `.claude/CLAUDE.md` from skills.json and marketplace.json. git-setup should appear in the Git section of the skills table.

**Step 2: Run sync validation**

Run: `node scripts/sync-all.js`
Expected: All systems in sync

**Step 3: Run full test suite**

Run: `npm test`
Expected: All 677+ tests pass

**Step 4: Verify hook installation**

Run: `node scripts/install-hooks.js`
Expected: Both pre-commit and pre-push installed

**Step 5: Commit if changes**

```bash
git add .claude/CLAUDE.md
git commit -m "chore: regenerate CLAUDE.md with git-setup skill"
```

(Only if build-claude-md.js produced changes.)

---

### Task 10: Full verification

**Step 1: Run everything**

```bash
npm test
node scripts/sync-all.js
node scripts/install-hooks.js
```

**Step 2: Verify commit history**

```bash
git log --oneline -20
```

Verify TDD commit order: test commits before feat commits in the log.

**Step 3: Summary**

All tasks complete when:
- 677+ tests pass (including ~20 new tests)
- sync-all validates
- hooks installed
- git-setup skill exists and is routed
- TDD enforcement hooks wired and tested
