---
model: claude-sonnet-4-6
name: neon
description: Use when working with Neon serverless Postgres — project setup, branching,
  connection pooling, autoscaling, serverless driver, or MCP configuration
---

# Neon

## Overview

Neon is a serverless Postgres platform with copy-on-write branching and scale-to-zero compute. Instant database branches — full clones in milliseconds, zero impact on the parent.

## Quick Reference

| Item | Value |
|------|-------|
| **API Base** | `https://console.neon.tech/api/v2/` |
| **Auth** | Bearer token (`Authorization: Bearer $NEON_API_KEY`) |
| **MCP Server** | `https://mcp.neon.tech/mcp` |
| **Node.js Driver** | `@neondatabase/serverless` (v1.0.2, Node.js 19+) |
| **AI Toolkit** | `@neondatabase/toolkit` |
| **Rate Limits** | 700 req/min; burst 40 req/sec per route; HTTP 429 on exceed |

## MCP Setup

### Option 1: Quick Setup (Recommended)
```bash
npx add-mcp https://mcp.neon.tech/mcp
```
Opens browser for OAuth. No API key needed.

### Option 2: API Key (Headless/Remote Agents)
```bash
npx add-mcp https://mcp.neon.tech/mcp --header "Authorization: Bearer <NEON_API_KEY>"
```
Or add to Claude Code `settings.json`:
```json
{
  "mcpServers": {
    "Neon": { "type": "http", "url": "https://mcp.neon.tech/mcp" }
  }
}
```

## Authentication
```
# Direct (migrations, admin, analytics):
postgresql://user@ep-cool-darkness-123456.us-east-2.aws.neon.tech/dbname
# Pooled (serverless/edge — add -pooler to hostname):
postgresql://user@ep-cool-darkness-123456-pooler.us-east-2.aws.neon.tech/dbname
```
## Common Operations

**HTTP mode (single queries, serverless/edge):**
```ts
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
const rows = await sql`SELECT * FROM users WHERE id = ${userId}`;
```
**WebSocket mode (Node.js, sessions, pg-compatible):**
```ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws; // REQUIRED for Node.js
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
```

**Create a branch:**
```bash
neonctl branches create --name feature/my-branch --parent main
```

## Branching

Branches are copy-on-write clones — instant creation, zero load on parent, only changed data consumes extra storage.

## Pricing

| Tier | CU Rate | Storage | Key Limits |
|------|---------|---------|------------|
| Free | 100 CU-hours/project/month included | 0.5 GB/project | 10 branches, 2 CU max autoscaling |
| Launch | $0.106/CU-hour | $0.35/GB-month | 10 branches, 16 CU max autoscaling |
| Scale | $0.222/CU-hour | $0.35/GB-month | 25 branches, 56 CU max fixed |

1 CU = ~1 vCPU + 4 GB RAM. Scale-to-zero default: 5 min inactivity (configurable on paid plans).

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Not using connection pooling | Use pooled endpoint (`-pooler` in hostname) for serverless/edge |
| Cold start surprises | Typical: a few hundred ms, under 1 sec to first response — adjust suspend timeout |
| Orphaned branches | Clean up after PR merge; 10 branches (Free/Launch), 25 (Scale) per project |
| WebSocket without ws package | Add `neonConfig.webSocketConstructor = ws` — required for Node.js |
| Direct connection from serverless | Use pooled endpoint; direct connections exhaust per-compute connection limits |
| Session state after suspend | Temp tables, prepared statements, LISTEN/NOTIFY, SET vars lost on compute suspend |

## Full Reference
See `reference.md` for complete API docs, serverless driver guide, branching workflows, connection pooling, autoscaling, and pricing breakdown.