# Skill System Improvements — Design Document

**Date:** 2026-02-17
**Context:** Analysis of Anthropic's official "Complete Guide to Building Skills for Claude", superpowers PR #471, and SDD retrospective findings.

## Problem Statement

Three categories of gaps identified:

1. **TDD enforcement is advisory, not structural.** The TDD skill has strong language but no `<HARD-GATE>` tag. SDD implementer prompts make TDD conditional ("if task says to"). Spec reviewer doesn't check TDD compliance. No code-based validation exists.

2. **Description guidance contradicts Anthropic's official guide.** `writing-skills/SKILL.md` says "WHEN only, NOT what it does" but Anthropic says "include BOTH what it does and when to use it." The real insight (don't summarize HOW/workflow) is correct but the framing is wrong.

3. **Writing-skills lacks reference materials.** No documentation of skill patterns, degrees-of-freedom concept (despite being in best practices), or troubleshooting guide for common authoring problems.

## Workstream 1: TDD Enforcement Hardening

### Level 1 — Prose Enforcement

**File:** `.claude/skills/test-driven-development/SKILL.md`

Add `<HARD-GATE>` block at top of skill (after Overview), modeled on brainstorming skill's gate:

```markdown
<HARD-GATE>
Do NOT write any production code, implementation logic, or non-test code until you have written a failing test that defines the desired behavior. This applies to EVERY task regardless of perceived simplicity.
</HARD-GATE>
```

The skill already has the Iron Law and rationalization table. The `<HARD-GATE>` tag is the missing structural element that other skills (brainstorming, verification) use effectively.

### Level 2 — Structural Enforcement

**File:** `.claude/skills/subagent-driven-development/implementer-prompt.md`

Change conditional TDD to mandatory:
- Line 33: `Write tests (following TDD if task says to)` → `Write a failing test FIRST (TDD is mandatory — no production code before a failing test)`
- Line 65: `Did I follow TDD if required?` → `Did I write failing tests BEFORE implementation code?`

**File:** `.claude/skills/subagent-driven-development/spec-reviewer-prompt.md`

Add "TDD Compliance" check section:
- Verify test files exist for the task
- Check git log shows test commits before/alongside implementation
- Flag if implementation was committed without corresponding tests

**File:** `.claude/skills/subagent-driven-development/code-quality-reviewer-prompt.md`

Add TDD verification to the review delegation — ensure the code-reviewer template checks for test existence and coverage.

### Level 3 — Code Enforcement

**File (new):** `.claude/scripts/verify-tdd-order.sh`

Script that analyzes git log for the current branch:
- Extracts commit history since branch point
- Identifies test files vs implementation files per commit
- Flags commits that add implementation without corresponding test files
- Returns pass/fail with details

Referenced from TDD skill as a verification step. Implements Anthropic's "code as enforcement" insight: "Code is deterministic; language interpretation isn't."

## Workstream 2: Description Guidance Fix

**File:** `.claude/skills/writing-skills/SKILL.md`

Change description formula from "WHEN only" to "WHAT + WHEN, never HOW":

- Line 99: Update frontmatter guidance
- Lines 140-197 (CSO section): Reframe examples. Keep the workflow-summary ban (correct insight) but fix the framing. Good descriptions say what the skill does and when to use it. Bad descriptions summarize the skill's process/steps.

**Resolution:** This preserves armadillo's CSO insight (workflow descriptions cause Claude to shortcut the actual skill) while aligning with Anthropic's guidance.

## Workstream 3: Reference Files for writing-skills

### skill-patterns.md (new)

Document 5 Anthropic patterns with armadillo examples:
1. Sequential Workflow Orchestration (e.g., brainstorming, finishing-a-development-branch)
2. Multi-MCP Coordination (e.g., skills using multiple tools)
3. Iterative Refinement (e.g., receiving-code-review)
4. Context-Aware Tool Selection (e.g., systematic-debugging)
5. Domain-Specific Intelligence (e.g., reference skills like neon, stripe-api)

Each pattern: when to use, structure template, armadillo example, common pitfalls.

### degrees-of-freedom.md (new)

Expand on concept from anthropic-best-practices.md:
- **High freedom** (text-based, multiple valid approaches): Use when task has many correct solutions. Example: brainstorming skill.
- **Medium freedom** (pseudocode with parameters): Use when structure matters but details vary. Example: writing-plans skill.
- **Low freedom** (specific scripts, exact steps): Use when deviation causes failure. Example: verification-before-completion skill.

Decision framework: "How fragile is this task? High fragility → low freedom."

### troubleshooting-guide.md (new)

Common skill authoring problems:
- Skill not invoked → description mismatch (too narrow or too broad)
- Skill invoked but steps skipped → missing enforcement (`<HARD-GATE>`, rationalization tables)
- Skill too long → split into main SKILL.md + linked reference files (500-line limit)
- Cross-model failures → Haiku needs more explicit instructions than Opus
- Skill rationalized away → add pressure testing with 3+ combined pressures

## Workstream 4: Update anthropic-best-practices.md

**File:** `.claude/skills/writing-skills/anthropic-best-practices.md`

Updates:
- Add optional frontmatter fields: `alwaysApply`, `globs`, `filePaths`
- Add 500-line SKILL.md limit recommendation
- Add cross-model testing section ("What works for Opus might need more detail for Haiku")
- Add progressive disclosure pattern (frontmatter → body → linked files)
- Align description guidance with "WHAT + WHEN, never HOW" (resolve contradiction with SKILL.md)

## Scope and Priority

All four workstreams ship as one release. Priority order for implementation:
1. TDD enforcement (highest impact — affects every future task)
2. Description guidance fix (quick win — aligns internal contradiction)
3. Reference files (medium effort — new content creation)
4. Best practices update (depends on workstreams 2 and 3)

## Files Changed

| File | Action |
|------|--------|
| `.claude/skills/test-driven-development/SKILL.md` | Modify — add HARD-GATE |
| `.claude/skills/subagent-driven-development/implementer-prompt.md` | Modify — mandatory TDD |
| `.claude/skills/subagent-driven-development/spec-reviewer-prompt.md` | Modify — add TDD check |
| `.claude/skills/subagent-driven-development/code-quality-reviewer-prompt.md` | Modify — add TDD check |
| `.claude/scripts/verify-tdd-order.sh` | Create — TDD validation script |
| `.claude/skills/writing-skills/SKILL.md` | Modify — description guidance |
| `.claude/skills/writing-skills/skill-patterns.md` | Create — reference file |
| `.claude/skills/writing-skills/degrees-of-freedom.md` | Create — reference file |
| `.claude/skills/writing-skills/troubleshooting-guide.md` | Create — reference file |
| `.claude/skills/writing-skills/anthropic-best-practices.md` | Modify — updates |
