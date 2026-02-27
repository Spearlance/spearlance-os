# Git Hygiene Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Bake hands-off git hygiene into armadillo — auto-merge, branch cleanup, main protection, stale branch detection — for both dillas and this repo itself.

**Architecture:** Four changes: (1) `finishing-a-development-branch` gets `--auto` + full post-merge local cleanup with polling, (2) `git-workflow` rule gets branch-first policy + naming conventions + cleanup commands, (3) `post-push-pr-check.sh` auto-enables auto-merge on every push, (4) `doctor.js` gets stale branch check. All changes apply to this repo immediately (eat our own cooking).

**Tech Stack:** Bash, Node.js, `gh` CLI, `git`, Node test runner

---

### Task 1: RED — tests for git-workflow rule branch-first policy

**Files:**
- Create: `tests/git-hygiene.test.js`

**Step 1: Write the failing tests**

```js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULE = readFileSync(resolve(__dirname, '../.claude/rules/git-workflow.md'), 'utf8');
const SKILL = readFileSync(resolve(__dirname, '../.claude/skills/finishing-a-development-branch/SKILL.md'), 'utf8');
const HOOK = readFileSync(resolve(__dirname, '../.claude/hooks/post-push-pr-check.sh'), 'utf8');
const DOCTOR = readFileSync(resolve(__dirname, '../.claude/lib/doctor.js'), 'utf8');

describe('git-workflow rule — branch-first policy', () => {
  test('prohibits direct pushes to main', () => {
    assert.ok(RULE.includes('never') || RULE.includes('Never'), 'must say never');
    assert.ok(RULE.toLowerCase().includes('main'), 'must mention main');
    assert.ok(RULE.includes('branch') || RULE.includes('PR'), 'must require branch/PR');
  });

  test('defines branch naming convention with type prefixes', () => {
    assert.ok(RULE.includes('feat/'), 'must include feat/ prefix');
    assert.ok(RULE.includes('fix/'), 'must include fix/ prefix');
    assert.ok(RULE.includes('chore/'), 'must include chore/ prefix');
  });

  test('includes post-merge cleanup commands', () => {
    assert.ok(RULE.includes('fetch --prune') || RULE.includes('git fetch'), 'must include fetch --prune');
    assert.ok(RULE.includes('--merged'), 'must include branch --merged cleanup');
  });

  test('specifies squash merge as the merge strategy', () => {
    assert.ok(RULE.includes('squash'), 'must specify squash merge');
  });
});

describe('finishing-a-development-branch — auto-merge + cleanup', () => {
  test('uses --auto flag for auto-merge', () => {
    assert.ok(SKILL.includes('--auto'), 'must use --auto flag');
  });

  test('uses --delete-branch flag', () => {
    assert.ok(SKILL.includes('--delete-branch'), 'must use --delete-branch');
  });

  test('polls for merge completion after enabling auto-merge', () => {
    assert.ok(SKILL.includes('poll') || SKILL.includes('MERGED') || SKILL.includes('gh pr view'), 'must poll for merge state');
  });

  test('performs local branch cleanup after merge', () => {
    assert.ok(SKILL.includes('git branch -D') || SKILL.includes('git checkout main'), 'must do local cleanup');
  });

  test('runs git fetch --prune after merge', () => {
    assert.ok(SKILL.includes('fetch --prune'), 'must run fetch --prune');
  });
});

describe('post-push-pr-check — auto-enables auto-merge', () => {
  test('enables auto-merge when PR exists', () => {
    assert.ok(HOOK.includes('--auto') || HOOK.includes('auto-merge'), 'must enable auto-merge');
  });

  test('uses --squash with auto-merge', () => {
    assert.ok(HOOK.includes('squash'), 'must use squash');
  });

  test('uses --delete-branch', () => {
    assert.ok(HOOK.includes('delete-branch'), 'must delete branch');
  });
});

describe('doctor.js — stale branch detection', () => {
  test('checks for merged local branches', () => {
    assert.ok(DOCTOR.includes('--merged') || DOCTOR.includes('merged'), 'must check merged branches');
  });

  test('warns about stale branches with cleanup command', () => {
    assert.ok(DOCTOR.includes('stale') || DOCTOR.includes('merged branch'), 'must warn about stale branches');
  });
});
```

**Step 2: Run to verify FAIL**

```bash
node --test tests/git-hygiene.test.js
```
Expected: 9 failures — all features missing.

**Step 3: Commit RED**

```bash
git add tests/git-hygiene.test.js
git commit -m "test: RED tests for git hygiene — branch policy, auto-merge, cleanup, doctor"
```

---

### Task 2: GREEN — git-workflow rule branch-first policy

**Files:**
- Modify: `.claude/rules/git-workflow.md`

**Step 1: Verify test still fails**

```bash
node --test tests/git-hygiene.test.js 2>&1 | grep -E "fail|FAIL" | head -5
```

**Step 2: Rewrite git-workflow.md**

Replace the full contents with:

```markdown
# Git Workflow

## Authentication
Claude Code sets a `GITHUB_TOKEN` env var with limited scopes (`repo` only — no `workflow`). This blocks pushes that include `.github/workflows/` files.

**Always prefix git push and gh api calls with `env -u GITHUB_TOKEN`** to use the keyring token (which has full scopes) instead:

```bash
env -u GITHUB_TOKEN git push origin <branch>
env -u GITHUB_TOKEN gh api repos/...
```

## Branch-First Policy

**Never commit directly to `main`.** All work happens on a branch, gets reviewed via PR, and merges via squash.

```
main branch  →  always clean, always deployable
feature work →  branch → PR → squash merge → branch deleted
```

### Branch Naming

Match the conventional commit type:

| Prefix | When |
|--------|------|
| `feat/` | New feature or capability |
| `fix/` | Bug fix |
| `chore/` | Tooling, deps, config |
| `docs/` | Documentation only |
| `test/` | Tests only |
| `refactor/` | Code restructure |

Format: `<type>/<short-description>` — e.g. `feat/auth-refresh`, `fix/null-checkout`

### Merge Strategy

Always squash merge via PR — one commit per feature on main, clean linear history.

```bash
gh pr merge --auto --squash --delete-branch
```

`--auto` queues the merge to fire when CI passes. No manual merge step.

## Commit Conventions
- Frequent, atomic commits
- Conventional commit messages (feat, fix, refactor, test, docs, chore)
- TDD order: test commit before (or with) implementation commit

## Post-Merge Cleanup

After a branch merges, clean up local state:

```bash
git checkout main
git pull
git fetch --prune                                           # remove tracking refs for deleted remote branches
git branch --merged main | grep -v '^\*\|main\|master' | xargs git branch -d 2>/dev/null || true
```

This removes local branches that have been squash-merged. Note: squash merges require `-D` (force) since git can't detect squash-merge ancestry:

```bash
# For squash-merged branches (like feat/my-feature after PR squash):
git branch -D feat/my-feature
```

Run `node .claude/lib/doctor.js` to detect stale local branches.
```

**Step 3: Run test to verify pass**

```bash
node --test tests/git-hygiene.test.js 2>&1 | grep -E "git-workflow"
```
Expected: 4 passing for git-workflow suite.

**Step 4: Commit**

```bash
git add .claude/rules/git-workflow.md
git commit -m "feat: git-workflow rule — branch-first policy, naming conventions, post-merge cleanup"
```

---

### Task 3: GREEN — finishing-a-development-branch auto-merge + local cleanup

**Files:**
- Modify: `.claude/skills/finishing-a-development-branch/SKILL.md` (Option 1 section)

**Step 1: Verify test still fails**

```bash
node --test tests/git-hygiene.test.js 2>&1 | grep -E "finishing"
```

**Step 2: Replace Option 1 section in the skill**

Find the `#### Option 1: Push and Create PR` section (lines ~134–174) and replace with:

```markdown
#### Option 1: Push and Create PR

**Use the `writing-prs` skill** to build the PR description. Invoke it:

```
Skill tool → skill: "writing-prs"
```

After `writing-prs` creates the PR, enable auto-merge:

```bash
env -u GITHUB_TOKEN gh pr merge --auto --squash --delete-branch
```

`--auto` queues the merge to fire as soon as CI passes. No manual step needed.

**Poll for merge completion:**

```bash
# Poll every 10s until merged (max ~5 min)
for i in $(seq 1 30); do
  STATE=$(env -u GITHUB_TOKEN gh pr view --json state --jq '.state' 2>/dev/null)
  if [ "$STATE" = "MERGED" ]; then
    echo "✓ Merged"
    break
  fi
  sleep 10
done
```

**After merge — local cleanup:**

```bash
env -u GITHUB_TOKEN git checkout main
env -u GITHUB_TOKEN git pull
git fetch --prune
git branch -D <feature-branch>   # squash merges need -D
```

Then: Cleanup worktree (Step 5)
```

Also update the Quick Reference table:

```markdown
| Option | Merge | Push | Keep Worktree | Cleanup Branch |
|--------|-------|------|---------------|----------------|
| 1. Create PR | auto (CI gate) | ✓ | until merged | ✓ (after merge) |
| 2. Keep as-is | - | - | ✓ | - |
| 3. Discard | - | - | - | ✓ (force) |
```

**Step 3: Run test**

```bash
node --test tests/git-hygiene.test.js 2>&1 | grep -E "finishing"
```
Expected: 5 passing for finishing suite.

**Step 4: Commit**

```bash
git add .claude/skills/finishing-a-development-branch/SKILL.md
git commit -m "feat: finishing-a-development-branch — auto-merge with polling + local cleanup"
```

---

### Task 4: GREEN — post-push-pr-check auto-enables auto-merge

**Files:**
- Modify: `.claude/hooks/post-push-pr-check.sh`

**Step 1: Verify test still fails**

```bash
node --test tests/git-hygiene.test.js 2>&1 | grep -E "post-push"
```

**Step 2: Rewrite the hook**

Replace the full contents with:

```bash
#!/usr/bin/env bash
# PostToolUse hook: after git push, check if a PR exists for the current branch.
# If PR exists but auto-merge not enabled → enable it.
# If no PR → remind to create one.
# Matcher: Bash — fires on every Bash tool call.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
source "${SCRIPT_DIR}/lib/json-escape.sh"

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null) || COMMAND=""

# Only fire for git push commands
case "$COMMAND" in
  *"git push"*)
    ;;
  *)
    exit 0
    ;;
esac

# Get current branch
BRANCH=$(git branch --show-current 2>/dev/null) || exit 0

# Skip if on main/master — no PR needed
case "$BRANCH" in
  main|master)
    exit 0
    ;;
esac

# Check if PR exists for this branch
PR_JSON=$(env -u GITHUB_TOKEN gh pr list --head "$BRANCH" --json number,autoMergeRequest 2>/dev/null) || exit 0
PR_COUNT=$(echo "$PR_JSON" | jq 'length' 2>/dev/null) || exit 0

if [ "$PR_COUNT" = "0" ]; then
  REMINDER="No PR exists for branch '${BRANCH}'. Create one using the writing-prs skill (invoke Skill tool with skill=\"writing-prs\") or use finishing-a-development-branch."
  REMINDER_ESCAPED=$(escape_for_json "$REMINDER")
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "${REMINDER_ESCAPED}"
  }
}
EOF
else
  # PR exists — enable auto-merge if not already enabled
  PR_NUMBER=$(echo "$PR_JSON" | jq -r '.[0].number' 2>/dev/null)
  AUTO_MERGE=$(echo "$PR_JSON" | jq -r '.[0].autoMergeRequest' 2>/dev/null)

  if [ "$AUTO_MERGE" = "null" ] || [ -z "$AUTO_MERGE" ]; then
    env -u GITHUB_TOKEN gh pr merge "$PR_NUMBER" --auto --squash --delete-branch 2>/dev/null || true
    MSG="Auto-merge enabled on PR #${PR_NUMBER} — will merge when CI passes and branch will be deleted."
    MSG_ESCAPED=$(escape_for_json "$MSG")
    cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "${MSG_ESCAPED}"
  }
}
EOF
  fi
fi

exit 0
```

**Step 3: Run test**

```bash
node --test tests/git-hygiene.test.js 2>&1 | grep -E "post-push"
```
Expected: 3 passing for post-push suite.

**Step 4: Commit**

```bash
git add .claude/hooks/post-push-pr-check.sh
git commit -m "feat: post-push hook auto-enables auto-merge when PR exists"
```

---

### Task 5: GREEN — doctor.js stale branch detection

**Files:**
- Modify: `.claude/lib/doctor.js`

**Step 1: Verify test still fails**

```bash
node --test tests/git-hygiene.test.js 2>&1 | grep -E "doctor"
```

**Step 2: Add stale branch check to doctor.js**

After the version check block (around line 153, before the summary), insert:

```js
// 9. Stale local branch check
try {
  const currentBranch = execSync('git branch --show-current', { stdio: 'pipe', encoding: 'utf8' }).trim();
  const mainBranch = 'main';
  // List merged branches — note squash merges won't appear here, this catches regular merges
  const mergedRaw = execSync(`git branch --merged ${mainBranch} 2>/dev/null`, { stdio: 'pipe', encoding: 'utf8' });
  const stale = mergedRaw
    .split('\n')
    .map(b => b.trim().replace(/^\*\s*/, ''))
    .filter(b => b && b !== mainBranch && b !== 'master' && b !== currentBranch);
  if (stale.length === 0) {
    ok('No stale merged local branches');
  } else {
    warn(`${stale.length} stale merged branch(es) — already merged into main`);
    stale.forEach(b => console.log(`       ↳ ${b}  →  git branch -d ${b}`));
  }
} catch {
  // Not a git repo or git unavailable — skip silently
}
```

**Step 3: Run test**

```bash
node --test tests/git-hygiene.test.js 2>&1 | grep -E "doctor"
```
Expected: 2 passing for doctor suite.

**Step 4: Full suite**

```bash
node --test tests/*.test.js 2>&1 | tail -8
```
Expected: all pass (431 + new git-hygiene tests).

**Step 5: Commit**

```bash
git add .claude/lib/doctor.js
git commit -m "feat: doctor.js stale branch detection — warns on merged local branches"
```

---

### Task 6: Finish branch

Run full test suite, then use `armadillo:finishing-a-development-branch`.

```bash
node --test tests/*.test.js 2>&1 | tail -8
```

All pass → invoke finishing-a-development-branch skill.
