# OpenCode Extensibility Reference

**Version:** OpenCode v1.2.10
**Date:** February 2026

This document covers every extensibility surface in OpenCode: MCP servers, plugins, custom commands, agent skills, and rules. All facts are verified against OpenCode v1.2.10 as of February 2026.

---

## Table of Contents

1. [MCP Servers](#mcp-servers)
   - [Local MCP Servers](#local-mcp-servers)
   - [Remote MCP Servers](#remote-mcp-servers)
   - [MCP OAuth](#mcp-oauth)
   - [MCP Tool Control](#mcp-tool-control)
   - [Notable MCP Examples](#notable-mcp-examples)
2. [Plugins](#plugins)
   - [Plugin Structure](#plugin-structure)
   - [Plugin Context Object](#plugin-context-object)
   - [Plugin Events](#plugin-events)
   - [Key Plugin Patterns](#key-plugin-patterns)
3. [Custom Commands](#custom-commands)
   - [File Format](#file-format)
   - [Frontmatter](#frontmatter)
   - [Template Variables](#template-variables)
   - [JSON Alternative](#json-alternative)
4. [Agent Skills](#agent-skills)
   - [Skill Structure](#skill-structure)
   - [SKILL.md Frontmatter](#skillmd-frontmatter)
   - [Skill Discovery](#skill-discovery)
   - [Skill Permissions](#skill-permissions)
5. [Rules and AGENTS.md](#rules-and-agentsmd)
   - [Search Order](#search-order)
   - [Instructions via Config](#instructions-via-config)
6. [Claude Code Migration](#claude-code-migration)
7. [Troubleshooting](#troubleshooting)

---

## MCP Servers

OpenCode supports the Model Context Protocol (MCP) to extend agent capabilities with external tools and data sources. MCP servers come in two forms: local (subprocess) and remote (HTTP/SSE).

All MCP configuration lives in `opencode.json` under the `"mcp"` key.

---

### Local MCP Servers

Local MCP servers run as a child process spawned by OpenCode. Use these for tools you install locally or run via npx.

```json
{
  "mcp": {
    "my-tool": {
      "type": "local",
      "command": ["npx", "-y", "my-mcp-command"],
      "environment": {
        "MY_VAR": "value"
      },
      "enabled": true,
      "timeout": 5000
    }
  }
}
```

#### Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `type` | yes | `"local"` | Identifies this as a local subprocess server |
| `command` | yes | `string[]` | Command and arguments array — first element is the executable |
| `environment` | no | `object` | Key-value env vars injected into the subprocess environment |
| `enabled` | no | `boolean` | When `true`, server activates on startup. Defaults to `true` |
| `timeout` | no | `number` | Milliseconds to wait for tool list fetching. Default: `5000` |

#### Notes

- `command` is always an array, never a string. `["npx", "-y", "my-mcp-command"]` is correct. `"npx -y my-mcp-command"` is not.
- Environment variables in `environment` are merged with the parent process environment — they do not replace it.
- Set `"enabled": false` to keep a server configured but inactive without removing its config.
- Timeouts only affect tool discovery on startup. Active tool calls use a separate timeout governed by the provider.

#### Example — Local filesystem tool via npx

```json
{
  "mcp": {
    "filesystem": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-filesystem", "/home/user/projects"],
      "enabled": true,
      "timeout": 8000
    }
  }
}
```

---

### Remote MCP Servers

Remote MCP servers run over HTTP using Server-Sent Events (SSE). OpenCode connects to these over the network.

```json
{
  "mcp": {
    "sentry": {
      "type": "remote",
      "url": "https://mcp.sentry.dev/sse",
      "headers": {
        "Authorization": "Bearer {env:SENTRY_TOKEN}"
      },
      "oauth": {},
      "enabled": true,
      "timeout": 5000
    }
  }
}
```

#### Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `type` | yes | `"remote"` | Identifies this as a remote HTTP/SSE server |
| `url` | yes | `string` | Full URL to the remote MCP endpoint |
| `headers` | no | `object` | Custom HTTP headers sent with every request |
| `oauth` | no | `object \| false` | OAuth config object, `{}` to enable auto-detection, `false` to disable |
| `enabled` | no | `boolean` | Activates on startup. Defaults to `true` |
| `timeout` | no | `number` | Milliseconds to wait for tool list fetching. Default: `5000` |

#### Header Interpolation

Headers support `{env:VAR_NAME}` interpolation. At runtime, OpenCode substitutes the actual environment variable value. This keeps secrets out of `opencode.json`:

```json
{
  "headers": {
    "Authorization": "Bearer {env:SENTRY_TOKEN}",
    "X-Tenant-ID": "{env:TENANT_ID}"
  }
}
```

If the referenced env var is unset, the literal string `{env:VAR_NAME}` is sent — not blank, not an error.

---

### MCP OAuth

OpenCode handles OAuth for remote MCP servers automatically and manually.

#### Automatic Flow

When a remote MCP server returns HTTP 401, OpenCode:

1. Detects the 401 response
2. Initiates Dynamic Client Registration per RFC 7591
3. Opens a browser for the user to complete the authorization flow
4. Stores the resulting token for subsequent requests

No manual configuration is required. Set `"oauth": {}` to enable auto-detection.

#### Manual Trigger

Force OAuth re-authentication at any time:

```bash
opencode mcp auth <name>
```

Where `<name>` matches the key in the `"mcp"` config object.

#### Pre-Registered OAuth Clients

For servers that require a pre-registered client, supply credentials directly in the `oauth` object:

```json
{
  "mcp": {
    "my-service": {
      "type": "remote",
      "url": "https://api.my-service.com/mcp/sse",
      "oauth": {
        "clientId": "your-client-id",
        "clientSecret": "{env:MY_SERVICE_CLIENT_SECRET}",
        "scope": "read write"
      }
    }
  }
}
```

Set `"oauth": false` to disable OAuth entirely for a server (use static headers instead).

#### MCP Management Commands

| Command | Description |
|---------|-------------|
| `opencode mcp list` | Lists all configured MCP servers and their current status |
| `opencode mcp auth <name>` | Manually triggers OAuth for a remote server |
| `opencode mcp logout <name>` | Clears stored OAuth tokens for a server |
| `opencode mcp debug <name>` | Outputs connection details and tool list for debugging |

---

### MCP Tool Control

By default, all tools from all enabled MCP servers are available to all agents. Fine-grained control is possible at the global and per-agent level.

#### Global Disable

Disable specific tools or all tools from an MCP server globally:

```json
{
  "tools": {
    "my-mcp-foo": false,
    "my-mcp*": false
  }
}
```

- Exact names disable a single tool: `"my-mcp-foo": false`
- Glob patterns disable multiple: `"my-mcp*": false` disables every tool whose name starts with `my-mcp`

#### Per-Agent Enable

When a server's tools are globally disabled, re-enable specific tools for a specific agent:

```json
{
  "agent": {
    "my-agent": {
      "tools": {
        "specific-mcp": true
      }
    }
  }
}
```

This layered model lets you restrict powerful tools to only the agents that need them.

---

### Notable MCP Examples

| Name | URL | Auth | Notes |
|------|-----|------|-------|
| Sentry | `https://mcp.sentry.dev/sse` | OAuth | Error data, stack traces, issue management |
| Context7 | varies | Optional API key | Documentation search — API key required for high-volume use |
| Grep by Vercel | varies | None | GitHub code search across public repositories |

---

## Plugins

Plugins are JavaScript or TypeScript modules that hook into OpenCode's event system. They extend behavior without forking OpenCode itself.

---

### Plugin Structure

Plugins are standard JS/TS module files that export a default async function. OpenCode auto-loads all plugins from two locations at startup:

| Scope | Path |
|-------|------|
| Project | `.opencode/plugins/` |
| Global | `~/.config/opencode/plugins/` |

**Load order:** Global config → Project config → Global plugin directory → Project plugin directory

Project plugins load after global plugins. Project plugin exports override global plugin exports of the same name.

#### Minimal plugin example

```typescript
// .opencode/plugins/my-plugin.ts
import type { Plugin } from "@opencode-ai/plugin";

const myPlugin: Plugin = async (ctx) => {
  return {
    event: async ({ event }) => {
      if (event.type === "session.created") {
        console.log(`Session started: ${event.properties?.id}`);
      }
    },
  };
};

export default myPlugin;
```

#### Dependencies

Add a `.opencode/package.json` to declare plugin dependencies. OpenCode installs them automatically via Bun before plugins load:

```json
{
  "dependencies": {
    "my-utility-lib": "^1.0.0"
  }
}
```

---

### Plugin Context Object

Every plugin receives a `PluginInput` object as its argument. The context provides access to project state and APIs:

| Property | Type | Description |
|----------|------|-------------|
| `client` | `OpenCodeClient` | SDK client for API interaction |
| `project` | `Project` | Current project info |
| `directory` | `string` | Current working directory |
| `worktree` | `string` | Git worktree root path |
| `serverUrl` | `URL` | OpenCode server URL |
| `$` | `BunShell` | Bun's `$` shell API for running commands |

Use `console.log()` for plugin logging. Output appears in OpenCode's log file.

#### Running shell commands via $

```typescript
const result = await ctx.$`git status --short`;
console.log(result.stdout);
```

The `$` property is Bun's tagged template shell — async, cross-platform, no child_process boilerplate.

---

### Plugin Events

Plugins hook into OpenCode by returning a `Hooks` object from the plugin function. There is no `ctx.on()` method — all hooks are declared as properties of the returned object.

#### Named Hooks (returned from plugin function)

| Hook | Signature | Fired When |
|------|-----------|------------|
| `event` | `({ event }) => Promise<void>` | Any system event (session, message, tool, etc.) |
| `config` | `(config) => Promise<void>` | Config is loaded |
| `tool.execute.before` | `(input: { tool, sessionID, callID }, output: { args }) => Promise<void>` | Before a tool executes |
| `tool.execute.after` | `(input: { tool, sessionID, callID, args }, output: { title, output, metadata }) => Promise<void>` | After a tool executes |
| `shell.env` | `(input: { cwd }, output: { env }) => Promise<void>` | Shell execution starting — inject env vars |
| `command.execute.before` | `(input: { command, sessionID, arguments }, output: { parts }) => Promise<void>` | Before a slash command executes |
| `chat.message` | `(input, output) => Promise<void>` | New message received |
| `chat.params` | `(input, output) => Promise<void>` | Modify LLM parameters |
| `chat.headers` | `(input, output) => Promise<void>` | Modify request headers |
| `permission.ask` | `(input, output) => Promise<void>` | Permission check |
| `tool.definition` | `(input: { toolID }, output: { description, parameters }) => Promise<void>` | Modify tool definitions sent to LLM |

#### Generic event types (received by the `event` hook)

**Sessions:** `session.created`, `session.updated`, `session.deleted`, `session.idle`, `session.error`, `session.compacted`, `session.diff`, `session.status`

**Messages:** `message.updated`, `message.removed`, `message.part.updated`, `message.part.removed`

**LSP:** `lsp.client.diagnostics`, `lsp.updated`

**Files:** `file.edited`, `file.watcher.updated`

**Permissions:** `permission.asked`, `permission.replied`

**Server:** `server.connected`, `installation.updated`

**Other:** `todo.updated`, `tui.prompt.append`, `tui.command.execute`, `tui.toast.show`

---

### Key Plugin Patterns

#### Custom tools

Register new tools that agents can call:

```typescript
import { tool, type Plugin } from "@opencode-ai/plugin";

const myPlugin: Plugin = async (ctx) => {
  return {
    tool: {
      "fetch-price": tool({
        description: "Fetch the current price of a ticker symbol",
        args: {
          ticker: tool.schema.string().describe("Stock ticker, e.g. AAPL"),
        },
        async execute({ ticker }) {
          const res = await fetch(`https://api.example.com/price/${ticker}`);
          const data = await res.json();
          return JSON.stringify({ price: data.price });
        },
      }),
    },
  };
};

export default myPlugin;
```

#### Tool hooks — intercept and modify

Intercept any tool call before or after execution:

```typescript
const auditPlugin: Plugin = async (ctx) => {
  return {
    "tool.execute.before": async (input, output) => {
      console.log(`Tool called: ${input.tool} with ${JSON.stringify(output.args)}`);
      // Modify output.args to change what gets passed to the tool
    },
    "tool.execute.after": async (input, output) => {
      console.log(`Tool result: ${output.title}`);
      // Modify output.output to change what the agent sees
    },
  };
};
```

#### Environment injection

Add env vars to every shell execution:

```typescript
const envPlugin: Plugin = async (ctx) => {
  return {
    "shell.env": async (_input, output) => {
      output.env["MY_CUSTOM_VAR"] = "injected-value";
      output.env["BUILD_ENV"] = process.env.NODE_ENV || "development";
    },
  };
};
```

Every command OpenCode runs — tool calls, shell commands — receives these vars.

#### Session compaction (experimental)

Customize how context is compacted when a session grows large:

```typescript
const compactPlugin: Plugin = async (ctx) => {
  return {
    "experimental.session.compacting": async (input, output) => {
      output.context.push("Key project decisions: use Drizzle ORM, deploy to Vercel");
      // Or replace the prompt entirely:
      // output.prompt = "Custom compaction prompt...";
    },
  };
};
```

This is marked experimental and may change in future versions.

---

## Custom Commands

Custom commands add slash commands to the TUI. They are Markdown files (or JSON config) that define a prompt template.

---

### File Format

Commands are Markdown files. The filename becomes the command name.

| Scope | Path | Example |
|-------|------|---------|
| Project | `.opencode/commands/` | `.opencode/commands/test.md` → `/test` |
| Global | `~/.config/opencode/commands/` | `~/.config/opencode/commands/deploy.md` → `/deploy` |

Commands in project scope take precedence over global commands with the same name.

Custom commands override built-in commands. The built-ins that can be overridden:

- `/init`
- `/undo`
- `/redo`
- `/share`
- `/help`

Override built-ins by creating a file with the matching name. Override is total — the original behavior is replaced, not extended.

---

### Frontmatter

Commands support YAML frontmatter to configure execution behavior:

```yaml
---
description: Brief explanation shown in TUI command picker
agent: build
model: anthropic/claude-sonnet-4-6
subtask: true
---

Your prompt template goes here.
```

#### Frontmatter fields

| Field | Required | Description |
|-------|----------|-------------|
| `description` | no | Short text shown in the TUI when browsing commands |
| `agent` | no | Which named agent executes this command. Defaults to the active agent |
| `model` | no | Override the default model for this command only |
| `subtask` | no | When `true`, runs the command as a subagent invocation |

---

### Template Variables

Commands are templates. Variables are substituted at invocation time.

#### Argument variables

| Variable | Expands To |
|----------|-----------|
| `$ARGUMENTS` | All arguments passed to the command, space-joined |
| `$1` | First positional argument |
| `$2` | Second positional argument |
| `$3` | Third positional argument |

Example: `/test src/auth.ts` in TUI → `$1` = `src/auth.ts`, `$ARGUMENTS` = `src/auth.ts`

#### Shell injection

Backtick expressions run in the project root at invocation time. Their stdout replaces the expression:

```markdown
Run tests for the current branch: `git branch --show-current`
```

At invocation, this becomes:

```
Run tests for the current branch: feat/auth-refresh
```

Shell injection runs in the project root directory regardless of the user's current working directory.

#### File inclusion

`@path/to/file` includes the file's contents inline:

```markdown
---
description: Review this file for security issues
---

Review the following file for security vulnerabilities:

@$1
```

When invoked as `/security-review src/api/auth.ts`, the contents of `src/api/auth.ts` are inlined at the `@$1` position.

#### Full example

```markdown
---
description: Run tests for a specific file and show coverage
agent: build
---

Run the test suite for `$1` using vitest.

Current branch: `git branch --show-current`
Staged files: `git diff --staged --name-only`

File under test:
@$1

Show coverage for this file only. Flag any uncovered branches.
```

---

### JSON Alternative

Commands can also be defined in `opencode.json` instead of as separate files:

```json
{
  "command": {
    "test": {
      "template": "Run tests for $1",
      "description": "Run tests for a specific file",
      "agent": "build",
      "model": "anthropic/claude-sonnet-4-6"
    }
  }
}
```

JSON-defined commands support the same template variables as Markdown files. The `subtask` field is also supported.

Markdown files take precedence over JSON config when both define the same command name.

---

## Agent Skills

Skills are reusable instruction sets that agents can load on demand. They scope specialized knowledge to when it's actually needed rather than bloating every session's context window.

---

### Skill Structure

Each skill lives in its own directory containing a `SKILL.md` file. The directory name has no special meaning — the skill's identity comes from its frontmatter.

```
.opencode/skills/
  my-skill/
    SKILL.md          ← required
    reference.md      ← optional supporting docs
    examples/         ← optional examples
```

#### Search locations

OpenCode searches these paths in order when resolving skills:

1. `.opencode/skills/<name>/SKILL.md`
2. `~/.config/opencode/skills/<name>/SKILL.md`
3. `.claude/skills/<name>/SKILL.md` (Claude Code compatibility)
4. `.agents/skills/<name>/SKILL.md`

OpenCode traverses upward from the current directory to the git worktree root when searching. A skill in a parent directory is found if no closer skill matches.

---

### SKILL.md Frontmatter

`SKILL.md` files require YAML frontmatter:

```yaml
---
name: my-skill-name
description: A clear description that guides when agents select this skill
license: MIT
compatibility: opencode>=1.2.0
metadata:
  author: Your Name
  category: testing
---

Skill instructions go here. Write them as you would write instructions for a capable developer.
```

#### Frontmatter fields

| Field | Required | Constraints | Description |
|-------|----------|-------------|-------------|
| `name` | yes | 1-64 chars, `^[a-z0-9]+(-[a-z0-9]+)*$` | Skill identifier — lowercase alphanumeric with hyphens only |
| `description` | yes | 1-1024 chars | Shown to agents when deciding which skill to load. Write it to guide selection accurately |
| `license` | no | string | License identifier (e.g., `MIT`, `Apache-2.0`) |
| `compatibility` | no | string | Version constraint (e.g., `opencode>=1.2.0`) |
| `metadata` | no | `object (string → string)` | Arbitrary key-value metadata — all values must be strings |

#### Name validation

The `name` field must match the regex `^[a-z0-9]+(-[a-z0-9]+)*$`. Valid examples:

```
my-skill          ✓
auth-refresh      ✓
tdd               ✓
MySkill           ✗  (uppercase not allowed)
my_skill          ✗  (underscores not allowed)
-leading-hyphen   ✗  (cannot start with hyphen)
double--hyphen    ✗  (consecutive hyphens not allowed)
```

---

### Skill Discovery

Skills surface to agents through the `skill` tool. When an agent decides a skill would help, it calls:

```
skill({ name: "my-skill-name" })
```

This loads the `SKILL.md` contents into the agent's context. The agent then follows those instructions for the remainder of the task.

The `skill` tool's description lists all available skills so agents can reason about which one applies. The `description` field in frontmatter is the primary signal agents use for selection — write it precisely.

#### Skill body best practices

- Write instructions in second person: "When the user asks to..., do..."
- Include concrete examples, not just abstract rules
- Reference supporting files with relative paths: `See ./reference.md for full API details`
- Keep total size under 8,000 tokens — large skills consume context that could go to actual work
- Structure with headers so agents can scan rather than read linearly

---

### Skill Permissions

Control which skills agents can load:

```json
{
  "permission": {
    "skill": {
      "*": "allow",
      "internal-*": "deny",
      "experimental-*": "ask"
    }
  }
}
```

#### Permission values

| Value | Behavior |
|-------|----------|
| `"allow"` | Skill loads automatically when called |
| `"deny"` | Skill call is blocked silently |
| `"ask"` | User is prompted before the skill loads |

Patterns are matched in order. First match wins. Use `*` as a catch-all default.

#### Per-agent overrides

Override permissions for a specific agent in its frontmatter or in `opencode.json`:

```json
{
  "agent": {
    "build-agent": {
      "permission": {
        "skill": {
          "experimental-*": "allow"
        }
      }
    }
  }
}
```

#### Disable skill loading entirely

Remove the `skill` tool from an agent entirely:

```json
{
  "tools": {
    "skill": false
  }
}
```

With `skill: false`, agents in that scope cannot load any skills regardless of permission config.

---

## Rules and AGENTS.md

OpenCode uses `AGENTS.md` files to inject persistent instructions into every session. These are the primary mechanism for project-level and global-level behavioral rules.

---

### Search Order

OpenCode resolves `AGENTS.md` using a first-match-wins search:

1. **Project AGENTS.md** — traverses upward from the current directory to the git worktree root. The closest match wins.
2. **Global AGENTS.md** — `~/.config/opencode/AGENTS.md` — applies when no project-level file is found.
3. **Fallback** — `~/.claude/CLAUDE.md` — Claude Code compatibility fallback (see below).

All found `AGENTS.md` files along the traversal path are concatenated, not replaced. A child directory's `AGENTS.md` appends to the parent's.

---

### Instructions via Config

Inject additional instruction files — beyond `AGENTS.md` — through `opencode.json`:

```json
{
  "instructions": [
    "CONTRIBUTING.md",
    "docs/guidelines.md",
    ".cursor/rules/*.md"
  ]
}
```

#### Supported sources

| Source Type | Example | Notes |
|-------------|---------|-------|
| Relative path | `"CONTRIBUTING.md"` | Resolved from project root |
| Absolute path | `"/etc/opencode/rules.md"` | Loaded as-is |
| Glob pattern | `".cursor/rules/*.md"` | All matching files concatenated in glob order |
| Remote URL | `"https://example.com/rules.md"` | Fetched at session start — 5-second timeout |

Remote URLs that fail to load (timeout, 404, network error) are silently skipped. No error is surfaced.

Files listed in `instructions` are loaded after `AGENTS.md`. They do not replace it.

---

## Claude Code Migration

OpenCode automatically recognizes Claude Code configuration. Projects that were previously using Claude Code work in OpenCode without manual migration.

#### Auto-recognized files

| File | OpenCode behavior |
|------|-----------------|
| `CLAUDE.md` | Treated as equivalent to `AGENTS.md` |
| `~/.claude/CLAUDE.md` | Used as global rules fallback |
| `~/.claude/skills/` | Skills directory recognized and searched |

#### Disabling Claude Code compatibility

Three environment variables control which parts of the compatibility layer are active:

| Variable | Effect |
|----------|--------|
| `OPENCODE_DISABLE_CLAUDE_CODE=1` | Disables all Claude Code compatibility |
| `OPENCODE_DISABLE_CLAUDE_CODE_PROMPT=1` | Disables `CLAUDE.md` prompt injection |
| `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1` | Disables `~/.claude/skills/` skill discovery |

Set these in your shell environment or in a `.env` file at the project root.

#### Migration checklist

If you want to fully migrate from Claude Code to native OpenCode config:

```
CLAUDE.md                 → AGENTS.md
~/.claude/CLAUDE.md       → ~/.config/opencode/AGENTS.md
~/.claude/skills/         → ~/.config/opencode/skills/
.claude/skills/           → .opencode/skills/
```

Skills in `.claude/skills/` continue to work via the compatibility layer indefinitely. Migration is optional.

---

## Troubleshooting

### MCP server not appearing

1. Run `opencode mcp list` — confirm the server shows `enabled: true`
2. Check the `"type"` field — it must be exactly `"local"` or `"remote"`
3. For local servers: verify the command runs successfully in a plain terminal
4. Increase `"timeout"` if the server is slow to start (default 5000ms)
5. Run `opencode mcp debug <name>` to see the raw connection attempt and tool list

### MCP OAuth failing

1. Run `opencode mcp logout <name>` to clear any stale tokens
2. Run `opencode mcp auth <name>` to re-initiate the OAuth flow
3. Confirm the `url` endpoint is reachable from your network
4. For pre-registered clients, verify `clientId` and `clientSecret` match the provider's records

### Plugin not loading

1. Confirm the file is in `.opencode/plugins/` or `~/.config/opencode/plugins/`
2. Confirm the file exports a default **async** function that returns a Hooks object
3. Check for syntax errors — Bun's error output appears in the OpenCode startup log
4. If the plugin has dependencies, confirm `.opencode/package.json` lists them and `bun install` has run

### Skill not found

1. Confirm `SKILL.md` exists in the skill's directory
2. Confirm the `name` field in frontmatter matches what the agent is calling
3. Validate the `name` against `^[a-z0-9]+(-[a-z0-9]+)*$` — no uppercase, no underscores
4. Run the agent and check if `skill` tool appears in the tool list — if not, check `tools.skill: false` in config

### Custom command not appearing

1. Confirm the `.md` file is in `.opencode/commands/`
2. The filename (without `.md`) is the command name — `test.md` → `/test`
3. Restart OpenCode — commands load at startup, not hot-reloaded
4. Check for YAML frontmatter syntax errors — invalid frontmatter causes the file to be skipped

### AGENTS.md not being applied

1. Confirm the file is named exactly `AGENTS.md` (case-sensitive on Linux)
2. Run from inside the git worktree — OpenCode traverses up to the worktree root, not the filesystem root
3. Check if `OPENCODE_DISABLE_CLAUDE_CODE=1` is set — this also affects some AGENTS.md behavior
4. Verify the `instructions` array in `opencode.json` for any glob patterns that might be failing silently

### Remote instruction URL timeout

Remote URLs in the `instructions` array have a hard 5-second timeout. If your rules server is slow:

- Host the file on a CDN or static host instead of a dynamic server
- Convert the remote URL to a local file committed to the repo
- Increase network reliability — OpenCode does not retry on timeout
