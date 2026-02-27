# Safe Merge Workflow — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Enforce PR-only merges to `main` via GitHub branch protection, CI, and updated skills.

**Architecture:** Create GitHub config files and update two skills while still able to push directly to `main`. Then configure branch protection — after that point all changes must go through PRs.

**Tech Stack:** GitHub Actions, `gh` CLI, YAML, Markdown

**Critical ordering:** All file changes must be committed and pushed to `main` BEFORE enabling branch protection. Once protection is active, direct pushes are blocked.

---

### Task 1: Create `.github/workflows/ci.yml`

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: Create the GitHub Actions CI workflow**

```yaml
name: CI

on:
  pull_request:
  push:
    branches:
      - 'feature/**'
      - 'fix/**'
      - 'chore/**'

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci
      # Add test/lint commands here as project grows
```

**Step 2: Verify file is valid YAML**

```bash
node -e "require('fs').readFileSync('.github/workflows/ci.yml', 'utf8'); console.log('OK')"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions CI workflow for PRs and feature branches"
```

---

### Task 2: Create `.github/PULL_REQUEST_TEMPLATE.md`

**Files:**
- Create: `.github/PULL_REQUEST_TEMPLATE.md`

**Step 1: Create the PR template**

```markdown
## What
<!-- one sentence describing what this PR does -->

## Why
<!-- context, motivation, or link to issue -->

## Test plan
- [ ]

## Screenshots / output (if relevant)
```

**Step 2: Commit**

```bash
git add .github/PULL_REQUEST_TEMPLATE.md
git commit -m "chore: add PR template"
```

---

### Task 3: Create `.github/CODEOWNERS`

**Files:**
- Create: `.github/CODEOWNERS`

**Step 1: Create CODEOWNERS**

```
# All files require review from repo owner
* @filenamedotexe
```

**Step 2: Commit**

```bash
git add .github/CODEOWNERS
git commit -m "chore: add CODEOWNERS — all files require review from @filenamedotexe"
```

---

### Task 4: Update `finishing-a-development-branch` skill

**Files:**
- Modify: `.claude/skills/finishing-a-development-branch/SKILL.md`

**Step 1: Read current file to understand exact text**

Read `.claude/skills/finishing-a-development-branch/SKILL.md`

**Step 2: Update the "Remember" section — add direct-push prohibition**

Find:
```
- Never start implementation on main/master branch without explicit user consent
```

Replace with:
```
- Never push directly to `main` — always go through a PR
- Never start implementation on main/master branch without explicit user consent
```

**Step 3: Remove "Option 1: Merge Locally" from Step 3 — present exactly 3 options**

Find the Step 3 options block:
```
1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work
```

Replace with:
```
1. Push and create a Pull Request
2. Keep the branch as-is (I'll handle it later)
3. Discard this work
```

**Step 4: Remove "Option 1: Merge Locally" implementation section**

Delete the entire `#### Option 1: Merge Locally` section (the git checkout / pull / merge / branch -d block).

**Step 5: Renumber the remaining Execute Choice sections**

- `#### Option 2: Push and Create PR` → `#### Option 1: Push and Create PR`
- `#### Option 3: Keep As-Is` → `#### Option 2: Keep As-Is`
- `#### Option 4: Discard` → `#### Option 3: Discard`

**Step 6: Add squash merge instruction to the PR step**

In the `#### Option 1: Push and Create PR` section, after `gh pr create ...`, add:

```bash
# Reviewer approves → merge with squash
gh pr merge --squash --delete-branch
```

**Step 7: Update the Quick Reference table**

Replace:
```
| 1. Merge locally | ✓ | - | - | ✓ |
| 2. Create PR | - | ✓ | ✓ | - |
| 3. Keep as-is | - | - | ✓ | - |
| 4. Discard | - | - | - | ✓ (force) |
```

With:
```
| 1. Create PR | - | ✓ | ✓ | - |
| 2. Keep as-is | - | - | ✓ | - |
| 3. Discard | - | - | - | ✓ (force) |
```

**Step 8: Verify the file reads cleanly — no orphaned Option references**

```bash
grep -n "Option [0-9]" .claude/skills/finishing-a-development-branch/SKILL.md
```

Expected: Only options 1, 2, 3 appear. No "Option 4" remaining.

**Step 9: Commit**

```bash
git add .claude/skills/finishing-a-development-branch/SKILL.md
git commit -m "feat: enforce PR-only merges in finishing-a-development-branch skill"
```

---

### Task 5: Update `using-git-worktrees` skill

**Files:**
- Modify: `.claude/skills/using-git-worktrees/SKILL.md`

**Step 1: Read current file**

Read `.claude/skills/using-git-worktrees/SKILL.md`

**Step 2: Add "pull latest main" as the first creation step**

Find the `## Creation Steps` / `### 1. Detect Project Name` section:

```
### 1. Detect Project Name

```bash
project=$(basename "$(git rev-parse --show-toplevel)")
```
```

Replace with:

```
### 1. Pull Latest Main

Before creating a worktree, ensure you're branching from the latest `main`:

```bash
git checkout main
git pull origin main
```

### 2. Detect Project Name

```bash
project=$(basename "$(git rev-parse --show-toplevel)")
```
```

**Step 3: Renumber all subsequent creation steps**

- `### 2. Create Worktree` → `### 3. Create Worktree`
- `### 3. Run Project Setup` → `### 4. Run Project Setup`
- `### 4. Verify Clean Baseline` → `### 5. Verify Clean Baseline`
- `### 5. Report Location` → `### 6. Report Location`

**Step 4: Add branch naming convention to the Create Worktree section**

Find in `### 3. Create Worktree`:
```
# Create worktree with new branch
git worktree add "$path" -b "$BRANCH_NAME"
```

Add above it:
```
# Branch naming convention:
#   feature/<short-description>  — new functionality
#   fix/<short-description>      — bug fixes
#   chore/<short-description>    — maintenance, deps, config
```

**Step 5: Update the Example Workflow section**

Find:
```
[Create worktree: git worktree add .worktrees/auth -b feature/auth]
```

Update the example to show the pull step first:
```
[git checkout main && git pull origin main]
[Create worktree: git worktree add .worktrees/auth -b feature/auth]
```

**Step 6: Verify step numbers are consistent — no duplicate numbers**

```bash
grep "^### [0-9]\." .claude/skills/using-git-worktrees/SKILL.md
```

Expected: Steps 1–6 each appear exactly once.

**Step 7: Commit**

```bash
git add .claude/skills/using-git-worktrees/SKILL.md
git commit -m "feat: add branch naming convention and pull-latest-main step to using-git-worktrees"
```

---

### Task 6: Push all commits to `main`

**This is the last direct push to main. After this, branch protection is enabled.**

**Step 1: Check what's going up**

```bash
git log origin/main..HEAD --oneline
```

Expected: The 5 commits from Tasks 1–5 listed.

**Step 2: Push**

```bash
git push origin main
```

Expected: Clean push, no errors.

**Step 3: Confirm on GitHub**

```bash
gh repo view filenamedotexe/armadillo-cli --web
```

Visually confirm all commits are on `main`.

---

### Task 7: Configure GitHub repo — squash-only merge

**Step 1: Disable merge commits and rebase, enable squash only**

```bash
gh api repos/filenamedotexe/armadillo-cli \
  --method PATCH \
  -f allow_squash_merge=true \
  -f allow_merge_commit=false \
  -f allow_rebase_merge=false \
  -f squash_merge_commit_title=PR_TITLE \
  -f squash_merge_commit_message=PR_BODY
```

**Step 2: Verify**

```bash
gh api repos/filenamedotexe/armadillo-cli \
  --jq '{squash: .allow_squash_merge, merge: .allow_merge_commit, rebase: .allow_rebase_merge}'
```

Expected:
```json
{
  "squash": true,
  "merge": false,
  "rebase": false
}
```

---

### Task 8: Configure GitHub branch protection on `main`

**Step 1: Apply branch protection rules**

```bash
gh api repos/filenamedotexe/armadillo-cli/branches/main/protection \
  --method PUT \
  --input - << 'EOF'
{
  "required_status_checks": null,
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true
}
EOF
```

> **Note:** `required_status_checks: null` for now — CI check context doesn't exist in GitHub until the workflow runs at least once on a PR. After the first PR with CI passing, run Task 9 to lock it in.

> **Note:** `enforce_admins: false` means you can bypass as admin if truly stuck. Set to `true` for strict enforcement.

**Step 2: Verify protection is active**

```bash
gh api repos/filenamedotexe/armadillo-cli/branches/main/protection \
  --jq '{
    pr_required: .required_pull_request_reviews.required_approving_review_count,
    dismiss_stale: .required_pull_request_reviews.dismiss_stale_reviews,
    codeowners: .required_pull_request_reviews.require_code_owner_reviews,
    force_push: .allow_force_pushes,
    linear: .required_linear_history
  }'
```

Expected:
```json
{
  "pr_required": 1,
  "dismiss_stale": true,
  "codeowners": true,
  "force_push": false,
  "linear": true
}
```

**Step 3: Verify a direct push to main is now blocked**

```bash
git commit --allow-empty -m "test: verify branch protection"
git push origin main
```

Expected: `remote: error: GH006: Protected branch update failed`

```bash
git reset HEAD~1
```

Clean up the test commit.

---

### Task 9: Add CI as required status check (run after first PR merges)

> **Run this task after the first PR has gone through CI successfully.** The `ci` check context must exist in GitHub before it can be required.

**Step 1: Add required status check**

```bash
gh api repos/filenamedotexe/armadillo-cli/branches/main/protection \
  --method PUT \
  --input - << 'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["ci"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true
}
EOF
```

**Step 2: Verify**

```bash
gh api repos/filenamedotexe/armadillo-cli/branches/main/protection \
  --jq '.required_status_checks.contexts'
```

Expected: `["ci"]`

---

## Workflow Summary (post-implementation)

```
git checkout main && git pull origin main
  → using-git-worktrees → feature/fix/chore branch + worktree
  → implement (TDD cycle, frequent commits)
  → finishing-a-development-branch → push + gh pr create
  → requesting-code-review → reviewer notified
  → CI passes → reviewer approves → gh pr merge --squash --delete-branch
  → worktree removed
```

`main` only ever moves forward via squash-merged, reviewed, CI-passing PRs.
