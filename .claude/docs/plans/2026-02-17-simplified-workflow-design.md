# Simplified GitHub Workflow Design

**Date:** 2026-02-17

## Goal

Remove review-gate friction for a solo maintainer while keeping CI as the quality gatekeeper.

## Branch Protection (New State)

| Setting | Value |
|---|---|
| Require PR before merging | ✅ ON |
| Required reviews | ❌ none (was 1 + CODEOWNERS) |
| enforce_admins | ❌ OFF |
| Required status checks (CI) | ✅ ON |

**Effect:** PRs are still required (no direct pushes to main), but you can merge your own PR the moment CI passes — no reviewer needed.

## Publish Workflow (New Behavior)

Add `gh pr merge --auto --squash` immediately after `gh pr create` so the version bump PR auto-merges once CI passes. Zero manual steps after triggering.

Full publish flow:
1. Trigger `workflow_dispatch` → select bump type
2. Bump version in `package.json`
3. Create `release/vX.Y.Z` branch + PR
4. Queue PR for auto-merge (merges when CI passes)
5. Publish to GitHub Packages

## Transition Steps

1. Update branch protection via API — remove required reviews + enforce_admins
2. Merge open PR #3 (`release/v0.1.1`) — housekeeping, gets main to 0.1.1
3. Update `publish.yml` — add auto-merge line
4. Commit `.claude/CLAUDE.md` unstaged change via normal PR
