# System Verification Audit — Design Doc

**Date:** 2026-02-22
**Status:** Approved
**Scope:** Diagnostic audit of Armadillo + Claude Code setup alignment

## Background

Full 8-section verification audit of the Armadillo system against current Claude Code documentation (Feb 2026). Identified 15 priority actions to improve alignment, fix drift, and close gaps.

## Critical Findings

### 1. settings.json ↔ hooks.json Drift
Three enforcement hooks exist in `hooks.json` (armadillo's source of truth) but are missing from `settings.json` (what Claude Code actually reads):
- `enforce-tdd-order.sh` (PostToolUse/Bash)
- `nap-ninja-hook.sh` (PostToolUse/Write|Edit)
- `env-ninja-hook.sh` (PostToolUse/Write|Edit)

**Impact:** TDD commit ordering, NAP warnings, and ENV warnings are silently disabled.

### 2. Test Suite Broken
Tests import `vitest` but `package.json` runs `node --test`. All 4 tests fail with `ERR_MODULE_NOT_FOUND`.

### 3. TaskCompleted Hook Scope
Runs full test suite on every task completion including research tasks, blocking non-code completions.

### 4. Skill `model:` Field Not Enforced
Without `context: fork`, skills run on the parent model regardless of their `model:` field. Only 2 of 29 core skills have `context: fork`.

## Approved Priority List

### P0 — Broken Right Now
1. Sync settings.json from hooks.json (add 3 missing hooks)
2. Fix test suite (vitest/node:test mismatch)
3. Add TaskCompleted scope filter (skip tests for research tasks)

### P1 — High-Value Gaps
4. Add `Stop` hook (final verification gate)
5. Add `SubagentStop` hook (post-subagent quality gate)
6. Add `SessionEnd` hook (cleanup temp files + rotate snapshots)
7. Add `PostToolUseFailure` hook (corrective error context)
8. Add doctor.js check for settings↔hooks.json drift

### P2 — Polish
9. Add `statusMessage` to hooks for better UX
10. Add snapshot rotation in pre-compact (keep last 10)
11. Create sharp/image-processing reference skill
12. Create pdf-generation reference skill
13. Add architecture.md documenting agent hierarchy

### P3 — Future
14. Explore prompt-type and agent-type hooks

### Bonus — User Approved
15. Add `context: fork` to skills that specify non-parent models

## Design Decisions

- **hooks.json stays** — it's the source of truth for onboarding, updating-armadillo, sync-all.js, build-docs.js
- **Plan/Explore blocking stays** — core armadillo identity, do NOT move to permissions.deny
- **Pack system stays unchanged** — no restructuring needed
- **`/tmp` flag files for skill gating** — pragmatic, no better native alternative exists
