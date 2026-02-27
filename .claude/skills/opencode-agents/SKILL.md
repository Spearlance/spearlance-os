---
model: claude-sonnet-4-6
name: opencode-agents
description: Use when working with OpenCode agents — creating custom agents, configuring Build/Plan modes, subagents, agent properties (model, tools, permissions, prompts), or switching between agents.
---

# OpenCode Agents

## Overview
Agents are specialized AI assistants with custom prompts, models, and tool access. Two types: primary (direct interaction, Tab to switch) and subagents (invoked by primary agents or via `@mention`). Current version: v1.2.10 (Feb 2026).

## Quick Reference

| Item | Value |
|------|-------|
| Switch agents | `Tab` key or `switch_agent` keybind |
| Invoke subagent | `@agent-name` in message |
| Config location (global) | `~/.config/opencode/agents/` |
| Config location (project) | `.opencode/agents/` |
| Create interactively | `opencode agent create` |

## Built-in Agents

| Agent | Type | Tools | Purpose |
|-------|------|-------|---------|
| **Build** | Primary | All enabled | Full development (default) |
| **Plan** | Primary | Restricted (edit/bash = "ask") | Analysis and exploration |
| **General** | Subagent | Full access | Complex multi-step research |
| **Explore** | Subagent | Read-only | Fast codebase analysis |
| **Compaction** | Hidden | System | Auto-compresses long context |
| **Title** | Hidden | System | Auto-generates session titles |
| **Summary** | Hidden | System | Auto-generates summaries |

## Agent Configuration (JSON)

```json
{
  "agent": {
    "reviewer": {
      "description": "Code review specialist",
      "mode": "primary",
      "model": "anthropic/claude-sonnet-4-6",
      "temperature": 0.3,
      "steps": 50,
      "prompt": ".opencode/prompts/reviewer.md",
      "tools": { "bash": false, "edit": false },
      "permission": { "read": "allow" },
      "color": "#FF6B6B"
    }
  }
}
```

## Agent Configuration (Markdown)

Create `.opencode/agents/reviewer.md`:

```markdown
---
description: Code review specialist
mode: primary
model: anthropic/claude-sonnet-4-6
temperature: 0.3
tools:
  bash: false
  edit: false
permission:
  read: allow
---

You are a code reviewer. Focus on...
```

## Key Properties

| Property | Type | Default | Notes |
|----------|------|---------|-------|
| `description` | string | **required** | Guides agent selection |
| `mode` | string | `"all"` | `primary`, `subagent`, or `all` |
| `model` | string | inherited | `provider/model-id` format |
| `temperature` | float | model default | 0.0–1.0 |
| `steps` | int | 50 | Max agentic iterations |
| `prompt` | string | — | Path to system prompt file |
| `tools` | object | — | Enable/disable tools |
| `permission` | object | — | Override permission rules |
| `color` | string | — | Hex or theme color |
| `hidden` | bool | false | Hide from `@` autocomplete |
| `disable` | bool | false | Deactivate agent |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Agent not appearing in Tab cycle | Check `mode` is `primary`, not `subagent` |
| Subagent not in `@` list | Check `hidden` is not `true` |
| Agent ignoring tools config | Agent tools override global — check both levels |
| Wrong model being used | Agent model overrides global `model` setting |

## Full Reference

See `reference.md` in this skill directory for complete agent properties, bash permission patterns, task tool configuration, model variant cycling, prompt file format, and advanced agent design patterns.
