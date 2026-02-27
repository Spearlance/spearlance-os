# Armadillo v2 — OpenCode Ground-Up Rebuild

**Date:** 2026-02-21
**Status:** Approved
**Platform:** OpenCode v1.2.10 (Go, Bubble Tea TUI, SQLite, client/server)
**Migration type:** Ground-up rebuild — NOT a port

---

## Overview

Armadillo v2 rebuilds the entire armadillo ecosystem natively for OpenCode, leveraging capabilities Claude Code doesn't have: plugin event bus, custom tools, TUI markdown rendering, SDK/server mode, GitHub bot, LSP integration, multi-provider support, session forking, toast notifications, themes, keybinds, and model variants.

Everything from v1 (130+ skills, 30 packs, workflow enforcement, routing) carries forward — upgraded to OpenCode best practices with new capabilities on top.

---

## Vocabulary

| Term | Meaning |
|------|---------|
| **armadillo** | The system (always lowercase) |
| **the shepherd** | The orchestrator agent |
| **dillas / dillos** | Users |
| **goons** | Agents (subagents) |
| **plays** | Workflow pipelines from the **armadillo playbook** |
| **skills** | Skills (unchanged from v1) |

---

## Architecture

### Routing Strategy: Agent-as-Router

The shepherd's system prompt contains the full routing table. The model reads it and dispatches subagents via `@mention`. This gives us intelligent routing — the model classifies the request and picks the right goon sequence, same as armadillo-shepherd in v1 but native to OpenCode's agent system.

### Enforcement Without Exit-2 Hooks

OpenCode plugins can't block actions via exit codes like Claude Code hooks. Instead:

1. **Agent-scoped permissions** (proactive deny) — each goon has locked-down tool access
2. **Plugin `tool.execute.before`** — can modify tool inputs (e.g., replace `git commit` with a warning echo)
3. **Toast notifications** — visible warnings that don't interrupt flow
4. **Permission config** — `doom_loop` guard, `.env` blocking, `external_directory` prompts

---

## The Shepherd

| Field | Value |
|-------|-------|
| Name | `armadillo-shepherd` |
| Model | `anthropic/claude-opus-4-6` |
| Color | `#4CAF50` (armadillo green) |
| Mode | primary (only Tab-cycle agent) |
| Tools | read, grep, glob, skill, question, lsp |
| Permissions | edit=deny, bash=deny |
| Role | Route, orchestrate, dispatch goons, summarize |

The shepherd is read-only. It never edits files or runs commands directly. It classifies requests, selects the right play or goon sequence, dispatches via `@mention`, and presents results to the dilla.

---

## The Goon Squad

All goons are hidden subagents — dispatched by the shepherd, invisible in the Tab cycle.

| Goon | Model | Color | Role | Key Restrictions |
|------|-------|-------|------|-----------------|
| **@build-goon** | sonnet | `#42A5F5` | Implementation | Full access, `git push*` = ask |
| **@debug-goon** | opus | `#FF6B6B` | Root cause analysis | Read + diagnostic bash, no edits |
| **@test-goon** | sonnet | `#66BB6A` | TDD, test writing | Edit + test runners, `git commit*` = deny until tests |
| **@review-goon** | opus | `#AB47BC` | Code review | Read-only, zero writes |
| **@scout-goon** | haiku | `#BDBDBD` | Fast recon | Read + grep + glob only |
| **@plan-goon** | opus | `#FFA726` | Architecture, design | Read + edit docs only |
| **@ship-goon** | sonnet | `#26C6DA` | PR + deploy | `gh pr create*` = allow |
| **@clean-goon** | haiku | `#8D6E63` | Dead code, cleanup | Edit + grep, scoped |
| **@guard-goon** | sonnet | `#EF5350` | Security, env/NAP | Read + custom scan tools |

---

## The Armadillo Playbook

### 🐛 `bug-hunt` — Debug + Fix + Test + Review

```
① @debug-goon  — tracing root cause
② @test-goon   — writing failing regression test
③ @build-goon  — implementing the fix
④ @test-goon   — verifying all tests pass
⑤ @review-goon — checking fix quality
⑥ shepherd     — summary + offer /ship
```

### 🏗 `feature-forge` — Design + Plan + Build + Review

```
① shepherd     — clarifying questions
② @plan-goon   — design doc + implementation plan
③ @test-goon   — RED: tests for each task
④ @build-goon  — GREEN: implement each task
⑤ @test-goon   — full suite verification
⑥ @review-goon — review between major tasks
⑦ shepherd     — summary + offer /ship
```

### 🚀 `launch-pad` — Review + Test + Secure + Ship

```
① @review-goon — pre-merge quality gate
② @test-goon   — full test suite + coverage
③ @guard-goon  — security sweep, env/NAP check
④ @ship-goon   — PR with conventional title + description
⑤ shepherd     — PR URL to dilla
```

### 🔍 `deep-recon` — Scout + Analyze + Report

```
① @scout-goon  — fast scan of relevant files
② @plan-goon   — analyze architecture, explain
③ shepherd     — present findings to dilla
```

### 🧹 `clean-sweep` — Scan + Clean + Verify

```
① @scout-goon  — scan for dead code, orphans, stale refs
② @clean-goon  — surgical removal + reorganization
③ @test-goon   — verify nothing broke
④ @review-goon — confirm changes are safe
⑤ shepherd     — summary of what was cleaned
```

### 🛡 `security-sweep` — Scan + Analyze + Report

```
① @guard-goon  — scan-nap, scan-env, audit-deps
② @review-goon — analyze findings, prioritize
③ shepherd     — report with recommendations
```

### 📋 `code-review` — Scout + Review + Report

```
① @scout-goon  — fast scan of changed files
② @review-goon — deep review with checklist
③ shepherd     — present findings + recommendations
```

---

## Commands

17 slash commands in `.opencode/commands/`:

### Workflow Commands

| Command | File | Description |
|---------|------|-------------|
| `/ship` | `ship.md` | launch-pad play |
| `/tdd $1` | `tdd.md` | TDD on a specific file |
| `/debug` | `debug.md` | bug-hunt play |
| `/review` | `review.md` | code-review play |
| `/audit` | `audit.md` | security-sweep play |
| `/fresh` | `fresh.md` | New project from scratch |
| `/clean` | `clean.md` | clean-sweep play |
| `/recon $1` | `recon.md` | deep-recon on a topic |
| `/nap` | `nap.md` | NAP ninja scan |
| `/env` | `env.md` | ENV ninja scan |
| `/pulse` | `pulse.md` | SEO/CRO health check |

### Meta Commands (creating new stuff)

| Command | File | Description |
|---------|------|-------------|
| `/new-goon` | `new-goon.md` | Create new subagent |
| `/new-skill` | `new-skill.md` | Create new skill |
| `/new-command` | `new-command.md` | Create new slash command |
| `/new-play` | `new-play.md` | Create new workflow play |
| `/new-rule` | `new-rule.md` | Create new instruction rule |
| `/new-tool` | `new-tool.md` | Create new custom tool |

---

## Plugin — `armadillo.ts`

One plugin handles all behavioral enforcement, custom tools, notifications, and lifecycle management.

### Guards

| Guard | Trigger | Action |
|-------|---------|--------|
| Skill-first | Turn starts without skill loading | Toast warning |
| TDD gate | `git commit` without test files in changeset | Toast warning + modify command |
| Debug-before-fix | Edit tool called before debug-goon dispatched | Toast warning |
| Post-push | `git push` completes | Toast + prompt injection for PR |
| Test failure routing | Test command exits non-zero | Toast + auto-route to bug-hunt |

### Custom Tools (LLM-callable)

| Tool | Purpose |
|------|---------|
| `scan-nap` | Detect hardcoded business info |
| `scan-env` | Detect hardcoded secrets |
| `audit-deps` | Vulnerability + outdated check |
| `scan-coverage` | Test coverage analysis |
| `check-a11y` | Accessibility scan |
| `play-status` | Current play progress report |

### Toast Notifications

| Toast | When | Level |
|-------|------|-------|
| `🛡 TDD gate: write tests before committing` | git commit without tests | warn |
| `⚠ 3 type errors detected` | LSP diagnostics after edit | warn |
| `✓ Formatted with prettier` | After auto-format | info |
| `🚀 Branch pushed — create PR?` | After git push | info |
| `🐛 Test failure detected — starting bug-hunt` | Test exits non-zero | warn |

### Lifecycle Events

| Event | Action |
|-------|--------|
| `session.created` | Greet dilla, load context |
| `session.idle` | Log metrics to dashboard |
| `session.compacted` | Preserve key context |
| `lsp.client.diagnostics` | Toast with error count |
| `file.edited` | Format confirmation toast |
| `tool.execute.before` | Enforce guards |
| `tool.execute.after` | Track usage + progress |

---

## Output Style — OpenCode TUI Native

OpenCode renders markdown natively — headers, bold, code blocks with syntax highlighting, tables, color-coded agent names. No ASCII box art.

### Play Announcements

```markdown
# 🐛 bug-hunt

**Debugging NaN in checkout totals**

---
```

### Goon Dispatches

```markdown
### @debug-goon — tracing root cause

→ price field is string from API, not number
→ `src/checkout/calculateTotal.ts:47`
→ LSP: `Type 'string' is not assignable to type 'number'`
```

### Play Summaries

```markdown
---

**bug-hunt complete** — 3 goons · 1 fix · 4 tests

● ahh, that felt good didn't it?

> `/ship` to create PR
```

### Session Start

```markdown
# 🛡 armadillo v2

your friendly armadillo is here to serve you

| | |
|--|--|
| **goons** | 9 ready |
| **skills** | 130 loaded |
| **plays** | 7 in playbook |
| **lsp** | typescript · eslint · pyright |
| **formatters** | prettier · biome |
```

---

## Voice — `armadillo-voice.md`

Loaded via `instructions` array in `opencode.json`.

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
- "ahh, that felt good didn't it?" → completion
- "your friendly armadillo is here to serve you" → session start
- "where my real dillas at?!" → onboarding / announcements
- "i may be an armadillo but i'll be damned if i let bad code slide" → TDD gate
- "brother, even real dillas make mistakes... don't worry i got u" → error recovery

## Output Format
- Play announcements: `# emoji play-name` + bold description + `---`
- Goon dispatch: `### @goon-name — what they're doing`
- Status: ✓ pass · ✗ fail · ○ pending · ● active · ◇ suggestion · ◆ critical
- Flow: → result · ▸ next action
- Code: fenced blocks with language tags, always
- Summaries: bold one-liner with stats
- Next action: blockquote `> /command`
```

---

## Theme — `armadillo.json`

Green-forward, falls back to terminal colors for bg/text (works on dark or light terminals).

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

---

## Keybinds

```json
{
  "keybind": {
    "switch_agent": "ctrl+a",
    "variant_cycle": "ctrl+v",
    "session_new": "ctrl+n",
    "session_list": "ctrl+l"
  }
}
```

| Keybind | Action |
|---------|--------|
| `ctrl+a` | Switch agent (Tab to shepherd) |
| `ctrl+v` | Cycle model variant (thinking budget) |
| `ctrl+n` | New session |
| `ctrl+l` | Session list |

---

## Model Variants

Dilla hits `ctrl+v` to cycle: **chill** (fast) → **deep** (thorough) → **max** (full power). No model switch needed.

```json
{
  "provider": {
    "anthropic": {
      "models": {
        "claude-opus-4-6": {
          "variants": {
            "chill": { "options": { "thinking": { "type": "enabled", "budgetTokens": 5000 } } },
            "deep": { "options": { "thinking": { "type": "enabled", "budgetTokens": 20000 } } },
            "max": { "options": { "thinking": { "type": "enabled", "budgetTokens": 32000 } } }
          }
        }
      }
    }
  }
}
```

---

## Skill Migration

**130+ skills migrate as-is.** OpenCode reads `.claude/skills/` natively via its `skill` tool. The SKILL.md format is identical.

**30 packs migrate as-is.** Pack directory structure stays the same. OpenCode's skill discovery finds them.

No rewriting of skill content needed. The routing table in the shepherd's system prompt maps requests to skills just like armadillo-shepherd does today.

---

## New Capabilities (v2 Only)

| Capability | How |
|-----------|-----|
| **Dashboard** | SDK-powered web UI — sessions, costs, skill heatmap, play stats, test trends |
| **GitHub Bot** | `/armadillo review` and `/armadillo fix` in PR comments via GitHub Actions |
| **LSP-Aware Goons** | All goons see type errors + diagnostics automatically |
| **Multi-Provider** | Opus for thinking, Sonnet for building, Haiku for scanning, GPT for code review |
| **Session Forking** | `opencode tui --fork <id>` — try two approaches, pick the winner |
| **Remote Rules** | CDN-hosted rules via `instructions` URL array, all dillas sync instantly |
| **Model Variants** | `ctrl+v` cycles chill → deep → max thinking budget |
| **Toast System** | Real-time overlay notifications for guards + LSP + formatting |
| **Session Sharing** | Built-in share links for pair debugging |
| **Usage Stats** | Token costs by goon, by play, by project via `opencode stats` |

---

## Directory Structure

```
project/
├── opencode.json              # Main config
├── AGENTS.md                  # Top-level instructions
├── .opencode/
│   ├── voice/
│   │   └── armadillo-voice.md
│   ├── agents/
│   │   ├── armadillo-shepherd.md
│   │   ├── build-goon.md
│   │   ├── debug-goon.md
│   │   ├── test-goon.md
│   │   ├── review-goon.md
│   │   ├── scout-goon.md
│   │   ├── plan-goon.md
│   │   ├── ship-goon.md
│   │   ├── clean-goon.md
│   │   └── guard-goon.md
│   ├── commands/
│   │   ├── ship.md
│   │   ├── tdd.md
│   │   ├── debug.md
│   │   ├── review.md
│   │   ├── audit.md
│   │   ├── fresh.md
│   │   ├── clean.md
│   │   ├── recon.md
│   │   ├── nap.md
│   │   ├── env.md
│   │   ├── pulse.md
│   │   ├── new-goon.md
│   │   ├── new-skill.md
│   │   ├── new-command.md
│   │   ├── new-play.md
│   │   ├── new-rule.md
│   │   └── new-tool.md
│   ├── skills/                # 130+ skills (same format as v1)
│   ├── plugins/
│   │   └── armadillo.ts
│   ├── tools/
│   │   ├── scan-nap.ts
│   │   ├── scan-env.ts
│   │   ├── audit-deps.ts
│   │   ├── scan-coverage.ts
│   │   ├── check-a11y.ts
│   │   └── play-status.ts
│   ├── rules/                 # Instructions (same content as v1 rules)
│   │   ├── coding-standards.md
│   │   ├── git-workflow.md
│   │   ├── security.md
│   │   ├── testing.md
│   │   └── ...
│   ├── themes/
│   │   └── armadillo.json
│   └── docs/
│       └── plans/
├── packs/                     # 30 skill packs (same structure as v1)
└── .github/
    └── workflows/
        └── armadillo.yml      # GitHub bot workflow
```

---

## OpenCode Config — `opencode.json`

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-opus-4-6",
  "small_model": "anthropic/claude-haiku-4-5",
  "provider": {
    "anthropic": {
      "apiKey": "{env:ANTHROPIC_API_KEY}",
      "timeout": 300000,
      "models": {
        "claude-opus-4-6": {
          "variants": {
            "chill": { "options": { "thinking": { "type": "enabled", "budgetTokens": 5000 } } },
            "deep": { "options": { "thinking": { "type": "enabled", "budgetTokens": 20000 } } },
            "max": { "options": { "thinking": { "type": "enabled", "budgetTokens": 32000 } } }
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
  "plugin": ["./armadillo"],
  "permission": {
    "edit": "allow",
    "bash": "allow",
    "read": "allow",
    "glob": "allow",
    "grep": "allow",
    "skill": "allow",
    "lsp": "allow",
    "webfetch": "allow",
    "websearch": "allow",
    "external_directory": "ask",
    "doom_loop": "ask"
  },
  "compaction": {
    "auto": true,
    "threshold": 0.85
  },
  "autoupdate": true
}
```

---

## What Armadillo v1 Had vs v2

| Dimension | v1 (Claude Code) | v2 (OpenCode) |
|-----------|------------------|---------------|
| Skill ecosystem | 130 skills, 30 packs | Same — zero migration |
| Behavioral enforcement | Exit-2 hooks | Plugin guards + agent-scoped permissions |
| Agent experience | Programmatic dispatch only | TUI-native, `@mention`, color-coded |
| Extensibility | Shell script hooks | TypeScript plugins, full event bus |
| Developer tools | No LSP, no formatters | 30+ LSPs, 28+ formatters built in |
| IDE integration | Terminal only | Zed, JetBrains, Neovim via ACP |
| SDK/Server | None | Full REST API, JS/TS + Python SDK |
| GitHub automation | Manual via `gh` CLI | Native bot with `/armadillo` comments |
| Provider flexibility | Anthropic only | 75+ providers |
| Distribution | Pack system | Pack system (carried forward) |
| UI/UX | ASCII box art, plain text | Markdown rendering, toast popups, themes |
| Reasoning control | Model-level only | Model variants with `ctrl+v` keybind |
| Session management | Single session | Fork, share, export, import, stats |

---

## Design Decisions Log

1. **One shepherd, not three primary agents** — User prefers single orchestrator that routes everything, not user-selectable agents
2. **Agent-as-Router over Plugin-as-Router** — Model-driven routing in the shepherd's system prompt is more flexible than hard-coded plugin routing
3. **Clarity-first play names** — `bug-hunt` over `fire-drill`, `feature-forge` over `build-it` — names must explain what they do
4. **Markdown output over ASCII boxes** — OpenCode renders markdown natively, no need for box-drawing characters
5. **Toast notifications for guards** — Non-blocking warnings that don't interrupt conversation flow
6. **Skills migrate as-is** — OpenCode reads `.claude/skills/` natively, no rewriting needed
7. **Custom tools for scanning** — `scan-nap`, `scan-env`, etc. as LLM-callable tools, not shell scripts
