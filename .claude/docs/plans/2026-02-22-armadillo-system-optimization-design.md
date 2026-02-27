# Armadillo System Optimization — Design Document

**Date:** 2026-02-22
**Status:** Approved
**Approach:** New rules + targeted skill updates (Approach B)

## Overview

System-wide optimization pass across 5 areas: bug discipline, visual regression testing, efficiency/speed, install/update policy, and git/branching strategy. Leverages Claude Code Feb 2026 native capabilities (hooks, persistent Tasks, subagent isolation, Chrome integration, Playwright MCP).

## Decisions

| Decision | Choice |
|----------|--------|
| Bug handling | Spawn background subagent immediately |
| Visual scope | Required when UI work detected, skip for pure backend/CLI |
| Install scope | ALL packs, no prompting |
| Integration branches | Auto-detect 3+ overlapping branches, suggest to developer |
| Agent Teams | Wait for stability, keep subagent model |
| Implementation approach | New rule files + targeted skill updates |

---

## Section 1: Bug Discipline

### New Rule: `.claude/rules/bug-discipline.md`

Encodes "never skip a bug" behavior globally. Three-phase protocol:

**Phase 1 — SPAWN:** When bug or unexpected behavior encountered during any work:
- Spawn background subagent with repro context (error, stack trace, file:line)
- Subagent mandate: write failing test proving the bug, create persistent Task with repro + expected behavior
- Uses `isolation: "worktree"` for safe parallel investigation

**Phase 2 — CONTINUE:** Primary work proceeds uninterrupted:
- Bug subagent runs in background
- Primary task does NOT block on bug resolution
- No derailing focus from current objective

**Phase 3 — VERIFY:** At end of current work block:
- Check bug Task status
- If subagent produced fix + passing test → merge it
- If subagent still working → flag for next action
- If subagent failed → escalate to systematic-debugging

### Skill Updates

| Skill | Change |
|-------|--------|
| `test-driven-development` | Add "bug encounter" escape hatch — spawn subagent instead of blocking |
| `executing-plans` | Same escape hatch between batch tasks |
| `subagent-driven-development` | Controller monitors for bug Tasks created by implementer subagents |

### Hook Support (Optional Automation)

`PostToolUseFailure` matched on `Bash` — when test command fails unexpectedly (not during TDD RED phase), auto-create Task with failure context.

---

## Section 2: Visual Regression Testing

### New Rule: `.claude/rules/visual-testing.md`

Activates when project has frontend stack (detected from `stack.json`, `package.json` framework deps, or file patterns like `src/components/`, `app/`, `pages/`).

**Expanded TDD Cycle:** RED → GREEN → VISUAL → REFACTOR

- **RED** — failing functional test
- **GREEN** — implementation passes functional test
- **VISUAL** — capture/verify visual baseline
  - Playwright `toHaveScreenshot()` for automated regression
  - Cross-browser: Chromium + Firefox + WebKit (minimum)
  - Viewports: mobile (375px), tablet (768px), desktop (1280px)
  - Deterministic: `animations: 'disabled'`, fonts loaded, time frozen
  - `mask` option for dynamic elements (timestamps, avatars, etc.)
- **REFACTOR** — clean up with both functional + visual tests as safety net

**Approvals:**
- Intentional visual change → `npx playwright test --update-snapshots`
- Unintentional diff → treated as RED (regression)

**Local vs CI:**
- Local: selective — only changed components' visual tests
- CI: full visual suite across all browsers + viewports

**Interactive Verification:**
- `claude --chrome` for live design verification when available
- Complementary to automated tests, not a replacement

### Skill Updates

| Skill | Change |
|-------|--------|
| `test-driven-development` | Add VISUAL step after GREEN when frontend detected |
| `playwright` | Add viewport presets + cross-browser config templates |
| `verification-before-completion` | Add visual regression check to completion gate |

### Not In Scope (Separate Pipeline)

- `visual-regression` standalone skill — in frontend pack design doc
- `storybook` skill — in frontend pack design doc
- `testing-library` skill — in frontend pack design doc

---

## Section 3: Efficiency & Speed

### Update Rule: `.claude/rules/coding-standards.md`

Add new sections:

**Selective Test Execution:**
- Local: run only tests related to changed files
  - Vitest: `--changed` flag or filename patterns
  - Playwright: `--grep` or specific test file
  - Jest: `--findRelatedTests`
- CI: full suite always — no shortcuts
- Pre-commit: affected tests only
- Pre-push: full suite

**Caching:**
- Dependencies: cache `node_modules` between installs (npm ci, lockfile hash)
- Browsers: cache Playwright browsers (~500MB) — `npx playwright install` only on miss
- Build artifacts: cache `.next/`, `dist/`, `.astro/` between builds where safe
- Test results: Vitest `--cache` for incremental runs

**Parallel Work Decomposition:**
- When task spans backend + frontend + tests:
  1. Decompose into independent workstreams
  2. Backend API → subagent A (worktree isolated)
  3. Frontend UI → subagent B (worktree isolated)
  4. Test infrastructure → subagent C (worktree isolated)
  5. Integration after all complete
- Use `dispatching-parallel-agents` for 3+ independent streams
- Use `subagent-driven-development` for sequential-with-review

**Timeout Budgets:**
- Subagent tasks: 10 min max before status check
- If no progress after 2 checks → escalate to user
- Background Bash: 5 min max for builds, 10 min for full test suites

### Skill Updates

| Skill | Change |
|-------|--------|
| `dispatching-parallel-agents` | Add timeout guidance, worktree isolation default for implementation agents |
| `executing-plans` | Allow batch size adjustment based on task complexity (not hardcoded at 3) |
| `subagent-driven-development` | Add caching hints to implementer prompts |

---

## Section 4: Install & Update Policy

### Skill Update: `onboarding`

**Full Install — No Prompting:**
- Remove interactive pack selection (AskUserQuestion multiSelect)
- Install ALL packs unconditionally
- Every Armadilloer gets the complete skill library
- Skills that don't match their stack sit dormant — zero overhead

**Keep These Prompts:**
- Permission mode (acceptEdits vs bypassPermissions)
- git-setup sub-skill
- Greenfield detection → fresh-project
- Quality audit gate (Phase 5e)

**Remove These Prompts:**
- Pack selection (Phase 2 interactive path)
- Knowledge base templates (roll into full install)

### Skill Update: `updating-armadillo`

**FIX: Intelligence layer skip bug:**
- Step 5.5 MUST run every update cycle, even on same-SHA
- Change: Step 2 same-SHA → skip to Step 5.5 (not Step 6)
- Semantic overlap, quality audit, hook audit always run

**ADD: Worktree validation in health check (Step 6):**
- Verify `.worktrees/` or `worktrees/` is gitignored
- If not → fix it (add to .gitignore, commit)

**ADD: Pack list sync:**
- Single source of truth: `armadillo.json` pack manifest
- Both onboarding and updating-armadillo read from same source
- Eliminates hardcoded pack list drift

---

## Section 5: Git / Branching / PR Strategy

### Update Rule: `.claude/rules/git-workflow.md`

**Integration Branches (new section):**
- Auto-detect trigger: 3+ active branches touching overlapping files
- Suggest to developer: "Multiple branches touching shared files. Create integration branch to reconcile?"
- Developer approves before creation
- Naming: `integrate/<description>` (e.g., `integrate/auth-refactor`)
- Lifecycle: merge to main via single squash PR, then delete
- When NOT to use: independent changes, parallel reviews wanted, one risky change shouldn't hold others

**Conflict Resolution (new section):**
- Rebase feature onto main at minimum every 2 days
- Resolve conflicts on the feature branch, never on main
- If conflict resolution is complex → create integration branch
- Use `git rerere` (reuse recorded resolution) to avoid re-resolving same conflicts

**Branch TTL (new section):**
- 7 days: warning — "Branch feat/x is 7 days old. Rebase or merge?"
- 14 days: flag — "Branch feat/x has drifted significantly from main"
- Detection: `doctor.js` enhanced to check branch age + main divergence
- TTL check runs during: `finishing-a-development-branch`, `safe-merge`

**Draft PRs (new section):**
- Support draft PRs for early-signal / WIP visibility
- Create via REST: `--field draft=true`
- Convert to ready: `PATCH /pulls/{n} --field draft=false`

### Skill Updates

| Skill | Change |
|-------|--------|
| `safe-merge` | FIX: Replace `gh pr merge` (GraphQL) with REST `gh api` equivalent |
| `safe-merge` | ADD: Branch TTL check in pre-flight phase |
| `safe-merge` | ADD: Integration branch verification — all constituent branches merged first |
| `finishing-a-development-branch` | ADD: Integration branch awareness (merge into integrate/ instead of main) |
| `finishing-a-development-branch` | ADD: Branch age warning if >7 days |
| `finishing-a-development-branch` | ADD: Draft PR as 4th option |
| `git-setup` | ADD: `git rerere` enable by default |
| `git-setup` | ADD: Integration branch guidelines in setup docs |
| `writing-prs` | ADD: Draft PR support (`--field draft=true` for WIP) |

---

## Files Changed Summary

### New Files (2)
- `.claude/rules/bug-discipline.md`
- `.claude/rules/visual-testing.md`

### Updated Rules (2)
- `.claude/rules/coding-standards.md` — add efficiency sections
- `.claude/rules/git-workflow.md` — add integration branches, conflict resolution, branch TTL, draft PRs

### Updated Skills (11)
- `test-driven-development` — bug escape hatch + visual step
- `systematic-debugging` — mid-feature bug protocol reference
- `executing-plans` — bug escape hatch + flexible batch size
- `subagent-driven-development` — bug monitoring + caching hints
- `dispatching-parallel-agents` — timeout guidance + worktree default
- `onboarding` — full install, no pack prompting
- `updating-armadillo` — intelligence layer fix + worktree validation + pack sync
- `safe-merge` — GraphQL→REST fix + branch TTL + integration branch support
- `finishing-a-development-branch` — integration branch awareness + draft PR option
- `git-setup` — git rerere + integration branch guidelines
- `writing-prs` — draft PR support
- `verification-before-completion` — visual regression gate
- `playwright` — viewport presets + cross-browser templates

### Bug Fixes (2)
- `safe-merge` uses GraphQL instead of REST-only mandate
- `updating-armadillo` intelligence layer skipped on same-SHA

---

## Claude Code Feb 2026 Alignment

| Feature Used | How |
|-------------|-----|
| PostToolUseFailure hook | Bug detection automation |
| TaskCompleted hook | Quality gates |
| Persistent Task system | Cross-session bug tracking |
| Subagent `isolation: "worktree"` | Safe parallel bug investigation |
| Chrome integration (`--chrome`) | Interactive visual verification |
| Playwright MCP server | Automated visual regression (optional) |
| 10-subagent concurrent cap | Informs parallel decomposition limits |

No conflicts with Claude Code native behavior. All changes extend or leverage existing capabilities.
