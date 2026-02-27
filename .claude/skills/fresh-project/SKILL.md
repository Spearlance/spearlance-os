---
model: claude-opus-4-6
name: fresh-project
description: Use when starting a new project from scratch, bringing an idea to life in a blank codebase, or when onboarding detects a greenfield project. Walks through discovery, stack selection, scaffolding, and hands off to implementation. Also use when user says "fresh project", "new project", "build something new", or "I have an idea".
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Task, AskUserQuestion, Skill, WebSearch, WebFetch
context: fork
---

# Fresh Project

## Overview

The zero-to-shipped orchestrator. Takes a user from "I have an idea" to a scaffolded, planned project ready for implementation. One skill, five phases, three entry points.

**Announce at start:**
```
┏━ 🛡 fresh-project ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ let's bring this to life                          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

<HARD-GATE>
Do NOT skip phases. Do NOT scaffold before stack is confirmed. Do NOT plan before scaffold is complete. Each phase produces artifacts the next phase requires. If the user tries to skip ahead, explain what's needed first.
</HARD-GATE>

## Entry Points

### 1. Onboarding Detection (Auto)
Onboarding detects blank canvas → transitions here. User never invokes `/fresh-project` explicitly.

### 2. Shepherd Routing (Natural Language)
User says "I want to build..." / "I have an idea for..." / "starting a new project" in an empty/near-empty directory → shepherd routes here.

### 3. Explicit Invocation
User types `/fresh-project` directly.

## Re-Entry

On session start, if `.claude/fresh-project.json` exists with incomplete phases:

```
picked up where you left off — [current phase description].

▸ ready to continue?
```

Read `fresh-project.json` to determine current phase. Resume from there. Don't re-ask questions that PROJECT.md or stack.json already answer.

## Phase 1: Discovery

**Goal:** Build a structured project brief in `.claude/PROJECT.md`

**Process:** Adaptive conversation. One question at a time. Parse EVERYTHING the user says — skip questions they already answered.

If user says "I want to build a SaaS dashboard with Stripe billing and Google login":
- ✓ It's a dashboard (SPA/SSR, not static)
- ✓ Has billing (Stripe)
- ✓ Has auth (Google OAuth minimum)
- ✓ It's SaaS (multi-tenant)
- ✗ Don't ask "will it have payments?" — already answered

**Questions to cover (skip any already answered):**
1. What are we building? (open-ended)
2. Who uses it? (user types/roles)
3. What must it do on day one? (MVP features)
4. What should it NOT be? (scope boundaries)
5. Any constraints? (timeline, team skills, budget, existing systems)

**When you have enough:** You know the project type, user roles, core features, and constraints. Move to Phase 2 without asking permission.

**Output:** Write `.claude/PROJECT.md`:

```markdown
# [Project Name]

## What
[One paragraph describing the project]

## Who
- [User type 1] ([permissions/role])
- [User type 2] ([permissions/role])

## Must Have (Day One)
- [Feature 1]
- [Feature 2]
- [Feature 3]

## Must Not Be
- [Anti-requirement 1]
- [Anti-requirement 2]

## Constraints
- [Timeline, team, budget, tech preferences]
```

**State update:** Write `.claude/fresh-project.json`:
```json
{
  "phase": "stack",
  "discovery": "complete",
  "stack": "in_progress",
  "scaffold": "pending",
  "plan": "pending",
  "build": "pending"
}
```

## Phase 2: Stack Selection

**Goal:** Decide every technology layer and write `.claude/stack.json`

**Process:** Dispatch `fullstack-architect` agent (Task tool, subagent_type: general-purpose, load the fullstack-architect agent).

The agent:
1. Reads PROJECT.md
2. Loads stack-recommender skill
3. Presents recommendations as a table with rationale
4. Accepts user adjustments
5. Writes stack.json

**On-demand skill generation:** If user picks a technology without an existing reference skill, the fullstack-architect agent triggers `writing-reference-skills` to generate one before continuing. Tell the user: "haven't used [X] before — give me 30 seconds to learn it."

**Output:** `.claude/stack.json` with all technology decisions.

**State update:** `fresh-project.json` → `"stack": "complete", "scaffold": "in_progress"`

## Phase 3: Scaffold

**Goal:** Create the actual project with all technologies configured

**Process:** Dispatch `project-scaffolder` agent.

The agent:
1. Reads stack.json
2. Loads reference skill for each technology
3. Runs CLIs in dependency order
4. Configures each layer
5. Verifies dev server starts
6. Creates initial commit

**Output:** A real, working project with all technologies installed and configured.

**State update:** `fresh-project.json` → `"scaffold": "complete", "plan": "in_progress"`

## Phase 4: Architecture & Planning

**Goal:** Create an implementation plan for the project's features

**REQUIRED SUB-SKILL:** Invoke armadillo:writing-plans

Pass it the context:
- PROJECT.md (what we're building)
- stack.json (what we're building with)
- The scaffold that already exists (don't re-create what's there)

The plan should focus on FEATURES, not boilerplate. The scaffold is done. The plan is about building what the user actually asked for.

**Output:** Implementation plan in `.claude/docs/plans/`

**State update:** `fresh-project.json` → `"plan": "complete", "build": "in_progress"`

## Phase 5: Build

**REQUIRED SUB-SKILL:** Invoke armadillo:executing-plans or armadillo:subagent-driven-development

Execute the plan from Phase 4. Standard armadillo workflow from here — TDD, code review, the works.

**State update:** `fresh-project.json` → `"build": "complete"`

**Completion:**

```
[project name] is live.

● ahh, that felt good didn't it?

▸ want to ship it? → finishing-a-development-branch
```

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| User already has partial project (package.json, some source) | Discovery adapts — note existing tech, don't re-scaffold what exists |
| User says `/fresh-project` in a mature project | "this isn't a blank canvas — looks like you've got a [framework] app already. want help building a feature instead?" → route to brainstorming |
| User wants a stack we don't have a ref skill for | On-demand generation via writing-reference-skills |
| User wants a monorepo | Stack rec includes turborepo, scaffold creates apps/ + packages/ |
| Non-JS project (Python, Go, Rust) | Discovery notes it, stack rec adjusts, scaffold uses appropriate CLIs |
| User has brand knowledge (.claude/brand/) | Discovery pulls it in — brief inherits brand context |
| User comes back days later | Re-entry via fresh-project.json checkpoint |
| User wants to restart | `fresh-project --reset` clears state files |
| Team member joins | PROJECT.md + stack.json give full context without re-discovery |

## Key Rules

1. **One question at a time** during discovery — never overwhelm
2. **Parse intent** — skip questions already answered by what the user said
3. **Phase gates are real** — don't skip ahead
4. **State files are checkpoints** — always update after each phase
5. **On-demand generation fills gaps** — no technology is a dead end
6. **The user drives** — armadillo recommends, user decides
7. **Delegate to existing skills** — Phases 4-5 use writing-plans and executing-plans
