---
model: claude-sonnet-4-6
name: finishing-a-development-branch
description: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup
---

# Finishing a Development Branch

## Overview

Guide completion of development work by presenting clear options and handling chosen workflow.

**Core principle:** Verify tests → Present options → Execute choice → Clean up.

**First action — before anything else:**
```bash
touch /tmp/.armadillo-merge-skill-active
```
This flag authorizes merge operations. Without it, the PreToolUse hook blocks merging. The flag is single-use — consumed when the merge REST call runs.

**Mandatory Announcement — FIRST OUTPUT before anything else:**

```
┏━ 🚀 finishing-a-development-branch ━━━━━━━━━━━━┓
┃ [one-line description of what branch/work]      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

No exceptions. Box frame first, then work.

## The Process

### Step 1: Verify Tests

**Before presenting options, verify tests pass. Use `run_in_background: true`. Poll with `TaskOutput`.**

**Step 1a: Discover test command.** Check in order:
1. `package.json` scripts → `npm test`
2. `Cargo.toml` → `cargo test`
3. `pyproject.toml` / `setup.cfg` / `pytest.ini` → `pytest`
4. `go.mod` → `go test ./...`
5. `Makefile` with test target → `make test`
6. If none found, check for test files (`*.test.*`, `*_test.*`, `tests/` directory)

**Step 1b: Run ALL discovered test suites.** Projects may have multiple test layers (e.g., `npm test` for unit tests AND `.claude/tests/` for skill tests). Run every discoverable test suite — do not pick one and skip the rest.

```bash
# Example: run both unit tests and integration tests
npm test
.claude/tests/explicit-skill-requests/run-all.sh
```

**If some tests require external services** (API calls, live databases, etc.) that are unavailable, still run them — report the results and note which failures are environment-related vs. code-related. Do NOT skip tests because they "probably" fail or "seem" unrelated.

**Step 1c: Check branch age.**

```bash
BRANCH_DATE=$(git log -1 --format=%ci HEAD)
# Calculate days old (macOS-compatible)
DAYS_OLD=$(( ( $(date +%s) - $(date -j -f "%Y-%m-%d %H:%M:%S %z" "$BRANCH_DATE" +%s) ) / 86400 ))
```

| Age | Action |
|-----|--------|
| ≤ 7 days | Continue normally |
| 7-14 days | `⚠ Branch is <N> days old. Consider rebasing onto main before proceeding.` |
| > 14 days | `◆ Branch has drifted significantly from main (<N> days). Strongly recommend rebasing before merge.` |

**If tests fail:**
```
Tests failing (<N> failures). Must fix before completing:

[Show failures]

Cannot proceed with merge/PR until tests pass.
```

Stop. Don't proceed to Step 2.

**If all tests pass:** Continue to Step 2.

**If tests have pre-existing failures** (confirmed via `git stash && run tests && git stash pop` or checking failures exist on base branch too): Note the pre-existing failures explicitly, confirm no new failures were introduced, then continue to Step 2.

### Step 1.5: Auto-Generate Changelog (Armadillo Repo Only)

**This step only applies when working in the armadillo repo.** Detect by checking:
```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('package.json','utf-8')).name)"
```
If the output is `armadillo`, proceed. Otherwise skip to Step 2.

**Step 1.5a: Identify changed skills.**

```bash
# Get the base branch merge-base
BASE=$(git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null)

# List changed skill files
git diff --name-only $BASE..HEAD -- .claude/skills/ skills.json
```

If no skill files changed, skip to Step 2.

**Step 1.5b: Analyze changes and generate entries.**

For each changed skill:
1. Read the diff: `git diff $BASE..HEAD -- <file>`
2. Determine the change type:
   - New file not in base → `added`
   - Modified existing file → `improved`
   - File deleted → `removed`
   - Bug fix (check commit messages for "fix") → `fixed`
3. Write a one-line `summary` describing what changed
4. Write an optional `details` field if the change is substantial
5. Set `breaking: true` if the change could break existing user customizations

**Step 1.5c: Read current CHANGELOG.json and append entries.**

1. Read `CHANGELOG.json` from repo root
2. Read current version from `package.json`
3. If the version key already exists in the changelog, append new entries to its `changes` array (don't duplicate — check if a similar entry already exists by matching `skill` + `files`)
4. If the version key doesn't exist, create it with today's date
5. Write the updated `CHANGELOG.json`
6. Stage it: `git add CHANGELOG.json`

**Step 1.5d: Commit the changelog update.**

```bash
git add CHANGELOG.json
git commit -m "docs: update CHANGELOG.json for <version>"
```

**Important:** This commit happens before Step 2 (base branch determination) and Step 3 (presenting options). The changelog should be part of the branch's commits before a PR is created.

### Step 2: Determine Base Branch

```bash
# Try common base branches
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

Or ask: "This branch split from main - is that correct?"

### Step 2.5: Integration Branch Detection

Check if an integration branch exists that this feature should target:

```bash
git branch -r | grep 'origin/integrate/' | head -5
```

If integration branches exist, check for file overlap:

```bash
# Files changed on this branch
git diff main...HEAD --name-only > /tmp/my-files.txt
# Files changed on integration branch
git diff main...origin/integrate/<name> --name-only > /tmp/integrate-files.txt
# Overlap
comm -12 <(sort /tmp/my-files.txt) <(sort /tmp/integrate-files.txt)
```

If overlap detected:
```
ℹ Integration branch `integrate/<name>` exists with overlapping files.
  Consider merging into the integration branch instead of main.

  ▸ Target main or integrate/<name>?
```

### Step 3: Present Options

Present exactly these 4 options:

```
Implementation complete. What would you like to do?

1. Push and create a Pull Request
2. Push and create a Draft PR (WIP — not ready for review)
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

**Don't add explanation** - keep options concise.

### Step 4: Execute Choice

#### Option 1: Push and Create PR

**Use the `writing-prs` skill** to build the PR description. Invoke it:

```
Skill tool → skill: "writing-prs"
```

The skill handles:
- Conventional commits title format
- Hybrid PR template (Why, Changes, conditional Review Guide, Test Plan, Links)
- `env -u GITHUB_TOKEN` prefix on all `gh api` commands
- REST API calls (not GraphQL)

If the writing-prs skill is unavailable, push and create manually via REST:

```bash
env -u GITHUB_TOKEN git push -u origin <feature-branch>

# Detect repo slug
SLUG=$(git remote get-url origin | sed 's|.*github.com[:/]||;s|\.git$||')

# Create PR via REST
BODY=$(cat <<'EOF'
## Why
<motivation>

## Changes
▪ <change 1>
▪ <change 2>

## Test plan
- [ ] <test command>
- [ ] <manual verification step>

Generated with [Claude Code](https://claude.com/claude-code)
EOF
)
PR_NUM=$(env -u GITHUB_TOKEN gh api "repos/${SLUG}/pulls" \
  --method POST \
  --field title="<type>(<scope>): <description>" \
  --field head="<feature-branch>" \
  --field base="main" \
  --field body="$BODY" \
  --jq '.number')
echo "Created PR #${PR_NUM}"
```

**Merge via REST:**
```bash
env -u GITHUB_TOKEN gh api "repos/${SLUG}/pulls/${PR_NUM}/merge" \
  --method PUT \
  --field merge_method=squash \
  --field commit_title="<type>(<scope>): <description> (#${PR_NUM})"
```

**Poll for merge completion (if using auto-merge via branch protection):**
```bash
for i in $(seq 1 30); do
  STATE=$(env -u GITHUB_TOKEN gh api "repos/${SLUG}/pulls/${PR_NUM}" --jq '.state' 2>/dev/null)
  MERGED=$(env -u GITHUB_TOKEN gh api "repos/${SLUG}/pulls/${PR_NUM}" --jq '.merged' 2>/dev/null)
  if [ "$MERGED" = "true" ]; then break; fi
  sleep 10
done
```

**After merge — local cleanup:**
```bash
git checkout main
env -u GITHUB_TOKEN git pull
git fetch --prune
git branch -D <feature-branch>
```

Then: Cleanup worktree (Step 5)

#### Option 2: Push and Create Draft PR

Same as Option 1 but with `--field draft=true`:

```bash
env -u GITHUB_TOKEN git push -u origin <feature-branch>

SLUG=$(git remote get-url origin | sed 's|.*github.com[:/]||;s|\.git$||')
BODY=$(cat <<'EOF'
## Why
<motivation>

## Changes
▪ <change 1>
▪ <change 2>

## Status
Work in progress — not ready for review

Generated with [Claude Code](https://claude.com/claude-code)
EOF
)
PR_NUM=$(env -u GITHUB_TOKEN gh api "repos/${SLUG}/pulls" \
  --method POST \
  --field title="<type>(<scope>): <description>" \
  --field head="<feature-branch>" \
  --field base="main" \
  --field body="$BODY" \
  --field draft=true \
  --jq '.number')
echo "Created draft PR #${PR_NUM}"
```

Report: "Draft PR #N created. Convert to ready when done."

**Don't cleanup worktree** — WIP means user will come back to it.

#### Option 3: Keep As-Is

Report: "Keeping branch <name>. Worktree preserved at <path>."

**Don't cleanup worktree.**

#### Option 4: Discard

**Confirm first:**
```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

Wait for exact confirmation.

If confirmed:
```bash
git checkout <base-branch>
git branch -D <feature-branch>
```

Then: Cleanup worktree (Step 5)

### Step 5: Cleanup Worktree

**For Options 1 and 4:**

Check if in worktree:
```bash
git worktree list | grep $(git branch --show-current)
```

If yes:
```bash
git worktree remove <worktree-path>
```

**For Options 2 and 3:** Keep worktree.

## Quick Reference

| Option | Merge | Push | Keep Worktree | Cleanup Branch |
|--------|-------|------|---------------|----------------|
| 1. Create PR | auto (CI gate) | ✓ | until merged | ✓ (after merge) |
| 2. Draft PR | - | ✓ | ✓ (WIP) | - |
| 3. Keep as-is | - | - | ✓ | - |
| 4. Discard | - | - | - | ✓ (force) |

## Common Mistakes

**Skipping test verification**
- **Problem:** Merge broken code, create failing PR
- **Fix:** Always verify tests before offering options

**Rationalizing skipping tests**
- **Problem:** "Tests need external services" or "failures look pre-existing" used as excuse to not run them at all
- **Fix:** Always run tests. If they need external services, run them anyway and report results. If failures are pre-existing, prove it by checking the base branch. Never skip.

**Open-ended questions**
- **Problem:** "What should I do next?" → ambiguous
- **Fix:** Present exactly 4 structured options

**Automatic worktree cleanup**
- **Problem:** Remove worktree when might need it (Options 2 or 3)
- **Fix:** Only cleanup for Options 1 and 4

**No confirmation for discard**
- **Problem:** Accidentally delete work
- **Fix:** Require typed "discard" confirmation

## Red Flags

**Never:**
- Proceed with failing tests
- Merge without verifying tests on result
- Delete work without confirmation
- Force-push without explicit request
- Push directly to `main` — always go through a PR
- Start implementation on main/master branch without explicit user consent

**Always:**
- Verify tests before offering options
- Present exactly 4 options
- Get typed confirmation for Option 4
- Clean up worktree for Options 1 & 4 only

## Integration

**Called by:**
- **subagent-driven-development** (Step 7) - After all tasks complete
- **executing-plans** (Step 5) - After all batches complete

**Pairs with:**
- **using-git-worktrees** - Cleans up worktree created by that skill

**Auto-changelog:**
- When in the armadillo repo, auto-generates `CHANGELOG.json` entries before creating PR
- Detects repo by checking `package.json` name is `armadillo`
- Only runs when `.claude/skills/` or `skills.json` files changed
