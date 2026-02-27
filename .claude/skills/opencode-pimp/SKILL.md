---
model: claude-sonnet-4-6
name: opencode-pimp
description: Active router for ALL OpenCode requests — classifies and routes to the correct opencode-* skill before any response. Use when anything involves OpenCode CLI, configuration, agents, tools, MCP, plugins, SDK, or GitHub integration.
---

<EXTREMELY-IMPORTANT>
If the request involves OpenCode in ANY way — configuration, agents, tools, MCP, plugins, commands, skills, CLI, TUI, SDK, server, ACP, GitHub, Zen, providers, models, themes, keybinds, formatters, LSP, permissions, or anything else OpenCode-related — you MUST route through this skill FIRST.

This is not optional. This is not negotiable. You cannot skip this.
</EXTREMELY-IMPORTANT>

# OpenCode Pimp

The orchestration layer for all OpenCode expertise. Not documentation — an active router. Every OpenCode request flows through this routing table before any response.

**Mandatory Announcement — FIRST OUTPUT before anything else:**

```
┏━ 🎛 opencode-pimp ━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [one-line description of what request/routing]  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

No exceptions. Box frame first, then route.

## Quick Context

OpenCode is the open-source AI coding agent (v1.2.10, Feb 2026). Go-based CLI with TUI, 100k+ GitHub stars, 75+ LLM providers, client/server architecture. Created by the SST/terminal.shop team.

## Routing Table

Classify the request. Invoke the matching skill. No response before invocation.

| Request Pattern | Skill | What It Covers |
|----------------|-------|----------------|
| opencode.json, config sources, providers, models, themes, keybinds, formatters, LSP servers, compaction | `opencode-config` | Configuration system |
| Build/Plan agents, custom agents, subagents, agent modes, agent creation | `opencode-agents` | Agent system |
| Built-in tools, custom tools, permissions, tool control, deny/allow/ask | `opencode-tools` | Tools & permissions |
| MCP servers, plugins, hooks, custom commands, agent skills, rules, AGENTS.md | `opencode-extensions` | Extensibility layer |
| CLI commands, TUI, server mode, SDK, ACP, GitHub integration, Zen | `opencode-cli` | CLI & interfaces |

## Cross-Cutting Rules

- If a request spans multiple skills, invoke the PRIMARY skill first (the one closest to the core question)
- If unclear which skill fits, route to `opencode-config` as the default — it covers the broadest surface
- Migration questions (Claude Code → OpenCode) → `opencode-extensions` (covers CLAUDE.md compat)
- "How do I set up OpenCode?" → `opencode-cli` (installation/setup)
- "How do I customize OpenCode?" → `opencode-config` (configuration)
- "How do I extend OpenCode?" → `opencode-extensions` (MCP/plugins/skills)

## When Multiple Skills Apply

Priority order:
1. **Config** — if the question involves `opencode.json` settings
2. **Agents** — if the question is about agent behavior or creation
3. **Tools** — if the question is about what the LLM can do
4. **Extensions** — if the question is about adding new capabilities
5. **CLI** — if the question is about running or interfacing with OpenCode

## What This Skill Does NOT Route

- General coding questions (even if using OpenCode) → let armadillo-shepherd handle normally
- Questions about OTHER tools (Claude Code, Cursor) → not OpenCode-specific
- LLM model questions (how Claude works) → not OpenCode-specific

## Hard Rules

- Never respond about OpenCode before invoking the target skill
- No summarizing, planning to invoke, or explaining what you're about to do
- If unclear, ask ONE clarifying question, then route
- The skill's reference.md has the verified facts — always defer to it
