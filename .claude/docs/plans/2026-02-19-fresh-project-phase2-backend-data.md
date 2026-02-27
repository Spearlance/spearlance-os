# Fresh Project System — Phase 2: Backend + Data Layer

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Create 9 reference skills + 2 agents covering backend frameworks, API patterns, databases, and ORMs — the biggest gap in armadillo's coverage.

**Architecture:** Each reference skill follows the writing-reference-skills TDD cycle (RED baseline → web research → GREEN write → REFACTOR gaps). All backend/API skills share a `backend-guide` agent. All database/ORM skills share a `database-guide` agent. Skills are registered in skills.json under new `backend`, `database` (expanded), and `orm` bundles.

**Tech Stack:** Hono, Express, tRPC, REST patterns, Supabase, MongoDB, Redis/Upstash, Drizzle ORM, Prisma

**Depends on:** Phase 1 complete (stack-recommender references these skills)

**Process for every skill (Tasks 1-9):** Each task follows the writing-reference-skills TDD cycle. Summary:

1. **RED (baseline):** Dispatch a haiku subagent with 4 questions, NO skill loaded. Document what it gets wrong.
2. **Research:** WebSearch + WebFetch for current facts. Verify versions, APIs, breaking changes.
3. **GREEN (write):** Write SKILL.md (<100 lines) + reference.md (400-800 lines). Address every baseline failure.
4. **GREEN (verify):** Cross-reference skill content against each baseline failure.
5. **REFACTOR:** Identify gaps, fix them, re-verify.
6. **Commit:** `git add` skill files, commit with conventional message.

**REQUIRED SUB-SKILL for each skill:** Use armadillo:writing-reference-skills

---

## Task 1: hono

**Files:**
- Create: `.claude/skills/hono/SKILL.md`
- Create: `.claude/skills/hono/reference.md`
- Create: `.claude/skills/hono/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: hono
description: Use when building APIs or web servers with Hono — routing, middleware, edge deployment, or multi-runtime support. Also use when deploying to Cloudflare Workers, Vercel Edge, Bun, Deno, or Node.js with a lightweight framework.
---
```

### RED baseline questions:

**Q1 (Setup):** "I want to build a REST API with Hono. Set it up for Cloudflare Workers deployment. Show me project creation, basic routing, middleware, and the dev/deploy workflow."

**Q2 (Common Operation):** "Show me how to build a CRUD API for a 'posts' resource in Hono with Zod validation, error handling, and middleware for auth. Include the full router file."

**Q3 (Gotcha/Limits):** "What's the difference between Hono's different runtime adapters? How do I write code that works on Cloudflare Workers AND Node.js? What are the edge cases with file uploads, WebSockets, and streaming?"

**Q4 (Recent Change):** "What's new in Hono v4? What changed from v3? Show me the new features like Hono RPC, the improved testing utilities, and any breaking changes."

### Research queries:
- `"Hono" framework changelog 2025 2026 breaking changes`
- `"Hono v4" new features RPC`
- `"Hono" cloudflare workers deployment guide`
- `"Hono" middleware patterns authentication`
- `"Hono vs Express" comparison performance`
- `site:hono.dev` — verify via WebFetch

### SKILL.md sections:
Overview, Quick Reference (version, install, runtimes), Setup (Cloudflare Workers, Node.js, Bun), Routing, Middleware, Common Mistakes, Full Reference pointer.

### reference.md sections:
1. Installation & Runtime Adapters (Cloudflare, Node, Bun, Deno, Vercel Edge)
2. Routing (path params, groups, chaining)
3. Middleware (built-in: cors, jwt, logger, compress; custom middleware)
4. Request/Response Handling (body parsing, headers, streaming)
5. Validation (Zod integration, @hono/zod-validator)
6. RPC / Client (hc client, type-safe API calls)
7. Testing
8. Error Handling
9. Deployment (per-runtime deploy guides)
10. Common Mistakes

---

## Task 2: express

**Files:**
- Create: `.claude/skills/express/SKILL.md`
- Create: `.claude/skills/express/reference.md`
- Create: `.claude/skills/express/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: express
description: Use when building APIs or web servers with Express.js — routing, middleware, error handling, or when working with the most widely-used Node.js HTTP framework. Also use when migrating Express apps or debugging Express-specific issues.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up a modern Express.js API with TypeScript, proper project structure, error handling middleware, and environment config. Show me the 2026 way to do this — not the 2018 tutorial way."

**Q2 (Common Operation):** "Build a CRUD API for users with Express + TypeScript. Include input validation, async error handling (no try-catch in every route), and proper HTTP status codes."

**Q3 (Gotcha/Limits):** "What are the most common Express.js security mistakes? Cover CORS, helmet, rate limiting, input sanitization, and how to handle async errors without crashing the server."

**Q4 (Recent Change):** "What's the status of Express 5? What changed from Express 4? What's the recommended middleware stack for a new Express project in 2026?"

### Research queries:
- `"Express.js 5" release status changelog 2025 2026`
- `"Express.js" TypeScript setup modern 2026`
- `"Express.js" security best practices middleware`
- `"Express.js" async error handling pattern`
- `site:expressjs.com` — verify via WebFetch

### reference.md sections:
1. Modern Setup (TypeScript, ESM, project structure)
2. Routing (Router, params, query, nested routers)
3. Middleware (execution order, built-in, third-party essentials)
4. Error Handling (async wrapper, error middleware, operational vs programmer errors)
5. Security (helmet, cors, rate limiting, input validation)
6. Authentication Patterns (passport, JWT, session)
7. File Uploads (multer)
8. Testing (supertest)
9. Performance (compression, caching, clustering)
10. Express 4 vs 5 Migration
11. Common Mistakes

---

## Task 3: trpc

**Files:**
- Create: `.claude/skills/trpc/SKILL.md`
- Create: `.claude/skills/trpc/reference.md`
- Create: `.claude/skills/trpc/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: trpc
description: Use when building type-safe APIs with tRPC — procedure definitions, routers, middleware, or client integration. Also use when connecting Next.js/React frontends to tRPC backends or debugging type inference issues.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up tRPC v11 with Next.js App Router. Show me the full setup: server adapter, router definition, client hooks, and how to call procedures from React Server Components vs Client Components."

**Q2 (Common Operation):** "Build a tRPC router for a todo app with queries, mutations, input validation with Zod, and optimistic updates on the client. Show the full stack — router, client hooks, and React component."

**Q3 (Gotcha/Limits):** "What are the tricky parts of tRPC? Cover: middleware chains, context typing, error handling, subscriptions vs polling, and when tRPC is the wrong choice (public APIs, non-TS consumers)."

**Q4 (Recent Change):** "What changed in tRPC v11 compared to v10? New features, breaking changes, and the recommended setup for 2026."

### Research queries:
- `"tRPC v11" changelog breaking changes 2025 2026`
- `"tRPC" Next.js App Router setup 2026`
- `"tRPC" middleware authentication pattern`
- `"tRPC vs REST vs GraphQL" comparison`
- `site:trpc.io` — verify via WebFetch

### reference.md sections:
1. Setup (Next.js App Router, standalone, with Express/Hono)
2. Router & Procedures (query, mutation, subscription)
3. Input Validation (Zod schemas)
4. Middleware (auth, logging, rate limiting)
5. Context & Dependencies
6. Client Integration (React hooks, RSC, vanilla client)
7. Error Handling (TRPCError, error formatting)
8. Subscriptions & Real-time
9. Testing (procedure unit tests)
10. When NOT to Use tRPC
11. Common Mistakes

---

## Task 4: rest-api-patterns

**Files:**
- Create: `.claude/skills/rest-api-patterns/SKILL.md`
- Create: `.claude/skills/rest-api-patterns/reference.md`
- Create: `.claude/skills/rest-api-patterns/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: rest-api-patterns
description: Use when designing REST APIs — resource naming, HTTP methods, status codes, pagination, filtering, error responses, or versioning. Also use when reviewing API design decisions or resolving REST design debates.
---
```

### RED baseline questions:

**Q1 (Design):** "Design a REST API for an e-commerce platform. Cover: resource naming for products, orders, users, and reviews. Show the full URL structure, HTTP methods, and response shapes."

**Q2 (Pagination/Filtering):** "Show me best practices for REST API pagination, filtering, sorting, and field selection. Compare cursor-based vs offset pagination. Include response envelope format and Link headers."

**Q3 (Error Handling):** "Design a REST API error response format. Cover: validation errors (multiple fields), not found, auth errors, rate limiting, and server errors. Show actual JSON response bodies with proper HTTP status codes."

**Q4 (Versioning):** "What are the real trade-offs between URL versioning (/v1/), header versioning, and query param versioning for REST APIs? Which should I use and why? How do I deprecate endpoints gracefully?"

### Research queries:
- `REST API design best practices 2025 2026`
- `REST API pagination cursor vs offset`
- `REST API error response format RFC 9457`
- `REST API versioning strategies comparison`
- `"API design" resource naming conventions`

### reference.md sections:
1. Resource Naming (nouns, hierarchy, collections vs singletons)
2. HTTP Methods (GET, POST, PUT, PATCH, DELETE — when to use each)
3. Status Codes (complete table with when to use)
4. Request/Response Design (envelopes, HATEOAS, content negotiation)
5. Pagination (cursor, offset, keyset — with code examples)
6. Filtering & Sorting (query param patterns)
7. Error Responses (RFC 9457 Problem Details, validation errors)
8. Authentication Patterns (Bearer, API key, OAuth)
9. Versioning Strategies
10. Rate Limiting (headers, response format)
11. API Documentation (OpenAPI/Swagger)
12. Common Mistakes

---

## Task 5: supabase

**Files:**
- Create: `.claude/skills/supabase/SKILL.md`
- Create: `.claude/skills/supabase/reference.md`
- Create: `.claude/skills/supabase/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: supabase
description: Use when working with Supabase — database queries, authentication, storage, real-time subscriptions, Edge Functions, or Row Level Security. Also use when setting up Supabase in a new project or migrating from Firebase.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up Supabase in a Next.js App Router project. Show me: client creation (server vs browser), environment variables, TypeScript types generation, and the recommended project structure."

**Q2 (Common Operation):** "Build a multi-tenant data layer with Supabase. Users belong to organizations, and they should only see their org's data. Show me: schema, Row Level Security policies, and the client-side queries."

**Q3 (Gotcha/Limits):** "What are the Supabase gotchas? Cover: RLS performance with complex policies, connection pooling (Supavisor), the difference between anon key and service role key, storage bucket policies, and Edge Functions cold starts."

**Q4 (Recent Change):** "What's new in Supabase in 2025-2026? Cover Supabase Branching, the new auth hooks, Edge Functions improvements, and any pricing changes."

### Research queries:
- `"Supabase" changelog 2025 2026 new features`
- `"Supabase" Next.js App Router setup 2026`
- `"Supabase" Row Level Security patterns multi-tenant`
- `"Supabase" pricing changes 2026`
- `"Supabase" branching database preview`
- `site:supabase.com/docs` — verify via WebFetch

### reference.md sections:
1. Setup (Next.js, React, standalone)
2. Database Queries (select, insert, update, delete, joins, RPC)
3. Authentication (email, OAuth, magic link, phone)
4. Row Level Security (policies, patterns, multi-tenant)
5. Storage (buckets, upload, signed URLs, policies)
6. Real-time (subscriptions, presence, broadcast)
7. Edge Functions (Deno runtime, deploy, secrets)
8. TypeScript Generation (supabase gen types)
9. Branching (preview databases)
10. Pricing & Limits
11. Common Mistakes

---

## Task 6: mongodb

**Files:**
- Create: `.claude/skills/mongodb/SKILL.md`
- Create: `.claude/skills/mongodb/reference.md`
- Create: `.claude/skills/mongodb/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: mongodb
description: Use when working with MongoDB — document modeling, queries, aggregation pipelines, Atlas setup, or Mongoose ODM. Also use when deciding between MongoDB and relational databases or debugging MongoDB-specific issues.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up MongoDB Atlas with a Node.js/TypeScript project. Show me: connection string, client setup, TypeScript interfaces, and the recommended way to manage connections in a serverless environment (Vercel/Cloudflare)."

**Q2 (Common Operation):** "Design a MongoDB schema for a blog platform with users, posts, comments, and tags. Show me: document modeling decisions (embed vs reference), Mongoose schemas with TypeScript, and the CRUD operations."

**Q3 (Gotcha/Limits):** "What are the MongoDB gotchas for web developers coming from SQL? Cover: the 16MB document limit, why you shouldn't embed everything, connection pool exhaustion in serverless, and when to use aggregation pipelines vs application-level joins."

**Q4 (Recent Change):** "What's new in MongoDB 8.0 and the MongoDB Node.js driver v6? Cover new query operators, Atlas features, and any breaking changes from v5."

### Research queries:
- `"MongoDB 8" changelog new features 2025 2026`
- `"MongoDB" Node.js driver v6 breaking changes`
- `"MongoDB Atlas" serverless pricing 2026`
- `"MongoDB" document modeling best practices embed vs reference`
- `"Mongoose" TypeScript setup 2026`
- `site:mongodb.com/docs` — verify via WebFetch

### reference.md sections:
1. Atlas Setup (cluster creation, connection, IP allowlist)
2. Client Setup (Node.js driver vs Mongoose, connection management)
3. Document Modeling (embed vs reference, schema design patterns)
4. CRUD Operations (with TypeScript)
5. Aggregation Pipeline (common stages, lookup, facets)
6. Indexing (types, compound, text, TTL, explain plans)
7. Mongoose ODM (schemas, middleware, virtuals, populate)
8. Serverless Considerations (connection pooling, cold starts)
9. Security (auth, network access, encryption)
10. Pricing & Limits (Atlas tiers)
11. Common Mistakes

---

## Task 7: redis-upstash

**Files:**
- Create: `.claude/skills/redis-upstash/SKILL.md`
- Create: `.claude/skills/redis-upstash/reference.md`
- Create: `.claude/skills/redis-upstash/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: redis-upstash
description: Use when working with Redis or Upstash — caching, rate limiting, queues, session storage, or pub/sub. Also use when adding a caching layer to an existing application or implementing background job processing with serverless-compatible Redis.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up Upstash Redis for a Next.js App Router project. Show me: creating a database, the @upstash/redis SDK setup, environment variables, and a basic cache-aside pattern."

**Q2 (Common Operation):** "Implement rate limiting with Upstash Redis using the @upstash/ratelimit SDK. Show me: sliding window rate limiter for an API route, custom limits per user tier, and the middleware pattern for Next.js."

**Q3 (Gotcha/Limits):** "What are the key differences between Upstash Redis and self-hosted Redis? Cover: command subset limitations, connection model (HTTP vs TCP), pricing gotchas at scale, and when to use Upstash vs a traditional Redis instance."

**Q4 (Recent Change):** "What's new with Upstash in 2025-2026? Cover Upstash QStash (message queues), Upstash Vector, pricing changes, and any new SDK features."

### Research queries:
- `"Upstash" Redis changelog 2025 2026`
- `"Upstash" rate limiting Next.js`
- `"Upstash" vs "self-hosted Redis" comparison`
- `"Upstash" pricing per-request cost`
- `"Upstash QStash" message queue`
- `site:upstash.com/docs` — verify via WebFetch

### reference.md sections:
1. Setup (Upstash console, REST SDK, Redis protocol)
2. Core Operations (get, set, hset, lists, sorted sets)
3. Caching Patterns (cache-aside, write-through, TTL strategies)
4. Rate Limiting (@upstash/ratelimit — sliding window, fixed window, token bucket)
5. Queues (QStash — publish, schedule, retry, dead letter)
6. Session Storage
7. Pub/Sub & Real-time
8. Vector Search (Upstash Vector basics)
9. Serverless Considerations (HTTP vs TCP, connection reuse)
10. Pricing & Limits
11. Common Mistakes

---

## Task 8: drizzle

**Files:**
- Create: `.claude/skills/drizzle/SKILL.md`
- Create: `.claude/skills/drizzle/reference.md`
- Create: `.claude/skills/drizzle/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: drizzle
description: Use when working with Drizzle ORM — schema definition, queries, migrations, or database integration. Also use when choosing between Drizzle and Prisma, or setting up Drizzle with Neon, Supabase, PlanetScale, or Turso.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up Drizzle ORM with Neon Postgres in a Next.js project. Show me: schema file, drizzle.config.ts, client setup, and the migration workflow (drizzle-kit push vs generate+migrate)."

**Q2 (Common Operation):** "Build a complete schema for a multi-tenant SaaS with Drizzle: users, organizations, memberships (many-to-many), and posts scoped to organizations. Show me: schema definition, relations, and the queries for common operations (create user, add to org, get org posts)."

**Q3 (Gotcha/Limits):** "What are the Drizzle ORM gotchas? Cover: the difference between query API and select API, relation loading (no lazy loading), migration strategy (push vs generate), and performance with complex joins."

**Q4 (Recent Change):** "What's new in Drizzle ORM in 2025-2026? Cover any new database adapters, query builder improvements, and the current state of Drizzle Studio."

### Research queries:
- `"Drizzle ORM" changelog 2025 2026`
- `"Drizzle ORM" Neon setup Next.js`
- `"Drizzle ORM" vs Prisma comparison 2026`
- `"Drizzle ORM" relations many-to-many`
- `"Drizzle" migration push vs generate`
- `site:orm.drizzle.team` — verify via WebFetch

### reference.md sections:
1. Setup (with Neon, Supabase, PlanetScale, Turso, SQLite)
2. Schema Definition (tables, columns, types, constraints)
3. Relations (one-to-one, one-to-many, many-to-many)
4. Query API (relational queries with `with`)
5. Select API (SQL-like builder, joins, subqueries)
6. Migrations (drizzle-kit: push, generate, migrate, studio)
7. Transactions
8. Prepared Statements
9. Database Adapters (node-postgres, neon, better-sqlite3, libsql)
10. Drizzle vs Prisma (when to choose which)
11. Common Mistakes

---

## Task 9: prisma

**Files:**
- Create: `.claude/skills/prisma/SKILL.md`
- Create: `.claude/skills/prisma/reference.md`
- Create: `.claude/skills/prisma/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: prisma
description: Use when working with Prisma ORM — schema modeling, client queries, migrations, or database management. Also use when setting up Prisma with Neon, Supabase, PlanetScale, or when debugging Prisma-specific query issues.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up Prisma with Supabase Postgres in a Next.js project. Show me: schema.prisma, environment setup, client generation, and the migration workflow. Include the connection pooling setup for serverless."

**Q2 (Common Operation):** "Build a Prisma schema for an e-commerce app: users, products, orders, order items, reviews. Show me: the schema with relations, and the queries for: creating an order with items, getting a user's orders with products included, and aggregate queries (average rating, total revenue)."

**Q3 (Gotcha/Limits):** "What are the Prisma performance gotchas? Cover: the N+1 problem with includes, connection pool exhaustion in serverless, the Prisma Client bundle size issue, and when to use raw queries vs the Prisma query builder."

**Q4 (Recent Change):** "What's new in Prisma 6? Cover the Prisma Accelerate service, typed SQL, any breaking changes from Prisma 5, and the current state of Prisma Studio."

### Research queries:
- `"Prisma 6" changelog breaking changes 2025 2026`
- `"Prisma" Supabase setup serverless`
- `"Prisma Accelerate" connection pooling caching`
- `"Prisma" performance N+1 optimization`
- `"Prisma vs Drizzle" comparison 2026`
- `site:prisma.io/docs` — verify via WebFetch

### reference.md sections:
1. Setup (with Neon, Supabase, PlanetScale, MySQL, SQLite)
2. Schema Definition (models, fields, relations, enums, composites)
3. Relations (1:1, 1:n, m:n, self-relations)
4. Client Queries (CRUD, filtering, ordering, pagination)
5. Aggregations (count, sum, avg, groupBy)
6. Transactions (interactive, sequential)
7. Migrations (migrate dev, deploy, reset, seeding)
8. Raw Queries (typed SQL, queryRaw, executeRaw)
9. Prisma Accelerate (connection pooling, global cache)
10. Serverless Considerations (edge compatibility, bundle size)
11. Prisma vs Drizzle (decision guide)
12. Common Mistakes

---

## Task 10: Write backend-guide agent

**Files:**
- Create: `.claude/agents/backend-guide.md`

```markdown
---
name: backend-guide
description: Use when asking general questions about backend development, API design, server frameworks, or when choosing between backend technologies. Routes to specific skills (hono, express, trpc, rest-api-patterns) based on context.
model: claude-sonnet-4-6
memory: user
allowed-tools: Read, Glob, Grep, Bash, WebSearch, WebFetch, Skill
---

# Backend Development Guide

You help with backend development questions — framework selection, API design, server architecture, and debugging.

## Skills You Route To

| Topic | Skill |
|-------|-------|
| Hono (edge-first framework) | armadillo:hono |
| Express.js | armadillo:express |
| tRPC (type-safe APIs) | armadillo:trpc |
| REST API design patterns | armadillo:rest-api-patterns |

## How to Help

1. Read `.claude/stack.json` if it exists — use the project's decided backend
2. If no stack.json, understand the user's context before recommending
3. Load the relevant reference skill for specific implementation questions
4. For general "which framework?" questions, compare trade-offs from the stack-recommender

## Decision Quick Reference

| Need | Recommendation |
|------|----------------|
| Edge deployment (Cloudflare, Vercel Edge) | Hono |
| Maximum ecosystem, most tutorials | Express |
| Type-safe API with React/Next.js frontend | tRPC |
| Public API for external consumers | REST patterns + Hono or Express |
| Internal API with TypeScript frontend | tRPC |
```

**Commit:**
```bash
git add .claude/agents/backend-guide.md
git commit -m "feat: add backend-guide agent"
```

---

## Task 11: Write database-guide agent

**Files:**
- Create: `.claude/agents/database-guide.md`

```markdown
---
name: database-guide
description: Use when asking general questions about databases, ORMs, schema design, migrations, or when choosing between database technologies. Routes to specific skills (neon, supabase, mongodb, redis-upstash, drizzle, prisma) based on context.
model: inherit
memory: user
allowed-tools: Read, Glob, Grep, Bash, WebSearch, WebFetch, Skill
---

# Database Guide

You help with database questions — technology selection, schema design, query optimization, and migrations.

## Skills You Route To

| Topic | Skill |
|-------|-------|
| Neon (serverless Postgres) | armadillo:neon |
| Supabase (Postgres + BaaS) | armadillo:supabase |
| MongoDB (document DB) | armadillo:mongodb |
| Redis / Upstash (caching, queues) | armadillo:redis-upstash |
| Drizzle ORM | armadillo:drizzle |
| Prisma ORM | armadillo:prisma |

## How to Help

1. Read `.claude/stack.json` if it exists — use the project's decided database + ORM
2. If no stack.json, understand the data model before recommending
3. Load the relevant reference skill for specific questions
4. For "which database?" questions, consider: data model (relational vs document), hosting (serverless vs managed), budget, and scale needs

## Decision Quick Reference

| Need | Recommendation |
|------|----------------|
| Serverless Postgres, branching | Neon |
| Postgres + auth + storage + realtime | Supabase |
| Flexible schema, document model | MongoDB |
| Caching, rate limiting, queues | Redis/Upstash |
| Type-safe ORM, SQL-like | Drizzle |
| Most mature ORM, best DX | Prisma |
```

**Commit:**
```bash
git add .claude/agents/database-guide.md
git commit -m "feat: add database-guide agent"
```

---

## Task 12: Update skills.json with Phase 2 skills + bundles

**Files:**
- Modify: `skills.json`

Add all 9 skills, 2 agents, and 3 bundles:

**New/expanded bundles:**
```json
"backend": {
  "name": "Backend & API",
  "description": "Hono, Express, tRPC, REST API design patterns",
  "default": false,
  "skills": ["hono", "express", "trpc", "rest-api-patterns"]
},
"orm": {
  "name": "ORM",
  "description": "Drizzle ORM and Prisma — type-safe database access",
  "default": false,
  "skills": ["drizzle", "prisma"]
}
```

**Expand existing database bundle:**
```json
"database": {
  "name": "Database",
  "description": "Neon, Supabase, MongoDB, Redis/Upstash — serverless databases and caching",
  "default": false,
  "skills": ["neon", "supabase", "mongodb", "redis-upstash"]
}
```

**Commit:**
```bash
git add skills.json
git commit -m "feat: register Phase 2 backend + data skills and bundles"
```

---

## Summary

| Task | Skill | Type |
|------|-------|------|
| 1 | hono | Reference (TDD) |
| 2 | express | Reference (TDD) |
| 3 | trpc | Reference (TDD) |
| 4 | rest-api-patterns | Reference (TDD) |
| 5 | supabase | Reference (TDD) |
| 6 | mongodb | Reference (TDD) |
| 7 | redis-upstash | Reference (TDD) |
| 8 | drizzle | Reference (TDD) |
| 9 | prisma | Reference (TDD) |
| 10 | backend-guide agent | Agent |
| 11 | database-guide agent | Agent |
| 12 | skills.json update | Registry |

12 tasks · executing subagent-driven (reason: reference skills are independent but agents depend on skills existing first)

**Parallelizable:** Tasks 1-4 (backend skills) can run in parallel. Tasks 5-7 (database skills) can run in parallel. Tasks 8-9 (ORM skills) can run in parallel. Tasks 10-12 are sequential after skills exist.
