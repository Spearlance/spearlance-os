# Neon Serverless Postgres Skill — Design

**Goal:** Create a reference skill for Neon serverless Postgres covering the full platform — API, serverless driver, branching, autoscaling, connection pooling, pricing — plus MCP configuration instructions.

**Approach:** Reference Skill + MCP Config Guide (Approach A). No custom agent — Neon's official MCP server handles live database operations, the skill handles knowledge.

**Pattern:** Follows Stripe API skill structure (SKILL.md + reference.md).

---

## Architecture

### Files

| File | Purpose | Size Target |
|------|---------|-------------|
| `skills/neon/SKILL.md` | Quick reference index card | <100 lines |
| `skills/neon/reference.md` | Comprehensive reference | 400-800 lines |

### No Custom Agent

Neon provides an official MCP server at `https://mcp.neon.tech/mcp` that exposes tools for project/branch management, SQL execution, migrations, and more. This IS the agent — no wrapper needed.

### Bundle

New `database` bundle in `skills.json`:

```json
"database": {
  "name": "Database",
  "description": "Neon serverless Postgres — branching, autoscaling, serverless driver",
  "default": false,
  "skills": ["neon"]
}
```

---

## SKILL.md Structure

```
---
name: neon
description: Use when working with Neon serverless Postgres — project setup, branching,
  connection pooling, autoscaling, serverless driver, or MCP configuration
---

# Neon

## Overview
Serverless Postgres with instant branching, autoscaling, and scale-to-zero.

## Quick Reference
| Item | Value |
|------|-------|
| API Base | https://console.neon.tech/api/v2/ |
| Auth | Bearer token (API key from console) |
| MCP Server | https://mcp.neon.tech/mcp |
| Node.js Driver | @neondatabase/serverless |
| Toolkit (AI agents) | @neondatabase/toolkit |
| Rate Limits | 700 req/min, 40 req/sec burst |

## MCP Setup
- OAuth method (neonctl init)
- API key method (manual config)
- Claude Code settings.json snippet

## Authentication
Connection string format + serverless driver setup (3-5 lines).

## Common Operations
- Create project & branch
- Connect & query (HTTP vs WebSocket)
- Branch for dev/preview environments

## Branching Quick Reference
Copy-on-write clones, instant creation, point-in-time recovery.

## Pricing
| Tier | CU Rate | Storage | Key Limits |
|------|---------|---------|------------|
| Free | 100 CU-hrs/mo | 0.5 GB | 100 projects |
| Launch | $0.106/CU-hr | included | - |
| Scale | $0.222/CU-hr | included | - |

## Common Mistakes
| Mistake | Fix |
|---------|-----|
| Not using connection pooling | Use pooled connection string (port 5432 → pooler) |
| Forgetting scale-to-zero cold starts | Set suspend timeout or use HTTP driver |
| Orphaned branches | Clean up after PR merge |
| Using WebSocket in serverless | Use HTTP mode for one-shot queries |

## Full Reference
See reference.md for complete API docs, driver guide, branching workflows, and pricing details.
```

---

## reference.md Structure

### Table of Contents

1. API Reference
2. Serverless Driver
3. Branching
4. Connection Pooling
5. Autoscaling & Compute
6. Pricing Tiers
7. Error Codes
8. SDKs

### Section Details

#### 1. API Reference
- Base URL, auth, rate limits
- Projects: CRUD, settings, permissions
- Branches: create, delete, reset, point-in-time
- Computes: start, suspend, resize
- Roles & Databases
- Operations: async status tracking
- Request/response examples for key endpoints

#### 2. Serverless Driver
- `@neondatabase/serverless` package
- HTTP mode: `neon()` function for one-shot queries (edge/serverless)
- WebSocket mode: `Pool`/`Client` for interactive sessions, transactions
- Connection string formats (pooled vs direct)
- `@neondatabase/toolkit`: combined API client + driver (designed for AI agents)
- Code examples: basic query, transaction, parameterized queries

#### 3. Branching
- Copy-on-write architecture (WAL-based)
- Create from parent branch or point-in-time
- Dev/preview environment workflows
- Branch compute lifecycle (auto-suspend)
- Reset branch to parent
- Branch naming conventions

#### 4. Connection Pooling
- Built-in PgBouncer (up to 10,000 concurrent connections)
- Pooled vs direct connection strings
- When to use pooled (serverless/edge) vs direct (long-running, migrations)
- Connection string format differences

#### 5. Autoscaling & Compute
- CU definition: 1 CU = 1 vCPU, 4 GB RAM
- Autoscaling range: 0.25-16 CU
- Scale-to-zero: suspend after inactivity timeout
- Cold start times and mitigation
- Configuring min/max CU and suspend timeout

#### 6. Pricing Tiers
- Free tier: 100 CU-hours/project/month, 0.5 GB storage, 100 projects, 10 branches
- Launch: $0.106/CU-hour, larger storage allowance
- Scale: $0.222/CU-hour, IP Allow, more computes
- Storage pricing per tier
- Data transfer costs
- Billing: CU-hours consumed, prorated

#### 7. Error Codes
- Common API errors with HTTP status codes
- Connection errors (cold start timeout, pool exhaustion)
- Branch operation errors
- Actionable fixes for each

#### 8. SDKs
- TypeScript: `@neondatabase/api-client` (management API wrapper)
- Python: `neon-api` (management API)
- Go: community-maintained
- All SDKs: auth setup, basic usage example

---

## What We're NOT Building

- **No custom agent** — Neon MCP server handles live operations
- **No CLI wrapper** — neonctl exists, MCP wraps it
- **No ORM guidance** — project-specific, out of scope
- **No migration tool** — Neon MCP has migration tools built in

---

## Research Requirements

Per the writing-reference-skills workflow, web research is mandatory before writing. Verify:

1. Current API version and any recent changes
2. Pricing tier names and exact rates (as of Feb 2026)
3. Rate limit values
4. MCP server setup instructions (OAuth vs API key)
5. Serverless driver API surface
6. Any deprecations or breaking changes since late 2024

---

## Testing Plan

### RED Phase (Baseline)
Ask subagent Neon-specific questions WITHOUT the skill:
1. How to set up Neon MCP in Claude Code?
2. HTTP vs WebSocket mode in the serverless driver — when to use each?
3. Current pricing tiers and free tier limits?
4. How to create a preview branch for a PR?

### GREEN Phase (With Skill)
Same questions WITH the skill. Skill should correct wrong facts, fill gaps, provide working examples.

### Success Criteria
Skill adds correct, current, actionable information on at least 3 of 4 questions that the agent couldn't produce from training data alone.
