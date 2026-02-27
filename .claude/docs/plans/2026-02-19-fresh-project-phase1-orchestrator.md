# Fresh Project System — Phase 1: Orchestrator

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Build the fresh-project orchestrator system — the phased skill that takes users from "I have an idea" to scaffolded project ready for implementation, plus the supporting agents, rules, and hook modifications.

**Architecture:** One orchestrator skill (`fresh-project`) manages 5 phases internally: Discovery → Stack Selection → Scaffold → Architecture → Build. It delegates to `fullstack-architect` agent for stack recommendations and `project-scaffolder` agent for project creation. State persists in `.claude/PROJECT.md`, `.claude/stack.json`, and `.claude/fresh-project.json` for re-entry. Three entry points: onboarding detection (auto), shepherd routing (natural language), explicit `/fresh-project` invocation.

**Tech Stack:** Shell (hooks), Markdown (skills/agents/rules), JSON (state files, skills.json)

**Phased delivery:** This is Phase 1 of 6. Phases 2-6 add reference skills for each technology category (backend, auth, deploy, etc.). Phase 1 builds the skeleton — the orchestrator works even without all reference skills by delegating to `writing-reference-skills` for on-demand generation.

---

## Task 1: Create branch + scaffold directories

**Files:**
- Create: `.claude/skills/fresh-project/` (directory)
- Create: `.claude/skills/scaffold/` (directory)
- Create: `.claude/skills/stack-recommender/` (directory)
- Create: `.claude/agents/fullstack-architect.md` (placeholder)
- Create: `.claude/agents/project-scaffolder.md` (placeholder)
- Create: `.claude/rules/project-context.md` (placeholder)

**Step 1: Create feature branch**

```bash
git checkout -b feat/fresh-project-system
```

**Step 2: Create directories**

```bash
mkdir -p .claude/skills/fresh-project
mkdir -p .claude/skills/scaffold
mkdir -p .claude/skills/stack-recommender
```

**Step 3: Commit scaffold**

```bash
git add .claude/skills/fresh-project/.gitkeep .claude/skills/scaffold/.gitkeep .claude/skills/stack-recommender/.gitkeep
git commit -m "chore: scaffold fresh-project system directories"
```

---

## Task 2: Write project-context rule

The rule that tells ALL skills how to read and use `stack.json` and `PROJECT.md` when they exist. This goes first because every other piece references it.

**Files:**
- Create: `.claude/rules/project-context.md`

**Step 1: Write the failing test**

Dispatch a haiku subagent WITHOUT the rule. Give it this scenario:

> "You're working in a project that has `.claude/stack.json` with `{"framework": "nextjs", "styling": ["tailwind-css", "shadcn-ui"], "auth": "clerk", "database": "supabase", "orm": "drizzle"}`. The user asks you to 'add a login page.' How do you approach this? What technologies do you use? Do you ask the user what stack to use?"

Document: Does the agent read stack.json? Does it use the stack decisions? Or does it ask redundant questions about which framework/auth/styling to use?

**Step 2: Run test to verify failure**

Expected: Agent either ignores stack.json or asks redundant questions about technology choices.

**Step 3: Write the rule**

```markdown
# Project Context

## Stack-Aware Behavior

When `.claude/stack.json` exists, ALL skills and agents MUST:

1. **Read it before starting work** — it contains the project's technology decisions
2. **Never ask redundant questions** — if the stack is decided, use it
3. **Activate relevant reference skills** — if stack says `"auth": "clerk"`, load the `clerk` skill
4. **Respect the architecture** — don't suggest alternatives unless the user asks

### stack.json Schema

```json
{
  "framework": "nextjs",
  "styling": ["tailwind-css", "shadcn-ui"],
  "auth": "clerk",
  "database": "supabase",
  "orm": "drizzle",
  "deploy": "vercel",
  "testing": ["vitest", "playwright"],
  "monitoring": "sentry",
  "apis": ["ga4-api"],
  "packageManager": "pnpm",
  "phase": "build",
  "decided": "2026-02-19"
}
```

Each key maps to an armadillo skill name. If the skill exists, use it. If it doesn't exist, the `fresh-project` orchestrator will have generated it on-demand via `writing-reference-skills`.

### PROJECT.md

When `.claude/PROJECT.md` exists, it contains the project brief — who, what, why, constraints. Read it for context on ANY task. Don't re-ask questions it already answers.

### fresh-project.json

When `.claude/fresh-project.json` exists, the project is in an active fresh-project flow. Read it to determine which phase is current. If a phase is `in_progress` or `pending`, the `fresh-project` skill manages it — don't interfere.

## When These Files Don't Exist

Normal behavior. No stack context, no project brief. Skills operate independently as usual.
```

**Step 4: Run test WITH rule to verify it passes**

Same scenario. Agent should now read stack.json, use the decided stack, and NOT ask what framework/auth to use.

**Step 5: Commit**

```bash
git add .claude/rules/project-context.md
git commit -m "feat: add project-context rule for stack-aware behavior"
```

---

## Task 3: Write stack-recommender reference skill

The decision matrix that the `fullstack-architect` agent consumes. Maps requirements to technology recommendations with rationale.

**Files:**
- Create: `.claude/skills/stack-recommender/SKILL.md`
- Create: `.claude/skills/stack-recommender/reference.md`
- Create: `.claude/skills/stack-recommender/test-baseline.md`

**REQUIRED SUB-SKILL:** Use armadillo:writing-reference-skills

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: stack-recommender
description: Use when recommending a technology stack for a new project based on requirements. Maps project needs to specific technologies with trade-off analysis and rationale. Also use when a user wants to change or evaluate their current stack choices.
---
```

### Step 1: RED baseline — dispatch haiku subagent with these 4 questions (NO skill):

**Q1 (Simple project):** "I'm building a personal blog with a CMS. I know React. What tech stack should I use and why?"

**Q2 (Complex SaaS):** "I'm building a multi-tenant SaaS dashboard with billing, auth, real-time updates, and analytics. Team of 3, shipping in 6 weeks. Recommend a full stack with rationale for each choice."

**Q3 (Edge case — constraints):** "I need to build a mobile app + web dashboard that share a backend. Budget is tight, team only knows Python and JavaScript. What stack covers both platforms?"

**Q4 (Trade-off analysis):** "For a project that needs auth, should I use Clerk, Auth.js, or Supabase Auth? What are the real trade-offs — not just feature lists but actual developer experience, pricing at scale, and lock-in risk?"

Save baseline results to `test-baseline.md`.

### Step 2: Research

This skill is unique — it's not documenting one API. It's a decision framework. Research:

- `"best tech stack 2025 2026" full-stack web application`
- `"Next.js vs Astro vs Remix vs SvelteKit" comparison 2026`
- `"Supabase vs Firebase vs Neon" comparison`
- `"Clerk vs Auth.js vs Supabase Auth" comparison developer experience`
- `"Drizzle vs Prisma" ORM comparison 2026`
- `"Vercel vs Cloudflare" deployment comparison`
- `"tech stack decisions" startup SaaS 2026`

### Step 3: Write SKILL.md + reference.md

**SKILL.md sections:** Overview, When to Use, Decision Framework (the 7 layers: framework, styling, backend, database, auth, deploy, DX), Quick Reference (default stack for common project types), How to Use (read PROJECT.md → match requirements → output stack.json).

**reference.md sections:**
1. Decision Framework Overview — the 7 layers every project decides
2. Framework Selection Matrix — requirements → framework (SSR needs, static, SPA, content-heavy, e-commerce)
3. Styling & Component Selection — when to use what
4. Backend & API Patterns — when REST vs tRPC vs GraphQL, when to use a backend framework vs framework API routes
5. Database Selection — Postgres vs MongoDB vs SQLite, serverless vs managed, when to add Redis
6. ORM Selection — Drizzle vs Prisma decision tree
7. Authentication Selection — managed (Clerk) vs framework-native (Auth.js) vs BaaS-bundled (Supabase Auth)
8. Deployment Selection — Vercel vs Cloudflare vs Docker vs Railway
9. DX Tooling Defaults — testing, linting, package manager recommendations
10. Common Project Templates — pre-built stack.json examples for: SaaS dashboard, marketing site, e-commerce, API service, mobile app
11. Anti-Patterns — stacks that don't work well together, common mistakes
12. On-Demand Skill Generation — how to handle technologies not in the pre-written skill set

### Step 4: GREEN verification — cross-reference against baseline failures

### Step 5: REFACTOR — close gaps

### Step 6: Commit

```bash
git add .claude/skills/stack-recommender/
git commit -m "feat: add stack-recommender reference skill"
```

---

## Task 4: Write fullstack-architect agent

The brain that reads PROJECT.md and outputs stack.json with rationale.

**Files:**
- Create: `.claude/agents/fullstack-architect.md`

**Step 1: Write the failing test**

Dispatch a haiku subagent (no agent file, no stack-recommender skill) with:

> "Here's a project brief: Building a client dashboard for a digital marketing agency. Users: internal team (admin) + clients (read-only, scoped to their data). Must have: client authentication with scoped access, GA4 traffic/conversion dashboard, PDF report export. Must NOT be: a CMS, a blog, a content editor. Constraints: ship in 2 weeks, team knows React. Output a complete technology stack as JSON with rationale for each choice."

Document: Does it produce a coherent stack? Are choices well-reasoned? Does it miss anything critical?

**Step 2: Run test to verify baseline quality**

Expected: Decent but generic recommendations, missing nuance on trade-offs, possibly inconsistent choices.

**Step 3: Write the agent**

```markdown
---
name: fullstack-architect
description: Recommends technology stacks for greenfield projects based on project requirements. Reads PROJECT.md, consults stack-recommender skill, outputs stack.json with rationale.
model: claude-opus-4-6
memory: project
allowed-tools: Read, Glob, Grep, Bash, Write, AskUserQuestion, Skill, WebSearch, WebFetch
---

# Fullstack Architect

You are the technology decision-maker for greenfield projects. Your job: read the project brief, understand requirements, and recommend a complete technology stack with clear rationale.

## Input

Read `.claude/PROJECT.md` for the project brief. If it doesn't exist, ask the user what they're building.

## Required Reference

**REQUIRED SKILL:** Load armadillo:stack-recommender before making any recommendations. It contains the decision framework and selection matrices.

## Process

1. **Parse requirements** from PROJECT.md — extract: project type, user types, key features, constraints, team skills, timeline
2. **Match to stack** using the stack-recommender decision framework — each layer gets a specific pick with rationale
3. **Check consistency** — do all picks work together? Any known incompatibilities?
4. **Present to user** as a table with rationale column
5. **Accept adjustments** — user may swap individual picks. Validate the swap doesn't break consistency.
6. **Write stack.json** — final decisions with rationale

## Output Format

Present as:

| Layer | Pick | Why |
|-------|------|-----|
| Framework | Next.js 15 | SSR + API routes + middleware auth |
| ... | ... | ... |

Then ask: "want to adjust anything or roll with this?"

After user confirms, write `.claude/stack.json`.

## On-Demand Skill Generation

If the user picks a technology that doesn't have an armadillo reference skill:

1. Tell the user: "haven't used [X] before — give me 30 seconds to learn it"
2. **REQUIRED SUB-SKILL:** Invoke armadillo:writing-reference-skills to generate the skill
3. Wait for generation to complete
4. Continue the flow with the new skill available

## Rules

- Never recommend a stack without reading the project brief first
- Always explain WHY for each pick — "it's popular" is not a reason
- Flag trade-offs honestly — every pick has downsides
- If requirements are unclear, ask ONE clarifying question before recommending
- Default to the simpler option when two technologies are equally suitable
- Account for team skills — don't recommend Vue to a React team unless there's a compelling reason
```

**Step 4: Run test WITH agent + stack-recommender skill**

Same scenario. Agent should now produce a well-reasoned, consistent stack with clear rationale for each pick.

**Step 5: Commit**

```bash
git add .claude/agents/fullstack-architect.md
git commit -m "feat: add fullstack-architect agent"
```

---

## Task 5: Write project-scaffolder agent

Executes the scaffold — runs framework CLIs, installs deps, configures tooling.

**Files:**
- Create: `.claude/agents/project-scaffolder.md`

**Step 1: Write the failing test**

Dispatch a sonnet subagent (no agent file) with:

> "Create a new Next.js 15 project with: pnpm, Tailwind v4, shadcn/ui, Vitest, Playwright, ESLint + Prettier. The project should be ready to develop in — not just scaffolded but configured. Initialize git. Don't actually run the commands — just list exactly what you would run in order and what config files you'd create."

Document: Does it get the command order right? Does it miss configuration steps? Does it handle tool-specific setup (e.g., shadcn init needs the project to exist first)?

**Step 2: Run test to verify baseline**

Expected: Mostly correct but likely missing config details, wrong flag orders, or outdated CLI syntax.

**Step 3: Write the agent**

```markdown
---
name: project-scaffolder
description: Creates greenfield projects from stack.json decisions. Runs framework CLIs, installs dependencies, configures tooling, initializes git. Used by the fresh-project orchestrator during the Scaffold phase.
model: claude-sonnet-4-6
memory: project
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Skill
---

# Project Scaffolder

You create real projects from technology decisions. Not templates — actual scaffolded, configured, ready-to-develop projects.

## Input

Read `.claude/stack.json` for technology decisions. Each key maps to an armadillo skill name.

## Process

### 1. Load Reference Skills

For each technology in stack.json, load the corresponding armadillo reference skill. These contain the current CLI commands, configuration, and setup instructions.

Example: if `stack.json` has `"framework": "nextjs"`, load armadillo:nextjs for current setup instructions.

### 2. Scaffold in Order

Technologies must be installed in dependency order:

```
1. Framework CLI (creates project structure)
2. Package manager setup (pnpm/bun/npm)
3. Styling (Tailwind, then component library)
4. Database + ORM (schema + migrations)
5. Authentication (depends on framework + database)
6. Testing frameworks
7. Linting + formatting
8. Deployment config
9. Monitoring (Sentry, etc.)
10. Git init + initial commit
```

### 3. Shell Out to Official CLIs

**Always use official CLIs** for the base scaffold. Then layer configuration on top.

```bash
# Example for Next.js + pnpm
pnpm create next-app@latest my-project --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

**Never** try to manually create framework boilerplate. The CLI handles it correctly.

### 4. Configure Each Layer

After the base scaffold, configure each technology. Read the reference skill for each to get current config syntax.

### 5. Write Project Context Files

After scaffold completes:
- Update `.claude/fresh-project.json` — set scaffold phase to `complete`
- Verify `.claude/PROJECT.md` and `.claude/stack.json` are in the project
- Write initial `.claude/CLAUDE.md` with project-specific instructions

### 6. Initial Commit

```bash
git add -A
git commit -m "feat: scaffold project from stack.json"
```

## Rules

- Always use the latest CLI syntax from reference skills — never guess
- Install one thing at a time and verify before moving to the next
- If a CLI command fails, read the error and fix before continuing
- Never install packages globally — use npx/pnpm dlx
- Always pin major versions in package.json
- Run the dev server briefly after scaffold to verify everything works
```

**Step 4: Run test WITH agent**

Same scenario. Agent should now produce correct, ordered, complete scaffold instructions.

**Step 5: Commit**

```bash
git add .claude/agents/project-scaffolder.md
git commit -m "feat: add project-scaffolder agent"
```

---

## Task 6: Write fresh-project orchestrator skill

The main skill. Manages phases, delegates to agents, handles state and re-entry.

**Files:**
- Create: `.claude/skills/fresh-project/SKILL.md`

**Step 1: Write the failing test**

Dispatch an opus subagent (no skill) with:

> "The user just installed armadillo in an empty directory and says: 'I want to build a client portal for my agency where clients can see their SEO reports and analytics data.' Walk them through everything they need to go from this idea to a working project. Ask questions one at a time. Make stack recommendations. Create the project. Plan the features. Execute the plan."

Document: Does it ask the right questions? Does it make coherent stack recommendations? Does it know when to stop asking and start building? Does it handle the full journey or get stuck?

**Step 2: Run test to verify failure**

Expected: Asks too many questions at once, makes generic recommendations, doesn't persist state, no concept of phases or re-entry.

**Step 3: Write the skill**

```markdown
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
```

**Step 4: Run test WITH skill to verify it passes**

Same scenario. Agent should now: ask adaptive questions, build a brief, make stack recommendations, scaffold, and hand off to planning — in order, with state persistence.

**Step 5: REFACTOR — identify gaps in the flow**

Test additional scenarios:
- User who gives a one-sentence idea (needs more discovery)
- User who gives a detailed spec (needs minimal discovery)
- User who wants to change stack after scaffold (should warn about re-scaffold)

**Step 6: Commit**

```bash
git add .claude/skills/fresh-project/
git commit -m "feat: add fresh-project orchestrator skill"
```

---

## Task 7: Write scaffold skill

The workflow skill that wraps the project-scaffolder agent with proper state management.

**Files:**
- Create: `.claude/skills/scaffold/SKILL.md`

**Step 1: Write the failing test**

Dispatch a sonnet subagent (no skill) with:

> "You have a `.claude/stack.json` that says: `{"framework": "nextjs", "styling": ["tailwind-css", "shadcn-ui"], "auth": "clerk", "database": "supabase", "orm": "drizzle", "testing": ["vitest", "playwright"], "deploy": "vercel", "packageManager": "pnpm"}`. Scaffold this project. Use official CLIs. Configure everything. Make it ready to develop."

Document: Does it get the order right? Does it reference the correct CLI commands? Does it miss configuration?

**Step 2: Run test to verify baseline**

**Step 3: Write the skill**

```markdown
---
model: claude-sonnet-4-6
name: scaffold
description: Use when creating a new project from stack.json technology decisions. Runs framework CLIs, installs dependencies, configures tooling, and produces a ready-to-develop project. Used by fresh-project orchestrator or standalone.
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Task, Skill
---

# Scaffold

## Overview

Create a real, configured project from technology decisions in `.claude/stack.json`. Not templates — actual CLI-scaffolded, fully-configured projects.

**Announce at start:**
```
┏━ ⚡ scaffold ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ creating project from stack decisions              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## When to Use

- fresh-project Phase 3 delegates here
- User has a stack.json and wants to scaffold
- User says "scaffold this project" with stack decisions already made

## Process

1. **Read stack.json** — get all technology decisions
2. **Load reference skills** — for each technology, load the armadillo skill to get current CLI commands and config
3. **Dispatch project-scaffolder agent** — it handles the actual creation
4. **Verify** — dev server starts, git initialized, all tools configured
5. **Update state** — fresh-project.json scaffold phase → complete

## Installation Order

Technologies install in dependency order:

| Order | Layer | Example |
|-------|-------|---------|
| 1 | Framework | `pnpm create next-app@latest` |
| 2 | Package manager | pnpm already set by CLI flag |
| 3 | Styling | Tailwind (via CLI), then shadcn init |
| 4 | Database + ORM | Supabase client + Drizzle schema |
| 5 | Auth | Clerk SDK + middleware |
| 6 | Testing | Vitest config + Playwright init |
| 7 | Linting | ESLint + Prettier config |
| 8 | Deploy | vercel.json or equivalent |
| 9 | Monitoring | Sentry SDK |
| 10 | Git | `git init && git add -A && git commit` |

## On-Demand Skill Generation

If stack.json references a technology without an existing reference skill:

1. Detect missing skill
2. Invoke `armadillo:writing-reference-skills` to generate it
3. Load the generated skill
4. Continue scaffold with correct, current CLI commands

## Rules

- Always use official CLIs for base scaffold — never manually create boilerplate
- One technology at a time — verify before moving to next
- If a CLI fails, read the error, fix, and retry before moving on
- Never install packages globally — npx/pnpm dlx only
- Verify the dev server starts before declaring scaffold complete
```

**Step 4: Run test WITH skill to verify improvement**

**Step 5: Commit**

```bash
git add .claude/skills/scaffold/
git commit -m "feat: add scaffold skill"
```

---

## Task 8: Modify session-start.sh for re-entry detection

Add fresh-project.json detection to the existing session-start hook.

**Files:**
- Modify: `.claude/hooks/session-start.sh`

**Step 1: Read current session-start.sh**

Understand the existing injection pattern.

**Step 2: Add fresh-project re-entry detection**

After the existing context injections (swarm-state, error-log, agent-memory), add:

```bash
# Inject fresh-project re-entry prompt if flow is incomplete
fresh_project_context=""
fresh_project_file="${PLUGIN_ROOT}/fresh-project.json"
if [ -f "$fresh_project_file" ]; then
    # Check if build phase is complete
    build_status=$(jq -r '.build // "pending"' "$fresh_project_file" 2>/dev/null || echo "pending")
    if [ "$build_status" != "complete" ]; then
        current_phase=$(jq -r '.phase // "unknown"' "$fresh_project_file" 2>/dev/null || echo "unknown")
        fp_escaped=$(escape_for_json "Active fresh-project flow detected. Current phase: ${current_phase}. Read .claude/fresh-project.json for state. Offer to resume: 'picked up where you left off — [phase description]. ready to continue?'")
        fresh_project_context="\\n\\n<fresh-project-resume>\\n${fp_escaped}\\n</fresh-project-resume>"
    fi
fi
```

Add `${fresh_project_context}` to the output JSON's additionalContext string.

**Step 3: Test the hook**

Create a test fresh-project.json, run the hook, verify the re-entry prompt is injected.

```bash
echo '{"phase":"scaffold","discovery":"complete","stack":"complete","scaffold":"in_progress","plan":"pending","build":"pending"}' > .claude/fresh-project.json
bash .claude/hooks/session-start.sh
# Should include fresh-project-resume in output
rm .claude/fresh-project.json
```

**Step 4: Commit**

```bash
git add .claude/hooks/session-start.sh
git commit -m "feat: add fresh-project re-entry detection to session-start hook"
```

---

## Task 9: Modify armadillo-shepherd routing table

Add fresh-project routing to the shepherd skill.

**Files:**
- Modify: `.claude/skills/armadillo-shepherd/SKILL.md`

**Step 1: Add routing entries**

In the "Creative & Planning" section of the routing table, add:

```markdown
| New project from scratch, idea to build | `fresh-project` |
```

In the "Armadillo Meta" section, add:

```markdown
| Scaffold a project from stack decisions | `scaffold` |
```

Add a new section:

```markdown
### Greenfield Project

| Request | Skill |
|---------|-------|
| "I want to build...", new project from idea | `fresh-project` |
| Scaffold from stack.json | `scaffold` |
| Stack/technology recommendation | Load `stack-recommender` reference |
```

**Step 2: Add detection signals to shepherd**

Add a note in the Hard Rules section:

```markdown
- If the project directory is empty/near-empty (no package.json, no src/, no framework config) AND the user describes something to build → route to `fresh-project`
```

**Step 3: Commit**

```bash
git add .claude/skills/armadillo-shepherd/SKILL.md
git commit -m "feat: add fresh-project routing to armadillo-shepherd"
```

---

## Task 10: Modify onboarding skill for greenfield detection

Add the greenfield detection and transition to onboarding.

**Files:**
- Modify: `.claude/skills/onboarding/SKILL.md`

**Step 1: Add greenfield detection to Phase 0**

In the "Phase 0: Detect State" section, after the existing detection logic, add a new path:

```markdown
### Greenfield Detection

After fresh install completes (Phase 5), before Phase 6 project analysis:

1. **Check if directory is empty** — no package.json, no src/, no framework config, no source files
2. If empty, offer the fresh-project flow:

```
armadillo is installed and ready.

this is a blank canvas — no framework, no source, no config.

▸ got something you want to build?
```

Use **AskUserQuestion** with options:
- "Yes, let's build something" → invoke `fresh-project` skill (this replaces Phase 6)
- "No, just set up armadillo" → continue with standard Phase 6 or finish

If user chooses to build → the `fresh-project` skill takes over entirely. Onboarding is complete.
```

**Step 2: Commit**

```bash
git add .claude/skills/onboarding/SKILL.md
git commit -m "feat: add greenfield detection to onboarding skill"
```

---

## Task 11: Update skills.json with new skills + bundles

Register everything in the skill registry.

**Files:**
- Modify: `skills.json`

**Step 1: Add new skills to skills section**

```json
"fresh-project": {
  "name": "Fresh Project",
  "description": "Zero-to-shipped orchestrator — discovery, stack selection, scaffold, planning, build",
  "files": ["skills/fresh-project/SKILL.md"],
  "agents": ["agents/fullstack-architect.md", "agents/project-scaffolder.md"],
  "depends": ["stack-recommender", "scaffold", "writing-plans", "executing-plans"],
  "bundle": "fresh-project"
},
"scaffold": {
  "name": "Scaffold",
  "description": "Create configured projects from stack.json technology decisions",
  "files": ["skills/scaffold/SKILL.md"],
  "agents": ["agents/project-scaffolder.md"],
  "depends": ["stack-recommender"],
  "bundle": "fresh-project"
},
"stack-recommender": {
  "name": "Stack Recommender",
  "description": "Technology selection framework — maps project requirements to stack decisions",
  "files": ["skills/stack-recommender/SKILL.md", "skills/stack-recommender/reference.md"],
  "agents": ["agents/fullstack-architect.md"],
  "bundle": "fresh-project"
}
```

**Step 2: Add new bundle**

```json
"fresh-project": {
  "name": "Fresh Project",
  "description": "Zero-to-shipped — discovery, stack recommendation, scaffold, plan, build",
  "default": false,
  "skills": ["fresh-project", "scaffold", "stack-recommender"]
}
```

**Step 3: Add new agents to any existing skill that references them**

Verify no existing skills need agent references updated.

**Step 4: Add project-context rule to sharedFiles.rules**

```json
"rules": [
  "rules/coding-standards.md",
  "rules/git-workflow.md",
  "rules/output-style.md",
  "rules/pr-format.md",
  "rules/project-context.md"
]
```

**Step 5: Commit**

```bash
git add skills.json
git commit -m "feat: register fresh-project skills, agents, and bundle in skills.json"
```

---

## Task 12: Integration test — full flow walkthrough

**Files:**
- Create: `.claude/tests/fresh-project/test-full-flow.sh`
- Create: `.claude/tests/fresh-project/prompts/greenfield-saas.txt`

**Step 1: Create test prompt**

```
I want to build a SaaS dashboard for my agency. Clients log in and see their Google Analytics data — traffic, conversions, top pages. The team uses it internally too for reporting. We know React and TypeScript. Ship in 2 weeks.
```

**Step 2: Create test script**

Script should:
1. Create a temporary empty directory
2. Run the session-start hook and verify fresh-project routing would trigger
3. Verify the fresh-project skill produces PROJECT.md after discovery questions
4. Verify stack.json is produced with consistent picks
5. Verify fresh-project.json state tracking works
6. Verify re-entry detection works (kill mid-flow, restart, check for resume prompt)

**Step 3: Run the test**

```bash
bash .claude/tests/fresh-project/test-full-flow.sh
```

**Step 4: Fix any issues found**

**Step 5: Commit**

```bash
git add .claude/tests/fresh-project/
git commit -m "test: add fresh-project integration test"
```

---

## Task 13: Update CLAUDE.md with fresh-project section

**Files:**
- Modify: `.claude/CLAUDE.md` (the template)

**Step 1: Add fresh-project to the skills list**

In the Workflow section, add:

```markdown
- **fresh-project** — Zero-to-shipped for greenfield projects
- **scaffold** — Create projects from stack decisions
```

In the Meta section, add:

```markdown
- **stack-recommender** — Technology selection framework
```

**Step 2: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: add fresh-project skills to CLAUDE.md template"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Branch + directories | Feature branch, skill dirs |
| 2 | project-context rule | `.claude/rules/project-context.md` |
| 3 | stack-recommender skill | SKILL.md + reference.md (TDD) |
| 4 | fullstack-architect agent | Agent markdown (TDD) |
| 5 | project-scaffolder agent | Agent markdown (TDD) |
| 6 | fresh-project skill | SKILL.md (TDD) |
| 7 | scaffold skill | SKILL.md (TDD) |
| 8 | session-start.sh | Hook modification |
| 9 | armadillo-shepherd | Routing table update |
| 10 | onboarding | Greenfield detection |
| 11 | skills.json | Registry + bundle |
| 12 | Integration test | Full flow test |
| 13 | CLAUDE.md | Template update |

13 tasks · executing subagent-driven (reason: tasks have sequential dependencies — each builds on prior artifacts)

**After Phase 1:** The orchestrator works end-to-end. It uses existing reference skills (nextjs, tailwind-css, shadcn-ui, neon, stripe-api, etc.) and generates missing ones on-demand via writing-reference-skills. Phases 2-6 add pre-written reference skills so common stacks are instant instead of on-demand.
