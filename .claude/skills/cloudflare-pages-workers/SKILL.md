---
model: claude-sonnet-4-6
name: cloudflare-pages-workers
description: Use when deploying to Cloudflare Pages or Workers — static sites, full-stack apps, edge computing, D1 database, R2 storage, or KV. Also use when choosing between Vercel and Cloudflare or building on the Cloudflare developer platform.
---

# Cloudflare Pages & Workers

## Overview

Wrangler v4 (March 2025). D1 is GA. Containers are in public beta (June 2025). Workers billing is CPU-time based — idle time is free.

## Quick Reference

| Item | Value |
|------|-------|
| **Wrangler version** | v4 (current) |
| **Install** | `npm install -g wrangler` |
| **Login** | `wrangler login` |
| **Dev server** | `wrangler dev` |
| **Deploy Worker** | `wrangler deploy` |
| **Deploy Pages** | `wrangler pages deploy <dir>` |
| **D1 status** | GA (April 2024) + global read replication beta (2025) |
| **Docs** | https://developers.cloudflare.com/workers/ |

## Pages vs Workers

| | Pages | Workers |
|-|-------|---------|
| **Best for** | Static sites + edge functions | Pure APIs, edge compute, microservices |
| **Deploy** | Git push or `wrangler pages deploy` | `wrangler deploy` |
| **Functions** | `/functions` directory, file-based routing | Single entrypoint (`src/index.ts`) |
| **Config** | Dashboard + `wrangler.toml` (optional) | `wrangler.toml` required |
| **Free requests** | Unlimited static, 100k/day dynamic | 100k/day |

## Bindings at a Glance

| Binding | Config key | Use for |
|---------|-----------|---------|
| D1 (SQLite) | `[[d1_databases]]` | Relational data, structured queries |
| R2 (object storage) | `[[r2_buckets]]` | Files, media, zero-egress uploads |
| KV | `[[kv_namespaces]]` | Config, session caching, flags |
| Durable Objects | `[[durable_objects]]` | Stateful coordination, WebSockets |
| Queues | `[[queues]]` | Async jobs, background tasks |
| AI | `[ai]` | Inference via Workers AI models |

## Key Limits

| Resource | Free | Paid |
|----------|------|------|
| Worker requests/day | 100k | 10M/mo included |
| CPU time/request | 10ms (default) | Up to 5min opt-in |
| Memory | 128 MB | 128 MB |
| Worker bundle size | 1 MB (compressed) | 10 MB (compressed) |
| KV reads/day | 100k | Pay-per-use |
| R2 storage | 10 GB | $0.015/GB-mo |
| D1 databases | 10 | 50k |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Env vars in `process.env` | Use `env.MY_VAR` from the handler context |
| Async I/O after response | Cloudflare kills the isolate — use `ctx.waitUntil()` |
| Node.js APIs without compat flag | Add `compatibility_flags = ["nodejs_compat"]` in `wrangler.toml` |
| D1 `await db.run()` for SELECT | Use `db.prepare().all()` or `.first()` |
| Missing `account_id` in `wrangler.toml` | Required for D1, R2, Durable Objects |
| Forgetting `export default` handler | Workers require a default export |

## Full Reference

See `reference.md` for complete documentation including wrangler.toml schemas, Pages Functions routing, all binding APIs, D1 migrations, R2 presigned URLs, environment variable patterns, Workers AI, and pricing details.
