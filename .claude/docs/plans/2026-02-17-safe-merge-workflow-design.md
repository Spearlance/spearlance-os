# Safe Merge Workflow — Design

**Date:** 2026-02-17
**Status:** Approved
**Approach:** GitHub-native enforcement + skill updates

## Problem

Everything commits directly to `main`. No branch protection, no PRs, no CI gate on pull requests. A small team (2–5) pushing freely to main risks broken releases and no review trail.

## Goal

Keep `main` always clean and releasable. Enforce review via GitHub (not just convention). Guide Claude through the correct flow via skill updates.

---

## Section 1 — Branching Model

Trunk-based. `main` is the only permanent branch.

```
main (protected, always releasable)
  └── feature/<short-description>
  └── fix/<short-description>
  └── chore/<short-description>
```

- All branches cut from latest `main`
- Branches deleted after merge
- `v*` tags on `main` trigger existing publish workflow

---

## Section 2 — GitHub Configuration (one-time setup)

### Branch protection on `main`
- No direct pushes (all users including admins)
- PR required before merge
- At least 1 approving review required
- Stale reviews dismissed on new commits
- Squash merge only (merge commits + rebase disabled at repo level)

### PR Template — `.github/PULL_REQUEST_TEMPLATE.md`
```markdown
## What
<!-- one sentence -->

## Why
<!-- context / ticket link -->

## Test plan
- [ ] item

## Screenshots / output (if relevant)
```

### CODEOWNERS — `.github/CODEOWNERS`
```
* @filenamedotexe
```
Auto-requests review from repo owner on every PR.

---

## Section 3 — CI Workflow

**File:** `.github/workflows/ci.yml`
**Triggers:** `pull_request`, push to `feature/**`, `fix/**`, `chore/**`

```yaml
on:
  pull_request:
  push:
    branches: ['feature/**', 'fix/**', 'chore/**']

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      # tests added here as the project grows
```

`npm ci` is the initial gate. Branch protection requires this check to pass before merge.

---

## Section 4 — Skills Updates

### `finishing-a-development-branch`
- **Remove** Option 1 (merge locally) — branch protection rejects it anyway
- **Renumber** to 3 options: Push + PR, Keep as-is, Discard
- **Add** explicit rule: never push directly to `main`, always PR
- **Add** squash merge instruction to the PR step

### `using-git-worktrees`
- **Add** branch naming convention: `feature/`, `fix/`, `chore/` prefixes
- **Add** explicit step: always pull latest `main` before creating worktree

### No new skills needed
`using-git-worktrees` → `finishing-a-development-branch` → `requesting-code-review` is the complete loop.

---

## Complete Workflow

```
1. git pull origin main (latest)
2. using-git-worktrees → creates feature/fix/chore branch
3. implement + commit (TDD cycle)
4. finishing-a-development-branch → push + gh pr create
5. requesting-code-review → review requested
6. CI passes, reviewer approves → squash merge via GitHub UI or gh pr merge --squash
7. branch deleted, worktree removed
```

---

## Files Changed / Created

| File | Action |
|------|--------|
| `.github/workflows/ci.yml` | Create |
| `.github/PULL_REQUEST_TEMPLATE.md` | Create |
| `.github/CODEOWNERS` | Create |
| `.claude/skills/finishing-a-development-branch/SKILL.md` | Update |
| `.claude/skills/using-git-worktrees/SKILL.md` | Update |
| GitHub branch protection rules | Configure via `gh` CLI |
| GitHub repo merge settings (squash-only) | Configure via `gh` CLI |
