# OpenCode Configuration Reference

**Last updated:** February 2026
**Schema:** https://opencode.ai/config.json
**Format:** JSON / JSONC (comments supported)

---

## Table of Contents

1. [Config Format & Sources](#config-format--sources)
2. [Variable Substitution](#variable-substitution)
3. [Provider Configuration](#provider-configuration)
4. [Model Configuration](#model-configuration)
5. [Model Variants](#model-variants)
6. [TUI Settings](#tui-settings)
7. [Server Configuration](#server-configuration)
8. [Themes](#themes)
9. [Keybinds](#keybinds)
10. [Formatters](#formatters)
11. [LSP Servers](#lsp-servers)
12. [Compaction](#compaction)
13. [Instructions & Agents](#instructions--agents)
14. [Sharing & Updates](#sharing--updates)
15. [Plugins & Experimental](#plugins--experimental)
16. [Directory Structure](#directory-structure)
17. [Environment Variables](#environment-variables)
18. [Common Errors](#common-errors)

---

## Config Format & Sources

OpenCode configuration is JSON or JSONC (JSON with comments). The schema is published at:

```
https://opencode.ai/config.json
```

Add the `$schema` field to any config file for editor autocompletion:

```json
{
  "$schema": "https://opencode.ai/config.json"
}
```

### Merge Order

Configuration is loaded and merged from six sources. Later sources win on conflict:

| Priority | Source | Location |
|----------|--------|----------|
| 1 (lowest) | Remote | `.well-known/opencode` on a remote host |
| 2 | Global | `~/.config/opencode/opencode.json` |
| 3 | Custom | File path in `OPENCODE_CONFIG` env var |
| 4 | Project | `opencode.json` at project root |
| 5 | Project dirs | `.opencode/` directories in project tree |
| 6 (highest) | Inline | JSON content in `OPENCODE_CONFIG_CONTENT` env var |

Inline config via `OPENCODE_CONFIG_CONTENT` always wins — useful for CI, containers, and ephemeral environments.

---

## Variable Substitution

OpenCode supports two substitution tokens usable in some config string values (e.g., MCP headers). They do NOT work for provider API keys — use the `env` field on the provider config instead.

### Environment Variable Substitution

```
{env:VAR_NAME}
```

Reads `VAR_NAME` from the process environment at startup.

```json
{
  "mcp": {
    "my-server": {
      "headers": {
        "Authorization": "Bearer {env:MY_API_TOKEN}"
      }
    }
  }
}
```

> **Note:** For provider API keys, use the `env` field on the provider config instead of `{env:}` substitution.

### File Content Substitution

```
{file:path/to/file}
```

Reads the file contents at the given path and inlines the value.

```json
{
  "mcp": {
    "my-server": {
      "headers": {
        "Authorization": "Bearer {file:/run/secrets/my_token}"
      }
    }
  }
}
```

Paths are resolved relative to the config file that contains the substitution.

---

## Provider Configuration

OpenCode supports 75+ providers via the AI SDK and Models.dev.

### Model ID Format

All model references use the format:

```
provider_id/model_id
```

Examples:

```
anthropic/claude-sonnet-4-6
openai/gpt-4o
google/gemini-2.0-flash
bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0
```

### Provider Block Structure

```json
{
  "provider": {
    "anthropic": {
      "env": ["ANTHROPIC_API_KEY"],
      "options": {
        "timeout": 300000
      }
    },
    "openai": {
      "env": ["OPENAI_API_KEY"],
      "options": {
        "timeout": 120000
      }
    }
  }
}
```

### Common Provider Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `api` | string | — | API endpoint URL |
| `name` | string | — | Display name for the provider |
| `env` | string[] | — | Env var names to read for the API key |
| `id` | string | — | Provider ID override |
| `npm` | string | — | NPM package override for the provider |
| `models` | object | — | Per-model configuration |
| `whitelist` | string[] | — | Allow only these model IDs |
| `blacklist` | string[] | — | Exclude these model IDs |
| `options` | object | — | Provider options: `apiKey`, `baseURL`, `timeout`, `setCacheKey` |

### Amazon Bedrock

Bedrock requires extra fields for AWS auth:

```json
{
  "provider": {
    "bedrock": {
      "region": "us-east-1",
      "profile": "my-aws-profile",
      "endpoint": "https://bedrock-runtime.us-east-1.amazonaws.com"
    }
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `region` | `us-east-1` | AWS region for Bedrock calls |
| `profile` | — | AWS credential profile name |
| `endpoint` | — | Custom Bedrock endpoint URL |

### Azure OpenAI

```json
{
  "provider": {
    "azure": {
      "apiKey": "{env:AZURE_OPENAI_KEY}",
      "endpoint": "https://my-instance.openai.azure.com",
      "apiVersion": "2024-12-01-preview"
    }
  }
}
```

### Provider Allow / Block Lists

Control which providers are available:

```json
{
  "disabled_providers": ["cohere", "mistral"],
  "enabled_providers": ["anthropic", "openai", "google"]
}
```

When `enabled_providers` is set, it acts as an allowlist — only listed providers are accessible, regardless of `disabled_providers`.

### Connecting Providers via TUI

Run `/connect` inside the TUI to authenticate and configure providers interactively. This writes provider credentials to the global config at `~/.config/opencode/opencode.json`.

---

## Model Configuration

### Primary and Small Models

```json
{
  "model": "anthropic/claude-opus-4-6",
  "small_model": "anthropic/claude-haiku-4-5"
}
```

| Field | Description |
|-------|-------------|
| `model` | Primary model for all main tasks |
| `small_model` | Lightweight model for background and utility tasks |

### Model Loading Priority

When determining which model to use, OpenCode checks in this order:

1. CLI `--model` flag
2. `model` field in config
3. Last used model (persisted across sessions)
4. First model by provider priority

### Model-Specific Options

Set model options under the provider's models block:

```json
{
  "provider": {
    "anthropic": {
      "models": {
        "claude-opus-4-6": {
          "options": {
            "thinking": {
              "type": "enabled",
              "budgetTokens": 10000
            }
          }
        }
      }
    },
    "openai": {
      "models": {
        "o3": {
          "options": {
            "reasoningEffort": "high"
          }
        }
      }
    },
    "google": {
      "models": {
        "gemini-2.0-flash-thinking-exp": {
          "options": {
            "thinkingConfig": {
              "thinkingBudget": 8000
            }
          }
        }
      }
    }
  }
}
```

### Reasoning Options by Provider

**Anthropic** — `thinking.budgetTokens` (integer, token budget for extended thinking)

**OpenAI** — `reasoningEffort` with levels:

| Value | Description |
|-------|-------------|
| `none` | No reasoning tokens |
| `minimal` | Very low reasoning |
| `low` | Low reasoning |
| `medium` | Medium reasoning |
| `high` | High reasoning |
| `xhigh` | Maximum reasoning |

**Google** — `thinkingConfig.thinkingBudget` (integer) with levels `low` and `high` as built-in variants.

### Recommended Models (February 2026)

| Model | Provider ID |
|-------|------------|
| Claude Opus 4.6 | `anthropic/claude-opus-4-6` |
| Claude Sonnet 4.6 | `anthropic/claude-sonnet-4-6` |
| Claude Haiku 4.5 | `anthropic/claude-haiku-4-5` |
| GPT-4o | `openai/gpt-4o` |
| Gemini 2.0 Flash | `google/gemini-2.0-flash` |

---

## Model Variants

Variants let you cycle through reasoning configurations with a single keybind rather than switching models.

### Built-in Variants

**Anthropic:**

| Variant | Behavior |
|---------|----------|
| `high` | Extended thinking enabled with high budget |
| `max` | Extended thinking at maximum budget |

**OpenAI:**

| Variant | `reasoningEffort` |
|---------|------------------|
| (default) | `none` |
| `minimal` | `minimal` |
| `low` | `low` |
| `medium` | `medium` |
| `high` | `high` |
| `xhigh` | `xhigh` |

**Google:**

| Variant | Behavior |
|---------|----------|
| `low` | Low thinking budget |
| `high` | High thinking budget |

### Custom Variants

Define custom variants for any model in the provider block:

```json
{
  "provider": {
    "anthropic": {
      "models": {
        "claude-opus-4-6": {
          "variants": {
            "budget": {
              "options": {
                "thinking": {
                  "type": "enabled",
                  "budgetTokens": 3000
                }
              }
            },
            "maximum": {
              "options": {
                "thinking": {
                  "type": "enabled",
                  "budgetTokens": 32000
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### Cycling Variants

Bind `variant_cycle` to a key to cycle through variants without leaving the TUI:

```json
{
  "keybinds": {
    "variant_cycle": "ctrl+v"
  }
}
```

---

## TUI Settings

### Scroll Speed

```json
{
  "tui": {
    "scroll_speed": 3
  }
}
```

| Field | Type | Default | Minimum | Description |
|-------|------|---------|---------|-------------|
| `scroll_speed` | number | `3` | `1` | Scroll lines per tick, as a multiplier |

### Scroll Acceleration

```json
{
  "tui": {
    "scroll_acceleration": {
      "enabled": true
    }
  }
}
```

When enabled, scroll acceleration mimics macOS-style momentum scrolling — speed increases the longer you scroll and decelerates when you stop.

### Diff Style

```json
{
  "tui": {
    "diff_style": "auto"
  }
}
```

| Value | Description |
|-------|-------------|
| `"auto"` | OpenCode picks inline or stacked based on terminal width |
| `"stacked"` | Always show diff as two stacked panes |

---

## Server Configuration

OpenCode runs a local server for its web UI and API. Configure it under the `server` key.

```json
{
  "server": {
    "port": 4096,
    "hostname": "127.0.0.1",
    "mdns": true,
    "mdnsDomain": "opencode.local",
    "cors": [
      "http://localhost:3000",
      "https://my-app.example.com"
    ]
  }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `port` | number | auto | Port to listen on |
| `hostname` | string | `0.0.0.0` | Bind address; defaults to all interfaces with mDNS discovery |
| `mdns` | boolean | `true` | Enable mDNS for local network discovery |
| `mdnsDomain` | string | — | Custom mDNS domain name |
| `cors` | string[] | — | Allowed CORS origins for web UI requests |

When `hostname` is `0.0.0.0` and `mdns` is `true`, other devices on the local network can discover and connect to this OpenCode instance via mDNS.

---

## Themes

### Built-in Themes

OpenCode ships with multiple built-in themes. List available themes with `/theme` in the TUI.

### System Theme

The `system` theme reads terminal ANSI colors 0–15 (standard 16-color palette) and adapts to whatever colors your terminal emulator is configured with. This is the most portable option and matches iTerm2, Alacritty, Kitty, and similar terminal themes automatically.

### Custom Themes

Place custom theme files in any of these locations:

- Config directories in the merge order (global → project)
- Project root

Themes in later directories override themes with the same name from earlier directories.

```json
{
  "theme": "my-custom-theme"
}
```

A custom theme file is a JSON file named `<theme-name>.json` placed in a `themes/` subdirectory of a config dir or project.

---

## Keybinds

Customize keybinds under the `keybinds` key. Set any keybind to `"none"` to disable it.

```json
{
  "keybinds": {
    "agent_list": "ctrl+a",
    "variant_cycle": "ctrl+shift+v",
    "session_new": "ctrl+n",
    "session_list": "ctrl+l"
  }
}
```

### Disabling a Keybind

```json
{
  "keybinds": {
    "session_new": "none"
  }
}
```

### Key Actions Reference

| Action | Description |
|--------|-------------|
| `agent_list` | Open agent selector |
| `agent_cycle` | Cycle to next primary agent (default: Tab) |
| `variant_cycle` | Cycle through model variants |
| `session_new` | Open a new session |
| `session_list` | Open the session list |
| `command_list` | Open command palette |
| `model_list` | Open model selector |

---

## Formatters

OpenCode runs formatters automatically after edit and write operations. 28+ formatters are built in.

### Built-in Formatters by Language

| Language / Ecosystem | Formatter(s) |
|---------------------|-------------|
| JavaScript / TypeScript | `prettier`, `biome`, `oxfmt` (experimental) |
| Go | `gofmt` |
| Rust | `rustfmt`, `cargofmt` |
| Python | `ruff`, `uv` |
| Ruby | `rubocop`, `standardrb` |
| PHP | `pint` |
| Dart | `dart` |

OpenCode detects which formatters are installed and selects based on project configuration files (e.g., `biome.json` activates Biome over Prettier).

### Disabling Formatters

**Disable all formatting globally:**

```json
{
  "formatter": false
}
```

**Disable a specific formatter:**

```json
{
  "formatter": {
    "prettier": {
      "disabled": true
    }
  }
}
```

### Custom Formatters

Register a custom formatter with a command array, file extension list, and optional environment:

```json
{
  "formatter": {
    "my-formatter": {
      "command": ["my-fmt", "--write", "$FILE"],
      "extensions": [".myfmt", ".mf"],
      "environment": {
        "MY_FMT_CONFIG": "/path/to/config"
      }
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `command` | string[] | Command and args; `$FILE` is replaced with the file path |
| `extensions` | string[] | File extensions this formatter handles |
| `environment` | object | Extra env vars for the formatter process |
| `disabled` | boolean | Set `true` to disable without removing the config |

---

## LSP Servers

OpenCode integrates with 30+ LSP servers and feeds diagnostics to the LLM automatically.

### Built-in LSP Servers by Language

| Language | LSP Server(s) |
|----------|--------------|
| JavaScript / TypeScript | `typescript`, `eslint`, `deno` |
| Python | `pyright` |
| Rust | `rust-analyzer` |
| Go | `gopls` |
| Java | `jdtls` |
| PHP | `intelephense` |
| C / C++ | `clangd` |
| C# | `omnisharp` |
| Ruby | `ruby-lsp` |
| Kotlin | `kotlin-language-server` |
| Lua | `lua-language-server` |
| Gleam | `gleam` |
| Elixir | `elixir-ls` |

### LSP Server Config Fields

```json
{
  "lsp": {
    "pyright": {
      "disabled": false,
      "command": ["pyright-langserver", "--stdio"],
      "extensions": [".py", ".pyi"],
      "env": {
        "PYTHONPATH": "./src"
      },
      "initialization": {
        "pythonPath": "/usr/local/bin/python3"
      }
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `disabled` | boolean | Disable this LSP without removing config |
| `command` | string[] | Override the default server command |
| `extensions` | string[] | File extensions that activate this LSP |
| `env` | object | Additional environment variables for the server process |
| `initialization` | object | LSP `initialize` params passed at startup |

### PHP: intelephense Premium License

```json
{
  "lsp": {
    "intelephense": {
      "initialization": {
        "licenceKey": "{env:INTELEPHENSE_LICENSE_KEY}"
      }
    }
  }
}
```

### Disabling Auto-Download

By default, OpenCode downloads LSP servers that aren't found locally. To disable this:

```bash
OPENCODE_DISABLE_LSP_DOWNLOAD=true opencode
```

Or set it permanently in your shell profile.

### Diagnostics and the LLM

All LSP diagnostics (errors, warnings, hints) are automatically included in context sent to the LLM. The model sees the same diagnostic output as the editor. No extra configuration is required.

---

## Compaction

Compaction manages context window overflow by summarizing conversation history when the token threshold is reached.

### Configuration

```json
{
  "compaction": {
    "auto": true,
    "prune": true,
    "reserved": 20000
  }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `auto` | boolean | `true` | Enable automatic compaction |
| `prune` | boolean | `true` | Prune compacted messages from history |
| `reserved` | integer | — | Token buffer to reserve |

### How Compaction Works

1. OpenCode tracks total tokens in the active context window.
2. The `reserved` token buffer is set aside for overflow detection headroom.
3. When remaining context falls within the reserved buffer, a compaction agent runs.
4. The compaction agent summarizes the conversation into a condensed context block.
5. If `prune` is `true`, original messages are replaced with the summary.

### Custom Compaction Hook (Experimental)

Intercept the compaction step to inject custom context:

```json
{
  "experimental": {
    "session": {
      "compacting": "my-custom-compaction-plugin"
    }
  }
}
```

---

## Instructions & Agents

### Instructions Files

Point OpenCode at rule files and system prompt documents using the `instructions` array. Supports file paths and glob patterns.

```json
{
  "instructions": [
    ".claude/rules/*.md",
    "AGENTS.md",
    "docs/coding-standards.md"
  ]
}
```

All matched files are concatenated and injected as system context before each session.

### Default Agent

```json
{
  "default_agent": "my-agent"
}
```

Sets which agent is active when OpenCode starts. If unset, the default built-in agent is used.

### Agents Directory

Place agent definition files in `agents/` (or `agent/` for backward compatibility) within a config dir or project root. Each agent file is a JSON or JSONC file describing the agent's model, instructions, tools, and behavior.

---

## Sharing & Updates

### Session Sharing

```json
{
  "share": "manual"
}
```

| Value | Behavior |
|-------|----------|
| `"manual"` | Share only when you explicitly invoke share |
| `"auto"` | Automatically share sessions |
| `"disabled"` | Sharing is fully disabled |

### Automatic Updates

```json
{
  "autoupdate": true
}
```

| Value | Behavior |
|-------|----------|
| `true` | Silently update OpenCode in the background |
| `false` | Never update automatically |
| `"notify"` | Check for updates and notify, but do not install |

---

## Plugins & Experimental

### NPM Plugins

```json
{
  "plugin": [
    "opencode-plugin-my-tools",
    "./local-plugin"
  ]
}
```

Plugins are NPM package names or local paths. They are loaded at startup and can extend tools, commands, and agent behaviors.

### Experimental Features

```json
{
  "experimental": {
    "session": {
      "compacting": "custom-compaction-agent"
    }
  }
}
```

All keys under `experimental` are unstable and subject to change between releases. Do not rely on them for production workflows without pinning the OpenCode version.

### Watcher Ignore Patterns

Exclude directories and files from the file watcher:

```json
{
  "watcher": {
    "ignore": [
      "node_modules",
      ".git",
      "dist",
      "*.log"
    ]
  }
}
```

---

## Directory Structure

OpenCode config directories use plural names. Singular variants are supported for backward compatibility but plural is canonical.

```
project/
├── opencode.json              # Project config
├── .opencode/                 # Project config dir
│   ├── agents/                # Agent definitions
│   ├── commands/              # Custom commands
│   ├── modes/                 # Session modes
│   ├── plugins/               # Local plugin files
│   ├── skills/                # Skill definitions
│   ├── tools/                 # Tool definitions
│   └── themes/                # Custom themes

~/.config/opencode/
├── opencode.json              # Global config
├── agents/
├── themes/
└── ...
```

### Directory Resolution Order

Config directories are scanned from global to project. For any given category (agents, themes, tools), the project-level directory wins over global when names conflict.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENCODE_CONFIG` | Path to a custom config file to load (merged at priority 3) |
| `OPENCODE_CONFIG_CONTENT` | Raw JSON config content (highest priority — overrides everything) |
| `OPENCODE_DISABLE_LSP_DOWNLOAD` | Set to `true` to prevent auto-download of LSP servers |

---

## Common Errors

### Provider Authentication Failure

```
Error: Provider 'anthropic' returned 401 Unauthorized
```

**Cause:** API key is missing, empty, or the env var listed in the provider's `env` field is not set.

**Fix:** Set the `env` field on the provider config with the env var name(s) to read for the API key, verify the env var is exported in your shell before launching OpenCode, or run `/connect` in the TUI to re-authenticate interactively.

```json
{
  "provider": {
    "anthropic": {
      "env": ["ANTHROPIC_API_KEY"]
    }
  }
}
```

---

### Timeout on Large Responses

```
Error: Request timed out after 300000ms
```

**Cause:** Default `timeout` of 300,000ms (5 minutes) exceeded on slow or large model responses.

**Fix:** Increase `timeout` under the provider's `options` block:

```json
{
  "provider": {
    "anthropic": {
      "options": {
        "timeout": 600000
      }
    }
  }
}
```

---

### Config File Not Found

```
Error: Config file not found at OPENCODE_CONFIG path
```

**Cause:** `OPENCODE_CONFIG` env var points to a file that does not exist.

**Fix:** Verify the path is absolute and the file exists. Relative paths in `OPENCODE_CONFIG` are not resolved relative to CWD.

---

### Compaction Loop

**Symptom:** Compaction triggers repeatedly without reducing context size.

**Cause:** The `reserved` buffer is too large relative to the model context window, or the compaction agent itself generates a large summary.

**Fix:** Reduce `reserved` to a smaller value, or reduce the scope of `instructions` files to lower baseline token count.

---

### LSP Server Not Starting

**Symptom:** No diagnostics, no completions.

**Cause:** LSP binary not found, or `OPENCODE_DISABLE_LSP_DOWNLOAD=true` prevents auto-install.

**Fix:**

1. Install the LSP manually (e.g., `npm install -g typescript-language-server`)
2. Override the `command` field to point to the binary:

```json
{
  "lsp": {
    "typescript": {
      "command": ["/usr/local/bin/typescript-language-server", "--stdio"]
    }
  }
}
```

---

### Formatter Not Running

**Symptom:** Files are not formatted after writes.

**Cause:** The formatter binary is not on `PATH`, or the file extension is not in the formatter's extension list.

**Fix:** Verify the binary is installed and accessible, or add the extension to a custom formatter config:

```json
{
  "formatter": {
    "prettier": {
      "extensions": [".js", ".ts", ".jsx", ".tsx", ".astro"]
    }
  }
}
```

---

### Merge Conflict Between Config Sources

**Symptom:** A setting in `opencode.json` appears overridden by an unknown source.

**Fix:** Check all six sources in merge order. Use `OPENCODE_CONFIG_CONTENT={}` temporarily to isolate the inline override source. Check `~/.config/opencode/opencode.json` for global overrides that may conflict with project settings.

---

### Schema Validation Error

```
Error: Config validation failed: 'provider.anthropic.options.timeout' must be a number
```

**Cause:** A config value has the wrong type (e.g., timeout as a string `"300000"` instead of number `300000`).

**Fix:** Match the types defined in the schema at `https://opencode.ai/config.json`. All timeout values are integers (milliseconds), not strings.
