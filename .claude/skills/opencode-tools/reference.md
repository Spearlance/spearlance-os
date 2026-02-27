# OpenCode Tools & Permission System Reference

**Version:** OpenCode v1.2.10
**Verified:** February 2026

---

## Table of Contents

1. [Built-in Tools](#built-in-tools)
   - [File Operations](#file-operations)
   - [Code Intelligence](#code-intelligence)
   - [Task Management](#task-management)
   - [Web Operations](#web-operations)
   - [Agent & Capability Tools](#agent--capability-tools)
   - [User Interaction](#user-interaction)
2. [Permission System](#permission-system)
   - [Resolution Outcomes](#resolution-outcomes)
   - [Permission Categories](#permission-categories)
   - [Configuration Syntax](#configuration-syntax)
   - [Pattern Matching Rules](#pattern-matching-rules)
   - [Default Permissions](#default-permissions)
3. [Enabling and Disabling Tools](#enabling-and-disabling-tools)
4. [Custom Tools](#custom-tools)
   - [File Location and Naming](#file-location-and-naming)
   - [Tool API](#tool-api)
   - [Multiple Tools Per File](#multiple-tools-per-file)
   - [Cross-Language Tools](#cross-language-tools)
   - [Tool Precedence](#tool-precedence)
5. [Agent-Level Overrides](#agent-level-overrides)
6. [Troubleshooting](#troubleshooting)

---

## Built-in Tools

OpenCode ships with 16 built-in tools. Each tool has a permission key that controls how it is gated in `opencode.json`.

### File Operations

#### `read`
**Permission key:** `read`

Reads file contents. Supports reading the full file or a specific line range. Returns content as plain text.

```
Parameters:
  filePath    string   — absolute or project-relative path
  startLine   number   — optional, 1-indexed
  endLine     number   — optional, 1-indexed
```

Use `startLine` + `endLine` on large files to avoid loading the entire buffer. When neither is provided, the full file is returned.

---

#### `edit`
**Permission key:** `edit`

Modifies an existing file using exact string replacements. The `oldString` must match exactly (including whitespace and indentation) — the tool performs a literal find-and-replace, not a fuzzy match.

```
Parameters:
  filePath    string   — path to the file to modify
  oldString   string   — exact text to find
  newString   string   — text to replace it with
```

The edit fails if `oldString` appears zero times or more than once in the file. Provide additional surrounding context to make the match unique when needed.

---

#### `write`
**Permission key:** `edit`

Creates a new file or overwrites an existing one in full. Shares the `edit` permission key — disabling `edit` disables both `edit` and `write`.

```
Parameters:
  filePath    string   — path to create or overwrite
  content     string   — full file content to write
```

Use `edit` for targeted modifications to existing files. Use `write` only when creating new files or performing a full replacement.

---

#### `patch`
**Permission key:** `edit`

Applies a unified diff (patch file) to the codebase. Also gated under the `edit` permission key.

```
Parameters:
  patch       string   — unified diff content to apply
```

Useful when receiving diffs from external systems, CI output, or structured code generation pipelines.

---

#### `glob`
**Permission key:** `glob`

Finds files matching a glob pattern. Backed by ripgrep, which respects `.gitignore` by default.

```
Parameters:
  pattern     string   — glob pattern (e.g., "**/*.ts", "src/**/*.test.*")
  path        string   — optional root directory to search from
```

To include paths that are in `.gitignore`, add an `.ignore` file that explicitly allows them. The `.ignore` file syntax mirrors `.gitignore` but inverts exclusion.

---

#### `grep`
**Permission key:** `grep`

Searches file contents using regular expressions. Backed by ripgrep for performance across large codebases.

```
Parameters:
  pattern     string   — regex pattern (ripgrep syntax)
  path        string   — optional directory to scope the search
  glob        string   — optional file pattern filter (e.g., "*.ts")
  type        string   — optional file type filter (e.g., "js", "py")
  output_mode string   — "content" | "files_with_matches" | "count"
  context     number   — lines of context around each match
  -i          boolean  — case-insensitive search
```

Like `glob`, grep respects `.gitignore`. Use `.ignore` files to explicitly allow ignored paths.

---

#### `list`
**Permission key:** `list`

Lists directory contents. Supports glob filtering to narrow results.

```
Parameters:
  path        string   — directory to list
  pattern     string   — optional glob filter
```

Returns filenames and metadata. Respects `.gitignore` via ripgrep.

---

### Code Intelligence

#### `lsp`
**Permission key:** `lsp`

Queries the Language Server Protocol engine for code intelligence. Provides definitions, references, hover info, and diagnostics without running the code.

```
Parameters:
  operation   string   — "definition" | "references" | "hover" | "diagnostics"
  filePath    string   — file to query
  line        number   — 1-indexed line number
  character   number   — 0-indexed column number
```

LSP operations require that a compatible language server is running or configured for the project's language. Definitions and references return file paths and line numbers. Hover returns type signatures and docstrings.

---

### Task Management

#### `todowrite`
**Permission key:** `todowrite`

Creates or updates the session task list. Persists todos for the current session, allowing agents to track multi-step work.

```
Parameters:
  todos       array    — list of todo objects
    id        string   — unique identifier
    content   string   — task description
    status    string   — "pending" | "in_progress" | "completed"
    priority  string   — "high" | "medium" | "low"
```

Calling `todowrite` replaces the full todo list — pass all todos each time, not just the delta.

---

#### `todoread`
**Permission key:** `todoread`

Returns the current todo list state for the session.

```
Parameters:
  (none)
```

Returns the same structure written by `todowrite`. Use at the start of tasks to restore context from a previous step.

---

### Web Operations

#### `webfetch`
**Permission key:** `webfetch`

Fetches a web page and returns its content, converting HTML to markdown for readability.

```
Parameters:
  url         string   — fully-formed URL (HTTP upgrades to HTTPS automatically)
  prompt      string   — instruction for what to extract from the page
```

Results may be summarized when page content is large. Responses are cached for 15 minutes per URL within a session.

---

#### `websearch`
**Permission key:** `websearch`

Searches the web via Exa AI and returns structured results with URLs, titles, and excerpts.

```
Parameters:
  query           string    — search query
  allowed_domains array     — optional whitelist of domains
  blocked_domains array     — optional blacklist of domains
```

**Requires the environment variable `OPENCODE_ENABLE_EXA=1` to be set.** Without it, `websearch` is unavailable regardless of permission configuration. Only available in US regions.

---

### Agent & Capability Tools

#### `skill`
**Permission key:** `skill`

Loads a SKILL.md file and returns its content for the current session. Used by agents to pull in domain-specific instructions at runtime.

```
Parameters:
  name        string   — skill name matching a SKILL.md file in the skills directory
```

---

#### `bash`
**Permission key:** `bash`

Executes shell commands in the project environment. The most powerful and most permission-sensitive tool.

```
Parameters:
  command     string   — shell command to execute
  timeout     number   — optional timeout in milliseconds (max 600000)
  description string   — human-readable label for what the command does
```

Bash supports granular pattern-based permission rules — see [Configuration Syntax](#configuration-syntax). Working directory persists between calls; shell state does not.

---

### User Interaction

#### `question`
**Permission key:** none (always available)

Asks the user a question and waits for their response. Used when agent needs user preferences, confirmation, or missing context.

```
Parameters:
  question    string   — the question to present to the user
  options     array    — optional list of choices
```

---

## Permission System

### Resolution Outcomes

Every tool invocation resolves to one of three outcomes:

| Outcome | Behavior |
|---------|----------|
| `allow` | Executes automatically with no prompt |
| `ask` | Pauses and prompts the user for approval |
| `deny` | Blocks the action entirely — returns an error |

### "Ask" User Response Options

When a tool resolves to `ask`, the user sees three choices:

| Response | Effect |
|----------|--------|
| `once` | Single approval for this invocation only |
| `always` | Approval for all matching patterns for the remainder of the session (not persisted to disk) |
| `reject` | Denial for this invocation |

---

### Permission Categories

| Category | Tools Covered | Notes |
|----------|--------------|-------|
| `read` | read | File read operations |
| `edit` | edit, write, patch | All file modification and creation |
| `glob` | glob | File pattern matching |
| `grep` | grep | Regex content search |
| `list` | list | Directory listing |
| `bash` | bash | Shell command execution — supports granular sub-patterns |
| `task` | (agent dispatch) | Launching subagents and parallel tasks |
| `skill` | skill | Loading skill files — supports sub-patterns |
| `lsp` | lsp | Language server queries |
| `todoread` | todoread | Reading the session todo list |
| `todowrite` | todowrite | Writing the session todo list |
| `webfetch` | webfetch | Fetching web pages |
| `websearch` | websearch | Web search via Exa AI |
| `codesearch` | (code search) | Searching indexed code |
| `external_directory` | any tool accessing paths outside the project | Default: `ask` |
| `doom_loop` | any tool called identically 3+ times | Repeated identical invocations — default: `ask` |

---

### Configuration Syntax

All permission config lives in `opencode.json` under the `"permission"` key.

#### Simple (flat) syntax

Assigns a single outcome to a tool by name. Use `*` as the catch-all for tools not explicitly listed.

```json
{
  "permission": {
    "*": "ask",
    "read": "allow",
    "bash": "allow",
    "edit": "deny"
  }
}
```

#### Granular (object) syntax for `bash`

When `bash`'s value is an object, each key is a command pattern and each value is an outcome. Patterns are matched in order — first match wins.

```json
{
  "permission": {
    "bash": {
      "*": "ask",
      "git *": "allow",
      "git push *": "ask",
      "npm test*": "allow",
      "rm *": "deny",
      "rm -rf *": "deny"
    }
  }
}
```

Because first match wins, put specific patterns before broad ones. In the example above, `git push origin main` matches `git push *` before it reaches `git *`.

#### MCP tool permissions

MCP tools register under their server's namespace. Use wildcards to gate entire namespaces:

```json
{
  "permission": {
    "mymcp_*": "ask"
  }
}
```

#### Skill permissions

Skill loading supports sub-pattern matching identical to bash:

```json
{
  "permission": {
    "skill": {
      "*": "allow",
      "internal-*": "deny"
    }
  }
}
```

---

### Pattern Matching Rules

| Pattern | Behavior |
|---------|----------|
| `*` | Matches zero or more characters |
| `?` | Matches exactly one character |
| `~` | Expands to the user's home directory |
| `$HOME` | Expands to the user's home directory |

Patterns in `bash` match against the full command string including arguments.

---

### Default Permissions

| Tool / Category | Default |
|-----------------|---------|
| read | allow |
| edit / write / patch | allow |
| glob | allow |
| grep | allow |
| list | allow |
| bash | allow |
| lsp | allow |
| todoread | allow |
| todowrite | allow |
| webfetch | allow |
| websearch | allow (requires EXA env var) |
| skill | allow |
| external_directory | ask |
| doom_loop | ask |
| .env files | deny (blocked by default, regardless of `edit` permission) |

---

## Enabling and Disabling Tools

Tools can be disabled entirely in `opencode.json` under the `"tools"` key. A disabled tool is never invoked, even when the agent selects it.

#### Global disable

```json
{
  "tools": {
    "write": false,
    "bash": false
  }
}
```

#### Per-agent disable

```json
{
  "agent": {
    "plan": {
      "tools": {
        "bash": false,
        "edit": false,
        "write": false
      }
    }
  }
}
```

Per-agent tool config takes precedence over global tool config. A tool disabled globally cannot be re-enabled at the agent level.

---

## Custom Tools

Custom tools extend OpenCode with project-specific or user-specific capabilities. They are TypeScript or JavaScript files that the runtime loads alongside built-ins.

### File Location and Naming

| Scope | Directory |
|-------|-----------|
| Project-level | `.opencode/tools/` |
| Global (user-level) | `~/.config/opencode/tools/` |

The filename (without extension) becomes the tool name. `database.ts` registers as the `database` tool. `email_sender.ts` registers as `email_sender`.

### Tool API

Custom tools use the `tool()` helper from `@opencode-ai/plugin`. The schema is Zod-based — define arguments with Zod types and the runtime validates inputs before calling `execute`.

The SDK signature is:

```typescript
function tool<Args extends z.ZodRawShape>(input: {
  description: string;
  args: Args;
  execute(args: z.infer<z.ZodObject<Args>>, context: ToolContext): Promise<string>;
}): ToolDefinition;
```

> **Note:** `tool.schema` is a re-export of `z` from Zod — so `tool.schema.string()` is equivalent to `z.string()`. You can use either.

```typescript
import { tool } from "@opencode-ai/plugin";
import { z } from "zod";

export default tool({
  description: "Fetches a record from the project database by ID",
  args: {
    table: z.string().describe("Table name to query"),
    id:    z.string().describe("Record ID"),
  },
  execute: async (args, context) => {
    const { table, id } = args;
    const result = await db.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    return JSON.stringify(result);
  },
});
```

#### `context` fields

| Field | Type | Description |
|-------|------|-------------|
| `sessionID` | string | Current session identifier |
| `messageID` | string | Current message identifier |
| `agent` | string | Name of the invoking agent |
| `directory` | string | Project root directory — prefer over process.cwd() |
| `worktree` | string | Active git worktree path — useful for stable relative paths |
| `abort` | AbortSignal | Signal for tool cancellation |
| `metadata(input)` | function | Set tool title and metadata for display |
| `ask(input)` | function | Request user permission |

#### Return value

`execute` must return a string. Serialize objects with `JSON.stringify()` before returning.

---

### Multiple Tools Per File

Export named functions to register multiple tools from a single file. The export name becomes the tool name.

```typescript
// .opencode/tools/math.ts
import { tool } from "@opencode-ai/plugin";
import { z } from "zod";

export const math_add = tool({
  description: "Adds two numbers",
  args: { a: z.number(), b: z.number() },
  execute: async ({ a, b }) => String(a + b),
});

export const math_multiply = tool({
  description: "Multiplies two numbers",
  args: { a: z.number(), b: z.number() },
  execute: async ({ a, b }) => String(a * b),
});
```

This registers `math_add` and `math_multiply` as separate tools.

---

### Cross-Language Tools

Custom tools can shell out to scripts in any language. Define the logic in Python, Ruby, Go, or any other runtime, then wrap it in a TypeScript tool that executes it as a subprocess.

**Python logic** (`.opencode/tools/add.py`):

```python
import sys, json

data = json.loads(sys.argv[1])
result = data["a"] + data["b"]
print(result)
```

**TypeScript wrapper** (`.opencode/tools/py_add.ts`):

```typescript
import { tool } from "@opencode-ai/plugin";
import { z } from "zod";
import { execSync } from "child_process";
import path from "path";

export default tool({
  description: "Adds two numbers using Python",
  args: { a: z.number(), b: z.number() },
  execute: async ({ a, b }, context) => {
    const script = path.join(context.directory, ".opencode/tools/add.py");
    const payload = JSON.stringify({ a, b });
    const result = execSync(`python3 ${script} '${payload}'`).toString().trim();
    return result;
  },
});
```

The subprocess runs in the project environment. Use `context.directory` to build absolute paths to companion scripts.

---

### Tool Precedence

When a custom tool and a built-in tool share the same name, the custom tool wins.

```
Custom tools  >  Built-in tools   (when names conflict)
Agent tools   >  Global tools     (when scopes conflict)
```

Use this to override built-in behavior for specific projects — for example, a custom `bash` tool that adds logging before delegation, or a custom `read` tool that decrypts files transparently.

---

## Agent-Level Overrides

Agents inherit the global permission config and then apply their own overrides on top. This allows a read-only planning agent to coexist with a write-capable build agent in the same project.

```json
{
  "permission": {
    "*": "allow",
    "bash": "ask"
  },
  "agent": {
    "build": {
      "permission": {
        "bash": {
          "*": "ask",
          "git commit *": "deny"
        }
      }
    },
    "plan": {
      "tools": {
        "bash": false,
        "edit": false,
        "write": false
      }
    },
    "deploy": {
      "permission": {
        "bash": {
          "*": "deny",
          "npm run build": "allow",
          "vercel deploy *": "ask"
        }
      }
    }
  }
}
```

Resolution order for any tool call inside an agent:
1. Agent-level permission config (if defined for this tool)
2. Global permission config (fallback)
3. Built-in default (final fallback)

---

## Troubleshooting

### Tool blocked unexpectedly

**Symptom:** An `allow`-configured tool is blocked.

Check for these overrides in order:
1. `doom_loop` — if the same call has been made 3+ times, the doom_loop guard fires regardless of tool permission.
2. `external_directory` — if the path is outside the project root, `external_directory` permission applies, not `read`/`edit`.
3. `.env` files — writes to `.env*` files are blocked by default and require an explicit `allow` override.
4. Agent-level config — the invoking agent may have a stricter config than global.

---

### `websearch` unavailable

**Symptom:** `websearch` tool is missing or returns an error.

`websearch` requires `OPENCODE_ENABLE_EXA=1` in the environment. Set it in `.env` or the shell before starting OpenCode. Without the variable, the tool is not registered regardless of permission config.

---

### Glob/grep not finding expected files

**Symptom:** Files exist on disk but `glob` or `grep` returns no matches.

Both tools are backed by ripgrep, which respects `.gitignore` by default. Files listed in `.gitignore` are excluded from results.

To include ignored paths, create a `.ignore` file in the project root or the target directory with explicit allow rules:

```
# .ignore — allow files that .gitignore would exclude
!dist/
!node_modules/some-package/
```

---

### Custom tool not loading

**Symptom:** A custom tool file exists but the tool is not available.

Check:
1. The file is in `.opencode/tools/` (project) or `~/.config/opencode/tools/` (global).
2. The file has a `.ts` or `.js` extension.
3. The default export or named exports use the `tool()` helper from `@opencode-ai/plugin`.
4. TypeScript syntax is valid — a compile error silently prevents the tool from loading.
5. The tool name does not conflict with a permission `deny` rule.

---

### Permission patterns not matching as expected

**Symptom:** A bash command matches the wrong pattern or hits the catch-all.

Pattern matching is first-match-wins within the object. Verify ordering — specific patterns must appear before general ones.

```json
{
  "bash": {
    "git push --force *": "deny",
    "git push *": "ask",
    "git *": "allow",
    "*": "ask"
  }
}
```

`git push --force origin main` matches `git push --force *` and is denied. If that line appeared after `git push *`, it would match `git push *` first and only ask, not deny.

Use `?` for single-character wildcards when a command has a predictable variable segment of fixed length. Use `*` for variable-length segments.

---

### `external_directory` prompts on every call

**Symptom:** Every tool call outside the project root triggers an `ask` prompt.

Set `external_directory` to `allow` in global config if the agent routinely needs access to paths outside the project:

```json
{
  "permission": {
    "external_directory": "allow"
  }
}
```

Scope this carefully — `allow` on `external_directory` grants the agent read/write access to any path on the filesystem, subject only to individual tool permissions.
