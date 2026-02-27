---
model: claude-sonnet-4-6
name: opencode-tools
description: Use when working with OpenCode tools — built-in tools (bash, edit, read, grep, glob, lsp, etc.), custom tool creation, permission system (allow/deny/ask), or controlling what the LLM can do.
---

# OpenCode Tools & Permissions

## Overview
Tools let the LLM perform actions in your codebase. OpenCode ships with 16 built-in tools, supports custom tools via TypeScript/JavaScript, and has a granular permission system. Current version: v1.2.10 (Feb 2026).

## Built-in Tools

| Tool | Permission Key | Function |
|------|---------------|----------|
| `bash` | `bash` | Execute shell commands |
| `edit` | `edit` | Modify files (exact string replacement) |
| `write` | `edit` | Create/overwrite files |
| `read` | `read` | Read file contents and line ranges |
| `grep` | `grep` | Regex search across codebase (ripgrep) |
| `glob` | `glob` | Find files by pattern |
| `list` | `list` | List directory contents |
| `lsp` | `lsp` | Code intelligence (definitions, references, hover) |
| `patch` | `edit` | Apply patch files |
| `skill` | `skill` | Load SKILL.md content |
| `todowrite` | `todowrite` | Create/update task lists |
| `todoread` | `todoread` | Read current todo state |
| `webfetch` | `webfetch` | Fetch and read web pages |
| `websearch` | `websearch` | Web search via Exa AI (`OPENCODE_ENABLE_EXA=1`) |
| `question` | `question` | Ask user for input |

## Permission System

Three levels: `"allow"` (auto-execute), `"ask"` (prompt user), `"deny"` (blocked).

```json
{
  "permission": {
    "*": "ask",
    "read": "allow",
    "edit": "allow",
    "bash": {
      "*": "ask",
      "git *": "allow",
      "npm test*": "allow",
      "rm *": "deny"
    }
  }
}
```

**Wildcards:** `*` (zero+ chars), `?` (exactly one char). `~` and `$HOME` expand.

## Custom Tools

Create TypeScript files in `.opencode/tools/` (project) or `~/.config/opencode/tools/` (global):

```typescript
import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Query the project database",
  args: {
    query: tool.schema.string().describe("SQL query"),
  },
  async execute(args, ctx) {
    // ctx has: agent, sessionID, messageID, directory, worktree
    return `Result: ${args.query}`
  },
})
```

Filename = tool name. Custom tools override built-in tools with same name.

## Defaults

| Permission | Default |
|-----------|---------|
| Most tools | `"allow"` |
| `doom_loop` | `"ask"` (3+ identical calls) |
| `external_directory` | `"ask"` |
| `.env` files | blocked |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Web search not working | Set `OPENCODE_ENABLE_EXA=1` env var |
| Custom tool not loading | Check file is in `.opencode/tools/` with `.ts`/`.js` extension |
| Permission too broad | Use object syntax with patterns for granular bash control |
| ripgrep ignoring files | Use `.ignore` file to explicitly allow paths |

## Full Reference

See `reference.md` in this skill directory for complete permission categories, all bash pattern examples, MCP tool permissions, agent-level overrides, custom tool context API, multi-export tools, and cross-language tool wrappers.
