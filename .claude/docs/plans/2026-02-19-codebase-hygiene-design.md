# Codebase Hygiene Skill — Design

**Date:** 2026-02-19
**Status:** Approved
**Skill name:** `codebase-hygiene`
**Bundle:** core

## Overview

A full-repo audit and cleanup skill that scans project source code AND armadillo configuration for cleanliness, organization, and best practices. Dispatches parallel scanner agents, merges findings into a unified report, gets user approval, then fixes approved issues safely.

Designed for both initial onboarding cleanup of messy codebases and periodic maintenance runs.

## Architecture

```
User invokes: /codebase-hygiene
         │
         v
┌─────────────────────────────┐
│   SKILL.md (orchestrator)   │
│   model: opus-4-6           │
│                             │
│  1. Detect project type     │
│  2. Dispatch 4 scanners     │
│  3. Merge results           │
│  4. Present report          │
│  5. Get approval            │
│  6. Execute fixes           │
│  7. Verify nothing broken   │
└─────────────────────────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    v         v          v          v
 structure  dead-code  armadillo  quality
 scanner    scanner    scanner    scanner
 (haiku)    (haiku)    (sonnet)   (sonnet)
```

### Model Choices

| Component | Model | Rationale |
|-----------|-------|-----------|
| Orchestrator skill | Opus 4.6 | Judgment calls, coordination, fix decisions |
| Structure scanner | Haiku 4.5 | Mechanical file/dir scanning |
| Dead code scanner | Haiku 4.5 | Pattern matching, import tracing |
| Armadillo config scanner | Sonnet 4.6 | Understands skill conventions, validates patterns |
| Code quality scanner | Sonnet 4.6 | Code comprehension, DRY detection, complexity |

### Files

| File | Purpose |
|------|---------|
| `skills/codebase-hygiene/SKILL.md` | Orchestrator skill |
| `skills/codebase-hygiene/scanner-prompts.md` | Shared scanner instructions |
| `agents/structure-scanner.md` | File/folder structure agent |
| `agents/dead-code-scanner.md` | Unused code detection agent |
| `agents/armadillo-config-scanner.md` | .claude/ health check agent |
| `agents/code-quality-scanner.md` | Best practices agent |

## Scan Dimensions

Each scanner produces findings in this format:

```
| Finding | Severity | Category | Auto-fixable | Location |
```

Severities: `◆ critical`, `⚠ warning`, `◇ suggestion`, `ℹ info`

### Scanner 1: Structure (Haiku)

| Check | What it looks for |
|-------|-------------------|
| Directory organization | Files in wrong directories, flat sprawl, deeply nested paths |
| Naming conventions | Inconsistent casing (kebab vs camel vs snake), mismatched file/export names |
| Empty directories | Dirs with no files or only `.gitkeep` |
| Config file placement | Configs scattered vs root-level, duplicate configs |
| File size outliers | Single files over 500 lines that should be split |
| Index barrel files | Missing or stale index.ts/index.js re-exports |

### Scanner 2: Dead Code (Haiku)

| Check | What it looks for |
|-------|-------------------|
| Unused exports | Exported functions/classes/types with zero internal consumers |
| Orphan files | Files not imported anywhere |
| Stale imports | Imports of deleted or renamed modules |
| Commented-out code | Blocks of commented code (>5 lines) |
| TODO/FIXME age | TODOs older than 30 days (via git blame) |
| Unused dependencies | package.json deps not imported anywhere |

### Scanner 3: Armadillo Config (Sonnet)

| Check | What it looks for |
|-------|-------------------|
| CLAUDE.md completeness | All installed skills listed, rules @-linked, model tier table present |
| Hook integrity | hooks.json references valid scripts, scripts are executable, no orphan hooks |
| Rule coverage | Rules exist for coding-standards, git-workflow, output-style, pr-format |
| Skill registration | All `.claude/skills/*/SKILL.md` files registered in skills.json |
| Settings validation | settings.json has valid model env, permissions are reasonable |
| Frontmatter health | All SKILL.md files have valid name, description, model fields |

### Scanner 4: Code Quality (Sonnet)

| Check | What it looks for |
|-------|-------------------|
| DRY violations | Duplicated logic blocks (>10 lines) across files |
| Complexity hotspots | Functions with cyclomatic complexity >10 or >50 lines |
| Inconsistent patterns | Mixed async styles, inconsistent error handling, varied naming |
| Security smells | Hardcoded secrets, eval usage, unsanitized inputs |
| Missing error handling | Unhandled promise rejections, bare catches, silent failures |
| Test coverage gaps | Source files with no corresponding test file |

## Orchestration Flow

### Phase 1: DETECT

- Read package.json — detect language, framework, test runner
- Read .claude/CLAUDE.md — detect armadillo installation
- Glob for src/, lib/, app/, pages/ — detect project structure pattern
- Output: project profile (language, framework, structure pattern)

### Phase 2: SCAN (parallel)

- Dispatch structure-scanner (background, haiku)
- Dispatch dead-code-scanner (background, haiku)
- Dispatch armadillo-config-scanner (background, sonnet)
- Dispatch code-quality-scanner (background, sonnet)
- Wait for all 4, merge results

### Phase 3: REPORT

- Sort findings by severity (◆ > ⚠ > ◇ > ℹ)
- Group by scanner category
- Show summary stats: X critical, Y warnings, Z suggestions
- Present full table to user

### Phase 4: APPROVE

- User reviews findings
- User selects which to fix (default: all ◆ and ⚠, opt-in ◇)
- User confirms

### Phase 5: FIX (sequential)

- Apply fixes in dependency order
- Commit after each logical group (atomic commits)
- Invoke relevant skills where needed:
  - test-driven-development for new test files
  - systematic-debugging if a fix breaks something
  - verification-before-completion after all fixes
- Final git status

### Phase 6: VERIFY

- Run project's test suite
- Run linter if configured
- Confirm no regressions
- Present completion summary

## Safety Rails

- Never deletes files without approval — marks them for review
- Never modifies code that has uncommitted changes (checks git status first)
- Creates a branch before fixing if on main (invokes `using-git-worktrees` if available)
- Each fix group gets its own commit — easy to revert individual changes
- Runs tests after fixes to catch regressions immediately

## Registration

### skills.json entry

```json
"codebase-hygiene": {
  "name": "Codebase Hygiene",
  "description": "Full repo audit and cleanup — scans structure, dead code, armadillo config, and code quality. Dispatches parallel scanners, presents findings, fixes with approval.",
  "files": [
    "skills/codebase-hygiene/SKILL.md",
    "skills/codebase-hygiene/scanner-prompts.md"
  ],
  "agents": [
    "agents/structure-scanner.md",
    "agents/dead-code-scanner.md",
    "agents/armadillo-config-scanner.md",
    "agents/code-quality-scanner.md"
  ],
  "bundle": "core"
}
```

### CLAUDE.md section

```markdown
### Maintenance
- **codebase-hygiene** — Full repo audit: structure, dead code, config health, quality
```

### Trigger phrases

"clean up", "housekeeping", "code health", "repo hygiene", "audit codebase", "organize", "refactor", "dead code", "unused code", "check config", "armadillo health"
