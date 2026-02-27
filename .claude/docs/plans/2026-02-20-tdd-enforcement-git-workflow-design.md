# TDD Enforcement Overhaul + Armadilloer Git Workflow — Design

**Date:** 2026-02-20
**Status:** Approved
**Scope:** Fix TDD enforcement gaps, add git-setup skill for Armadilloer projects

## Context

TDD is documented but not enforced. Nothing verifies RED-before-GREEN order. Subagents bypass state via /tmp/. Config tasks skip the gate entirely. Meanwhile, Armadilloers have no automated git strategy — armadillo has the skills (worktrees, finishing-a-branch, writing-prs) but nothing detects that a project lacks git hygiene or sets it up.

## Part 1: TDD Enforcement Fixes

### 1a. Commit-Order Enforcement Hook

**What:** New PostToolUse hook on Bash. When a `git commit` runs with a `feat:` or `fix:` message, check the branch's recent git log for a preceding `test:` commit. If none exists, block with exit 2.

**Message:** "TDD requires a test: commit before feat:/fix: commits. Write the failing test first."

**Escape hatch:** `ARMADILLO_SKIP_TDD=1` for rare cases (pure config, docs-only branches).

**Hook wiring:**
- PostToolUse matcher: Bash
- Script: `plugins/core/hooks/enforce-tdd-order.sh`
- Fires after every Bash call, checks if command was a git commit with feat:/fix: prefix

### 1b. Project-Level Test Failure Flag

**What:** Move flag from `/tmp/.armadillo-tests-failing` to `.claude/context/.tests-failing`.

**Why:** `/tmp/` is session-scoped. Fresh subagent = fresh /tmp/ = no flag. `.claude/context/` is shared across all subagents and already gitignored.

**Files changed:**
- `plugins/core/hooks/detect-test-failure.sh` — write to `.claude/context/.tests-failing`
- `plugins/core/hooks/enforce-debug-before-fix.sh` — read from `.claude/context/.tests-failing`

### 1c. Remove Keyword Filter from task-completed.sh

**What:** Delete the `case` statement (lines 12-18) that only enforces on "implement/fix/add/feat/refactor/create/build/update/write" tasks. Always run the test suite.

**Why:** Skill changes, hook edits, and config updates can break tests. If no test runner is found, it passes anyway (existing fallback behavior at line 50).

### 1d. Subagent-Start Test State Injection

**What:** `subagent-start.sh` checks `.claude/context/.tests-failing`. If present, inject warning: "Tests are currently failing. Use systematic-debugging before implementation."

**Why:** Subagents need to know the project has failing tests before they start writing code.

### 1e. task-completed.sh Commit-Order Audit

**What:** After running tests, check the branch's git log for the current task. If `feat:`/`fix:` commits exist without a preceding `test:` commit, warn in output.

**Why:** Backstop for 1a. The commit-order hook catches it at commit time; this catches anything that slipped through (e.g., escape hatch usage).

## Part 2: Armadilloer Git Workflow

### 2a. New Skill: git-setup

Standalone skill invocable via `/git-setup`. Also called automatically during onboarding Phase 1.

#### Detection Phase

Scans the project for:
- `.githooks/` directory (branch protection)
- `git-workflow.md` rule in `.claude/rules/` (conventions)
- Conventional commit history (last 10 commits for `feat:`, `fix:`, etc.)
- `package.json` with version field (version-bump candidate)
- Current branch = main with uncommitted work (immediate nudge)

#### Setup Phase

| Component | What it installs | User choice? |
|-----------|-----------------|--------------|
| Pre-commit hook | `.githooks/pre-commit` blocking main/master, `ARMADILLO_ALLOW_MAIN=1` escape hatch | Yes |
| git-workflow.md rule | Branch naming (feat/, fix/, chore/), conventional commits, squash merge | Auto-install |
| install-hooks.js | Copies `.githooks/*` to `.git/hooks/` on npm install (postinstall) | Auto if package.json exists |
| Version-bump automation | Pre-push hook or CI workflow: reads conventional commits, bumps semver, creates tag | Yes — asks local hook vs CI |

#### Version-Bump for Armadilloers

Simpler than armadillo's internal version-bump:
- Reads conventional commits since last tag
- `feat:` = minor, `fix:` = patch, `!` = major
- Bumps `package.json` version
- Creates git tag
- No CHANGELOG.json, no README update, no sync-all (armadillo-repo-specific)
- Two modes: **pre-push hook** (local) or **GitHub Actions workflow** (CI-based, for teams)

### 2b. Onboarding Integration

Onboarding Phase 1 adds a git health check step. If the project lacks git-workflow.md or .githooks/, invoke `git-setup` skill automatically. User walks through setup as part of onboarding.

### What This Does NOT Do

- No custom branching strategies (always branch-first + squash merge)
- No monorepo versioning (single package.json only)
- No CI setup beyond version-bump (that's the github-actions skill's job)

## Summary

| Change | Type | Risk |
|--------|------|------|
| Commit-order enforcement hook | New hook | Low — escape hatch prevents lockout |
| Project-level test flag | Hook edit (2 files) | Low — same behavior, different path |
| Remove keyword filter | Hook edit (1 file) | Low — passthrough when no tests found |
| Subagent-start injection | Hook edit (1 file) | Low — informational warning only |
| task-completed commit audit | Hook edit (1 file) | Low — warning only, not blocking |
| git-setup skill | New skill | Low — user-driven, every step is opt-in |
| Onboarding integration | Skill edit | Low — delegates to git-setup |
