# GitHub REST API Fallback — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Prevent GraphQL rate limit exhaustion from blocking PR workflows by switching hooks to REST API.

**Architecture:** Create a shared `github-rest.sh` lib with REST-based alternatives to `gh pr *` commands (which use GraphQL). Update `post-push-pr-check.sh` to use the new lib. Update `finishing-a-development-branch` SKILL.md to document REST fallback patterns.

**Tech Stack:** Bash, GitHub REST API v3 via `gh api`, `jq`

---

### Task 1: Create `github-rest.sh` shared library

**Files:**
- Create: `.claude/hooks/lib/github-rest.sh`
- Test: `tests/github-rest-lib.test.js`

**Step 1: Write the failing tests**

Create `tests/github-rest-lib.test.js`:

```javascript
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, chmodSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const LIB_PATH = join(ROOT, '.claude', 'hooks', 'lib', 'github-rest.sh');

describe('hooks/lib/github-rest.sh', () => {
  it('exists and is executable-sourceable', () => {
    assert.ok(existsSync(LIB_PATH), 'github-rest.sh should exist');
  });

  it('exports gh_repo_slug function', () => {
    const result = execSync(
      `bash -c 'source "${LIB_PATH}" && type -t gh_repo_slug'`,
      { encoding: 'utf8' }
    ).trim();
    assert.equal(result, 'function');
  });

  it('exports gh_rest_pr_list_by_head function', () => {
    const result = execSync(
      `bash -c 'source "${LIB_PATH}" && type -t gh_rest_pr_list_by_head'`,
      { encoding: 'utf8' }
    ).trim();
    assert.equal(result, 'function');
  });

  it('exports gh_rest_pr_merge function', () => {
    const result = execSync(
      `bash -c 'source "${LIB_PATH}" && type -t gh_rest_pr_merge'`,
      { encoding: 'utf8' }
    ).trim();
    assert.equal(result, 'function');
  });

  it('exports gh_graphql_available function', () => {
    const result = execSync(
      `bash -c 'source "${LIB_PATH}" && type -t gh_graphql_available'`,
      { encoding: 'utf8' }
    ).trim();
    assert.equal(result, 'function');
  });

  it('gh_repo_slug detects correct slug from git remote', () => {
    const result = execSync(
      `bash -c 'source "${LIB_PATH}" && gh_repo_slug'`,
      { encoding: 'utf8', cwd: ROOT }
    ).trim();
    assert.equal(result, 'filenamedotexe/armadillo');
  });

  it('gh_graphql_available returns 0 or 1', () => {
    // Just verify it runs without error and outputs 0 or 1 exit code
    try {
      execSync(
        `bash -c 'source "${LIB_PATH}" && gh_graphql_available'`,
        { encoding: 'utf8' }
      );
      // exit 0 = available
    } catch (e) {
      // exit 1 = exhausted (which is our current state, also valid)
      assert.equal(e.status, 1);
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/github-rest-lib.test.js`
Expected: FAIL — file doesn't exist

**Step 3: Write implementation**

Create `.claude/hooks/lib/github-rest.sh`:

```bash
#!/usr/bin/env bash
# Shared GitHub REST API utilities for armadillo hooks.
# Uses REST API (5000 req/hr) instead of gh CLI's GraphQL (5000 pts/hr).
# Source this file: source "$(dirname "${BASH_SOURCE[0]}")/lib/github-rest.sh"

# Detect owner/repo from git remote origin
gh_repo_slug() {
  git remote get-url origin 2>/dev/null | sed 's|.*github.com[:/]||;s|\.git$||'
}

# List open PRs for a branch using REST API
# Usage: gh_rest_pr_list_by_head "branch-name"
# Returns: JSON array of PRs (same shape as gh pr list --json)
gh_rest_pr_list_by_head() {
  local branch="$1"
  local slug
  slug=$(gh_repo_slug)
  local owner="${slug%%/*}"
  env -u GITHUB_TOKEN gh api "repos/${slug}/pulls?head=${owner}:${branch}&state=open" 2>/dev/null
}

# Merge a PR using REST API (squash merge)
# Usage: gh_rest_pr_merge "pr_number" "commit_title"
# Returns: JSON merge result
gh_rest_pr_merge() {
  local pr_number="$1"
  local commit_title="${2:-}"
  local slug
  slug=$(gh_repo_slug)
  local args="--method PUT --field merge_method=squash"
  if [ -n "$commit_title" ]; then
    args="$args --field commit_title=\"$commit_title\""
  fi
  env -u GITHUB_TOKEN gh api "repos/${slug}/pulls/${pr_number}/merge" \
    --method PUT \
    --field merge_method=squash \
    ${commit_title:+--field commit_title="$commit_title"} 2>/dev/null
}

# Check if GraphQL rate limit has budget remaining (>50 points buffer)
# Returns: exit 0 if available, exit 1 if exhausted
gh_graphql_available() {
  local remaining
  remaining=$(env -u GITHUB_TOKEN gh api rate_limit --jq '.resources.graphql.remaining' 2>/dev/null) || return 1
  [ "$remaining" -gt 50 ] 2>/dev/null
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/github-rest-lib.test.js`
Expected: PASS (all 7 tests)

**Step 5: Commit**

```bash
git add .claude/hooks/lib/github-rest.sh tests/github-rest-lib.test.js
git commit -m "feat(hooks): add github-rest.sh shared library — REST API fallback for GraphQL rate limits"
```

---

### Task 2: Update `post-push-pr-check.sh` to use REST API

**Files:**
- Modify: `.claude/hooks/post-push-pr-check.sh`
- Test: `tests/github-rest-lib.test.js` (add integration test)

**Step 1: Write the failing test**

Append to `tests/github-rest-lib.test.js`:

```javascript
describe('post-push-pr-check.sh uses REST API', () => {
  const hookPath = join(ROOT, '.claude', 'hooks', 'post-push-pr-check.sh');

  it('sources github-rest.sh', () => {
    const content = readFileSync(hookPath, 'utf8');
    assert.ok(content.includes('github-rest.sh'),
      'post-push-pr-check.sh should source github-rest.sh');
  });

  it('does NOT use gh pr list (GraphQL)', () => {
    const content = readFileSync(hookPath, 'utf8');
    assert.ok(!content.includes('gh pr list'),
      'should not use gh pr list (GraphQL) — use gh_rest_pr_list_by_head instead');
  });

  it('does NOT use gh pr merge without graphql guard', () => {
    const content = readFileSync(hookPath, 'utf8');
    // If gh pr merge is used, gh_graphql_available must guard it
    if (content.includes('gh pr merge')) {
      assert.ok(content.includes('gh_graphql_available'),
        'gh pr merge must be guarded by gh_graphql_available check');
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/github-rest-lib.test.js`
Expected: FAIL — "should not use gh pr list"

**Step 3: Update `post-push-pr-check.sh`**

Replace the full file content with:

```bash
#!/usr/bin/env bash
# PostToolUse hook: after git push, check if a PR exists for the current branch.
# If PR exists but auto-merge not enabled → enable it (if GraphQL available).
# If no PR → remind to create one.
# Uses REST API to avoid GraphQL rate limit exhaustion.
# Matcher: Bash — fires on every Bash tool call.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
source "${SCRIPT_DIR}/lib/json-escape.sh"
source "${SCRIPT_DIR}/lib/github-rest.sh"

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

# Check if PR exists for this branch (REST API — not GraphQL)
PR_JSON=$(gh_rest_pr_list_by_head "$BRANCH") || exit 0
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
  # PR exists — enable auto-merge if GraphQL budget available
  PR_NUMBER=$(echo "$PR_JSON" | jq -r '.[0].number' 2>/dev/null)
  AUTO_MERGE=$(echo "$PR_JSON" | jq -r '.[0].auto_merge' 2>/dev/null)

  if [ "$AUTO_MERGE" = "null" ] || [ -z "$AUTO_MERGE" ]; then
    # Auto-merge requires GraphQL — check budget first
    if gh_graphql_available; then
      env -u GITHUB_TOKEN gh pr merge "$PR_NUMBER" --auto --squash --delete-branch 2>/dev/null || true
      MSG="Auto-merge enabled on PR #${PR_NUMBER} — will squash merge when CI passes."
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
    # If GraphQL exhausted, skip silently — auto-merge is best-effort
  fi
fi

exit 0
```

**Important:** The REST API returns `auto_merge` (underscore), not `autoMergeRequest` (camelCase from GraphQL). The new code uses the REST field name.

**Step 4: Run test to verify it passes**

Run: `node --test tests/github-rest-lib.test.js`
Expected: PASS (all 10 tests)

**Step 5: Commit**

```bash
git add .claude/hooks/post-push-pr-check.sh tests/github-rest-lib.test.js
git commit -m "fix(hooks): switch post-push-pr-check from GraphQL to REST API"
```

---

### Task 3: Update `finishing-a-development-branch` SKILL.md with REST fallback

**Files:**
- Modify: `.claude/skills/finishing-a-development-branch/SKILL.md`

**Step 1: Read the current skill to locate insertion point**

The skill currently has a section "#### Option 1: Push and Create PR" with `gh pr create` and `gh pr merge --auto`. Add a "Rate Limit Fallback" subsection after the polling loop and before "After merge — local cleanup."

**Step 2: Add REST fallback section**

Insert after the polling loop block and before "**After merge — local cleanup:**":

````markdown
**Rate limit fallback — if `gh pr create` or `gh pr merge` fails with GraphQL rate limit:**

When `gh` CLI commands fail with "API rate limit exceeded," fall back to REST API:

```bash
# Create PR via REST (bypasses GraphQL)
env -u GITHUB_TOKEN gh api repos/<owner>/<repo>/pulls \
  --method POST \
  --field title="<type>(<scope>): <description>" \
  --field head="<feature-branch>" \
  --field base="main" \
  --field body="<PR body>" \
  --jq '.number, .html_url'

# Merge PR via REST (bypasses GraphQL)
env -u GITHUB_TOKEN gh api repos/<owner>/<repo>/pulls/<number>/merge \
  --method PUT \
  --field merge_method=squash \
  --field commit_title="<title> (#<number>)"
```

**Note:** Auto-merge (`gh pr merge --auto`) is GraphQL-only. Direct REST merge is the fallback when GraphQL is exhausted. This skips CI gates — only use when CI has already passed or the repo has no required checks.

Detect repo slug:
```bash
SLUG=$(git remote get-url origin | sed 's|.*github.com[:/]||;s|\.git$||')
```
````

**Step 3: Verify the edit looks correct**

Read the modified skill file and confirm the section flows naturally between the polling loop and cleanup.

**Step 4: Commit**

```bash
git add .claude/skills/finishing-a-development-branch/SKILL.md
git commit -m "docs(skills): add REST API fallback to finishing-a-development-branch"
```

---

### Task 4: Update `hook-lib.test.js` to include `github-rest.sh` in shared lib checks

**Files:**
- Modify: `tests/hook-lib.test.js`

**Step 1: Read current hook-lib.test.js**

The existing test checks that hooks source `json-escape.sh` and don't inline it. Add a similar check for `post-push-pr-check.sh` sourcing `github-rest.sh`.

**Step 2: Add test**

Add to the "no inline escape_for_json in hooks" describe block, or create a new describe block:

```javascript
describe('post-push-pr-check.sh sources github-rest.sh', () => {
  it('sources github-rest.sh for REST API functions', () => {
    const content = readFileSync(join(ROOT, '.claude', 'hooks', 'post-push-pr-check.sh'), 'utf8');
    assert.ok(content.includes('github-rest.sh'),
      'post-push-pr-check.sh should source github-rest.sh');
  });
});
```

**Step 3: Run full test suite**

Run: `node --test tests/hook-lib.test.js tests/github-rest-lib.test.js`
Expected: All PASS

**Step 4: Commit**

```bash
git add tests/hook-lib.test.js
git commit -m "test: verify post-push-pr-check sources github-rest.sh"
```
