---
paths:
  - "**/*.{js,ts,jsx,tsx,py,go,rs,java,rb,sh}"
  - "**/*.{test,spec}.*"
---

# Coding Standards

## Principles
- **DRY** — Don't Repeat Yourself
- **YAGNI** — You Aren't Gonna Need It
- **TDD** — Test-Driven Development (RED/GREEN/REFACTOR)

## Workflow
- One question at a time
- Verify before claiming done
- Frequent commits

## Commit Order
TDD requires strict commit order: test commit (`test:`) before implementation commit (`feat:`/`fix:`).

```
git commit -m "test: add failing test for X"   ← RED commit (no implementation yet)
git commit -m "feat: implement X"               ← GREEN commit
```

Never commit implementation without a prior test commit in the same feature. The git history must show RED before GREEN.

## Background Execution
Use `run_in_background: true` selectively:
- **Task (agent dispatch)** calls — always background subagent dispatches
- **Long-running Bash** (test suites, builds, installs, dev servers, watchers) — background and poll with `TaskOutput`
- **Quick Bash** (git status, git log, file validation, JSON checks, single-file operations) — run synchronously

## Skills
- **`EnterPlanMode` is BLOCKED by hook (exit 2)** — use the `writing-plans` skill for all planning
- **Plan/Explore agents are BLOCKED by hook (exit 2)** — use skills via the Skill tool instead
- **Invoke skills immediately** — no narration ("I'm going to use..."), no deliberation, just `Skill` tool call

## Selective Test Execution

- **Local development:** run only tests related to changed files
  - Vitest: `--changed` flag or filename patterns
  - Playwright: `--grep` or specific test file
  - Jest: `--findRelatedTests`
- **CI:** full suite always — no shortcuts
- **Pre-commit:** affected tests only
- **Pre-push:** full suite

## Caching

- **Dependencies:** cache `node_modules` between installs (`npm ci`, lockfile hash)
- **Browsers:** cache Playwright browsers (~500MB) — `npx playwright install` only on miss
- **Build artifacts:** cache `.next/`, `dist/`, `.astro/` between builds where safe
- **Test results:** Vitest `--cache` for incremental runs

## Parallel Work Decomposition

When task spans backend + frontend + tests:
1. Decompose into independent workstreams
2. Backend API → subagent A (`isolation: "worktree"`)
3. Frontend UI → subagent B (`isolation: "worktree"`)
4. Test infrastructure → subagent C (`isolation: "worktree"`)
5. Integration after all complete

Use `dispatching-parallel-agents` for 3+ independent streams.
Use `subagent-driven-development` for sequential-with-review.

## Timeout Budgets

- **Subagent tasks:** 10 min max before status check
- **If no progress after 2 checks:** escalate to user
- **Background Bash:** 5 min max for builds, 10 min for full test suites
