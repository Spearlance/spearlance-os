# Cloudflare Pages & Workers Developer Reference

> **Last Verified:** February 2026
> **Wrangler Version:** v4 (March 2025)
> **Documentation:** https://developers.cloudflare.com/workers/

---

## Table of Contents

1. [Pages Setup](#1-pages-setup)
2. [Workers Setup](#2-workers-setup)
3. [Pages Functions](#3-pages-functions)
4. [Bindings Overview](#4-bindings-overview)
5. [D1 Database](#5-d1-database)
6. [R2 Object Storage](#6-r2-object-storage)
7. [KV](#7-kv)
8. [Environment Variables & Secrets](#8-environment-variables--secrets)
9. [Custom Domains & Routing](#9-custom-domains--routing)
10. [Workers AI & Vectorize](#10-workers-ai--vectorize)
11. [Node.js Compatibility Mode](#11-nodejs-compatibility-mode)
12. [Pricing & Limits](#12-pricing--limits)
13. [Common Mistakes](#13-common-mistakes)

---

## 1. Pages Setup

### Static Site Deployment

```bash
# Deploy a build output directory directly
wrangler pages deploy ./dist --project-name my-site

# Or connect to GitHub via dashboard — auto-deploys on push
```

### Full-Stack with Pages Functions

Structure:

```
my-project/
├── public/           # or dist/ — static assets
├── functions/        # Pages Functions (edge API routes)
│   ├── api/
│   │   └── users.ts  # → /api/users
│   └── _middleware.ts
├── wrangler.toml     # optional but recommended
└── package.json
```

Minimal `wrangler.toml` for Pages:

```toml
name = "my-site"
pages_build_output_dir = "./dist"
compatibility_date = "2024-09-23"

[[d1_databases]]
binding = "DB"
database_name = "my-db"
database_id = "xxxx-xxxx-xxxx"
```

### Build Integration

```bash
# wrangler.toml build command (for CI)
[build]
command = "npm run build"
```

Pages auto-detects frameworks (Astro, Next.js, SvelteKit, etc.) and sets the build command and output directory automatically when connected to Git.

---

## 2. Workers Setup

### Initialize

```bash
npm create cloudflare@latest my-worker
# or
wrangler init my-worker
```

### wrangler.toml Schema

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]   # optional

# Route matching (Workers for Platforms)
routes = [
  { pattern = "example.com/api/*", zone_name = "example.com" }
]

[vars]
MY_VAR = "production-value"

[[kv_namespaces]]
binding = "MY_KV"
id = "xxxx-xxxx-xxxx"

[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "xxxx-xxxx-xxxx"

[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "my-bucket"
```

### Worker Entrypoint

```typescript
// src/index.ts
export interface Env {
  MY_KV: KVNamespace;
  DB: D1Database;
  MY_BUCKET: R2Bucket;
  MY_VAR: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/hello') {
      return Response.json({ message: 'Hello from the edge!' });
    }

    return new Response('Not Found', { status: 404 });
  },

  // Scheduled cron trigger
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(doSomeBackgroundWork(env));
  },
};
```

### Dev & Deploy

```bash
wrangler dev                  # local dev server (http://localhost:8787)
wrangler dev --remote         # dev against real Cloudflare network
wrangler deploy               # deploy to production
wrangler deploy --env staging # deploy to named environment
wrangler tail                 # stream live logs
wrangler rollback             # roll back to previous deployment
```

---

## 3. Pages Functions

### File-Based Routing

```
functions/
├── index.ts              # → /
├── about.ts              # → /about
├── api/
│   ├── users.ts          # → /api/users
│   └── users/
│       └── [id].ts       # → /api/users/:id
├── blog/
│   └── [[slug]].ts       # → /blog/* (catch-all)
└── _middleware.ts        # runs before all functions in this dir
```

### Function Handler

```typescript
// functions/api/users/[id].ts
import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(params.id)
    .first();

  if (!user) return new Response('Not Found', { status: 404 });
  return Response.json(user);
};

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(params.id).run();
  return new Response(null, { status: 204 });
};
```

Named exports per HTTP method: `onRequestGet`, `onRequestPost`, `onRequestPut`, `onRequestPatch`, `onRequestDelete`, `onRequest` (all methods).

### Middleware

```typescript
// functions/_middleware.ts
import type { PagesFunction } from '@cloudflare/workers-types';

const authMiddleware: PagesFunction = async ({ request, next, data }) => {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return new Response('Unauthorized', { status: 401 });

  data.user = await verifyToken(token);  // attach to context
  return next();
};

const loggingMiddleware: PagesFunction = async ({ request, next }) => {
  const start = Date.now();
  const response = await next();
  console.log(`${request.method} ${request.url} → ${response.status} (${Date.now() - start}ms)`);
  return response;
};

export const onRequest = [loggingMiddleware, authMiddleware];
```

### `_routes.json` (Exclude Static Paths)

```json
{
  "version": 1,
  "include": ["/api/*", "/auth/*"],
  "exclude": []
}
```

Use this to keep unlimited free static requests — only dynamic routes invoke Functions.

---

## 4. Bindings Overview

Bindings give Workers and Pages Functions access to Cloudflare services. They are injected as properties on the `env` object.

```toml
# wrangler.toml binding declarations

[[kv_namespaces]]
binding = "SESSIONS"
id = "your-namespace-id"

[[d1_databases]]
binding = "DB"
database_name = "my-app"
database_id = "your-db-id"

[[r2_buckets]]
binding = "UPLOADS"
bucket_name = "my-uploads"

[[durable_objects.bindings]]
name = "ROOMS"
class_name = "ChatRoom"

[[queues.producers]]
binding = "EMAIL_QUEUE"
queue = "email-jobs"

[[queues.consumers]]
queue = "email-jobs"
max_batch_size = 10
max_batch_timeout = 30

[ai]
binding = "AI"
```

---

## 5. D1 Database

**Status:** GA (April 2024). Global read replication in beta (2025).

D1 is SQLite-based serverless SQL. Each database runs in a single primary region with optional read replicas.

### Create & Migrate

```bash
# Create a database
wrangler d1 create my-database

# Apply migrations
wrangler d1 migrations apply my-database

# Execute SQL directly
wrangler d1 execute my-database --command "SELECT * FROM users LIMIT 5"
wrangler d1 execute my-database --file ./seed.sql

# Local dev (persisted in .wrangler/state/)
wrangler d1 execute my-database --local --command "SELECT 1"
```

### Migration Files

```bash
# Create migration file
wrangler d1 migrations create my-database add-users-table
# → migrations/0001_add-users-table.sql
```

```sql
-- migrations/0001_add-users-table.sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users(email);
```

### Query API

```typescript
const env: Env; // from handler

// Single row
const user = await env.DB
  .prepare('SELECT * FROM users WHERE id = ?')
  .bind(userId)
  .first<User>();

// Multiple rows
const { results } = await env.DB
  .prepare('SELECT * FROM users WHERE active = ?')
  .bind(1)
  .all<User>();

// Insert/update/delete
const { success, meta } = await env.DB
  .prepare('INSERT INTO users (email, name) VALUES (?, ?)')
  .bind(email, name)
  .run();

console.log(meta.last_row_id); // inserted ID

// Batch (atomic)
const [r1, r2] = await env.DB.batch([
  env.DB.prepare('INSERT INTO orders (user_id) VALUES (?)').bind(userId),
  env.DB.prepare('UPDATE users SET order_count = order_count + 1 WHERE id = ?').bind(userId),
]);

// Raw SQL (returns array of arrays)
const raw = await env.DB.prepare('PRAGMA table_info(users)').raw();
```

### Consistency Notes

- **Primary write region:** Single primary; writes go there.
- **Read replication (beta):** Reads can be served from nearest replica with slight eventual consistency lag.
- **Local dev:** Uses a local SQLite file in `.wrangler/state/`. Schema/data won't sync automatically.

### D1 Limits

| Metric | Free | Paid |
|--------|------|------|
| Databases | 10 | 50,000 |
| Max DB size | 500 MB | 10 GB |
| Rows read/day | 5M | 25B/mo included |
| Rows written/day | 100k | 50M/mo included |

---

## 6. R2 Object Storage

R2 is S3-compatible object storage with **zero egress fees**.

### Bucket Setup

```bash
wrangler r2 bucket create my-bucket
wrangler r2 object put my-bucket/hello.txt --file ./hello.txt
wrangler r2 object get my-bucket/hello.txt
wrangler r2 object list my-bucket
```

### R2 Binding API

```typescript
const env: Env;

// Upload
await env.MY_BUCKET.put('path/to/file.jpg', fileBuffer, {
  httpMetadata: { contentType: 'image/jpeg' },
  customMetadata: { userId: '123' },
});

// Download
const object = await env.MY_BUCKET.get('path/to/file.jpg');
if (!object) return new Response('Not Found', { status: 404 });
return new Response(object.body, {
  headers: { 'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream' },
});

// List
const listed = await env.MY_BUCKET.list({ prefix: 'uploads/', limit: 100 });
for (const obj of listed.objects) {
  console.log(obj.key, obj.size);
}

// Delete
await env.MY_BUCKET.delete('path/to/file.jpg');

// Head (metadata only, no body)
const head = await env.MY_BUCKET.head('path/to/file.jpg');
console.log(head?.size, head?.uploaded);
```

### Public Access Options

| Option | How |
|--------|-----|
| Public bucket | Enable in Dashboard — zero-auth direct URL |
| Custom domain | Map `files.example.com` to the R2 bucket |
| Worker proxy | Stream through a Worker for auth/transforms |
| Presigned URLs | R2 binding doesn't support them natively — use the S3-compatible API with `aws4fetch` + your R2 access keys |

### R2 Pricing

| Tier | Storage | Class A (writes) | Class B (reads) | Egress |
|------|---------|-----------------|-----------------|--------|
| Free | 10 GB | 1M ops/mo | 10M ops/mo | Free |
| Paid | $0.015/GB-mo | $4.50/M ops | $0.36/M ops | Free |

---

## 7. KV

KV is an eventually consistent key-value store — optimized for high read throughput globally.

### KV API

```typescript
const env: Env;

// Write
await env.MY_KV.put('user:123', JSON.stringify({ name: 'Alice' }));

// Write with TTL (seconds)
await env.MY_KV.put('session:abc', token, { expirationTtl: 3600 });

// Write with absolute expiration (Unix timestamp)
await env.MY_KV.put('temp:key', value, { expiration: Math.floor(Date.now() / 1000) + 3600 });

// Read (string)
const value = await env.MY_KV.get('user:123');

// Read (JSON)
const user = await env.MY_KV.get<User>('user:123', 'json');

// Read (ArrayBuffer or stream)
const buf = await env.MY_KV.get('file', 'arrayBuffer');

// Read with metadata
const { value: v, metadata } = await env.MY_KV.getWithMetadata('user:123');

// Delete
await env.MY_KV.delete('user:123');

// List keys (up to 1000 per call)
const list = await env.MY_KV.list({ prefix: 'user:', limit: 100 });
for (const key of list.keys) {
  console.log(key.name, key.expiration, key.metadata);
}
```

### Caching Patterns

KV is best for: feature flags, session tokens with TTL, cached API responses, globally distributed config.

**Not good for:** high-frequency writes, counters, strong consistency. Use Durable Objects or D1 instead.

### KV Limits

| Metric | Free | Paid |
|--------|------|------|
| Namespaces | 100 (increased to 1000 in Jan 2025) | 1000 |
| Reads/day | 100k | Pay-per-use |
| Writes/day | 1k | Pay-per-use |
| Max value size | 25 MB | 25 MB |
| Max key size | 512 bytes | 512 bytes |

---

## 8. Environment Variables & Secrets

### Vars vs Secrets

| | `[vars]` in wrangler.toml | Secrets |
|-|--------------------------|---------|
| **Visibility** | Committed to repo | Never in source control |
| **Encryption** | Plaintext | Encrypted at rest |
| **Set via** | wrangler.toml | `wrangler secret put` / Dashboard |
| **Use for** | Non-sensitive config | API keys, tokens, passwords |

### wrangler.toml

```toml
[vars]
API_URL = "https://api.example.com"
DEBUG = "false"

# Per-environment overrides
[env.staging.vars]
API_URL = "https://staging.api.example.com"
DEBUG = "true"
```

### Secrets CLI

```bash
# Set a secret (prompted for value)
wrangler secret put MY_API_KEY

# Set for a specific environment
wrangler secret put MY_API_KEY --env staging

# List secrets (names only, values never shown)
wrangler secret list

# Delete
wrangler secret delete MY_API_KEY
```

### Access in Worker

```typescript
export interface Env {
  API_URL: string;       // var
  MY_API_KEY: string;    // secret — same access pattern
  DB: D1Database;        // binding
}

export default {
  async fetch(request: Request, env: Env) {
    const resp = await fetch(env.API_URL, {
      headers: { Authorization: `Bearer ${env.MY_API_KEY}` },
    });
    return resp;
  },
};
```

### Pages Secrets

Set via Dashboard (Settings → Environment Variables) or:

```bash
wrangler pages secret put MY_SECRET --project-name my-site
```

---

## 9. Custom Domains & Routing

### Workers Routes

Map a Worker to a hostname/path pattern:

```toml
# wrangler.toml
routes = [
  { pattern = "example.com/api/*", zone_name = "example.com" },
  { pattern = "*.example.com/*", zone_name = "example.com" },
]
```

Or use `workers.dev` subdomain (enabled by default for dev):

```toml
workers_dev = true   # default
```

### Pages Custom Domains

Add via Dashboard → Pages project → Custom domains. Cloudflare handles SSL automatically for zones on Cloudflare. For external DNS, add a CNAME to `<project>.pages.dev`.

### `_redirects` and `_headers`

Place in your Pages output directory:

```
# public/_redirects
/old-path  /new-path  301
/blog/*    /posts/:splat  200

# public/_headers
/api/*
  Access-Control-Allow-Origin: *
  Cache-Control: no-store
```

---

## 10. Workers AI & Vectorize

### Workers AI

Run inference at the edge — no GPU provisioning needed.

```typescript
// wrangler.toml
[ai]
binding = "AI"
```

```typescript
export interface Env {
  AI: Ai;
}

export default {
  async fetch(request: Request, env: Env) {
    // Text generation
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Summarize this in 3 bullets: ...' },
      ],
    });

    // Embeddings
    const embeddings = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: ['Hello world', 'Goodbye world'],
    });

    // Image classification
    const result = await env.AI.run('@cf/microsoft/resnet-50', {
      image: [...new Uint8Array(imageBuffer)],
    });

    return Response.json(response);
  },
};
```

Common models:
- Text: `@cf/meta/llama-3.1-8b-instruct`, `@cf/mistral/mistral-7b-instruct-v0.1`
- Embeddings: `@cf/baai/bge-base-en-v1.5`, `@cf/baai/bge-large-en-v1.5`
- Image: `@cf/microsoft/resnet-50`
- Speech: `@cf/openai/whisper`

### Vectorize

Cloudflare's vector database — pairs with Workers AI embeddings.

```bash
# Create an index
wrangler vectorize create my-index --dimensions=768 --metric=cosine
```

```typescript
// wrangler.toml
[[vectorize]]
binding = "VECTORIZE"
index_name = "my-index"
```

```typescript
// Upsert vectors
await env.VECTORIZE.upsert([
  { id: 'doc-1', values: embeddingArray, metadata: { title: 'My Doc' } },
]);

// Query
const results = await env.VECTORIZE.query(queryEmbedding, {
  topK: 5,
  returnMetadata: 'all',
});
```

---

## 11. Node.js Compatibility Mode

Workers run on V8 isolates — not Node.js. Many Node.js built-ins require the compat flag.

### Enable

```toml
# wrangler.toml
compatibility_flags = ["nodejs_compat"]
compatibility_date = "2024-09-23"
```

### What's Available with `nodejs_compat`

- `node:crypto`, `node:buffer`, `node:stream`, `node:path`, `node:url`
- `node:util`, `node:events`, `node:assert`, `node:querystring`
- Partial: `node:fs` (limited — no real filesystem), `node:child_process` (not available)

### What's Not Available

- `node:fs` real disk access
- `node:child_process`, `node:cluster`
- Native modules (`.node` files)
- `__dirname`, `__filename` (use `import.meta.url` instead)

### Runtime APIs Always Available

- `fetch`, `Request`, `Response`, `Headers`
- `URL`, `URLSearchParams`
- `crypto.subtle` (Web Crypto)
- `TextEncoder`, `TextDecoder`
- `ReadableStream`, `WritableStream`, `TransformStream`
- `WebSocket` (outbound)
- `caches` (Cache API)

---

## 12. Pricing & Limits

### Workers

| Metric | Free | Paid ($5/mo base) |
|--------|------|-------------------|
| Requests/day | 100k | 10M/mo included |
| CPU ms/mo | 10ms/req | 30M included |
| Memory | 128 MB | 128 MB |
| Bundle size (compressed) | 1 MB | 10 MB |
| Subrequests/request | 50 | 1,000 |
| Env vars | 64 (1 KB each) | 64 (1 KB each) |

**CPU billing** (Paid): $0.02 per million CPU-milliseconds above 30M.
**Request billing** (Paid): $0.30 per million above 10M.
Idle time waiting on `fetch()`, D1 queries, KV reads — free.

Extended CPU (up to 5 minutes) available via `cpu_ms` in wrangler.toml (Paid only).

### Pages

| Metric | Free | Paid |
|--------|------|------|
| Static requests | Unlimited | Unlimited |
| Functions requests/day | 100k | 10M/mo included |
| Builds/month | 500 | 5,000 |
| Bandwidth | Unlimited | Unlimited |
| Custom domains | 100 | 250 |

### D1

| Metric | Free | Paid |
|--------|------|------|
| Databases | 10 | 50,000 |
| Max DB size | 500 MB | 10 GB |
| Rows read/day | 5M | 25B/mo |
| Rows written/day | 100k | 50M/mo |

### R2

| Tier | Storage | Class A (PUT/POST) | Class B (GET) | Egress |
|------|---------|-------------------|---------------|--------|
| Free | 10 GB | 1M/mo | 10M/mo | Free |
| Paid | $0.015/GB-mo | $4.50/M | $0.36/M | Free |

### KV

| Metric | Free | Paid |
|--------|------|------|
| Namespaces | 1,000 | 1,000 |
| Reads/day | 100k | $0.50/M |
| Writes/day | 1k | $5.00/M |
| Deletes/day | 1k | $5.00/M |
| Lists/day | 1k | $5.00/M |
| Storage | 1 GB | $0.50/GB-mo |

---

## 13. Common Mistakes

| Mistake | Wrong | Right |
|---------|-------|-------|
| **Env vars** | `process.env.API_KEY` | `env.API_KEY` from handler context |
| **Fire-and-forget** | `fetch(url)` before return | `ctx.waitUntil(fetch(url))` |
| **D1 SELECT** | `.run()` (no rows) | `.all<T>()` or `.first<T>()` |
| **Node modules** | `import crypto from 'crypto'` without flag | Add `compatibility_flags = ["nodejs_compat"]` |
| **Missing account_id** | Omit from wrangler.toml | Required for D1, R2, Durable Objects |
| **Worker entrypoint** | Named export | `export default { async fetch(...) {} }` |
| **KV counters** | `KV.put('counter', n+1)` | Use Durable Objects for strong consistency |
| **R2 large uploads** | `await request.arrayBuffer()` then put | Stream directly: `env.BUCKET.put('file', request.body)` |

### CI Authentication

```bash
export CLOUDFLARE_API_TOKEN="your-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
wrangler deploy
```
