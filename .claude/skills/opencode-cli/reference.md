# OpenCode CLI Reference

**Version:** 1.2.10
**Date:** February 2026
**Source:** opencode.ai

---

## Table of Contents

1. [Installation](#installation)
2. [CLI Commands](#cli-commands)
   - [tui](#tui-default)
   - [run](#run)
   - [serve](#serve)
   - [web](#web)
   - [attach](#attach)
   - [agent](#agent)
   - [auth](#auth)
   - [github](#github)
   - [mcp](#mcp)
   - [models](#models)
   - [session](#session)
   - [stats](#stats)
   - [export](#export)
   - [import](#import)
   - [acp](#acp)
   - [upgrade](#upgrade)
   - [uninstall](#uninstall)
   - [Global Flags](#global-flags)
3. [TUI Interface](#tui-interface)
   - [Slash Commands](#slash-commands)
   - [Special Syntax](#special-syntax)
   - [Key Actions](#key-actions)
4. [Server Mode](#server-mode)
   - [Architecture](#architecture)
   - [Authentication](#server-authentication)
   - [API Endpoints](#server-api-endpoints)
5. [SDK](#sdk)
   - [Node.js / TypeScript](#nodejs--typescript)
   - [Python](#python-sdk)
6. [ACP (Agent Client Protocol)](#acp-agent-client-protocol)
   - [Editor Configurations](#editor-configurations)
   - [Supported Features](#supported-features)
7. [GitHub Integration](#github-integration)
   - [How It Works](#how-it-works)
   - [Setup](#setup)
   - [Workflow Configuration](#workflow-configuration)
   - [Usage](#github-usage)
8. [OpenCode Zen](#opencode-zen)
9. [Troubleshooting](#troubleshooting)

---

## Installation

### Script (Universal)

```bash
curl -fsSL https://opencode.ai/install | bash
```

### Package Managers

| Manager | Command |
|---------|---------|
| npm | `npm install -g opencode` |
| npx (no install) | `npx opencode` |
| Bun | `bun install -g opencode` |
| pnpm | `pnpm install -g opencode` |
| Homebrew (macOS/Linux) | `brew install opencode` |
| Scoop (Windows) | `scoop install opencode` |
| Chocolatey (Windows) | `choco install opencode` |
| Pacman (Arch Linux) | `pacman -S opencode` |
| Mise | `mise install opencode` |

### Docker

Docker images are available. See `opencode.ai/docs` for the current image tag.

### Windows

WSL (Windows Subsystem for Linux) is the recommended environment for the best experience on Windows. Native Windows installs via Scoop and Chocolatey work but have reduced terminal integration.

---

## CLI Commands

### tui (default)

Starts the interactive terminal UI. This is the default command when you run `opencode` with no subcommand.

```bash
opencode [tui] [flags]
```

| Flag | Short | Description |
|------|-------|-------------|
| `--continue` | `-c` | Continue the last session |
| `--session <id>` | `-s` | Resume a specific session by ID |
| `--fork <id>` | | Fork an existing session |
| `--prompt <text>` | | Set an initial prompt on launch |
| `--model <provider/id>` | `-m` | Override the model for this session |
| `--agent <name>` | | Specify which agent to use |
| `--port <n>` | | HTTP server port |
| `--hostname <addr>` | | HTTP server hostname |

**Examples:**

```bash
# Start fresh session
opencode

# Continue last session
opencode -c

# Resume specific session
opencode -s sess_abc123

# Start with a model override
opencode -m anthropic/claude-opus-4-5

# Start with an initial prompt
opencode --prompt "Review my auth module"
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### run

Non-interactive execution. Accepts a prompt and exits. Useful for scripting and CI pipelines.

```bash
opencode run [flags] [prompt]
```

| Flag | Short | Description |
|------|-------|-------------|
| `--command <cmd>` | | Execute a slash command (e.g., `/init`) |
| `--continue` | `-c` | Continue last session |
| `--session <id>` | `-s` | Resume specific session |
| `--fork <id>` | | Fork a session |
| `--share` | | Share the session after execution |
| `--model <provider/id>` | `-m` | Model override |
| `--agent <name>` | | Agent selection |
| `--file <path>` | `-f` | Read prompt from file |
| `--format <format>` | | Output format (`text`, `json`) |
| `--title <text>` | | Set session title |
| `--attach` | | Attach to an already-running session |
| `--port <n>` | | Server port |

**Examples:**

```bash
# Run a single prompt
opencode run "Fix the TypeScript errors in src/api.ts"

# Run from file
opencode run --file prompt.txt

# Run slash command
opencode run --command /init

# Continue last session with new prompt
opencode run -c "Now add tests for what you just built"

# JSON output
opencode run --format json "List all exported functions in src/"
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### serve

Start a headless HTTP server with no TUI. Exposes the full REST API for external clients (IDE plugins, web interfaces, SDK).

```bash
opencode serve [flags]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--port <n>` | `4096` | Port to listen on |
| `--hostname <addr>` | `127.0.0.1` | Bind address |
| `--mdns` | off | Enable mDNS service discovery |
| `--cors <origin>` | | Allowed CORS origins (repeatable) |

**Examples:**

```bash
# Default — localhost:4096
opencode serve

# Expose on all interfaces with CORS
opencode serve --hostname 0.0.0.0 --cors "http://localhost:3000" --cors "https://myapp.com"

# Custom port with mDNS
opencode serve --port 5000 --mdns
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### web

Start a headless server with the web interface included. Same flags as `serve`.

```bash
opencode web [flags]
```

Accepts identical flags to `serve`: `--port`, `--hostname`, `--mdns`, `--cors`.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### attach

Connect a TUI client to a running remote OpenCode backend. The backend must already be running via `serve` or `web`.

```bash
opencode attach [flags]
```

| Flag | Short | Description |
|------|-------|-------------|
| `--dir <path>` | | Working directory on the remote server |
| `--session <id>` | `-s` | Session to attach to |

**Example:**

```bash
# Attach to remote server running on port 5000
opencode attach --port 5000 --session sess_abc123
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### agent

Manage OpenCode agents.

```bash
opencode agent <subcommand>
```

| Subcommand | Description |
|------------|-------------|
| `create` | Interactive wizard to create a new agent |
| `list` | List all configured agents |

**Examples:**

```bash
opencode agent list
opencode agent create
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### auth

Manage LLM provider credentials.

```bash
opencode auth <subcommand>
```

| Subcommand | Description |
|------------|-------------|
| `login` | Add or update credentials for a provider |
| `list` | Show all configured providers and auth status |
| `logout` | Remove credentials for a provider |

**Examples:**

```bash
opencode auth list
opencode auth login
opencode auth logout anthropic
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### github

GitHub Actions integration management.

```bash
opencode github <subcommand> [flags]
```

| Subcommand | Description |
|------------|-------------|
| `install` | Guided setup for GitHub integration |
| `run` | Manually trigger a GitHub workflow run |

**`run` flags:**

| Flag | Description |
|------|-------------|
| `--event <type>` | GitHub event type to simulate |
| `--token <token>` | GitHub token to use |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### mcp

Manage MCP (Model Context Protocol) servers.

```bash
opencode mcp <subcommand>
```

| Subcommand | Description |
|------------|-------------|
| `add` | Add a new MCP server |
| `list` | List all configured MCP servers |
| `auth` | Authenticate with an MCP server |
| `logout` | Remove MCP server credentials |
| `debug` | Debug MCP server connectivity and tools |

**Examples:**

```bash
opencode mcp list
opencode mcp add
opencode mcp debug
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### models

List available models from configured providers.

```bash
opencode models [provider] [flags]
```

| Flag | Description |
|------|-------------|
| `--refresh` | Force refresh the model list from providers |
| `--verbose` | Show detailed model metadata (context window, pricing, capabilities) |

**Examples:**

```bash
# List all models from all providers
opencode models

# List only Anthropic models
opencode models anthropic

# Refresh and show verbose detail
opencode models --refresh --verbose
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### session

Session management operations.

```bash
opencode session <subcommand> [flags]
```

| Subcommand | Description |
|------------|-------------|
| `list` | List all sessions |

**`list` flags:**

| Flag | Short | Description |
|------|-------|-------------|
| `--max-count <n>` | `-n` | Limit number of results |
| `--format <fmt>` | | Output format (`table`, `json`) |

**Examples:**

```bash
opencode session list
opencode session list -n 10
opencode session list --format json
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### stats

Token usage and cost analysis across sessions.

```bash
opencode stats [flags]
```

| Flag | Description |
|------|-------------|
| `--days <n>` | Analyze usage over the last N days |
| `--tools` | Break down usage by tool |
| `--models` | Break down usage by model |
| `--project` | Scope to the current project directory |

**Examples:**

```bash
# Overview of all usage
opencode stats

# Last 7 days, broken down by model
opencode stats --days 7 --models

# Current project cost
opencode stats --project
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### export

Export session data as JSON.

```bash
opencode export [sessionID]
```

If no `sessionID` is provided, exports the most recent session.

```bash
# Export specific session
opencode export sess_abc123 > session.json

# Export last session
opencode export > last-session.json
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### import

Import a session from a JSON file or a share URL.

```bash
opencode import <file|url>
```

**Examples:**

```bash
# Import from local JSON
opencode import session.json

# Import from share URL
opencode import https://opencode.ai/share/sess_xyz
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### acp

Start the ACP (Agent Client Protocol) server for editor integration. Communicates via JSON-RPC over stdio. Editors that support ACP (Zed, JetBrains, Neovim) invoke this command directly as a subprocess.

```bash
opencode acp
```

See [ACP section](#acp-agent-client-protocol) for editor-specific configuration.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### upgrade

Update OpenCode to a newer version.

```bash
opencode upgrade [target] [flags]
```

| Flag | Short | Description |
|------|-------|-------------|
| `--method <method>` | `-m` | Upgrade method (auto-detected from install method) |

**Examples:**

```bash
# Upgrade to latest
opencode upgrade

# Upgrade to specific version
opencode upgrade 1.3.0
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### uninstall

Remove OpenCode from the system.

```bash
opencode uninstall [flags]
```

| Flag | Short | Description |
|------|-------|-------------|
| `--keep-config` | `-c` | Preserve configuration files |
| `--keep-data` | `-d` | Preserve session data and history |
| `--dry-run` | | Preview what would be removed without deleting |
| `--force` | `-f` | Skip confirmation prompts |

**Examples:**

```bash
# Preview removal
opencode uninstall --dry-run

# Remove but keep config
opencode uninstall --keep-config

# Full removal, no prompts
opencode uninstall --force
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Global Flags

These flags apply to every command.

| Flag | Short | Description |
|------|-------|-------------|
| `--help` | `-h` | Show help for the current command |
| `--version` | `-v` | Print OpenCode version |
| `--print-logs` | | Print server logs to stdout |
| `--log-level <level>` | | Set log verbosity (`debug`, `info`, `warn`, `error`) |

---

## TUI Interface

The TUI (Terminal UI) is the primary interactive interface. It consists of a message input area, a conversation panel, and a status bar showing the current agent and model.

### Slash Commands

Slash commands are entered directly in the message input.

| Command | Description |
|---------|-------------|
| `/connect` | Configure LLM providers and add API keys |
| `/init` | Scan the project structure and generate `AGENTS.md` |
| `/undo` | Revert the last file change made by the agent |
| `/redo` | Restore a change that was undone |
| `/share` | Generate a shareable link for the current session |
| `/models` | Open model selector to switch models mid-session |
| `/help` | Show the in-TUI help panel |

### Special Syntax

| Syntax | Behavior |
|--------|---------|
| `@filename` | Fuzzy file search — adds the matched file as context |
| `@agent-name` | Invoke a named subagent inline |
| `Tab` | Switch between primary agents (Build / Plan) |

**`@filename` detail:** Typing `@` followed by a partial filename opens an interactive fuzzy finder. Selecting a file attaches its content to the next message as context.

### Key Actions

| Action | Description |
|--------|-------------|
| `switch_agent` | Cycle through available primary agents |
| `variant_cycle` | Cycle through model variants for the current provider |

The TUI editor supports Vim-like keybindings in the input field, including normal/insert mode switching, word navigation (`w`, `b`, `e`), and line operations.

---

## Server Mode

### Architecture

OpenCode uses a client/server architecture. The server manages all LLM sessions, file operations, and tool execution. The TUI, web interface, IDE plugins, and SDK are all clients that communicate with this server over HTTP.

When you run `opencode` (TUI mode), it starts both the HTTP server and the TUI client as a single process. You can also run the server standalone with `opencode serve` and connect multiple clients to it simultaneously.

```
┌─────────────────────────────────────────┐
│              OpenCode Server            │
│         (HTTP API — port 4096)          │
└──────┬──────────┬───────────┬───────────┘
       │          │           │
  ┌────▼───┐  ┌───▼──┐  ┌────▼────────┐
  │  TUI   │  │  Web │  │  SDK / IDE  │
  │ Client │  │  App │  │   Plugins   │
  └────────┘  └──────┘  └─────────────┘
```

The OpenAPI 3.1 spec for the server is always accessible at:

```
http://<hostname>:<port>/doc
```

Default server address: `http://127.0.0.1:4096`

### Server Authentication

By default the server listens on localhost with no authentication. To enable HTTP Basic Auth:

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `OPENCODE_SERVER_PASSWORD` | (none) | Enables basic auth when set |
| `OPENCODE_SERVER_USERNAME` | `opencode` | Username for basic auth |

```bash
OPENCODE_SERVER_PASSWORD=mysecret opencode serve
```

### Server API Endpoints

The full REST API is organized into these categories. See `/doc` for the complete OpenAPI spec.

| Category | Operations |
|----------|-----------|
| **Global** | Health check, server-sent event stream, version info |
| **Project / VCS** | Current project metadata, version control status |
| **Sessions** | Create, read, update, delete; fork, share/unshare, prompt, command, shell, abort, revert, unrevert, todo, summarize |
| **Messages** | Send (sync and async), message history, command execution, shell commands |
| **Files** | Content search, file/directory discovery, workspace symbols, file status |
| **Config** | Providers, auth methods, OAuth flows, model listing |
| **Tools / Services** | LSP status, formatter status, MCP server listing |
| **TUI** | Prompt manipulation, dialog controls, toast notifications |
| **Other** | Agent listing, log streaming, event subscriptions |

---

## SDK

### Node.js / TypeScript

#### Installation

```bash
npm install @opencode-ai/sdk
```

#### Full Setup (starts server + client)

Use `createOpencode` when your process needs to own the server lifecycle. It starts a server subprocess and returns a connected client.

```typescript
import { createOpencode } from "@opencode-ai/sdk"

const { client } = await createOpencode({
  hostname: "127.0.0.1",
  port: 4096,
  timeout: 5000
})
```

#### Client-Only (connect to existing server)

Use `createOpencodeClient` when the server is already running (e.g., started by `opencode serve` or the TUI).

```typescript
import { createOpencodeClient } from "@opencode-ai/sdk"

const client = createOpencodeClient({
  baseUrl: "http://localhost:4096"
})
```

#### API Methods

All methods return typed responses generated from the OpenAPI spec.

**Global**

```typescript
await client.global.health()
```

**App**

```typescript
await client.app.log()
await client.app.agents()
```

**Project**

```typescript
await client.project.list()
await client.project.current()
```

**Sessions**

```typescript
await client.session.create({ body: { ... } })
await client.session.list()
await client.session.get({ path: { id: sessionId } })
await client.session.delete({ path: { id: sessionId } })
await client.session.prompt({ path: { id }, body: { ... } })
await client.session.command({ path: { id }, body: { command: "/init" } })
await client.session.shell({ path: { id }, body: { command: "npm test" } })
await client.session.abort({ path: { id } })
await client.session.revert({ path: { id } })
await client.session.unrevert({ path: { id } })
await client.session.share({ path: { id } })
await client.session.unshare({ path: { id } })
```

**Files**

```typescript
await client.find.text({ body: { query: "function auth" } })
await client.find.files({ body: { pattern: "*.ts" } })
await client.find.symbols({ body: { query: "AuthProvider" } })
await client.file.read({ body: { path: "src/auth.ts" } })
await client.file.status({ body: { path: "src/auth.ts" } })
```

**TUI Control**

```typescript
await client.tui.appendPrompt({ body: { text: "add error handling" } })
await client.tui.submitPrompt()
await client.tui.clearPrompt()
await client.tui.openHelp()
await client.tui.openSessions()
await client.tui.openModels()
await client.tui.openThemes()
await client.tui.showToast({ body: { message: "Build complete", level: "info" } })
```

**Events**

```typescript
const stream = await client.event.subscribe()
for await (const event of stream) {
  console.log(event)
}
```

#### Structured Output

Request JSON-structured responses by passing a `format` field in the prompt body.

```typescript
const result = await client.session.prompt({
  path: { id: sessionId },
  body: {
    parts: [{ type: "text", text: "List all exported functions in src/auth.ts" }],
    format: {
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          functions: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["functions"]
      }
    }
  }
})
```

Supported format types:

| Type | Behavior |
|------|---------|
| `"text"` | Default — plain text response |
| `"json_schema"` | Response parsed and validated against provided JSON Schema |

Check for structured output errors:

```typescript
if (result.data.info.error?.name === "StructuredOutputError") {
  // Model could not produce valid JSON matching the schema
}
```

#### TypeScript Types

All types are generated directly from the OpenAPI spec.

```typescript
import type { Session, Message, Part } from "@opencode-ai/sdk"
```

### Python SDK

```bash
pip install opencode_ai
```

The Python SDK mirrors the Node.js SDK structure. Use it for scripting and automation workflows where Python is preferred. See `opencode.ai/docs/sdk/python` for the full method reference.

---

## ACP (Agent Client Protocol)

### Overview

ACP is an open protocol that standardizes communication between editors and AI agents. OpenCode acts as an ACP server; editors act as ACP clients. The protocol uses JSON-RPC over stdio — the editor starts `opencode acp` as a subprocess and communicates via stdin/stdout.

Start the ACP server directly:

```bash
opencode acp
```

### Editor Configurations

#### Zed

Add to `~/.config/zed/settings.json`:

```json
{
  "agent_servers": {
    "OpenCode": {
      "command": "opencode",
      "args": ["acp"]
    }
  }
}
```

#### JetBrains (IntelliJ, WebStorm, etc.)

Create or update `acp.json` in the plugin configuration directory. Use the **absolute path** to the opencode binary:

```json
{
  "command": "/usr/local/bin/opencode",
  "args": ["acp"]
}
```

Find the binary path with:

```bash
which opencode
```

#### Avante.nvim

```lua
require("avante").setup({
  provider = "opencode",
  opencode = {
    command = "opencode",
    args = { "acp" }
  }
})
```

#### CodeCompanion.nvim

Configure an adapter pointing to the `opencode acp` command. Refer to CodeCompanion's adapter documentation for the exact config structure, as it varies by version.

### Supported Features

ACP exposes the full OpenCode feature set with one exception.

| Feature | Supported |
|---------|-----------|
| All built-in tools | ✓ |
| Custom tools | ✓ |
| Custom slash commands | ✓ |
| MCP servers | ✓ |
| AGENTS.md rules | ✓ |
| Formatters and linters | ✓ |
| Agents and permissions | ✓ |
| `/undo` and `/redo` | ✗ |

`/undo` and `/redo` are not supported in ACP sessions. All other TUI-available capabilities are available.

---

## GitHub Integration

### How It Works

OpenCode runs as a GitHub Actions bot. Mention `/opencode` or `/oc` in any issue or pull request comment to trigger it. The agent receives the full issue/PR context, has access to the repository code, and posts results as comments.

### Triggers

| Trigger | How |
|---------|-----|
| Issue comment | Mention `/opencode` or `/oc` in comment body |
| PR comment | Mention `/opencode` or `/oc` in comment body |
| PR review comment | Mention `/oc` on a specific code line |
| Automated issue/PR events | Configure in workflow YAML |
| Scheduled (cron) | `schedule` trigger in workflow YAML |
| Manual | `workflow_dispatch` in workflow YAML |

### Setup

#### Guided (recommended)

```bash
opencode github install
```

This walks through every step interactively.

#### Manual Setup

1. Install the GitHub App: `https://github.com/apps/opencode-agent`
2. Add the workflow file to your repository:
   ```
   .github/workflows/opencode.yml
   ```
3. Store your LLM provider API key in GitHub repository secrets (Settings → Secrets and variables → Actions)

### Workflow Configuration

The `opencode.yml` workflow accepts these configuration options:

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `model` | Yes | — | Model to use — format: `provider/model-id` |
| `agent` | No | config default | Primary agent to use |
| `share` | No | `true` (public repos) | Enable session sharing |
| `prompt` | No | — | Additional system instructions |
| `token` | No | app installation token | GitHub token for API operations |

**Example workflow YAML:**

```yaml
name: OpenCode Agent

on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]

jobs:
  opencode:
    runs-on: ubuntu-latest
    steps:
      - uses: opencode-ai/opencode-action@v1
        with:
          model: "anthropic/claude-opus-4-5"
          share: true
          prompt: "Always write tests. Follow the existing code style."
```

### GitHub Usage

| Comment | Action |
|---------|--------|
| `/opencode explain this issue` | Generates an explanation as a comment |
| `/opencode fix this` | Creates commits with the fix |
| `/opencode review` | Performs a code review on the PR |
| `/oc <any request>` | Shorthand — same behavior |
| `/oc fix this` on a code line | Addresses that specific line |

For scheduled reviews, configure a `schedule` (cron) trigger in the workflow and set a `prompt` with review instructions. The agent will open issues or PR comments on a recurring schedule.

---

## OpenCode Zen

### Overview

OpenCode Zen is a curated gateway of pre-tested models optimized for coding tasks. It is a pay-as-you-go service — no subscription required.

### Pricing

| Aspect | Detail |
|--------|--------|
| Entry | Add $20 to balance |
| Auto-top-up | Triggers automatically when balance runs low |
| Per-token billing | Cost + processing fees |
| Price changes | Price drops from providers are passed through immediately |
| Spend limits | Configurable per workspace and per member |

### Model Format

All OpenCode Zen models use the `opencode/` prefix:

```
opencode/model-name
```

Example:

```bash
opencode -m opencode/gpt-5.1-codex
```

### OpenCode Black

A subscription tier at $200/month that includes access to:

- OpenAI models
- Anthropic models
- Open-weight models: GLM-4.7, Kimi K2

---

## Troubleshooting

### Server Won't Start

```bash
# Check if port 4096 is already in use
lsof -i :4096

# Start on a different port
opencode serve --port 5000
```

### Authentication Failures

```bash
# Verify configured providers
opencode auth list

# Re-authenticate a provider
opencode auth login

# Check API key is set for the provider
```

### TUI Won't Connect to Server

```bash
# Verify the server is running and healthy
curl http://127.0.0.1:4096/health

# Attach to a running server explicitly
opencode attach
```

### ACP Not Connecting in Editor

1. Verify the binary path is correct: `which opencode`
2. Test ACP starts without error: `opencode acp` (should hang waiting for JSON-RPC input)
3. Use the absolute path to the binary in editor config (required for JetBrains)
4. Check editor logs for subprocess startup errors

### GitHub Actions Failing

```bash
# Test the workflow locally first
opencode github run --event issue_comment

# Verify secrets are set in the repo
# Settings → Secrets → ANTHROPIC_API_KEY (or your provider's key)
```

### Debugging

```bash
# Enable debug logging
opencode --log-level debug

# Print server logs to stdout
opencode --print-logs serve

# Check MCP server connectivity
opencode mcp debug
```

### Model / Provider Issues

```bash
# Refresh model list from providers
opencode models --refresh

# List all models with detail
opencode models --verbose

# Check usage and costs
opencode stats --days 7 --models
```
