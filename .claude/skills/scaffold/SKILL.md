---
model: claude-sonnet-4-6
name: scaffold
description: Use when creating a new project from stack.json technology decisions. Runs framework CLIs, installs dependencies, configures tooling, and produces a ready-to-develop project. Used by fresh-project orchestrator or standalone.
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Task, Skill
---

# Scaffold

## Overview

Create a real, configured project from technology decisions in `.claude/stack.json`. Not templates — actual CLI-scaffolded, fully-configured projects.

**Announce at start:**
```
┏━ ⚡ scaffold ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ creating project from stack decisions              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## When to Use

- fresh-project Phase 3 delegates here
- User has a stack.json and wants to scaffold
- User says "scaffold this project" with stack decisions already made

## Process

1. **Read stack.json** — get all technology decisions
2. **Load reference skills** — for each technology, load the armadillo skill to get current CLI commands and config
3. **Dispatch project-scaffolder agent** — it handles the actual creation
4. **Verify** — dev server starts, git initialized, all tools configured
5. **Update state** — fresh-project.json scaffold phase → complete

## Installation Order

Technologies install in dependency order:

| Order | Layer | Example |
|-------|-------|---------|
| 1 | Framework | `pnpm create next-app@latest` |
| 2 | Package manager | pnpm already set by CLI flag |
| 3 | Styling | Tailwind (via CLI), then shadcn init |
| 4 | Database + ORM | Supabase client + Drizzle schema |
| 5 | Auth | Clerk SDK + middleware |
| 6 | Testing | Vitest config + Playwright init |
| 7 | Linting | ESLint + Prettier config |
| 8 | Deploy | vercel.json or equivalent |
| 9 | Monitoring | Sentry SDK |
| 10 | Git | `git init && git add -A && git commit` |

## On-Demand Skill Generation

If stack.json references a technology without an existing reference skill:

1. Detect missing skill
2. Invoke `armadillo:writing-reference-skills` to generate it
3. Load the generated skill
4. Continue scaffold with correct, current CLI commands

## Rules

- Always use official CLIs for base scaffold — never manually create boilerplate
- One technology at a time — verify before moving to next
- If a CLI fails, read the error, fix, and retry before moving on
- Never install packages globally — npx/pnpm dlx only
- Verify the dev server starts before declaring scaffold complete
