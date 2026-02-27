# Skill Patterns Reference

Five common patterns for structuring skills, identified from Anthropic's official guide and armadillo's skill library. Use this when deciding how to structure a new skill.

## 1. Sequential Workflow Orchestration

**When to use:** Complex multi-step processes where order matters and steps build on each other.

**Structure:**
- Numbered steps with clear entry/exit criteria
- Flowchart showing the decision path
- Verification checkpoints between steps
- Clear "done" conditions

**Armadillo examples:**
- `brainstorming` — Explore → Questions → Approaches → Design → Doc → Handoff
- `finishing-a-development-branch` — Verify tests → Changelog → Base branch → Options → Execute → Cleanup
- `subagent-driven-development` — Read plan → Dispatch → Review → Fix → Next task

**Common pitfall:** Steps that are too coarse-grained. If a step takes > 5 minutes, split it.

## 2. Iterative Refinement

**When to use:** Quality-sensitive tasks that benefit from review cycles.

**Structure:**
- Initial attempt
- Validation/review step
- Fix loop (repeat until passing)
- Gate before proceeding

**Armadillo examples:**
- `receiving-code-review` — Analyze feedback → Classify → Implement → Verify each fix
- `test-driven-development` — RED → GREEN → REFACTOR → repeat
- `writing-skills` — Baseline → Write skill → Test → Close loopholes → Re-test

**Common pitfall:** No termination condition. Always define when the loop ends.

## 3. Context-Aware Tool Selection

**When to use:** Tasks where the right approach depends on what you find.

**Structure:**
- Discovery/analysis phase
- Decision tree or flowchart
- Branch-specific instructions
- Merge point for common post-processing

**Armadillo examples:**
- `systematic-debugging` — Reproduce → Gather evidence → Analyze → Choose strategy
- `onboarding` — Scan existing → Classify files → Route each to appropriate handler

**Common pitfall:** Decision tree that's too deep. Keep to 2-3 levels max.

## 4. Discipline Enforcement

**When to use:** Rules that agents are tempted to skip under pressure.

**Structure:**
- `<HARD-GATE>` tag with non-negotiable rule
- Iron Law (one-line summary)
- Rationalization table (excuse → reality)
- Red Flags list (symptoms of violation)
- "Spirit vs letter" statement

**Armadillo examples:**
- `test-driven-development` — HARD-GATE + Iron Law + rationalization table
- `verification-before-completion` — Gate Function + rationalization prevention
- `brainstorming` — HARD-GATE before any implementation

**Common pitfall:** Rules without rationalization counters. Agents WILL find loopholes.

## 5. Domain-Specific Intelligence

**When to use:** Reference material for specific tools, APIs, or domains.

**Structure:**
- Quick start (minimal working example)
- Reference tables (endpoints, methods, config)
- Common recipes (task-oriented examples)
- Troubleshooting section

**Armadillo examples:**
- `neon` — Serverless Postgres reference with connection patterns
- `stripe-api` — Payment integration with webhook handling
- `ga4-api` — Analytics queries with dimension/metric reference

**Common pitfall:** Including information Claude already knows. Only add domain-specific context that isn't in Claude's training data.

## Pattern Selection

| Question | Pattern |
|----------|---------|
| Does order matter? | Sequential Workflow |
| Does quality need iteration? | Iterative Refinement |
| Does the approach depend on context? | Context-Aware Selection |
| Will agents try to skip this? | Discipline Enforcement |
| Is this reference material? | Domain-Specific Intelligence |

Most skills combine 2-3 patterns. For example, `subagent-driven-development` is Sequential Workflow + Iterative Refinement (the review loop within the sequential flow).
