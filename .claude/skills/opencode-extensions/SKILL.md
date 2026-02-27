---
model: claude-sonnet-4-6
name: opencode-extensions
description: Use when extending OpenCode — MCP servers, plugins/hooks, custom commands, agent skills, rules/AGENTS.md, or migrating from Claude Code. Covers the full extensibility layer.
---

# OpenCode Extensions

## Overview
OpenCode's extensibility layer covers MCP servers (external tools), plugins (hooks/events), custom commands (slash commands), agent skills (reusable instructions), and rules (AGENTS.md). Current version: v1.2.10 (Feb 2026).

## MCP Servers

Add external tools via Model Context Protocol. Local (command-based) or remote (HTTP-based).

```json
{
  "mcp": {
    "sentry": {
      "type": "remote",
      "url": "https://mcp.sentry.dev/sse",
      "oauth": {}
    },
    "my-tool": {
      "type": "local",
      "command": ["npx", "-y", "my-mcp-package"],
      "environment": { "API_KEY": "{env:MY_KEY}" },
      "timeout": 5000
    }
  }
}
```

**OAuth:** Auto-detected on 401. Manual: `opencode mcp auth <name>`. Debug: `opencode mcp debug <name>`.

## Plugins

JavaScript/TypeScript modules in `.opencode/plugins/` or `~/.config/opencode/plugins/`.

```typescript
import { plugin, tool } from "@opencode-ai/plugin"

export default plugin((ctx) => ({
  hooks: {
    "tool.execute.before": async (input) => { /* intercept */ },
    "session.idle": async () => { /* post-task */ },
    "shell.env": async () => ({ MY_VAR: "value" }),
  }
}))
```

**Key events:** `tool.execute.before/after`, `session.idle/created/compacted`, `file.edited`, `shell.env`, `permission.asked/replied`, `tui.command.execute`.

Dependencies: `.opencode/package.json` — auto-installed via Bun at startup.

## Custom Commands

Markdown files in `.opencode/commands/` or `~/.config/opencode/commands/`. Filename = `/command`.

```markdown
---
description: Run full test suite with coverage
agent: build
subtask: true
---

Run the test suite for $1 with full coverage.
Current test output: `!`npm test``
```

**Variables:** `$ARGUMENTS`, `$1`–`$3`, `` `!`command`` `` (shell output), `@path/to/file`.

## Agent Skills

Folder-per-skill with `SKILL.md`. Discovered automatically.

**Locations:** `.opencode/skills/`, `~/.config/opencode/skills/`, `.claude/skills/`, `.agents/skills/`

```yaml
---
name: my-skill
description: What this skill does
---
```

## Rules (AGENTS.md)

- Primary: `AGENTS.md` in project root
- Global: `~/.config/opencode/AGENTS.md`
- Fallback: `~/.claude/CLAUDE.md` (Claude Code compat)
- Via config: `"instructions": ["docs/*.md", "CONTRIBUTING.md"]`

**Claude Code migration:** Auto-reads `CLAUDE.md`, `~/.claude/skills/`. Disable with `OPENCODE_DISABLE_CLAUDE_CODE=1`.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| MCP tools eating context | Be selective — disable unused MCP tools via `tools` config |
| Plugin not loading | Check file extension (.ts/.js) and export format |
| Skill not discovered | Verify `SKILL.md` (all caps), frontmatter has `name` + `description` |
| Command not appearing | Check it's in `commands/` dir, has frontmatter |

## Full Reference

See `reference.md` in this skill directory for complete MCP OAuth flow, all plugin events/hooks, command template syntax, skill permission patterns, AGENTS.md best practices, and Claude Code migration guide.
