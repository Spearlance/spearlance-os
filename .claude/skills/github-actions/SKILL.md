---
model: claude-sonnet-4-6
name: github-actions
description: Use when setting up CI/CD with GitHub Actions — workflows, jobs, actions, matrix builds, or deployment automation. Also use when debugging workflow failures, optimizing build times, or implementing release automation.
---

# GitHub Actions

## Overview

GitHub Actions automates CI/CD directly in your repo. Workflows are YAML files in `.github/workflows/`. Triggers, jobs, steps, and actions compose the execution model.

## Workflow File Structure

```yaml
name: CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
```

## Triggers

| Trigger | When | Key Options |
|---------|------|-------------|
| `push` | Any push | `branches`, `paths`, `tags` |
| `pull_request` | PR opened/updated | `branches`, `types` |
| `schedule` | Cron | `cron: '0 2 * * 1'` |
| `workflow_dispatch` | Manual run | `inputs` |
| `workflow_call` | Called by another workflow | `inputs`, `secrets` |
| `release` | Release published | `types: [published]` |

## Common Actions

| Action | Version | Purpose |
|--------|---------|---------|
| `actions/checkout` | v4 | Clone repo |
| `actions/setup-node` | v4 | Install Node.js |
| `actions/cache` | v4 | Cache dependencies |
| `actions/upload-artifact` | v4 | Save build outputs |
| `actions/download-artifact` | v4 | Retrieve build outputs |

## pnpm Cache Pattern

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: pnpm          # built-in pnpm support

# Or manual:
- uses: actions/cache@v4
  with:
    path: ~/.pnpm-store
    key: pnpm-${{ hashFiles('pnpm-lock.yaml') }}
    restore-keys: pnpm-
```

## Runners (Feb 2026)

| Label | OS | Arch |
|-------|----|------|
| `ubuntu-latest` | Ubuntu 24.04 | x64 |
| `ubuntu-22.04` | Ubuntu 22.04 | x64 |
| `ubuntu-24.04-arm` | Ubuntu 24.04 | arm64 (public preview) |
| `windows-latest` | Windows Server 2022 | x64 |
| `macos-latest` | macOS 15 | arm64 |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Forgetting `--frozen-lockfile` / `--ci` | Prevents CI installing wrong versions |
| Not caching dependencies | Adds 30–90s per run; always cache |
| Broad `on: push` with no branch filter | Runs on every branch; add `branches: [main]` |
| Secrets in `run:` output | Use `core.setSecret()` or mask in logs |
| No concurrency group | Queues pile up on PRs; add `concurrency:` |

## Full Reference

See `reference.md` for complete syntax, matrix builds, reusable workflows, secrets, deployment patterns, and billing.
