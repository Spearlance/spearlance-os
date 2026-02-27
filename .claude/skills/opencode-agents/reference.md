# OpenCode Agent System — Developer Reference

Last updated: February 2026 | OpenCode v1.2.10

---

## Table of Contents

1. [Agent Types Overview](#agent-types-overview)
2. [Built-in Agents](#built-in-agents)
3. [Agent Properties Reference](#agent-properties-reference)
4. [Configuration Methods](#configuration-methods)
   - [JSON Configuration](#json-configuration)
   - [Markdown Configuration](#markdown-configuration)
5. [Tool Configuration](#tool-configuration)
6. [Permission Configuration](#permission-configuration)
7. [Model Configuration](#model-configuration)
8. [Agent Creation CLI](#agent-creation-cli)
9. [Design Patterns](#design-patterns)
10. [Troubleshooting](#troubleshooting)

---

## Agent Types Overview

OpenCode has three agent types that determine how and when an agent is invoked.

| Type | Description | Selection |
|------|-------------|-----------|
| `primary` | Main assistants the user directly interacts with | Tab key cycle (`agent_cycle`) or `agent_list` keybind |
| `subagent` | Invoked by primary agents or via `@mention` in messages | `@agent-name` in message or programmatic dispatch |
| `hidden` | System agents that run automatically | No direct user invocation — triggered by runtime events |

Primary agents are the day-to-day drivers. Subagents handle delegation — a primary agent can spin up a subagent for specialized work without leaving the current session context. Hidden agents are runtime machinery: they fire automatically based on internal triggers (context length, session state, etc.) and never appear in user-facing menus.

---

## Built-in Agents

OpenCode ships six built-in agents. Four are user-facing, two are system-level.

### Primary Agents

#### Build
- **Mode:** primary
- **Tools:** all enabled
- **Purpose:** Default agent for active development — writing code, running bash, editing files
- **When to use:** Any hands-on implementation work

#### Plan
- **Mode:** primary
- **Tools:** `edit` and `bash` set to `"ask"` — requires confirmation before acting
- **Purpose:** Safe analysis and exploration without unintended side effects
- **When to use:** Architecture review, codebase exploration, planning sessions before implementation

### Subagents

#### General
- **Mode:** subagent
- **Tools:** full access
- **Purpose:** Complex multi-step research tasks requiring broad tool use
- **Invoked via:** `@general` mention or primary agent dispatch

#### Explore
- **Mode:** subagent
- **Tools:** read-only
- **Purpose:** Fast codebase analysis — reads files, searches patterns, no writes
- **Invoked via:** `@explore` mention or primary agent dispatch for read-only work

### Hidden Agents (System)

#### Compaction
- **Mode:** hidden
- **Trigger:** Automatically fires when session context exceeds threshold
- **Purpose:** Compresses long context to maintain performance and token efficiency
- **User interaction:** None — fully automatic

#### Title
- **Mode:** hidden
- **Trigger:** Fires at session start or after meaningful interaction
- **Purpose:** Auto-generates descriptive session titles
- **User interaction:** None — result appears in session list

#### Summary
- **Mode:** hidden
- **Trigger:** Fires on session end or checkpoint events
- **Purpose:** Auto-generates session summaries for future reference
- **User interaction:** None — result stored with session

---

## Agent Properties Reference

Complete property reference for agent configuration. Properties apply to both JSON and Markdown formats.

| Property | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `description` | string | — | **YES** | Explains agent purpose; guides `@mention` autocomplete and agent selection |
| `mode` | string | `"all"` | no | `"primary"`, `"subagent"`, or `"all"` (appears in both contexts) |
| `model` | string | global default | no | Overrides default model — format: `provider/model-id` |
| `temperature` | float | provider default | no | Response randomness — range `0.0` (deterministic) to `1.0` (creative) |
| `top_p` | float | provider default | no | Alternative diversity control — nucleus sampling parameter |
| `steps` | int | `50` | no | Max agentic iterations before forcing text-only response |
| `prompt` | string | — | no | Path to system prompt file (relative or absolute) |
| `tools` | object | — | no | Enable/disable specific tools — `tool_name: true/false` |
| `permission` | object | — | no | Tool access control — `"allow"`, `"ask"`, or `"deny"` |
| `color` | string | — | no | UI color — hex (`#FF6B6B`) or theme color name |
| `hidden` | bool | `false` | no | When `true`, hides agent from `@` autocomplete but remains functional |
| `disable` | bool | `false` | no | When `true`, fully deactivates agent — not invokable in any mode |

### Property Notes

**`description` is the only required field.** Without it, the agent cannot be selected or recommended intelligently. Write descriptions that explain *what the agent is for*, not just what it's named.

**`mode: "all"`** makes an agent available as both a primary agent (in Tab cycle) and a subagent (via `@mention`). Useful for general-purpose agents you want accessible everywhere.

**`steps`** caps the agentic loop. At 50 steps (default), if the agent hasn't completed its task, it switches to text-only response to prevent runaway loops. Set lower for fast, focused agents. Set higher for complex automation that needs deep iteration.

**`hidden: true`** removes an agent from autocomplete without disabling it. Use for internal agents invoked programmatically by other agents — keeps the `@` menu clean.

---

## Configuration Methods

Agents are configured via JSON (in `opencode.json`) or Markdown (standalone `.md` files). Both methods support all agent properties. JSON is concise for simple agents; Markdown separates system prompt from config and is easier to edit for prompt-heavy agents.

---

### JSON Configuration

Define agents in the `agent` key of `opencode.json` at project root or global config.

```json
{
  "agent": {
    "reviewer": {
      "description": "Code review specialist — checks logic, coverage, and style",
      "mode": "primary",
      "model": "anthropic/claude-sonnet-4-6",
      "temperature": 0.3,
      "top_p": 0.9,
      "steps": 50,
      "prompt": ".opencode/prompts/reviewer.md",
      "tools": {
        "bash": false,
        "edit": false
      },
      "permission": {
        "read": "allow",
        "bash": {
          "*": "ask",
          "git *": "allow"
        }
      },
      "color": "#FF6B6B",
      "hidden": false,
      "disable": false
    }
  }
}
```

The agent key (`"reviewer"` above) becomes the agent's identifier. Use this name in `@reviewer` mentions.

#### Multiple Agents in JSON

```json
{
  "agent": {
    "reviewer": {
      "description": "Read-only code review",
      "mode": "primary",
      "tools": { "bash": false, "edit": false }
    },
    "debugger": {
      "description": "Deep bug investigation with full bash access",
      "mode": "primary",
      "model": "anthropic/claude-opus-4-6",
      "steps": 100
    },
    "docs-writer": {
      "description": "Documentation specialist — writes only to docs/",
      "mode": "subagent",
      "prompt": ".opencode/prompts/docs-writer.md"
    }
  }
}
```

---

### Markdown Configuration

Markdown agents use YAML frontmatter for properties and document body for the system prompt.

#### File Locations

| Scope | Path |
|-------|------|
| Global (all projects) | `~/.config/opencode/agents/<agent-name>.md` |
| Project-local | `.opencode/agents/<agent-name>.md` |

Project-local agents override global agents with the same name.

#### Markdown Agent Format

```markdown
---
description: Code review specialist — checks logic, coverage, and style
mode: primary
model: anthropic/claude-sonnet-4-6
temperature: 0.3
steps: 50
tools:
  bash: false
  edit: false
permission:
  read: allow
  bash:
    "*": ask
    "git *": allow
color: "#FF6B6B"
---

You are a senior code reviewer. Your job is to catch bugs, identify missing test coverage, and enforce code style conventions.

## Review Checklist

- Logic correctness — trace edge cases
- Error handling — all failure paths covered
- Test coverage — new code has corresponding tests
- Style — consistent with existing codebase conventions
- Security — no hardcoded secrets, no injection vectors

When reviewing, cite specific line numbers. Be direct. Do not hedge.
```

Everything after the closing `---` frontmatter delimiter is the system prompt. This is the primary advantage of Markdown format — write a full, structured prompt as a normal document without escaping or JSON string constraints.

#### Markdown vs JSON: When to Use Which

| Scenario | Format |
|----------|--------|
| Simple agents with short prompts | JSON — keeps everything in one file |
| Complex agents with long system prompts | Markdown — prompt stays readable |
| Agents shared across many projects | Global Markdown at `~/.config/opencode/agents/` |
| Project-specific agents | Either — project `.opencode/agents/` or `opencode.json` |
| Programmatic generation | JSON — easier to generate from scripts |

---

## Tool Configuration

The `tools` object in agent config enables or disables specific tools. Agent tool settings override global tool settings.

### Basic Tool Toggle

```json
{
  "tools": {
    "bash": false,
    "edit": false,
    "read": true,
    "grep": true
  }
}
```

### Wildcard Support

Wildcards match groups of tools — useful for MCP tool namespaces.

```json
{
  "tools": {
    "mcp_*": true,
    "mcp_stripe_*": false
  }
}
```

This enables all MCP tools, then selectively disables the Stripe MCP tools. More specific patterns take precedence over wildcards.

### Enabling MCP Tools Per Agent

Use wildcards to give specific agents access to specific MCP servers:

```json
{
  "agent": {
    "payments-agent": {
      "description": "Stripe and payment flow specialist",
      "tools": {
        "mcp_stripe_*": true,
        "bash": false
      }
    },
    "db-agent": {
      "description": "Database query specialist",
      "tools": {
        "mcp_supabase_*": true,
        "bash": false
      }
    }
  }
}
```

### Tool Reference

| Tool | Purpose |
|------|---------|
| `bash` | Execute shell commands |
| `edit` | Write and modify files |
| `read` | Read file contents |
| `grep` | Search file contents |
| `glob` | Find files by pattern |
| `mcp_*` | MCP server tools (wildcard namespace) |

---

## Permission Configuration

Permissions control *how* tools prompt before running. Three permission values:

| Value | Behavior |
|-------|----------|
| `"allow"` | Runs without prompting |
| `"ask"` | Prompts user for confirmation |
| `"deny"` | Blocked — never runs |

Agent permissions override global permissions. This is how you create agents that feel safe by default (Plan agent) or fast by default (Build agent).

### Bash Permission Patterns

```json
{
  "permission": {
    "bash": {
      "*": "ask",
      "git *": "allow",
      "git push *": "ask",
      "rm *": "deny",
      "npm install *": "allow"
    }
  }
}
```

Pattern matching is prefix-based. More specific patterns take precedence. In the example above:
- All bash defaults to `"ask"`
- `git status`, `git log`, `git diff` → `"allow"` (matches `"git *"`)
- `git push origin main` → `"ask"` (matches `"git push *"`, more specific)
- `rm -rf node_modules` → `"deny"` (matches `"rm *"`)

### Skill/Internal Permission Patterns

```json
{
  "permission": {
    "internal-*": "deny",
    "task": "ask"
  }
}
```

### Task Permissions — Controlling Subagent Invocation

The `task` permission controls whether this agent can invoke subagents. Set to `"ask"` to require confirmation before subagent dispatch:

```json
{
  "permission": {
    "task": "ask"
  }
}
```

### Full Permission Example

```json
{
  "permission": {
    "read": "allow",
    "bash": {
      "*": "ask",
      "git status": "allow",
      "git log *": "allow",
      "git diff *": "allow",
      "git add *": "allow",
      "git commit *": "allow",
      "git push *": "ask",
      "rm *": "deny"
    },
    "edit": "ask",
    "task": "allow"
  }
}
```

---

## Model Configuration

### Per-Agent Model Override

Specify `model` in agent config using `provider/model-id` format:

```json
{
  "agent": {
    "architect": {
      "description": "High-stakes architecture decisions",
      "model": "anthropic/claude-opus-4-6",
      "temperature": 0.2
    },
    "commenter": {
      "description": "Add inline code comments",
      "model": "anthropic/claude-haiku-4-5-20251001",
      "temperature": 0.1
    }
  }
}
```

### Built-in Model Variants

OpenCode includes built-in variants for major providers. Cycle through variants with the `variant_cycle` keybind.

| Provider | Variants |
|----------|----------|
| Anthropic | `high`, `max` |
| OpenAI | `none`, `minimal`, `low`, `medium`, `high`, `xhigh` |
| Google | `low`, `high` |

Variants adjust inference parameters (reasoning effort, token budget) without changing the base model.

### Custom Variants

Define custom variants in model config — then reference by variant name per agent:

```json
{
  "models": {
    "anthropic/claude-sonnet-4-6": {
      "variants": {
        "fast": { "temperature": 0.1, "max_tokens": 1000 },
        "deep": { "temperature": 0.7, "max_tokens": 8000 }
      }
    }
  },
  "agent": {
    "quick-reviewer": {
      "model": "anthropic/claude-sonnet-4-6",
      "variant": "fast"
    }
  }
}
```

### Model Selection Strategy

| Agent Role | Recommended Tier | Rationale |
|------------|-----------------|-----------|
| Architecture, planning | Opus 4.6 | Deep reasoning, complex tradeoffs |
| Implementation, review | Sonnet 4.6 | Balanced speed and quality |
| Mechanical tasks (comments, formatting) | Haiku | Fast, cheap, sufficient |
| Subagents with simple reads | Haiku | Minimize cost on high-volume dispatch |

---

## Agent Creation CLI

### Interactive Creation

```bash
opencode agent create
```

Launches an interactive wizard that:
1. Prompts for agent name
2. Collects description
3. Asks about tool preferences
4. Generates a Markdown file with frontmatter + empty system prompt

Output is written to `.opencode/agents/<name>.md` in the current project directory.

### List All Agents

```bash
opencode agent list
```

Shows all active agents — built-in and custom — with their mode, model, and description.

### Manual Creation

Skip the wizard and write the file directly. Both approaches produce equivalent agents — the wizard is just scaffolding.

```bash
# Create agents directory if needed
mkdir -p .opencode/agents

# Write agent file directly
cat > .opencode/agents/security-scanner.md << 'EOF'
---
description: Security-focused code scanner — identifies injection, secrets, and auth issues
mode: primary
model: anthropic/claude-sonnet-4-6
temperature: 0.1
tools:
  bash: false
  edit: false
---

You are a security specialist. Analyze code for:
- Hardcoded secrets and API keys
- SQL injection vulnerabilities
- XSS vectors
- Authentication bypasses
- Insecure direct object references

Report findings with file path, line number, severity (critical/high/medium/low), and remediation.
EOF
```

---

## Design Patterns

Common agent configurations for recurring use cases.

### Build Agent (Default Development)

Full access. The workhorse.

```json
{
  "agent": {
    "build": {
      "description": "Full-access development agent — implements features, runs tests, edits files",
      "mode": "primary",
      "tools": {},
      "permission": {
        "bash": { "*": "allow", "git push *": "ask", "rm -rf *": "deny" }
      }
    }
  }
}
```

### Plan Agent (Safe Exploration)

Read-only by default. Prompts before any write action. Use before implementation to map the terrain.

```json
{
  "agent": {
    "planner": {
      "description": "Analysis and planning — explores codebase without modifying anything",
      "mode": "primary",
      "tools": { "bash": false, "edit": false },
      "permission": {
        "read": "allow",
        "bash": { "*": "ask" },
        "edit": "ask"
      }
    }
  }
}
```

### Review Agent (Read-Only Focus)

No writes. No bash. Read and report only.

```json
{
  "agent": {
    "reviewer": {
      "description": "Code review — reads files and reports findings, no modifications",
      "mode": "primary",
      "model": "anthropic/claude-sonnet-4-6",
      "temperature": 0.3,
      "tools": { "bash": false, "edit": false },
      "permission": { "read": "allow" },
      "color": "#4ECDC4"
    }
  }
}
```

### Debug Agent (Full Bash, Targeted)

Full bash for tracing and reproduction. Higher step count for deep investigation loops.

```json
{
  "agent": {
    "debugger": {
      "description": "Bug investigation — full bash access for tracing, reproduction, and root cause analysis",
      "mode": "primary",
      "model": "anthropic/claude-opus-4-6",
      "steps": 100,
      "permission": {
        "bash": {
          "*": "allow",
          "rm *": "ask"
        },
        "edit": "ask"
      },
      "color": "#FF6B6B"
    }
  }
}
```

### Docs Agent (Write Access Scoped to Docs)

Edit permission only for documentation paths. No bash, no source edits.

```markdown
---
description: Documentation writer — creates and updates docs/, README, and reference files only
mode: subagent
model: anthropic/claude-sonnet-4-6
temperature: 0.5
tools:
  bash: false
permission:
  read: allow
  edit: ask
---

You write documentation. Scope: docs/, README.md, *.md reference files.

Do not modify source code. If a doc requires understanding source behavior, read the source but do not edit it.

Follow existing doc conventions: tone, heading structure, code example format.
```

### Security Scanner Agent

Custom MCP tools enabled, no file writes, no bash.

```json
{
  "agent": {
    "security": {
      "description": "Security scanner — identifies vulnerabilities, secrets exposure, and auth issues",
      "mode": "subagent",
      "model": "anthropic/claude-sonnet-4-6",
      "temperature": 0.1,
      "tools": {
        "bash": false,
        "edit": false,
        "read": true,
        "grep": true,
        "glob": true
      },
      "hidden": true
    }
  }
}
```

### Fast Mechanical Agent (Haiku)

High-volume, low-complexity tasks. Use as a subagent for things like adding comments, formatting, or generating boilerplate.

```json
{
  "agent": {
    "formatter": {
      "description": "Code formatting and comment generation — fast, mechanical, high volume",
      "mode": "subagent",
      "model": "anthropic/claude-haiku-4-5-20251001",
      "temperature": 0.0,
      "steps": 20,
      "tools": { "bash": false },
      "hidden": true
    }
  }
}
```

---

## Troubleshooting

### Agent Not Appearing in @ Autocomplete

| Cause | Fix |
|-------|-----|
| `hidden: true` is set | Remove `hidden` or set to `false` |
| `disable: true` is set | Remove `disable` or set to `false` |
| YAML frontmatter parse error | Validate YAML — check quotes around hex colors and wildcard keys |
| File not in correct directory | Confirm file is in `.opencode/agents/` or `~/.config/opencode/agents/` |
| Missing `description` field | Add `description` — it is required |

### Agent Ignoring Tool Config

Agent `tools` object overrides global tool settings entirely for that agent. If a tool is not listed in the agent's `tools` object, it inherits global defaults.

To disable a tool that's enabled globally:

```json
{
  "tools": { "bash": false }
}
```

To enable a tool that's disabled globally:

```json
{
  "tools": { "edit": true }
}
```

### Permission Conflicts

Permissions are evaluated most-specific first. If behavior is unexpected:

1. Check global permissions in `opencode.json` root `permission` key
2. Check agent-level `permission` — these override global
3. More specific bash patterns override wildcards — `"git push *"` overrides `"git *"`

### Agent Hitting Step Limit

Default `steps: 50`. When an agent hits the limit, it falls back to text-only response. Signs:
- Agent stops tool calls mid-task
- Response is text summary instead of continued action

Fix: Increase `steps` for complex agents:

```json
{
  "steps": 100
}
```

Set a ceiling based on task complexity. Unbounded loops are expensive and usually indicate a task decomposition problem — break the task into smaller subagent invocations instead of just raising the limit.

### Model Format Errors

Model must be `provider/model-id`. Common mistakes:

| Wrong | Correct |
|-------|---------|
| `claude-sonnet-4-6` | `anthropic/claude-sonnet-4-6` |
| `gpt-4o` | `openai/gpt-4o` |
| `gemini-pro` | `google/gemini-pro` |

### YAML Parsing — Hex Colors and Wildcards

YAML treats `#` as a comment. Quote hex colors:

```yaml
# Wrong — YAML sees this as comment
color: #FF6B6B

# Correct
color: "#FF6B6B"
```

YAML also has issues with `*` in keys. Quote wildcard patterns:

```yaml
tools:
  # Wrong
  mcp_*: true

  # Correct
  "mcp_*": true
```

### Project vs Global Agent Precedence

Project-local agents (`.opencode/agents/`) override global agents (`~/.config/opencode/agents/`) with the same filename. If a project agent is behaving unexpectedly, check that no global agent with the same name has conflicting config.

### Subagent Not Being Dispatched

If a primary agent is not dispatching a subagent it should:

1. Check that the subagent's `mode` includes `"subagent"` or `"all"`
2. Check that the primary agent has `"task": "allow"` in its permissions
3. Check that `disable: false` on the target subagent
4. Verify the `@agent-name` spelling matches the agent's key/filename exactly

---

*OpenCode v1.2.10 · Reference verified February 2026*
