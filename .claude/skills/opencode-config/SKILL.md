---
model: claude-sonnet-4-6
name: opencode-config
description: Use when configuring OpenCode — opencode.json schema, config sources/precedence, providers, models, themes, keybinds, formatters, LSP servers, compaction, or any opencode.json settings.
---

# OpenCode Configuration

## Overview
OpenCode uses JSON/JSONC config files merged from multiple sources. Schema validation at `https://opencode.ai/config.json`. Current version: v1.2.10 (Feb 2026).

## Quick Reference

| Item | Value |
|------|-------|
| Config format | `opencode.json` or `opencode.jsonc` |
| Schema URL | `https://opencode.ai/config.json` |
| Global config | `~/.config/opencode/opencode.json` |
| Project config | `opencode.json` (project root) |
| Env override | `OPENCODE_CONFIG` (path) or `OPENCODE_CONFIG_CONTENT` (inline) |

## Config Precedence (later wins)

1. Remote config (`.well-known/opencode`)
2. Global config (`~/.config/opencode/opencode.json`)
3. Custom config (`OPENCODE_CONFIG` env var)
4. Project config (`opencode.json` in project root)
5. `.opencode` directories
6. Inline config (`OPENCODE_CONFIG_CONTENT` env var)

Files are **merged**, not replaced. Later sources override conflicting keys only.

## Model Configuration

Format: `provider_id/model_id`

```json
{
  "model": "anthropic/claude-sonnet-4-6",
  "small_model": "anthropic/claude-haiku-4-5"
}
```

**Recommended models (Feb 2026):** GPT 5.2, GPT 5.1 Codex, Claude Opus 4.5, Claude Sonnet 4.5, Gemini 3 Pro, Minimax M2.1.

## Provider Settings

```json
{
  "provider": {
    "anthropic": {
      "timeout": 300000,
      "apiKey": "{env:ANTHROPIC_API_KEY}"
    }
  },
  "disabled_providers": ["openai"],
  "enabled_providers": ["anthropic", "google"]
}
```

## Variable Substitution

- Environment: `"{env:VARIABLE_NAME}"`
- File contents: `"{file:path/to/file}"`

## Key Config Sections

| Section | Controls |
|---------|----------|
| `model` / `small_model` | Default models |
| `provider` | Provider-specific settings (timeout, apiKey) |
| `agent` | Custom agent definitions |
| `tools` | Tool enable/disable |
| `permission` | Tool approval rules |
| `mcp` | MCP server definitions |
| `formatter` | Code formatters |
| `lsp` | LSP server config |
| `theme` | Visual theme |
| `keybinds` | Keyboard shortcuts |
| `instructions` | Rule file paths/globs |
| `compaction` | Context management (auto, prune, threshold, maxContext) |
| `share` | Sharing mode (manual/auto/disabled) |
| `autoupdate` | Update behavior (true/false/notify) |
| `watcher` | File watcher ignore patterns |
| `plugin` | NPM plugins array |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `provider/model` without `/connect` first | Run `/connect` to set up credentials |
| Config not taking effect | Check precedence — project overrides global |
| Provider blocked | Check `disabled_providers` and `enabled_providers` |
| Formatter not running | Verify formatter binary in PATH and extensions match |

## Full Reference

See `reference.md` in this skill directory for complete config schema, all provider options, theme customization, keybind reference, LSP server list (30+), formatter list (28+), compaction tuning, and Bedrock/Azure-specific settings.
