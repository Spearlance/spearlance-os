---
model: claude-opus-4-6
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
allowed-tools: Read, Glob, Grep, Bash, Write, AskUserQuestion, Skill
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Mandatory Announcement — FIRST OUTPUT before anything else:**

```
┏━ 🧠 writing-plans ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [one-line description of what you're planning]  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

No exceptions. Box frame first, then work.

**Model requirement:** Planning requires deep reasoning about architecture and dependencies. Use **Opus 4.6** (`claude-opus-4-6`).

**Context:** This should be run in a dedicated worktree (created by brainstorming skill).

**Save plans to:** `.claude/docs/plans/YYYY-MM-DD-<feature-name>.md`

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Task Structure

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

**Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````

## Verify External Architecture (before writing tasks)

If the plan involves external platform integrations — plugin systems, cloud APIs, third-party services, OS-level features — **search the official docs before writing implementation tasks.** Wrong assumptions at the plan stage = wrong work at the execution stage.

Ask: "Does the platform actually work the way the spec assumes?" If not, note the correction in the plan.

Examples of what to verify:
- Claude Code extension system behavior (how sources, skill packs, and CLAUDE.md loading work)
- GitHub Actions API limits, artifact retention
- Any third-party SDK version-specific behavior

Use `WebSearch` to pull current official docs. This step takes 2 minutes and saves hours.

## Remember
- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant skills with @ syntax
- DRY, YAGNI, TDD, frequent commits

## TDD Task Structure (non-negotiable)

**Never group tests into a final task.** Do NOT create a separate "Write all tests" task at the end of the plan. Tests must be embedded inside each task as Step 1 (RED step).

Every implementation task follows this exact structure:
1. Write the failing test → run it → confirm FAIL
2. Write minimal implementation → run it → confirm PASS
3. Commit

A plan with a "Testing" or "Write tests" phase at the end is wrong. Each task is self-contained: test → implement → commit.

## Execution Handoff

After saving the plan, **decide the execution approach yourself** based on these signals, then announce your choice and proceed:

### Decision criteria

| Signal | Choose |
|--------|--------|
| Tasks ≤ 8, mostly sequential dependencies | **Subagent-Driven** |
| Tasks > 8, OR user needs to review at checkpoints | **Subagent-Driven** (batches of 3) |
| Tasks are large, independent, and parallelizable | **dispatching-parallel-agents** inside subagent-driven |
| User wants to continue in a separate session later | **Parallel Session** |

**Default to Subagent-Driven** — it's faster, keeps context, and lets you catch issues early.

### Announcement format

```
Plan complete → `.claude/docs/plans/<filename>.md`
N tasks · executing subagent-driven (reason: <1 sentence why>)
```

**Reason examples:**
- "tasks have sequential dependencies"
- "mix of sequential + parallelizable groups"
- "user wants to review between phases"

### Execution

**Subagent-Driven (default):**
- **REQUIRED SUB-SKILL:** Use armadillo:subagent-driven-development
- Stay in this session — fresh subagent per task + code review between

**Parallel Session (only when user explicitly needs to continue later):**
- Guide them to open new session in worktree
- **REQUIRED SUB-SKILL:** New session uses armadillo:executing-plans
