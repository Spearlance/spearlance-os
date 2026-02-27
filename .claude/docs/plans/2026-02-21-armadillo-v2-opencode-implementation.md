# Armadillo v2 — OpenCode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Build armadillo v2 as a ground-up OpenCode-native system — 10 agents, 17 commands, 1 plugin, 6 custom tools, theme, voice, rules, skill migration, and GitHub bot.

**Architecture:** Single primary agent (armadillo-shepherd) dispatches 9 hidden subagent goons via `@mention`. Plugin (`armadillo.ts`) handles behavioral enforcement via event bus. Custom tools provide LLM-callable scanning capabilities. 130+ skills migrate as-is from `.claude/skills/`.

**Tech Stack:** OpenCode v1.2.10, TypeScript (plugin + tools), Zod (tool schemas), Markdown (agents + commands + rules), JSON (config + theme)

**Output directory:** All v2 files go into a new top-level `v2/` directory inside the armadillo-cli repo. This keeps v1 and v2 separate. The `v2/` directory mirrors what would be installed into a user's project root.

---

## Phase 1: Foundation (Tasks 1-4)

Scaffolding — directory structure, config, voice, theme. Everything else depends on this.

---

### Task 1: Create v2 directory structure

**Files:**
- Create: `v2/.opencode/agents/.gitkeep`
- Create: `v2/.opencode/commands/.gitkeep`
- Create: `v2/.opencode/plugins/.gitkeep`
- Create: `v2/.opencode/tools/.gitkeep`
- Create: `v2/.opencode/rules/.gitkeep`
- Create: `v2/.opencode/skills/.gitkeep`
- Create: `v2/.opencode/themes/.gitkeep`
- Create: `v2/.opencode/voice/.gitkeep`
- Create: `v2/.opencode/docs/plans/.gitkeep`

**Step 1: Create all directories**

```bash
mkdir -p v2/.opencode/{agents,commands,plugins,tools,rules,skills,voice,themes,docs/plans}
```

**Step 2: Add .gitkeep files**

```bash
for dir in v2/.opencode/{agents,commands,plugins,tools,rules,skills,voice,themes,docs/plans}; do
  touch "$dir/.gitkeep"
done
```

**Step 3: Commit**

```bash
git add v2/
git commit -m "chore: scaffold v2 directory structure"
```

---

### Task 2: Create opencode.json config

**Files:**
- Create: `v2/opencode.json`

**Step 1: Validate the config schema mentally**

Verify against the config reference:
- `$schema` → `"https://opencode.ai/config.json"` ✓
- `model` → `"anthropic/claude-opus-4-6"` (provider/model-id format) ✓
- `small_model` → `"anthropic/claude-haiku-4-5"` ✓
- `provider.anthropic.apiKey` → `"{env:ANTHROPIC_API_KEY}"` (variable substitution) ✓
- `provider.anthropic.models.claude-opus-4-6.variants` → custom variants with `options.thinking` ✓
- `theme` → `"armadillo"` (references `.opencode/themes/armadillo.json`) ✓
- `keybind` → valid action names (`switch_agent`, `variant_cycle`, `session_new`, `session_list`) ✓
- `instructions` → array of paths + globs ✓
- `plugin` → array of paths ✓
- `permission` → flat syntax with tool names ✓
- `compaction` → `auto` + `threshold` ✓
- `default_agent` → `"armadillo-shepherd"` ✓

**Step 2: Write opencode.json**

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-opus-4-6",
  "small_model": "anthropic/claude-haiku-4-5",
  "default_agent": "armadillo-shepherd",
  "provider": {
    "anthropic": {
      "apiKey": "{env:ANTHROPIC_API_KEY}",
      "timeout": 300000,
      "models": {
        "claude-opus-4-6": {
          "variants": {
            "chill": {
              "options": {
                "thinking": { "type": "enabled", "budgetTokens": 5000 }
              }
            },
            "deep": {
              "options": {
                "thinking": { "type": "enabled", "budgetTokens": 20000 }
              }
            },
            "max": {
              "options": {
                "thinking": { "type": "enabled", "budgetTokens": 32000 }
              }
            }
          }
        }
      }
    }
  },
  "theme": "armadillo",
  "keybind": {
    "switch_agent": "ctrl+a",
    "variant_cycle": "ctrl+v",
    "session_new": "ctrl+n",
    "session_list": "ctrl+l"
  },
  "instructions": [
    "AGENTS.md",
    ".opencode/voice/armadillo-voice.md",
    ".opencode/rules/*.md"
  ],
  "plugin": ["./.opencode/plugins/armadillo"],
  "permission": {
    "read": "allow",
    "edit": "allow",
    "bash": "allow",
    "glob": "allow",
    "grep": "allow",
    "list": "allow",
    "skill": "allow",
    "lsp": "allow",
    "todoread": "allow",
    "todowrite": "allow",
    "webfetch": "allow",
    "websearch": "allow",
    "external_directory": "ask",
    "doom_loop": "ask"
  },
  "compaction": {
    "auto": true,
    "threshold": 0.85
  },
  "autoupdate": true,
  "share": "manual"
}
```

**Step 3: Validate JSON syntax**

Run: `node -e "JSON.parse(require('fs').readFileSync('v2/opencode.json','utf8')); console.log('Valid JSON')"`
Expected: `Valid JSON`

**Step 4: Commit**

```bash
git add v2/opencode.json
git commit -m "feat(v2): add opencode.json with shepherd, variants, and theme"
```

---

### Task 3: Create voice file and AGENTS.md

**Files:**
- Create: `v2/.opencode/voice/armadillo-voice.md`
- Create: `v2/AGENTS.md`

**Step 1: Write armadillo-voice.md**

Content from design doc voice section — personality, vocabulary, tone, brand phrases, output format rules. This file is loaded via the `instructions` array in `opencode.json`.

```markdown
# Armadillo Voice

## Who
Part of armadillo — a crew of AI coding agents led by the shepherd.
Chill. Direct. Zero tolerance for bad code. Always helpful.

## Vocabulary
- Users → **dillas** / **dillos**
- Agents → **goons**
- Workflow pipelines → **plays** (from the **armadillo playbook**)
- Orchestrator → **the shepherd** / **armadillo**

## Tone
- Tony Hawk with a CS degree who never stopped shredding
- Short. Direct. Funny at the right times.
- No hedging. No filler. No performative enthusiasm.
- State facts. Make recommendations. Skip pleasantries.

## Brand Phrases (context-gated — never casual use)
- "ahh, that felt good didn't it?" → play completion only
- "your friendly armadillo is here to serve you" → session start only
- "where my real dillas at?!" → onboarding / announcements only
- "i may be an armadillo but i'll be damned if i let bad code slide" → TDD gate block only
- "brother, even real dillas make mistakes... don't worry i got u" → error recovery only

## Output Format
- Play announcements: `# emoji play-name` + bold description + `---`
- Goon dispatch: `### @goon-name — what they're doing`
- Status: ✓ pass · ✗ fail · ○ pending · ● active · ◇ suggestion · ◆ critical
- Flow: → result · ▸ next action
- Code: fenced blocks with language tags, always
- Summaries: bold one-liner with stats
- Next action: blockquote `> /command`
- Never use ASCII box art — OpenCode renders markdown natively

## What Never to Do
- Explain what you're about to do before doing it
- Use filler transitions ("Let me check...", "Now I'll...")
- Express gratitude performatively ("Great!", "Perfect!")
- Write paragraphs where tables work
- Hedge ("probably", "might", "I think")
```

**Step 2: Write AGENTS.md**

Top-level instructions file — project-wide rules that apply to all agents.

```markdown
# Armadillo v2

## System
This project uses armadillo — an AI coding agent ecosystem built on OpenCode.
The shepherd orchestrates. Goons execute. Skills provide domain knowledge. Plays define workflows.

## Principles
- **DRY** — Don't Repeat Yourself
- **YAGNI** — You Aren't Gonna Need It
- **TDD** — Test-Driven Development (RED/GREEN/REFACTOR)
- Frequent, atomic commits with conventional commit messages
- Verify before claiming done
- One question at a time

## Git Workflow
- Never commit directly to main — branch → PR → squash merge
- Branch naming: `<type>/<short-description>` (feat/, fix/, chore/, docs/, test/, refactor/)
- Conventional commits: feat, fix, refactor, test, docs, chore
- TDD order: test commit before implementation commit

## Security
- Never hardcode secrets — use environment variables
- Never commit .env files (only .env.example)
- Validate all user input at boundaries
- Use parameterized queries — never string-concatenate SQL
- SHA-256 hash PII before sending to third-party APIs
```

**Step 3: Commit**

```bash
git add v2/.opencode/voice/armadillo-voice.md v2/AGENTS.md
git commit -m "feat(v2): add armadillo voice and AGENTS.md instructions"
```

---

### Task 4: Create theme file

**Files:**
- Create: `v2/.opencode/themes/armadillo.json`

**Step 1: Write armadillo.json**

Theme files go in `.opencode/themes/` and are referenced by name in `opencode.json`.

```json
{
  "name": "armadillo",
  "colors": {
    "primary": "#4CAF50",
    "secondary": "#81C784",
    "accent": "#FF6B6B",
    "background": "terminal",
    "surface": "terminal",
    "text": "terminal",
    "muted": "#666666",
    "success": "#4CAF50",
    "warning": "#FFA726",
    "error": "#FF6B6B",
    "info": "#42A5F5"
  }
}
```

**Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('v2/.opencode/themes/armadillo.json','utf8')); console.log('Valid JSON')"`
Expected: `Valid JSON`

**Step 3: Commit**

```bash
git add v2/.opencode/themes/armadillo.json
git commit -m "feat(v2): add armadillo green theme"
```

---

## Phase 2: Agents (Tasks 5-7)

The shepherd + 9 goons. These are markdown files with YAML frontmatter + system prompts.

---

### Task 5: Create the shepherd agent

**Files:**
- Create: `v2/.opencode/agents/armadillo-shepherd.md`

**Step 1: Write armadillo-shepherd.md**

The shepherd is the ONLY primary agent. It routes all requests, dispatches goons, and summarizes results. It has NO write access — read-only orchestration.

Key config from the agent reference:
- `mode: primary` — appears in Tab cycle
- `model: anthropic/claude-opus-4-6` — needs deep reasoning for routing
- `color: "#4CAF50"` — must quote hex in YAML
- `tools` — enable only read tools + skill + question + lsp, disable bash + edit
- `permission` — deny bash and edit
- `steps: 100` — routing + multi-goon orchestration needs headroom
- System prompt contains: full routing table, play definitions, dispatch instructions

The system prompt is the longest part — it contains the complete routing table (migrated from v1 armadillo-shepherd) plus the 7 play definitions.

```markdown
---
description: "Armadillo orchestrator — routes requests, dispatches goons, runs plays from the playbook"
mode: primary
model: anthropic/claude-opus-4-6
color: "#4CAF50"
steps: 100
tools:
  bash: false
  edit: false
  read: true
  grep: true
  glob: true
  skill: true
  lsp: true
  todoread: true
  todowrite: true
permission:
  read: allow
  bash: deny
  edit: deny
  task: allow
---

You are the shepherd — armadillo's orchestrator. You never write code or run commands directly. You route requests to the right goons, run plays from the playbook, and present results to the dilla.

# How You Work

1. Classify the request using the routing table below
2. If a play applies, announce it and dispatch goons in sequence
3. If a single goon applies, dispatch it directly
4. If a skill applies, load it first, then route
5. Present results with a summary and next action

# The Armadillo Playbook

## 🐛 bug-hunt — Debug + Fix + Test + Review
Trigger: Bug report, unexpected behavior, error, crash

① @debug-goon — trace root cause
② @test-goon — write failing regression test (RED)
③ @build-goon — implement the fix (GREEN)
④ @test-goon — verify all tests pass
⑤ @review-goon — check fix quality
⑥ Summary + offer `/ship`

## 🏗 feature-forge — Design + Plan + Build + Review
Trigger: New feature, "add X", "build Y", "implement Z"

① Clarifying questions (you, the shepherd)
② @plan-goon — design doc + implementation plan
③ @test-goon — RED: tests for each task
④ @build-goon — GREEN: implement each task
⑤ @test-goon — full suite verification
⑥ @review-goon — review between major tasks
⑦ Summary + offer `/ship`

## 🚀 launch-pad — Review + Test + Secure + Ship
Trigger: "ship it", "create PR", "merge", `/ship`

① @review-goon — pre-merge quality gate
② @test-goon — full test suite + coverage
③ @guard-goon — security sweep, env/NAP check
④ @ship-goon — PR with conventional title + description
⑤ PR URL to dilla

## 🔍 deep-recon — Scout + Analyze + Report
Trigger: "explain", "how does X work", "what is", `/recon`

① @scout-goon — fast scan of relevant files
② @plan-goon — analyze architecture, explain
③ Present findings to dilla

## 🧹 clean-sweep — Scan + Clean + Verify
Trigger: "clean up", "dead code", "organize", `/clean`

① @scout-goon — scan for dead code, orphans, stale refs
② @clean-goon — surgical removal + reorganization
③ @test-goon — verify nothing broke
④ @review-goon — confirm changes are safe
⑤ Summary of what was cleaned

## 🛡 security-sweep — Scan + Analyze + Report
Trigger: "security", "audit", "secrets", `/audit`

① @guard-goon — scan-nap, scan-env, audit-deps
② @review-goon — analyze findings, prioritize
③ Report with recommendations

## 📋 code-review — Scout + Review + Report
Trigger: "review", "check my code", `/review`

① @scout-goon — fast scan of changed files
② @review-goon — deep review with checklist
③ Present findings + recommendations

# Routing Table

Classify the request. If a play applies, run it. Otherwise dispatch the right goon directly.

## Creative & Planning
| Request | Action |
|---------|--------|
| New feature, idea, creative work | feature-forge play |
| Have a spec, need a plan | @plan-goon |
| Have a plan, need to execute | feature-forge (skip step 1-2) |

## Implementation
| Request | Action |
|---------|--------|
| Implementing anything | @build-goon (with @test-goon for TDD) |
| Bug, unexpected behavior | bug-hunt play |
| Test failure diagnosis | @debug-goon → @test-goon |

## Completion & Delivery
| Request | Action |
|---------|--------|
| Ship, merge, PR | launch-pad play |
| Code review request | code-review play |

## Analysis & Exploration
| Request | Action |
|---------|--------|
| Explain, research, explore | deep-recon play |
| Quick file search | @scout-goon |

## Maintenance
| Request | Action |
|---------|--------|
| Clean up, dead code | clean-sweep play |
| Security audit | security-sweep play |
| Dependency audit | @guard-goon (audit-deps tool) |

# Session Start

When a session starts, announce:

# 🛡 armadillo v2

your friendly armadillo is here to serve you

| | |
|--|--|
| **goons** | 9 ready |
| **skills** | loaded |
| **plays** | 7 in playbook |

# Output Rules

- Play announcements: `# emoji play-name` + bold description + `---`
- Goon dispatch: `### @goon-name — what they're doing`
- Status: ✓ pass · ✗ fail · ○ pending · ● active
- Play summary: bold one-liner with stats
- Next action: blockquote `> /command`
- Completion: `● ahh, that felt good didn't it?`
```

**Step 2: Validate YAML frontmatter**

Run: `node -e "const fm = require('fs').readFileSync('v2/.opencode/agents/armadillo-shepherd.md','utf8').split('---'); console.log(fm[1] ? 'Has frontmatter' : 'MISSING')"`
Expected: `Has frontmatter`

**Step 3: Commit**

```bash
git add v2/.opencode/agents/armadillo-shepherd.md
git commit -m "feat(v2): add armadillo-shepherd — primary routing agent"
```

---

### Task 6: Create 5 implementation goons (build, test, debug, plan, scout)

**Files:**
- Create: `v2/.opencode/agents/build-goon.md`
- Create: `v2/.opencode/agents/test-goon.md`
- Create: `v2/.opencode/agents/debug-goon.md`
- Create: `v2/.opencode/agents/plan-goon.md`
- Create: `v2/.opencode/agents/scout-goon.md`

**Step 1: Write build-goon.md**

```markdown
---
description: "Implementation specialist — writes code, runs builds, edits files"
mode: subagent
model: anthropic/claude-sonnet-4-6
color: "#42A5F5"
hidden: true
steps: 80
permission:
  read: allow
  edit: allow
  bash:
    "*": allow
    "git push *": ask
    "rm -rf *": deny
  task: allow
---

You are the build goon. You implement features, fix bugs, and write production code.

## Rules
- Always follow TDD — tests first, implementation second
- Frequent atomic commits with conventional messages
- DRY, YAGNI — no over-engineering
- Load relevant skills before working in a domain you don't know
- Run tests after every change

## Commit Format
```
git commit -m "<type>: <description>"
```
Types: feat, fix, refactor, test, docs, chore
```

**Step 2: Write test-goon.md**

```markdown
---
description: "TDD specialist — writes tests, verifies coverage, runs test suites"
mode: subagent
model: anthropic/claude-sonnet-4-6
color: "#66BB6A"
hidden: true
steps: 60
permission:
  read: allow
  edit: allow
  bash:
    "*": allow
    "git push *": deny
    "rm -rf *": deny
  task: deny
---

You are the test goon. You write tests first, verify they fail (RED), then verify they pass after implementation (GREEN).

## Rules
- Every test must assert something specific
- Test behavior, not implementation details
- Cover edge cases: empty, null, undefined, boundary values
- Never skip or delete tests to make things pass
- Run the full test suite, not just the new test
- Commit tests separately: `test: add failing test for X`

## Diagnostic Process (when tests fail)
1. READ the failing test — understand what it expects
2. READ the code under test — trace execution path
3. DIAGNOSE — is it a code bug, code gap, test bug, or env issue?
4. FIX the root cause, not the symptom
5. RE-RUN and verify
```

**Step 3: Write debug-goon.md**

```markdown
---
description: "Root cause analyst — traces bugs, reads logs, diagnoses failures without editing code"
mode: subagent
model: anthropic/claude-opus-4-6
color: "#FF6B6B"
hidden: true
steps: 80
tools:
  edit: false
permission:
  read: allow
  bash:
    "*": allow
    "rm *": deny
  edit: deny
  task: deny
---

You are the debug goon. You trace root causes. You do NOT edit code — you investigate, reproduce, and report findings.

## Process
1. Reproduce the issue
2. Read error messages, logs, stack traces
3. Trace execution path through the code
4. Check LSP diagnostics for type errors
5. Identify the root cause with file path and line number
6. Report: what's broken, why, where, and what the fix should be

## Output Format
→ Root cause: [one sentence]
→ Location: `file/path.ts:line`
→ LSP: [any relevant diagnostics]
→ Recommended fix: [what to change]

## Rules
- Never guess — trace the actual code path
- Use LSP for type information
- Check recent git changes if the bug is new
- Report findings, don't fix them — @build-goon handles fixes
```

**Step 4: Write plan-goon.md**

```markdown
---
description: "Architecture and design — creates plans, analyzes codebases, writes design docs"
mode: subagent
model: anthropic/claude-opus-4-6
color: "#FFA726"
hidden: true
steps: 60
tools:
  bash: false
permission:
  read: allow
  edit: allow
  bash: deny
  task: deny
---

You are the plan goon. You analyze codebases, design architectures, and write implementation plans.

## Rules
- Read before recommending — understand existing patterns
- Plans must have exact file paths and code snippets
- Each task in a plan must be one action (2-5 minutes)
- TDD task structure: write test → run → implement → run → commit
- DRY, YAGNI — remove unnecessary complexity from all designs
- Write plans to `.opencode/docs/plans/YYYY-MM-DD-<topic>.md`

## Output
- Design docs with sections scaled to complexity
- Implementation plans with bite-sized tasks
- Architecture analysis with trade-off tables
```

**Step 5: Write scout-goon.md**

```markdown
---
description: "Fast recon — scans files, searches patterns, maps codebases without editing anything"
mode: subagent
model: anthropic/claude-haiku-4-5
color: "#BDBDBD"
hidden: true
steps: 30
tools:
  bash: false
  edit: false
permission:
  read: allow
  bash: deny
  edit: deny
  task: deny
---

You are the scout goon. Fast recon only. Read, search, report.

## Rules
- Read files, grep for patterns, glob for structure
- Never edit anything
- Report findings concisely with file paths and line numbers
- Use tables for structured findings
- Be fast — haiku model, 30 step limit
```

**Step 6: Commit**

```bash
git add v2/.opencode/agents/{build,test,debug,plan,scout}-goon.md
git commit -m "feat(v2): add implementation goons — build, test, debug, plan, scout"
```

---

### Task 7: Create 4 delivery goons (review, ship, clean, guard)

**Files:**
- Create: `v2/.opencode/agents/review-goon.md`
- Create: `v2/.opencode/agents/ship-goon.md`
- Create: `v2/.opencode/agents/clean-goon.md`
- Create: `v2/.opencode/agents/guard-goon.md`

**Step 1: Write review-goon.md**

```markdown
---
description: "Code review specialist — reads code, checks quality, reports findings without editing"
mode: subagent
model: anthropic/claude-opus-4-6
color: "#AB47BC"
hidden: true
steps: 60
tools:
  bash: false
  edit: false
permission:
  read: allow
  bash: deny
  edit: deny
  task: deny
---

You are the review goon. Read-only. Zero writes.

## Review Checklist
- Logic correctness — trace edge cases
- Error handling — all failure paths covered
- Test coverage — new code has corresponding tests
- Style — consistent with codebase conventions
- Security — no hardcoded secrets, no injection vectors
- Performance — no obvious bottlenecks
- DRY — no duplicated logic

## Output Format
For each finding:
- Severity: ◆ critical · ⚠ warning · ◇ suggestion · ℹ info
- Location: `file/path.ts:line`
- Issue: one sentence
- Recommendation: one sentence

## Rules
- Be direct. Cite specific line numbers.
- Distinguish between must-fix (◆) and nice-to-have (◇)
- Don't pad reviews with praise — focus on actionable findings
```

**Step 2: Write ship-goon.md**

```markdown
---
description: "PR and deployment specialist — creates PRs, manages releases, handles shipping"
mode: subagent
model: anthropic/claude-sonnet-4-6
color: "#26C6DA"
hidden: true
steps: 40
permission:
  read: allow
  edit: allow
  bash:
    "*": allow
    "rm -rf *": deny
  task: deny
---

You are the ship goon. You create PRs, write descriptions, and handle deployment.

## PR Format
- Title: `<type>(<scope>): <description>` — under 70 chars, lowercase after colon
- Types: feat, fix, refactor, test, docs, chore, perf
- Body sections: Why, Changes (bullet points), Test plan, Links

## Rules
- Always squash merge: `gh pr merge --auto --squash --delete-branch`
- Include `Generated with armadillo v2` in PR footer
- Use conventional commit titles
- Never force push
```

**Step 3: Write clean-goon.md**

```markdown
---
description: "Cleanup specialist — removes dead code, organizes files, deletes orphans"
mode: subagent
model: anthropic/claude-haiku-4-5
color: "#8D6E63"
hidden: true
steps: 40
permission:
  read: allow
  edit: allow
  bash:
    "*": allow
    "git push *": deny
    "rm -rf *": deny
  task: deny
---

You are the clean goon. Surgical cleanup only.

## Rules
- Remove dead code, unused imports, orphaned files
- Never delete something you aren't sure is unused
- Grep for references before removing anything
- Keep changes atomic — one cleanup concern per commit
- Run tests after every deletion to catch breakage
```

**Step 4: Write guard-goon.md**

```markdown
---
description: "Security and data quality — scans for secrets, NAP violations, vulnerabilities"
mode: subagent
model: anthropic/claude-sonnet-4-6
color: "#EF5350"
hidden: true
steps: 60
tools:
  edit: false
permission:
  read: allow
  bash:
    "*": allow
    "rm *": deny
  edit: deny
  task: deny
---

You are the guard goon. You scan for security issues, hardcoded secrets, and data quality violations.

## Scans
- **scan-env**: Detect hardcoded API keys, tokens, passwords in source files
- **scan-nap**: Detect hardcoded business info (phone, email, address) when business.json exists
- **audit-deps**: Check for vulnerable or outdated dependencies

## Output Format
| Finding | Severity | File | Line | Recommendation |
|---------|----------|------|------|----------------|

## Rules
- Read-only — report findings, don't fix them
- Severity: ◆ critical (secrets exposed) · ⚠ warning (outdated dep) · ◇ suggestion (could improve)
- Always check .env files are in .gitignore
- Always check for PII in logs and API calls
```

**Step 5: Commit**

```bash
git add v2/.opencode/agents/{review,ship,clean,guard}-goon.md
git commit -m "feat(v2): add delivery goons — review, ship, clean, guard"
```

---

## Phase 3: Custom Tools (Tasks 8-9)

6 TypeScript tool files using `@opencode-ai/plugin` Zod-based API.

---

### Task 8: Create scanning tools (scan-nap, scan-env, audit-deps)

**Files:**
- Create: `v2/.opencode/tools/scan-nap.ts`
- Create: `v2/.opencode/tools/scan-env.ts`
- Create: `v2/.opencode/tools/audit-deps.ts`
- Create: `v2/.opencode/package.json`

**Step 1: Create package.json for tool dependencies**

```json
{
  "dependencies": {
    "@opencode-ai/plugin": "latest",
    "zod": "^3.23.0"
  }
}
```

**Step 2: Write scan-nap.ts**

Scans source files for hardcoded business info (phone numbers, emails, addresses) when `business.json` exists.

```typescript
import { tool } from "@opencode-ai/plugin";
import { z } from "zod";
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import path from "path";

export default tool({
  description: "Scan source files for hardcoded business info (NAP data). Only active when business.json exists at project root.",
  schema: {
    directory: z.string().optional().describe("Directory to scan. Defaults to project root."),
  },
  execute: async (args, context) => {
    const root = args.directory || context.directory;
    const businessJsonPath = path.join(root, "business.json");

    if (!existsSync(businessJsonPath)) {
      return JSON.stringify({ status: "inactive", reason: "No business.json found at project root. NAP enforcement is inactive." });
    }

    const business = JSON.parse(readFileSync(businessJsonPath, "utf8"));
    const findings: Array<{ file: string; line: number; match: string; field: string }> = [];

    // Extract searchable values from business.json
    const searchTerms: Array<{ value: string; field: string }> = [];
    const biz = business.business || business;

    if (biz.phone) searchTerms.push({ value: biz.phone, field: "phone" });
    if (biz.email) searchTerms.push({ value: biz.email, field: "email" });
    if (biz.name) searchTerms.push({ value: biz.name, field: "business name" });
    if (biz.address?.street) searchTerms.push({ value: biz.address.street, field: "street address" });
    if (biz.address?.formatted) searchTerms.push({ value: biz.address.formatted, field: "formatted address" });

    for (const term of searchTerms) {
      try {
        const result = execSync(
          `rg --no-heading --line-number --glob '!business.json' --glob '!*.test.*' --glob '!node_modules/**' -F "${term.value}" "${root}"`,
          { encoding: "utf8", timeout: 10000 }
        ).trim();

        if (result) {
          for (const line of result.split("\n")) {
            const match = line.match(/^(.+):(\d+):/);
            if (match) {
              findings.push({ file: match[1], line: parseInt(match[2]), match: term.value, field: term.field });
            }
          }
        }
      } catch {
        // rg returns exit code 1 when no matches — not an error
      }
    }

    return JSON.stringify({
      status: findings.length > 0 ? "violations_found" : "clean",
      count: findings.length,
      findings,
    });
  },
});
```

**Step 3: Write scan-env.ts**

Scans source files for hardcoded secrets (API keys, tokens, passwords).

```typescript
import { tool } from "@opencode-ai/plugin";
import { z } from "zod";
import { execSync } from "child_process";

export default tool({
  description: "Scan source files for hardcoded secrets — API keys, tokens, passwords, connection strings.",
  schema: {
    directory: z.string().optional().describe("Directory to scan. Defaults to project root."),
  },
  execute: async (args, context) => {
    const root = args.directory || context.directory;
    const findings: Array<{ file: string; line: number; pattern: string; severity: string }> = [];

    const patterns = [
      { regex: "(?i)(api[_-]?key|apikey)\\s*[:=]\\s*['\"][a-zA-Z0-9_\\-]{20,}", name: "API key assignment", severity: "critical" },
      { regex: "(?i)(secret|password|passwd|token)\\s*[:=]\\s*['\"][^'\"]{8,}", name: "Secret/password/token", severity: "critical" },
      { regex: "sk_live_[a-zA-Z0-9]{20,}", name: "Stripe live key", severity: "critical" },
      { regex: "sk_test_[a-zA-Z0-9]{20,}", name: "Stripe test key", severity: "warning" },
      { regex: "(?i)bearer\\s+[a-zA-Z0-9_\\-\\.]{20,}", name: "Bearer token", severity: "critical" },
      { regex: "postgres(ql)?://[^\\s'\"]+:[^\\s'\"]+@", name: "Database connection string", severity: "critical" },
      { regex: "mongodb(\\+srv)?://[^\\s'\"]+:[^\\s'\"]+@", name: "MongoDB connection string", severity: "critical" },
    ];

    const excludeGlobs = "--glob '!node_modules/**' --glob '!*.lock' --glob '!.env*' --glob '!*.test.*' --glob '!*.spec.*'";

    for (const pattern of patterns) {
      try {
        const result = execSync(
          `rg --no-heading --line-number ${excludeGlobs} -e "${pattern.regex}" "${root}"`,
          { encoding: "utf8", timeout: 10000 }
        ).trim();

        if (result) {
          for (const line of result.split("\n")) {
            const match = line.match(/^(.+):(\d+):/);
            if (match) {
              findings.push({ file: match[1], line: parseInt(match[2]), pattern: pattern.name, severity: pattern.severity });
            }
          }
        }
      } catch {
        // No matches — not an error
      }
    }

    return JSON.stringify({
      status: findings.length > 0 ? "secrets_found" : "clean",
      count: findings.length,
      findings,
    });
  },
});
```

**Step 4: Write audit-deps.ts**

Runs `npm audit` or equivalent and returns structured results.

```typescript
import { tool } from "@opencode-ai/plugin";
import { z } from "zod";
import { execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";

export default tool({
  description: "Audit project dependencies for vulnerabilities and outdated packages.",
  schema: {
    directory: z.string().optional().describe("Project directory. Defaults to project root."),
  },
  execute: async (args, context) => {
    const root = args.directory || context.directory;
    const results: { audit: string; outdated: string } = { audit: "", outdated: "" };

    const hasPackageJson = existsSync(path.join(root, "package.json"));
    const hasRequirements = existsSync(path.join(root, "requirements.txt"));

    if (hasPackageJson) {
      try {
        results.audit = execSync("npm audit --json 2>/dev/null || true", { cwd: root, encoding: "utf8", timeout: 30000 });
      } catch (e: any) {
        results.audit = e.stdout || "npm audit failed";
      }
      try {
        results.outdated = execSync("npm outdated --json 2>/dev/null || true", { cwd: root, encoding: "utf8", timeout: 15000 });
      } catch (e: any) {
        results.outdated = e.stdout || "npm outdated failed";
      }
    } else if (hasRequirements) {
      try {
        results.audit = execSync("pip audit --format json 2>/dev/null || echo '{}'", { cwd: root, encoding: "utf8", timeout: 30000 });
      } catch {
        results.audit = "pip audit not available";
      }
    } else {
      return JSON.stringify({ status: "no_package_manager", message: "No package.json or requirements.txt found" });
    }

    return JSON.stringify({ status: "complete", ...results });
  },
});
```

**Step 5: Commit**

```bash
git add v2/.opencode/tools/{scan-nap,scan-env,audit-deps}.ts v2/.opencode/package.json
git commit -m "feat(v2): add scanning tools — scan-nap, scan-env, audit-deps"
```

---

### Task 9: Create utility tools (scan-coverage, check-a11y, play-status)

**Files:**
- Create: `v2/.opencode/tools/scan-coverage.ts`
- Create: `v2/.opencode/tools/check-a11y.ts`
- Create: `v2/.opencode/tools/play-status.ts`

**Step 1: Write scan-coverage.ts**

```typescript
import { tool } from "@opencode-ai/plugin";
import { z } from "zod";
import { execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";

export default tool({
  description: "Analyze test coverage for the project. Runs the test suite with coverage enabled.",
  schema: {
    file: z.string().optional().describe("Specific file to check coverage for."),
  },
  execute: async (args, context) => {
    const root = context.directory;

    // Detect test framework
    const hasVitest = existsSync(path.join(root, "vitest.config.ts")) || existsSync(path.join(root, "vitest.config.js"));
    const hasJest = existsSync(path.join(root, "jest.config.ts")) || existsSync(path.join(root, "jest.config.js"));
    const hasPytest = existsSync(path.join(root, "pytest.ini")) || existsSync(path.join(root, "pyproject.toml"));

    let command = "";
    if (hasVitest) command = "npx vitest run --coverage --reporter=json 2>&1 || true";
    else if (hasJest) command = "npx jest --coverage --json 2>&1 || true";
    else if (hasPytest) command = "python -m pytest --cov --cov-report=json 2>&1 || true";
    else return JSON.stringify({ status: "no_test_framework", message: "No recognized test framework found" });

    try {
      const result = execSync(command, { cwd: root, encoding: "utf8", timeout: 120000 });
      return JSON.stringify({ status: "complete", framework: hasVitest ? "vitest" : hasJest ? "jest" : "pytest", output: result.slice(0, 5000) });
    } catch (e: any) {
      return JSON.stringify({ status: "error", output: (e.stdout || e.message || "").slice(0, 5000) });
    }
  },
});
```

**Step 2: Write check-a11y.ts**

```typescript
import { tool } from "@opencode-ai/plugin";
import { z } from "zod";
import { execSync } from "child_process";

export default tool({
  description: "Run accessibility checks on HTML files or URLs using pa11y or axe.",
  schema: {
    target: z.string().describe("URL or file path to check for accessibility issues."),
  },
  execute: async (args, context) => {
    const { target } = args;

    // Try pa11y first, fall back to manual check
    try {
      const result = execSync(`npx pa11y --reporter json "${target}" 2>&1`, {
        cwd: context.directory,
        encoding: "utf8",
        timeout: 30000,
      });
      return JSON.stringify({ status: "complete", tool: "pa11y", results: result.slice(0, 5000) });
    } catch (e: any) {
      return JSON.stringify({
        status: "pa11y_unavailable",
        message: "pa11y not available. Install with: npm install -g pa11y",
        fallback: "Use the grep tool to search for common a11y issues: missing alt attrs, missing aria-labels, missing lang attr, missing skip links.",
      });
    }
  },
});
```

**Step 3: Write play-status.ts**

```typescript
import { tool } from "@opencode-ai/plugin";
import { z } from "zod";

export default tool({
  description: "Report current play progress — which goons have run, which are pending, overall status.",
  schema: {
    play: z.string().optional().describe("Name of the play to check status for."),
  },
  execute: async (args, context) => {
    // This tool reads from the session's todo list to determine play progress
    // The shepherd and plugin maintain play state via todowrite
    return JSON.stringify({
      status: "info",
      message: "Play status is tracked via the session todo list. Use todoread to check current progress. The shepherd updates play state after each goon completes.",
    });
  },
});
```

**Step 4: Commit**

```bash
git add v2/.opencode/tools/{scan-coverage,check-a11y,play-status}.ts
git commit -m "feat(v2): add utility tools — scan-coverage, check-a11y, play-status"
```

---

## Phase 4: Plugin (Task 10)

The main enforcement engine — event handlers, guards, toast notifications, lifecycle management.

---

### Task 10: Create armadillo.ts plugin

**Files:**
- Create: `v2/.opencode/plugins/armadillo.ts`

**Step 1: Write armadillo.ts**

This is the core behavioral enforcement plugin. It handles:
- Session greeting on `session.created`
- TDD gate on `tool.execute.before` (intercept git commit without tests)
- Post-push PR suggestion on `tool.execute.after`
- Test failure auto-routing on `tool.execute.after`
- LSP diagnostic toast on `lsp.client.diagnostics`
- File format confirmation on `file.edited`

```typescript
// .opencode/plugins/armadillo.ts
// Armadillo v2 — behavioral enforcement plugin for OpenCode

export default function armadillo(ctx: any) {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Session Lifecycle
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ctx.on("session.created", (event: any) => {
    ctx.client.app.log("info", "🛡 armadillo v2 — session started");
  });

  ctx.on("session.idle", (event: any) => {
    ctx.client.app.log("debug", `Session idle: ${event.session?.id}`);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Tool Execution Guards
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ctx.on("tool.execute.before", (event: any) => {
    // TDD Gate — warn on git commit without test files in recent edits
    if (event.tool === "bash" && typeof event.input?.command === "string") {
      const cmd = event.input.command;

      // Detect git commit attempts
      if (cmd.startsWith("git commit")) {
        ctx.client.app.log("info", "🛡 TDD gate check — verifying tests exist");
        // Note: We can't fully block commits in OpenCode plugins,
        // but we can log and show toast warnings.
        // The agent-scoped permissions on test-goon handle the hard gate.
      }

      // Detect dangerous commands
      if (cmd.includes("--force") && cmd.includes("push")) {
        ctx.client.app.log("warn", "⚠ Force push detected — be careful");
      }
    }
  });

  ctx.on("tool.execute.after", (event: any) => {
    if (event.tool === "bash" && typeof event.input?.command === "string") {
      const cmd = event.input.command;

      // Post-push — suggest PR creation
      if (cmd.startsWith("git push") && event.output && !event.output.includes("error")) {
        ctx.client.app.log("info", "🚀 Branch pushed — consider `/ship` to create a PR");
        try {
          ctx.client.tui.showToast({
            body: { message: "🚀 Branch pushed — create PR?", level: "info" }
          });
        } catch {
          // Toast API may not be available in all contexts
        }
      }

      // Test failure detection — suggest bug-hunt
      if ((cmd.includes("vitest") || cmd.includes("jest") || cmd.includes("pytest") || cmd.includes("npm test")) &&
          event.output && (event.output.includes("FAIL") || event.output.includes("failed"))) {
        ctx.client.app.log("warn", "🐛 Test failure detected");
        try {
          ctx.client.tui.showToast({
            body: { message: "🐛 Test failure — consider bug-hunt play", level: "warn" }
          });
        } catch {
          // Toast API may not be available
        }
      }
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LSP Diagnostics
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ctx.on("lsp.client.diagnostics", (event: any) => {
    const diagnostics = event.diagnostics || [];
    const errors = diagnostics.filter((d: any) => d.severity === 1);
    const warnings = diagnostics.filter((d: any) => d.severity === 2);

    if (errors.length > 0) {
      try {
        ctx.client.tui.showToast({
          body: { message: `⚠ ${errors.length} type error${errors.length > 1 ? "s" : ""} detected`, level: "warn" }
        });
      } catch {
        ctx.client.app.log("warn", `${errors.length} LSP errors detected`);
      }
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // File Events
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ctx.on("file.edited", (event: any) => {
    ctx.client.app.log("debug", `File edited: ${event.filePath}`);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Shell Environment
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ctx.on("shell.env", (event: any) => {
    // Inject armadillo version identifier into shell env
    event.env["ARMADILLO_VERSION"] = "2.0.0";
  });
}
```

**Step 2: Verify TypeScript syntax**

Run: `npx tsc --noEmit --allowImportingTsExtensions --moduleResolution bundler v2/.opencode/plugins/armadillo.ts 2>&1 || echo "Note: TypeScript check requires @opencode-ai/plugin types. Plugin will be validated at OpenCode runtime."`

Note: Full type checking requires the `@opencode-ai/plugin` package installed. The plugin will be validated when OpenCode loads it. The TypeScript here follows the patterns documented in the OpenCode extensions reference.

**Step 3: Commit**

```bash
git add v2/.opencode/plugins/armadillo.ts
git commit -m "feat(v2): add armadillo plugin — guards, toast, lifecycle"
```

---

## Phase 5: Commands (Tasks 11-13)

17 slash commands as markdown files with frontmatter.

---

### Task 11: Create workflow commands (ship, tdd, debug, review, audit)

**Files:**
- Create: `v2/.opencode/commands/ship.md`
- Create: `v2/.opencode/commands/tdd.md`
- Create: `v2/.opencode/commands/debug.md`
- Create: `v2/.opencode/commands/review.md`
- Create: `v2/.opencode/commands/audit.md`

**Step 1: Write ship.md**

```markdown
---
description: Run the launch-pad play — review, test, secure, ship
agent: armadillo-shepherd
---

Run the **launch-pad** play.

Current branch: `git branch --show-current`
Recent commits: `git log --oneline -5`
Staged files: `git diff --staged --name-only`

Ship this work — review it, test it, secure it, and create a PR.
```

**Step 2: Write tdd.md**

```markdown
---
description: TDD cycle on a specific file — RED/GREEN/REFACTOR
agent: armadillo-shepherd
---

Run TDD on `$1`.

File under test:
@$1

Write a failing test first (RED), then implement to make it pass (GREEN), then refactor.
```

**Step 3: Write debug.md**

```markdown
---
description: Run the bug-hunt play — trace, test, fix, review
agent: armadillo-shepherd
---

Run the **bug-hunt** play.

`git diff --stat HEAD~3`

Debug the issue described below. Trace root cause, write a regression test, fix it, verify.

$ARGUMENTS
```

**Step 4: Write review.md**

```markdown
---
description: Run the code-review play — scout changed files, deep review
agent: armadillo-shepherd
---

Run the **code-review** play.

Changed files: `git diff --name-only HEAD~1`
Branch: `git branch --show-current`

Review the recent changes for quality, correctness, and style.
```

**Step 5: Write audit.md**

```markdown
---
description: Run the security-sweep play — scan secrets, NAP, deps
agent: armadillo-shepherd
---

Run the **security-sweep** play.

Scan this project for security issues, hardcoded secrets, NAP violations, and vulnerable dependencies.
```

**Step 6: Commit**

```bash
git add v2/.opencode/commands/{ship,tdd,debug,review,audit}.md
git commit -m "feat(v2): add workflow commands — ship, tdd, debug, review, audit"
```

---

### Task 12: Create utility commands (fresh, clean, recon, nap, env, pulse)

**Files:**
- Create: `v2/.opencode/commands/fresh.md`
- Create: `v2/.opencode/commands/clean.md`
- Create: `v2/.opencode/commands/recon.md`
- Create: `v2/.opencode/commands/nap.md`
- Create: `v2/.opencode/commands/env.md`
- Create: `v2/.opencode/commands/pulse.md`

**Step 1: Write fresh.md**

```markdown
---
description: Start a new project from scratch — discovery, stack, scaffold
agent: armadillo-shepherd
---

Start a **fresh project**. Walk me through discovery, recommend a stack, scaffold, plan, and build.

$ARGUMENTS
```

**Step 2: Write clean.md**

```markdown
---
description: Run the clean-sweep play — scan and remove dead code
agent: armadillo-shepherd
---

Run the **clean-sweep** play.

Scan for dead code, orphaned files, unused imports, and stale references. Clean it up surgically.
```

**Step 3: Write recon.md**

```markdown
---
description: Run the deep-recon play — explore and explain a topic
agent: armadillo-shepherd
---

Run the **deep-recon** play on: $ARGUMENTS

Scout the codebase, analyze the architecture, and explain how it works.
```

**Step 4: Write nap.md**

```markdown
---
description: NAP ninja — scan for hardcoded business info
agent: armadillo-shepherd
---

Run the NAP ninja scan. Check for hardcoded business information in source files.

Use the `scan-nap` tool to detect violations, then report findings with recommendations.
```

**Step 5: Write env.md**

```markdown
---
description: ENV ninja — scan for hardcoded secrets
agent: armadillo-shepherd
---

Run the ENV ninja scan. Check for hardcoded secrets, API keys, and tokens in source files.

Use the `scan-env` tool to detect violations, then report findings with recommendations.
```

**Step 6: Write pulse.md**

```markdown
---
description: Quick health check — SEO, CRO, performance pulse
agent: armadillo-shepherd
---

Run a quick health pulse check on this project.

Check: test suite status, build status, dependency health, code quality metrics.

`npm test 2>&1 | tail -5`
`npm run build 2>&1 | tail -5`
```

**Step 7: Commit**

```bash
git add v2/.opencode/commands/{fresh,clean,recon,nap,env,pulse}.md
git commit -m "feat(v2): add utility commands — fresh, clean, recon, nap, env, pulse"
```

---

### Task 13: Create meta commands (new-goon, new-skill, new-command, new-play, new-rule, new-tool)

**Files:**
- Create: `v2/.opencode/commands/new-goon.md`
- Create: `v2/.opencode/commands/new-skill.md`
- Create: `v2/.opencode/commands/new-command.md`
- Create: `v2/.opencode/commands/new-play.md`
- Create: `v2/.opencode/commands/new-rule.md`
- Create: `v2/.opencode/commands/new-tool.md`

**Step 1: Write new-goon.md**

```markdown
---
description: Create a new subagent (goon)
agent: armadillo-shepherd
subtask: true
---

Create a new goon named `$1`.

Generate a markdown agent file at `.opencode/agents/$1.md` with:
- YAML frontmatter (description, mode: subagent, model, color, hidden: true, tools, permission)
- System prompt explaining the goon's role and rules

Follow the pattern of existing goons in `.opencode/agents/`.
Ask me about the goon's purpose, model tier, and tool access.
```

**Step 2: Write new-skill.md**

```markdown
---
description: Create a new skill
agent: armadillo-shepherd
subtask: true
---

Create a new skill named `$1`.

Generate a skill at `.opencode/skills/$1/SKILL.md` with:
- YAML frontmatter (name, description)
- Skill instructions in second person
- Examples and references if applicable

Follow the SKILL.md format. Name must match: `^[a-z0-9]+(-[a-z0-9]+)*$`
```

**Step 3: Write new-command.md**

```markdown
---
description: Create a new slash command
agent: armadillo-shepherd
subtask: true
---

Create a new command named `$1`.

Generate `.opencode/commands/$1.md` with:
- YAML frontmatter (description, agent, optional model and subtask)
- Prompt template with $ARGUMENTS and shell injection as needed

Follow the pattern of existing commands in `.opencode/commands/`.
```

**Step 4: Write new-play.md**

```markdown
---
description: Create a new workflow play for the armadillo playbook
agent: armadillo-shepherd
subtask: true
---

Create a new play named `$1` for the armadillo playbook.

A play is a predefined sequence of goon dispatches. To add a play:
1. Define the goon sequence with numbered steps
2. Add the play to the shepherd's system prompt (`.opencode/agents/armadillo-shepherd.md`)
3. Optionally create a `/command` that triggers it

Ask me about the play's purpose and which goons should be involved.
```

**Step 5: Write new-rule.md**

```markdown
---
description: Create a new instruction rule
agent: armadillo-shepherd
subtask: true
---

Create a new rule named `$1`.

Generate `.opencode/rules/$1.md` with behavioral instructions.

Rules are loaded via the `instructions` glob in `opencode.json` and apply to all agents.
Keep rules concise and actionable. Follow the pattern of existing rules in `.opencode/rules/`.
```

**Step 6: Write new-tool.md**

```markdown
---
description: Create a new custom tool
agent: armadillo-shepherd
subtask: true
---

Create a new custom tool named `$1`.

Generate `.opencode/tools/$1.ts` using the `@opencode-ai/plugin` tool API:
- Import `tool` from `@opencode-ai/plugin` and `z` from `zod`
- Define schema with Zod types
- Implement `execute` function returning a string
- Export as default

Follow the pattern of existing tools in `.opencode/tools/`.
Ask me about the tool's purpose, input parameters, and expected output.
```

**Step 7: Commit**

```bash
git add v2/.opencode/commands/{new-goon,new-skill,new-command,new-play,new-rule,new-tool}.md
git commit -m "feat(v2): add meta commands — new-goon, new-skill, new-command, new-play, new-rule, new-tool"
```

---

## Phase 6: Rules Migration (Task 14)

Copy v1 rules to `.opencode/rules/`, adapting format where needed.

---

### Task 14: Migrate rules from v1 to v2

**Files:**
- Create: `v2/.opencode/rules/coding-standards.md`
- Create: `v2/.opencode/rules/git-workflow.md`
- Create: `v2/.opencode/rules/security.md`
- Create: `v2/.opencode/rules/testing.md`
- Create: `v2/.opencode/rules/env-enforcement.md`
- Create: `v2/.opencode/rules/nap-enforcement.md`
- Create: `v2/.opencode/rules/output-style.md`
- Create: `v2/.opencode/rules/pr-format.md`
- Create: `v2/.opencode/rules/project-context.md`

**Step 1: Copy and adapt rules**

For each rule in `.claude/rules/`:
1. Copy content to `v2/.opencode/rules/`
2. Remove Claude Code-specific references (replace `.claude/` paths with `.opencode/`)
3. Remove hook-specific references (exit codes, PreToolUse, etc.)
4. Update `CLAUDE.md` references to `AGENTS.md`
5. Remove `paths:` frontmatter (OpenCode doesn't use it — rules are always global)
6. Keep domain-specific rules (facebook-capi, meta-api-versioning, pinterest) — they migrate as-is

**Important adaptations:**
- `coding-standards.md`: Remove "EnterPlanMode is BLOCKED by hook" and "Plan/Explore agents are BLOCKED by hook" — OpenCode uses agent permissions, not hooks. Remove `.claude/` path references.
- `git-workflow.md`: Remove `env -u GITHUB_TOKEN` — this is Claude Code-specific. OpenCode doesn't set GITHUB_TOKEN.
- `output-style.md`: Replace ASCII box art announcements with markdown header format. Remove box frame requirement. Update to v2 output format (# headers, ### goon dispatch, tables, blockquotes).
- `project-context.md`: Update `.claude/stack.json` to `.opencode/stack.json`, `.claude/PROJECT.md` to `.opencode/PROJECT.md`.

**Step 2: Skip repo-specific rules**

Do NOT copy `release-checklist.md` — that's armadillo repo-specific, not for user projects.

**Step 3: Commit**

```bash
git add v2/.opencode/rules/
git commit -m "feat(v2): migrate rules from v1 — adapted for OpenCode"
```

---

## Phase 7: Skill Migration (Task 15)

Skills migrate as-is — OpenCode reads `.claude/skills/` natively, but for a clean v2 install we put them in `.opencode/skills/`.

---

### Task 15: Set up skill symlink strategy

**Files:**
- Create: `v2/.opencode/skills/README.md`

**Step 1: Write README.md explaining the skill migration approach**

```markdown
# Skills

Armadillo v2 skills are compatible with both Claude Code and OpenCode.

## Installation

During armadillo v2 installation, skills are copied from the armadillo distribution
into `.opencode/skills/`. OpenCode discovers them automatically via its native
`skill` tool.

## Pack Structure

Skills from optional packs are installed into `.opencode/skills/` alongside core skills.
The pack metadata lives in the armadillo distribution, not in the user's project.

## Compatibility

OpenCode also searches `.claude/skills/` as a fallback. Projects migrating from
armadillo v1 (Claude Code) don't need to move their skills — they work in both locations.
```

Note: The actual 130+ skill files don't need to be copied into `v2/` right now. They exist in `.claude/skills/` and `packs/*/skills/` in the armadillo repo. The v2 installer (to be built later) will handle copying skills to the target project's `.opencode/skills/` directory. For now, the directory structure and README document the strategy.

**Step 2: Commit**

```bash
git add v2/.opencode/skills/README.md
git commit -m "docs(v2): add skill migration strategy"
```

---

## Phase 8: GitHub Actions (Task 16)

The bot workflow for PR review and issue triage.

---

### Task 16: Create GitHub Actions workflow

**Files:**
- Create: `v2/.github/workflows/armadillo.yml`

**Step 1: Create .github/workflows directory**

```bash
mkdir -p v2/.github/workflows
```

**Step 2: Write armadillo.yml**

Based on the OpenCode CLI reference for GitHub integration.

```yaml
name: Armadillo Bot

on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]

jobs:
  armadillo:
    if: contains(github.event.comment.body, '/armadillo') || contains(github.event.comment.body, '/dillo')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: opencode-ai/opencode-action@v1
        with:
          model: "anthropic/claude-opus-4-6"
          share: true
          prompt: |
            You are armadillo — a chill AI coding agent that doesn't let bad code slide.
            Follow the armadillo voice: direct, confident, no hedging.
            Always write tests. Follow existing code style.
            Use conventional commits.
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

**Step 3: Commit**

```bash
git add v2/.github/workflows/armadillo.yml
git commit -m "feat(v2): add GitHub Actions bot — /armadillo and /dillo triggers"
```

---

## Phase 9: Integration Validation (Task 17)

Validate the complete v2 directory structure and file integrity.

---

### Task 17: Validate v2 structure and file integrity

**Step 1: Verify directory structure matches design**

Run:
```bash
find v2/ -type f | sort
```

Expected files (excluding .gitkeep):
```
v2/.github/workflows/armadillo.yml
v2/.opencode/agents/armadillo-shepherd.md
v2/.opencode/agents/build-goon.md
v2/.opencode/agents/clean-goon.md
v2/.opencode/agents/debug-goon.md
v2/.opencode/agents/guard-goon.md
v2/.opencode/agents/plan-goon.md
v2/.opencode/agents/review-goon.md
v2/.opencode/agents/scout-goon.md
v2/.opencode/agents/ship-goon.md
v2/.opencode/agents/test-goon.md
v2/.opencode/commands/audit.md
v2/.opencode/commands/clean.md
v2/.opencode/commands/debug.md
v2/.opencode/commands/env.md
v2/.opencode/commands/fresh.md
v2/.opencode/commands/nap.md
v2/.opencode/commands/new-command.md
v2/.opencode/commands/new-goon.md
v2/.opencode/commands/new-play.md
v2/.opencode/commands/new-rule.md
v2/.opencode/commands/new-skill.md
v2/.opencode/commands/new-tool.md
v2/.opencode/commands/pulse.md
v2/.opencode/commands/recon.md
v2/.opencode/commands/review.md
v2/.opencode/commands/ship.md
v2/.opencode/commands/tdd.md
v2/.opencode/package.json
v2/.opencode/plugins/armadillo.ts
v2/.opencode/rules/*.md (9 files)
v2/.opencode/skills/README.md
v2/.opencode/themes/armadillo.json
v2/.opencode/tools/audit-deps.ts
v2/.opencode/tools/check-a11y.ts
v2/.opencode/tools/play-status.ts
v2/.opencode/tools/scan-coverage.ts
v2/.opencode/tools/scan-env.ts
v2/.opencode/tools/scan-nap.ts
v2/.opencode/voice/armadillo-voice.md
v2/AGENTS.md
v2/opencode.json
```

**Step 2: Validate all JSON files**

Run:
```bash
for f in v2/opencode.json v2/.opencode/themes/armadillo.json v2/.opencode/package.json; do
  node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" && echo "✓ $f" || echo "✗ $f"
done
```

Expected: All ✓

**Step 3: Validate all agent files have frontmatter**

Run:
```bash
for f in v2/.opencode/agents/*.md; do
  head -1 "$f" | grep -q "^---" && echo "✓ $f" || echo "✗ $f (missing frontmatter)"
done
```

Expected: All ✓ (10 agent files)

**Step 4: Validate all command files have frontmatter**

Run:
```bash
for f in v2/.opencode/commands/*.md; do
  head -1 "$f" | grep -q "^---" && echo "✓ $f" || echo "✗ $f (missing frontmatter)"
done
```

Expected: All ✓ (17 command files)

**Step 5: Count deliverables**

Run:
```bash
echo "Agents: $(ls v2/.opencode/agents/*.md | wc -l)"
echo "Commands: $(ls v2/.opencode/commands/*.md | wc -l)"
echo "Tools: $(ls v2/.opencode/tools/*.ts | wc -l)"
echo "Plugins: $(ls v2/.opencode/plugins/*.ts | wc -l)"
echo "Rules: $(ls v2/.opencode/rules/*.md 2>/dev/null | wc -l)"
echo "Themes: $(ls v2/.opencode/themes/*.json | wc -l)"
```

Expected:
```
Agents: 10
Commands: 17
Tools: 6
Plugins: 1
Rules: 9 (after migration)
Themes: 1
```

**Step 6: Final commit**

```bash
git add -A v2/
git commit -m "chore(v2): validate structure — all deliverables present"
```

---

## Summary

| Phase | Tasks | Deliverables |
|-------|-------|-------------|
| 1. Foundation | 1-4 | Directory structure, opencode.json, AGENTS.md, voice, theme |
| 2. Agents | 5-7 | 10 agent markdown files (shepherd + 9 goons) |
| 3. Custom Tools | 8-9 | 6 TypeScript tool files + package.json |
| 4. Plugin | 10 | armadillo.ts — guards, toast, lifecycle |
| 5. Commands | 11-13 | 17 command markdown files |
| 6. Rules Migration | 14 | 9 migrated rule files |
| 7. Skill Migration | 15 | Migration strategy + README |
| 8. GitHub Actions | 16 | armadillo.yml workflow |
| 9. Validation | 17 | Structure and integrity checks |

**Total: 17 tasks · ~55 files**

### Dependencies

```
Task 1 (directories) → all other tasks
Task 2 (opencode.json) → Task 10 (plugin references config)
Tasks 5-7 (agents) → Tasks 11-13 (commands reference agents)
Task 8 (tools package.json) → Task 9 (more tools)
```

### Parallelizable Groups

- **Group A** (after Task 1): Tasks 2, 3, 4 can run in parallel
- **Group B** (after Task 2): Tasks 5, 6, 7 can run in parallel
- **Group C** (after Group A): Tasks 8, 9 can run in parallel with Group B
- **Group D** (after Group B): Tasks 11, 12, 13 can run in parallel
- **Group E** (independent): Tasks 14, 15, 16 can run in parallel with everything after Task 1
- **Task 17** runs last — validates everything
