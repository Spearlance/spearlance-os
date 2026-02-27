---
model: claude-sonnet-4-6
name: opencode-cli
description: Use when working with OpenCode CLI commands, TUI interface, server mode, SDK client, ACP editor integration, GitHub Actions integration, Zen models, or installation/setup.
---

# OpenCode CLI & Interfaces

## Overview
OpenCode runs as a TUI (default), headless server, ACP agent, or GitHub bot. Go-based, client/server architecture, 75+ LLM providers. Current version: v1.2.10 (Feb 2026).

## Quick Reference

| Item | Value |
|------|-------|
| Install | `curl -fsSL https://opencode.ai/install \| bash` |
| Also via | npm, Homebrew, Scoop, Chocolatey, Pacman, Mise, Docker |
| Start TUI | `opencode` |
| Start server | `opencode serve --port 4096` |
| Start web UI | `opencode web` |
| SDK package | `npm install @opencode-ai/sdk` |
| ACP command | `opencode acp` |
| Upgrade | `opencode upgrade` |

## CLI Commands

| Command | Purpose |
|---------|---------|
| `opencode` (tui) | Interactive TUI (default) |
| `opencode run` | Non-interactive, direct prompt |
| `opencode serve` | Headless HTTP server |
| `opencode web` | Server + web interface |
| `opencode attach` | Connect TUI to remote server |
| `opencode agent create\|list` | Manage agents |
| `opencode auth login\|list\|logout` | Provider credentials |
| `opencode mcp add\|list\|auth\|logout\|debug` | MCP server management |
| `opencode models [provider]` | List available models |
| `opencode session list` | Session management |
| `opencode stats` | Token usage and costs |
| `opencode export [id]` | Export session as JSON |
| `opencode import <file>` | Import from JSON/share URL |
| `opencode github install\|run` | GitHub Actions setup |
| `opencode acp` | Start ACP agent for editors |
| `opencode upgrade [target]` | Update OpenCode |
| `opencode uninstall` | Remove OpenCode |

## TUI Slash Commands

| Command | Action |
|---------|--------|
| `/connect` | Configure LLM providers |
| `/init` | Generate AGENTS.md from project scan |
| `/undo` | Revert last change |
| `/redo` | Restore undone change |
| `/share` | Generate shareable link |
| `/models` | Switch models |
| `/help` | Show help |
| `@file` | Fuzzy-search file for context |
| `@agent` | Invoke subagent |

## Server Mode

```bash
opencode serve --port 4096 --hostname 0.0.0.0 --cors http://localhost:3000
```

API docs at `http://localhost:4096/doc` (OpenAPI 3.1 spec). Auth via `OPENCODE_SERVER_PASSWORD`.

## SDK (Node.js)

```typescript
import { createOpencode } from "@opencode-ai/sdk"
const { client } = await createOpencode()

const session = await client.session.create({ body: {} })
await client.session.prompt({
  path: { id: session.data.id },
  body: { parts: [{ type: "text", text: "Fix the login bug" }] }
})
```

## ACP (Editor Integration)

Works with Zed, JetBrains, Neovim (avante/codecompanion). Same capabilities as TUI.

## GitHub Integration

Mention `/opencode` or `/oc` in issues/PRs. Setup: `opencode github install`.

## Zen (Curated Models)

Pay-as-you-go gateway with pre-tested models. No subscription, usage-based. Format: `opencode/model-name`.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Windows issues | Use WSL for best experience |
| Can't connect to server | Check port, hostname, and CORS settings |
| GitHub bot not responding | Verify workflow file and repo secrets |
| SDK type errors | Import types from `@opencode-ai/sdk` |

## Full Reference

See `reference.md` in this skill directory for complete CLI flags, TUI keybinds, server API endpoints, SDK methods (session, file, tui, events), ACP editor configs, GitHub workflow examples, and Zen pricing details.
