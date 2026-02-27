# Neon Serverless Postgres Reference

> **Last Updated:** February 2026
> **API Base:** `https://console.neon.tech/api/v2/`
> **Documentation:** `https://neon.com/docs`
> **Domain:** Neon migrated from `neon.tech` to `neon.com` (308 redirects in place)

---

## Table of Contents

1. [MCP Server Integration](#mcp-server-integration)
2. [Authentication and Setup](#authentication-and-setup)
3. [Serverless Driver](#serverless-driver)
4. [API Reference](#api-reference)
5. [Branching](#branching)
6. [Connection Pooling](#connection-pooling)
7. [Autoscaling and Compute](#autoscaling-and-compute)
8. [Pricing Tiers](#pricing-tiers)
9. [Error Codes](#error-codes)
10. [SDKs and Tools](#sdks-and-tools)
11. [GitHub Actions](#github-actions)

---

## MCP Server Integration

Neon provides an official MCP server at `https://mcp.neon.tech/mcp` that handles live
database operations. This IS the agent — no custom wrapper needed.

### Setup Methods

#### Method 1: Quick Setup (Recommended)

```bash
npx add-mcp https://mcp.neon.tech/mcp
```

Opens browser for OAuth. Automatically adds Neon MCP to Claude Code config. No API key
or manual JSON editing required.

#### Method 2: Remote Server — OAuth (Manual Config)

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "Neon": {
      "type": "http",
      "url": "https://mcp.neon.tech/mcp"
    }
  }
}
```

Claude Code will prompt for OAuth on first use.

#### Method 3: Remote Server — API Key

```bash
npx add-mcp https://mcp.neon.tech/mcp --header "Authorization: Bearer <NEON_API_KEY>"
```

Or manually in `settings.json`:

```json
{
  "mcpServers": {
    "Neon": {
      "type": "http",
      "url": "https://mcp.neon.tech/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_NEON_API_KEY"
      }
    }
  }
}
```

Use this for headless environments or remote agents where browser OAuth isn't available.

#### Method 4: Local Installation

```bash
npx add-mcp "npx -y @neondatabase/mcp-server-neon start <YOUR_NEON_API_KEY>" --name neon
```

Requires Node.js v18+. Runs MCP server as a local process.

#### Legacy SSE URL

The legacy SSE endpoint `https://mcp.neon.tech/sse` is still available but the HTTP
streamable endpoint (`/mcp`) is preferred for new setups.

### Read-Only Mode

Add `"x-read-only": "true"` header to restrict to read-only tools. SQL queries run
in read-only transactions automatically.

**Security:** Use MCP for development/testing only. Do not connect to production.

### Available MCP Tools

The Neon MCP server exposes 30+ tools including:

| Category | Tools |
|----------|-------|
| **Project management** | create_project, list_projects, describe_project |
| **Branch operations** | create_branch, list_branches, delete_branch, reset_branch, compare_schemas |
| **SQL execution** | run_sql, run_sql_transaction |
| **Database migrations** | prepare_migration (creates temp branch), complete_migration (applies to main) |
| **Performance** | identify_slow_queries, suggest_optimizations |
| **Authentication** | provision_neon_auth, get_data_api_access |
| **Search/discovery** | find_resources (across organizations) |

### Verify MCP Connection

Run `/mcp` in Claude Code to see connected servers and available tools.

---

## Authentication and Setup

### API Keys

| Key Type | Scope | Use Case |
|----------|-------|----------|
| Personal | All owned/accessible projects | Development, CLI |
| Organization | All org-wide projects | Team automation |
| Project-scoped | Single project only | CI/CD, restricted access |

**Generate keys:** Neon Console → Account Settings → API Keys

### API Authentication

```bash
# All API requests require Bearer token
curl -H "Authorization: Bearer $NEON_API_KEY" \
     https://console.neon.tech/api/v2/projects
```

### Connection String Formats

```
# Direct connection (no pooling)
postgresql://user:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech/dbname

# Pooled connection (add -pooler to endpoint hostname)
postgresql://user:password@ep-cool-darkness-123456-pooler.us-east-2.aws.neon.tech/dbname

# With SSL (required by default)
postgresql://user:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech/dbname?sslmode=require
```

**Use pooled for:** Serverless functions, web apps, anything connection-per-request
**Use direct for:** Migrations, pg_dump/restore, logical replication, admin, analytics

### Environment Variables

```bash
# Standard convention
DATABASE_URL=postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/dbname

# Neon also provides these as project secrets in Console
PGHOST, PGUSER, PGPASSWORD, PGDATABASE
```

---

## Serverless Driver

Package: `@neondatabase/serverless` (npm) / `@neon/serverless` (JSR)
Version: v1.0.2 (released ~Oct 2025)
**Requires Node.js 19+** (breaking change from pre-1.0 which supported older Node)
TypeScript types included — no separate `@types` package needed.

```bash
npm install @neondatabase/serverless
# For WebSocket mode in Node.js:
npm install ws
```

### HTTP Mode

Best for **single, non-interactive queries** in serverless/edge environments.
Lower latency for one-shot queries. No persistent connection.

```typescript
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Tagged template literal (parameterized automatically)
const users = await sql`SELECT * FROM users WHERE active = ${true}`;

// Parameterized query (explicit)
const user = await sql.query('SELECT * FROM users WHERE id = $1', [userId]);

// Raw string (trusted content only — no user input)
const count = await sql.unsafe('SELECT COUNT(*) FROM users');

// Transaction (HTTP mode supports multi-statement transactions)
const results = await sql.transaction([
  sql`INSERT INTO orders(user_id) VALUES(${userId})`,
  sql`UPDATE users SET order_count = order_count + 1 WHERE id = ${userId}`
]);

// Full results (includes fields, rowCount, etc.)
const result = await sql`SELECT * FROM users`.then(rows => rows); // default: array of row objects
const fullResult = await neon(url, { fullResults: true })`SELECT * FROM users`;
// fullResult.rows, fullResult.fields, fullResult.rowCount
```

**Limits:** Max request/response size: 64 MB. No session state between calls.

### WebSocket Mode

Best for **interactive sessions, transactions requiring session state,
and pg-compatible libraries** (Drizzle ORM, Prisma, etc.).

```typescript
import { Pool, Client, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// REQUIRED for Node.js server-side — without this, WebSocket mode silently fails
neonConfig.webSocketConstructor = ws;

// Pool (recommended for most apps)
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

// Simple query
const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

// Transaction with session state
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const result = await client.query(
    'INSERT INTO orders(user_id, total) VALUES($1, $2) RETURNING id',
    [userId, total]
  );
  await client.query(
    'UPDATE users SET order_count = order_count + 1 WHERE id = $1',
    [userId]
  );
  await client.query('COMMIT');
  return result.rows[0];
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}

// Client (single connection)
const client = new Client({ connectionString: process.env.DATABASE_URL! });
await client.connect();
const { rows } = await client.query('SELECT NOW()');
await client.end();
```

**Note:** `Pool` and `Client` are drop-in replacements for `pg` (node-postgres).

### HTTP vs WebSocket: When to Use

| Factor | HTTP Mode | WebSocket Mode |
|--------|-----------|----------------|
| **Use case** | Serverless, edge, one-shot queries | Server apps, transactions, ORM libraries |
| **Session state** | None | Full session support |
| **Transactions** | Supported (HTTP transaction API) | Full interactive transactions |
| **Node.js setup** | No extra config | Requires `neonConfig.webSocketConstructor = ws` |
| **pg-compatible** | No (different API) | Yes (drop-in replacement) |
| **Cold start** | Lower latency for first query | Slightly higher connection overhead |
| **ORM support** | Limited | Full (Drizzle, Prisma, etc.) |

### @neondatabase/toolkit

Combined package for AI agents: wraps both the Management API client and serverless driver.

```typescript
import { NeonToolkit } from '@neondatabase/toolkit';
const toolkit = new NeonToolkit(process.env.NEON_API_KEY!);
// Access Management API + serverless driver in one package
```

Status: Early development (as of Feb 2026). Designed for AI agent platforms provisioning
databases at scale.

---

## API Reference

**Base URL:** `https://console.neon.tech/api/v2/`
**Auth:** `Authorization: Bearer $NEON_API_KEY`
**Content-Type:** `application/json`
**Rate limits:** 700 req/min (~11/sec average); burst up to 40 req/sec per route per account
**Rate limit headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`

### Projects

```bash
# List projects
GET /projects
GET /projects?limit=10&cursor=<cursor>

# Create project
POST /projects
{
  "project": {
    "name": "my-project",
    "region_id": "aws-us-east-2",
    "pg_version": 17
  }
}

# Get project
GET /projects/{project_id}

# Update project
PATCH /projects/{project_id}
{ "project": { "name": "new-name" } }

# Delete project
DELETE /projects/{project_id}
```

### Branches

```bash
# List branches
GET /projects/{project_id}/branches

# Create branch
POST /projects/{project_id}/branches
{
  "branch": {
    "name": "feature/my-feature",
    "parent_id": "br-main-branch-id",    # optional, defaults to default branch
    "parent_lsn": "0/1234ABCD"           # optional, point-in-time (LSN)
    # OR
    "parent_timestamp": "2026-02-01T00:00:00Z"  # optional, point-in-time (timestamp)
  },
  "endpoints": [{ "type": "read_write" }]  # auto-create compute for the branch
}

# Get branch
GET /projects/{project_id}/branches/{branch_id}

# Delete branch
DELETE /projects/{project_id}/branches/{branch_id}

# Reset branch to parent head
POST /projects/{project_id}/branches/{branch_id}/restore
{ "source_branch_id": "br-parent-id" }

# Set as default branch
PATCH /projects/{project_id}/branches/{branch_id}
{ "branch": { "default": true } }
```

**Response includes** `operations` array — async operations return operation IDs for status polling.

### Computes (Endpoints)

```bash
# List endpoints
GET /projects/{project_id}/endpoints

# Create endpoint (compute) for a branch
POST /projects/{project_id}/endpoints
{
  "endpoint": {
    "branch_id": "br-xxx",
    "type": "read_write",
    "autoscaling_limit_min_cu": 0.25,
    "autoscaling_limit_max_cu": 4,
    "suspend_timeout_seconds": 300     # 0 = never suspend
  }
}

# Update endpoint (resize, change autoscaling)
PATCH /projects/{project_id}/endpoints/{endpoint_id}
{
  "endpoint": {
    "autoscaling_limit_min_cu": 1,
    "autoscaling_limit_max_cu": 8
  }
}

# Start suspended compute
POST /projects/{project_id}/endpoints/{endpoint_id}/start

# Suspend compute
POST /projects/{project_id}/endpoints/{endpoint_id}/suspend
```

### Roles and Databases

```bash
# Create role
POST /projects/{project_id}/branches/{branch_id}/roles
{ "role": { "name": "app_user" } }

# Get role password
GET /projects/{project_id}/branches/{branch_id}/roles/{role_name}/reveal_password

# Create database
POST /projects/{project_id}/branches/{branch_id}/databases
{ "database": { "name": "mydb", "owner_name": "app_user" } }
```

### Operations

Many API calls return `operations` — async tasks running in the background.

```bash
# Get operation status
GET /projects/{project_id}/operations/{operation_id}

# Response
{
  "operation": {
    "id": "op-xxx",
    "status": "running",  # "scheduling", "running", "finished", "failed"
    "action": "create_branch",
    "created_at": "2026-02-17T12:00:00Z",
    "updated_at": "2026-02-17T12:00:01Z"
  }
}
```

**Best practice:** Poll with exponential backoff (start at 500ms, max 5s) until
`status === "finished"` or `"failed"`.

---

## Branching

### Architecture

Neon branches use **copy-on-write via the Write-Ahead Log (WAL)**. A branch is an
instant clone of the parent's data at the moment of creation. Only data that diverges
from the parent consumes additional storage.

**Properties:**
- Zero load on parent during branch creation
- Instant regardless of database size
- Branch and parent share WAL history until they diverge
- Only changed pages (after fork point) cost storage

### Point-in-Time Branching

```bash
# Branch from a specific LSN
neonctl branches create --name recovery --parent main \
  --parent-lsn 0/1234ABCD

# Branch from a specific timestamp
neonctl branches create --name recovery --parent main \
  --parent-timestamp "2026-02-01T00:00:00Z"
```

Point-in-time restore windows per plan:

| Plan | Default | Maximum |
|------|---------|---------|
| Free | 6 hours | 6 hours (1 GB max data changes) |
| Launch | 1 day | 7 days |
| Scale | 1 day | 30 days |

### Dev/Preview Environment Workflow

**Per-PR branching pattern:**

```bash
# Create branch for PR (CLI)
neonctl branches create \
  --project-id $NEON_PROJECT_ID \
  --name "pr-$PR_NUMBER" \
  --parent main

# Get connection string for the branch
neonctl connection-string \
  --project-id $NEON_PROJECT_ID \
  --branch "pr-$PR_NUMBER" \
  --pooled

# Add TTL to auto-expire (RFC 3339 format)
neonctl branches create \
  --project-id $NEON_PROJECT_ID \
  --name "pr-$PR_NUMBER" \
  --parent main \
  --expires-at "2026-03-01T00:00:00Z"

# Delete branch after merge
neonctl branches delete "pr-$PR_NUMBER" \
  --project-id $NEON_PROJECT_ID
```

### Branch Limits

| Plan | Included branches/project | Extra branch cost |
|------|---------------------------|-------------------|
| Free | 10 | Not available |
| Launch | 10 | $0.002/branch-hour (~$1.50/month) |
| Scale | 25 | $0.002/branch-hour (~$1.50/month) |

### Data Masking (Nov 2025)

API endpoints available for creating anonymized branches with masking rules — useful for
sharing production-like data with developers without exposing PII.

---

## Connection Pooling

Neon uses **PgBouncer in transaction mode** as a built-in connection pooler.

### Pooled vs Direct Connection Strings

```
# Direct — connects to Postgres directly
postgresql://user@ep-cool-darkness-123456.us-east-2.aws.neon.tech/dbname

# Pooled — add -pooler to endpoint hostname (before region)
postgresql://user@ep-cool-darkness-123456-pooler.us-east-2.aws.neon.tech/dbname
```

The **only** difference is `-pooler` added to the endpoint ID in the hostname.

### PgBouncer Configuration

| Setting | Value |
|---------|-------|
| pool_mode | transaction |
| max_client_conn | 10,000 |
| default_pool_size | 90% of Postgres max_connections |
| query_wait_timeout | 120 seconds |
| max_prepared_statements | 1,000 per connection |

### Connection Limits by Compute Size

| CU | RAM | max_connections (Postgres) |
|----|-----|---------------------------|
| 0.25 | 1 GB | 104 |
| 0.5 | 2 GB | 209 |
| 1 | 4 GB | 419 |
| 2 | 8 GB | 839 |
| 4 | 16 GB | 1,679 |
| 8 | 32 GB | 3,400 |
| 9+ | 36–224 GB | 4,000 (capped) |

Note: 7 connections reserved for Neon superuser.

### What Doesn't Work with Pooling (Transaction Mode)

- `SET`/`RESET` session variables
- `LISTEN`/`NOTIFY`
- `WITH HOLD CURSOR`
- `PREPARE`/`DEALLOCATE` (SQL-level prepared statements)
- Temporary tables
- `LOAD` statement
- Session-level advisory locks

**For these, use a direct connection.**

---

## Autoscaling and Compute

### CU Definition

**1 CU ≈ 1 vCPU + 4 GB RAM** (scales linearly). Each CU also includes proportional
local SSD for the Local File Cache (LFC).

### Available Compute Sizes

| Range | RAM | Notes |
|-------|-----|-------|
| 0.25 CU | 1 GB | Minimum (fractional) |
| 0.5 CU | 2 GB | Fractional |
| 1–8 CU | 4–32 GB | Standard (1 CU increments) |
| 9–16 CU | 36–64 GB | Larger (2 CU increments) |
| 17–56 CU | 68–224 GB | Fixed only, no autoscaling |

### Autoscaling

- **Range:** 0.25 CU minimum to 16 CU maximum
- **Max range:** The difference between max and min CU cannot exceed 8 CU
- **Default minimum:** 0.25 CU (changed Dec 2025)
- **Computes >16 CU:** Fixed size only, no autoscaling, no scale-to-zero
- **Efficiency:** Autoscaling databases consume ~2.4× less compute than non-autoscaling equivalents

Configure via API or Console:
```bash
# Set autoscaling range via API
PATCH /projects/{project_id}/endpoints/{endpoint_id}
{
  "endpoint": {
    "autoscaling_limit_min_cu": 0.25,
    "autoscaling_limit_max_cu": 4
  }
}
```

### Scale-to-Zero

- **Default timeout:** 5 minutes of inactivity
- **Configurable:** Paid plans can set 0–7 days (0 = never suspend)
- **Restriction:** Only available for computes ≤16 CU (changed Dec 2025)
- **Session context lost on suspend:** Temp tables, prepared statements, advisory locks,
  NOTIFY/LISTEN channels, SET parameters

```bash
# Disable scale-to-zero (paid plans)
PATCH /projects/{project_id}/endpoints/{endpoint_id}
{ "endpoint": { "suspend_timeout_seconds": 0 } }
```

### Cold Start Times

- **Typical:** A few hundred milliseconds (from first query to response: under 1 second)
- **Extended idle (7+ days):** May be slightly longer
- **After wake:** First few queries may be slower while Postgres memory buffers warm up

**Mitigation options:**
- Set `suspend_timeout_seconds` to a longer value or 0 on paid plans
- Use HTTP mode (`neon()` function) — lower connection overhead
- Keep-alive: send periodic lightweight queries from application
- Use Neon's Local File Cache (LFC) — caches frequently accessed pages in compute RAM

### Local File Cache (LFC)

- Uses up to 75% of compute's RAM
- Extends Postgres shared_buffers to reduce storage round-trips
- Automatically managed — no configuration needed

---

## Pricing Tiers

> Pricing as of February 2026. Major reduction occurred August 2025 (post-Databricks
> acquisition). Storage dropped from $1.75 to $0.35/GB-month (80% reduction). Free tier
> compute doubled (Oct 2025) and projects increased to 100 (Dec 2025).

### Tier Comparison

| Feature | Free | Launch | Scale |
|---------|------|--------|-------|
| **Monthly cost** | $0 | Usage-based | Usage-based |
| **Compute rate** | 100 CU-hrs/project/mo included | $0.106/CU-hour | $0.222/CU-hour |
| **Storage** | 0.5 GB/project included | $0.35/GB-month | $0.35/GB-month |
| **Projects** | 100 | 100 | 1,000+ |
| **Branches/project** | 10 | 10 | 25 |
| **Extra branches** | N/A | $0.002/branch-hr (~$1.50/mo) | $0.002/branch-hr (~$1.50/mo) |
| **Max autoscaling** | 2 CU (8 GB) | 16 CU (64 GB) | 16 CU (64 GB) |
| **Max fixed compute** | 2 CU | 16 CU | 56 CU (224 GB) |
| **Data transfer (egress)** | 5 GB included | 100 GB + $0.10/GB | 100 GB + $0.10/GB |
| **Point-in-time restore** | 6 hours (1 GB max) | Up to 7 days | Up to 30 days |
| **Snapshots** | 1 | 10 | 10 |
| **Monitoring retention** | 1 day | 3 days | 14 days |

### Billing Model

- **Compute:** Billed per CU-hour consumed (not provisioned). Autoscaling means you
  pay only for what you use. Scale-to-zero means $0 during idle.
- **Storage:** Billed per GB-month of actual data. Branches share pages with parent —
  only unique (diverged) data incurs cost.
- **Data transfer:** Egress beyond included amount billed at $0.10/GB.
- **Branches:** Extra branches beyond plan limit billed at $0.002/branch-hour.
- **Prorated:** All costs are billed prorated to the second.

### Agent Plan (Coming Soon)

Custom resource limits, higher API rate limits for instant provisioning, credits for
free tier users. Targets AI agent platforms provisioning databases at scale.

---

## Error Codes

### HTTP API Errors

| Status | Code | Meaning | Fix |
|--------|------|---------|-----|
| 400 | Bad Request | Invalid request body or parameters | Check request JSON structure |
| 401 | Unauthorized | Missing or invalid API key | Verify `NEON_API_KEY` and Bearer format |
| 403 | Forbidden | API key lacks permission for this resource | Check key type (personal/org/project-scoped) |
| 404 | Not Found | Project, branch, or endpoint doesn't exist | Verify IDs |
| 409 | Conflict | Resource already exists or operation in progress | Wait for pending operation or use unique names |
| 422 | Unprocessable Entity | Request is well-formed but invalid semantically | Check quota limits (branches, projects) |
| 429 | Too Many Requests | Rate limit exceeded | Back off; check `X-RateLimit-Remaining` header |
| 500 | Internal Server Error | Neon-side error | Retry with exponential backoff |

### Connection Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `connection timeout` | Compute is cold-starting | Retry; cold start is typically <1 second |
| `too many connections` | Pool exhausted | Use pooled endpoint; reduce connection pool size in app |
| `FATAL: password authentication failed` | Wrong credentials | Use `reveal_password` API to get current password |
| `no pg_hba.conf entry` | SSL not enabled | Add `?sslmode=require` to connection string |
| `WebSocket connection failed` | Missing `neonConfig.webSocketConstructor = ws` | Add `import ws from 'ws'; neonConfig.webSocketConstructor = ws;` |

### Branch Operation Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `branch limit exceeded` | At plan's branch limit | Delete unused branches; upgrade plan |
| `parent branch not found` | Wrong parent_id | List branches to get correct IDs |
| `restore window exceeded` | LSN/timestamp outside restore window | Upgrade plan for longer restore window |

---

## SDKs and Tools

### TypeScript/JavaScript

#### @neondatabase/serverless (Serverless Driver)

```bash
npm install @neondatabase/serverless
```

- HTTP mode: `neon()` function for one-shot queries
- WebSocket mode: `Pool`/`Client` drop-in for `pg`
- **Node.js 19+ required** for v1.0.0+
- See [Serverless Driver](#serverless-driver) section for full docs

#### @neondatabase/api-client (Management API)

```bash
npm install @neondatabase/api-client
```

```typescript
import { createApiClient } from '@neondatabase/api-client';

const client = createApiClient({ apiKey: process.env.NEON_API_KEY! });

// List projects
const { data } = await client.listProjects({});
console.log(data.projects);

// Create branch
const { data: branch } = await client.createProjectBranch(projectId, {
  branch: { name: 'feature/my-feature', parent_id: mainBranchId }
});
```

Latest version: 2.6.0

#### @neondatabase/toolkit (AI Agent Toolkit)

```bash
npm install @neondatabase/toolkit
```

Combined Management API client + serverless driver. Designed for AI agent platforms.
Status: Early development (as of Feb 2026).

### Python

#### neon-api (Management API)

```bash
pip install neon-api  # requires Python 3.9+
```

```python
import neon_api

client = neon_api.Client(api_key=os.environ["NEON_API_KEY"])
projects = client.get_projects()

# Use standard psycopg2 for queries
import psycopg2
conn = psycopg2.connect(os.environ["DATABASE_URL"])
```

Note: `neon-api` wraps the Management API only. For Postgres queries, use standard
`psycopg2` or `asyncpg` with the connection string.

### Go (Community)

```bash
go get github.com/kislerdm/neon-sdk-go
```

Community-maintained by @kislerdm. Not officially supported by Neon. Check GitHub for
current status before using in production.

### Neon CLI (neonctl)

```bash
# Install
npm install -g neonctl
# OR
brew install neonctl

# Authenticate
neonctl auth

# Version: 2.20.2 (as of Feb 2026)
```

#### Key Commands

```bash
# Projects
neonctl projects list
neonctl projects create --name my-project --region-id aws-us-east-2
neonctl projects delete <project-id>

# Branches
neonctl branches list --project-id <id>
neonctl branches create --project-id <id> --name feature/foo --parent main
neonctl branches delete feature/foo --project-id <id>
neonctl branches restore feature/foo --timestamp "2026-02-01T00:00:00Z" --project-id <id>

# Connection strings
neonctl connection-string --project-id <id> --branch main --pooled
neonctl connection-string --project-id <id> --branch main --database mydb --role myuser

# Context (set default project/branch)
neonctl set-context --project-id <id> --branch main

# AI coding assistant init (sets up MCP + env vars)
neonctl init
```

#### Global Options

```
-o, --output   Output format: json | yaml | table (default: table)
--api-key      API key (or set NEON_API_KEY env var)
--config-dir   Path to config directory
--project-id   Default project ID
```

---

## GitHub Actions

### Create Branch Action

```yaml
# .github/workflows/preview.yml
name: Create Preview Branch
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  create-branch:
    runs-on: ubuntu-latest
    steps:
      - uses: neondatabase/create-branch-action@v6
        id: neon-branch
        with:
          project_id: ${{ vars.NEON_PROJECT_ID }}
          branch_name: preview/pr-${{ github.event.pull_request.number }}
          api_key: ${{ secrets.NEON_API_KEY }}

      - name: Use branch connection string
        run: echo "DATABASE_URL=${{ steps.neon-branch.outputs.db_url_pooled }}"
```

**Outputs:** `db_url`, `db_url_pooled`, `branch_id`, `password`, `host`, `branch_name`

### Delete Branch Action

```yaml
# Cleanup on PR close/merge
name: Delete Preview Branch
on:
  pull_request:
    types: [closed]

jobs:
  delete-branch:
    runs-on: ubuntu-latest
    steps:
      - uses: neondatabase/delete-branch-action@v3
        with:
          project_id: ${{ vars.NEON_PROJECT_ID }}
          branch: preview/pr-${{ github.event.pull_request.number }}
          api_key: ${{ secrets.NEON_API_KEY }}
```

### Schema Diff Action

```yaml
- uses: neondatabase/schema-diff-action@v1
  with:
    project_id: ${{ vars.NEON_PROJECT_ID }}
    compare_branch: preview/pr-${{ github.event.pull_request.number }}
    base_branch: main
    api_key: ${{ secrets.NEON_API_KEY }}
```

Adds a schema diff comment to the PR showing database changes.

---

## Useful Links

| Resource | URL |
|----------|-----|
| Neon Console | `https://console.neon.tech` |
| Documentation | `https://neon.com/docs` |
| API Reference | `https://api-docs.neon.tech/reference` |
| Serverless Driver | `https://neon.com/docs/serverless/serverless-driver` |
| MCP Server | `https://neon.com/docs/ai/neon-mcp-server` |
| Status Page | `https://neonstatus.com` |
| GitHub | `https://github.com/neondatabase` |
| Changelog | `https://neon.com/docs/changelog` |
| Discord | `https://neon.com/discord` |
