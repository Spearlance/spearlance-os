---
model: claude-opus-4-6
name: executing-plans
description: Use when you have a written implementation plan to execute in a separate session with review checkpoints
allowed-tools: Read, Glob, Grep, Bash, Edit, Write, Task, Skill
---

# Executing Plans

## Overview

Load plan, review critically, execute tasks in batches, report for review between batches.

**Core principle:** Batch execution with checkpoints for architect review.

**Mandatory Announcement — FIRST OUTPUT before anything else:**

```
┏━ ⚡ executing-plans ━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [one-line description of what plan you're executing] ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

No exceptions. Box frame first, then work.

## The Process

### Step 1: Load and Review Plan
1. Read plan file
2. Review critically - identify any questions or concerns about the plan
3. If concerns: Raise them with your human partner before starting
4. If no concerns: Create TodoWrite and proceed

### Step 2: Execute Batch
**Default batch size: 3 tasks.** Adjust based on task complexity:
- Simple tasks (single-file edits, config changes): batch of 4-5
- Medium tasks (new feature with tests): batch of 3
- Complex tasks (multi-file, architectural): batch of 1-2

For each task:
1. Mark as in_progress
2. **TDD gate:** If the task has implementation steps, verify there is a RED step (failing test) first.
   - If the plan task includes a "Write the failing test" step — execute it, run it, confirm it FAILS before writing any implementation code.
   - If no test step exists in the task, STOP and raise it with your partner before proceeding.
   - **REQUIRED SUB-SKILL when unsure how to write the test:** Use armadillo:test-driven-development
3. Follow each step exactly (plan has bite-sized steps)
4. Run verifications as specified
5. Mark as completed

**Bug encounter between tasks:** If a bug or unexpected behavior surfaces during execution:
1. Follow `.claude/rules/bug-discipline.md` — spawn background subagent
2. Note: `⚠ Bug spawned → <summary> (background)`
3. Continue with next task in batch
4. Check bug Task status at end of batch (before Step 3 report)

### Step 3: Report
When batch complete:
- Show what was implemented
- Show verification output
- Say: "Ready for feedback."

### Step 4: Continue
Based on feedback:
- Apply changes if needed
- Execute next batch
- Repeat until complete

### Step 5: Complete Development

After all tasks complete and verified:
- Announce: "I'm using the finishing-a-development-branch skill to complete this work."
- **REQUIRED SUB-SKILL:** Use armadillo:finishing-a-development-branch
- Follow that skill to verify tests, present options, execute choice

## When to Stop and Ask for Help

**STOP executing immediately when:**
- Hit a blocker mid-batch (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly

**Ask for clarification rather than guessing.**

## When to Revisit Earlier Steps

**Return to Review (Step 1) when:**
- Partner updates the plan based on your feedback
- Fundamental approach needs rethinking

**Don't force through blockers** - stop and ask.

## Remember
- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when plan says to
- Between batches: just report and wait
- Stop when blocked, don't guess
- Never start implementation on main/master branch without explicit user consent

## Integration

**Required workflow skills:**
- **armadillo:using-git-worktrees** - REQUIRED: Set up isolated workspace before starting
- **armadillo:writing-plans** - Creates the plan this skill executes
- **armadillo:finishing-a-development-branch** - Complete development after all tasks
