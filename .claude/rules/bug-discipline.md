---
paths:
  - "**/*.{js,ts,jsx,tsx,py,go,rs,java,rb,sh}"
  - "**/*.{test,spec}.*"
---

# Bug Discipline

## The Iron Law

```
NEVER SKIP A BUG. NEVER DERAIL THE PRIMARY TASK.
```

When you encounter a bug or unexpected behavior during any work, follow this three-phase protocol. No exceptions.

## Phase 1: SPAWN

Immediately spawn a background subagent with:
- **Repro context:** error message, stack trace, file:line where bug was observed
- **Mandate:** write a failing test that proves the bug, then create a persistent Task with repro steps + expected behavior
- **Isolation:** use `isolation: "worktree"` for safe parallel investigation

```
Task(
  description: "Bug: <one-line summary>",
  prompt: "...<repro context>...",
  subagent_type: "general-purpose",
  run_in_background: true,
  isolation: "worktree"
)
```

The subagent should:
1. Write a failing test proving the bug
2. Attempt a minimal fix
3. If fix works → commit on worktree branch
4. If fix fails → create Task with findings for later

## Phase 2: CONTINUE

Primary work proceeds uninterrupted:
- Bug subagent runs in background
- Primary task does NOT block on bug resolution
- No derailing focus from current objective
- Brief note in output: `⚠ Bug spawned → <summary> (background)`

## Phase 3: VERIFY

At end of current work block (after commit, before moving to next task):
- Check bug Task status via `TaskOutput`
- If subagent produced fix + passing test → review the worktree branch, merge if clean
- If subagent still working → note status, continue to next task
- If subagent failed → escalate to `systematic-debugging` skill

## When This Applies

- Test failure during non-TDD work (not during intentional RED phase)
- Runtime error during development
- Unexpected behavior spotted while reading code
- Regression discovered while working on unrelated feature

## When This Does NOT Apply

- Intentional TDD RED phase (test is supposed to fail)
- Known pre-existing failures documented in the codebase
- Environmental issues (missing env var, wrong Node version)

## Integration

| Skill | How it uses this rule |
|-------|----------------------|
| `test-driven-development` | Bug encounter escape hatch — spawn instead of blocking |
| `executing-plans` | Same escape hatch between batch tasks |
| `subagent-driven-development` | Controller monitors for bug Tasks created by implementer subagents |
