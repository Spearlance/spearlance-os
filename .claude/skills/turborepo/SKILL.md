---
model: claude-sonnet-4-6
name: turborepo
description: Use when managing monorepos with Turborepo — workspace setup, pipeline configuration, caching, or multi-package builds. Also use when deciding on a monorepo strategy or optimizing build times in a multi-package project.
---

# Turborepo

## Overview
Turborepo (v2.7, December 2025) is a Rust-powered build system for JavaScript/TypeScript monorepos. Caches task outputs locally and remotely, runs tasks in parallel, and understands the dependency graph between packages.

## Quick Reference

| Item | Value |
|------|-------|
| **Current Version** | 2.7.x (December 2025) |
| **Create new repo** | `npx create-turbo@latest` |
| **Add to existing** | `npx turbo@latest init` |
| **Config file** | `turbo.json` or `turbo.jsonc` (since 2.3) |
| **Schema (local)** | `"$schema": "./node_modules/turbo/schema.json"` |
| **Cache dir** | `.turbo/cache/` |
| **Docs** | [turborepo.dev](https://turborepo.dev) |

## turbo.json Structure (v2.x)

```json
{
  "$schema": "./node_modules/turbo/schema.json",
  "ui": "tui",
  "globalEnv": ["NODE_ENV"],
  "globalDependencies": [".env"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"],
      "env": ["DATABASE_URL"]
    },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^lint"] },
    "test": { "outputs": ["coverage/**"], "inputs": ["src/**", "test/**"] }
  }
}
```

**v2.x key change:** `pipeline` is now `tasks`. `pipeline` was removed in 2.0.

## Key CLI Commands

| Command | Description |
|---------|-------------|
| `turbo run build` | Run build across all packages |
| `turbo run build --filter=@myorg/web` | Run for one package + its deps |
| `turbo run build --filter=...@myorg/ui` | Run for dependents of ui |
| `turbo run build --affected` | Only packages changed vs main |
| `turbo run build test lint` | Multiple tasks in one command |
| `turbo login && turbo link` | Authenticate + link Vercel Remote Cache |
| `turbo devtools` | Open visual package/task graph (2.7+) |
| `turbo prune --scope=@myorg/web` | Prune for Docker builds |

## Workspace Setup (pnpm)

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"    # Next.js, Astro, Express apps
  - "packages/*" # shared UI, utils, configs
```

Structure: `apps/` for deployable apps, `packages/` for shared libs. One level deep only — `apps/**` is not supported.

## Caching Behavior

Cache key = task + package + file inputs + env var values. Hit = replay stdout/stderr and restore `outputs` from `.turbo/cache/`.

- `outputs` — what to cache and restore on hit (required for caching to be useful)
- `inputs` — which files affect the cache key (defaults to all git-tracked files in package)
- `env` — env vars baked into the task hash
- `cache: false` — disable caching (use for `dev`, `start`)

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `pipeline` key | Renamed to `tasks` in v2.0 — update turbo.json |
| Missing `^build` in dependsOn | Without `^`, builds run in parallel regardless of dep graph |
| Empty or missing `outputs` | No outputs = no cache restoration; always declare what the task produces |
| `cache: true` on dev/watch tasks | Persistent tasks must set `cache: false, persistent: true` |
| Internal packages missing `exports` | Apps can't import them; add exports field to package.json |
| Env vars not in `env` or `globalEnv` | Silently missing in strict mode; causes incorrect cache hits |
| Nested package dirs (`apps/**`) | Turborepo requires one-level-deep patterns: `apps/*` only |

See reference.md for full API coverage.
