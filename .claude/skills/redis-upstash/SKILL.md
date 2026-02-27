---
model: claude-sonnet-4-6
name: redis-upstash
description: Use when working with Redis or Upstash — caching, rate limiting, queues, session storage, or pub/sub. Also use when adding a caching layer to an existing application or implementing background job processing with serverless-compatible Redis.
---

# Redis / Upstash

## Overview

Upstash is a serverless Redis platform built for edge and serverless environments. HTTP-based — no persistent TCP connections, no connection pools to manage, no cold-start penalties. Pay per request, scale to zero.

Core products: Redis (key-value store), QStash (message queue/scheduler), Vector (vector search).

## Quick Reference

| Item | Value |
|------|-------|
| **Console** | `https://console.upstash.com` |
| **Redis SDK** | `npm install @upstash/redis` |
| **Rate Limit SDK** | `npm install @upstash/ratelimit` |
| **QStash SDK** | `npm install @upstash/qstash` |
| **Free Tier** | 500K commands/month, 256MB storage |
| **PAYG** | Per-command pricing, 200GB bandwidth free/month |

## Setup

```ts
import { Redis } from "@upstash/redis";
// Initialize at module scope — reused while function is hot
const redis = Redis.fromEnv(); // reads UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
```

## Caching Patterns

**Cache-aside:** check cache → miss → fetch DB → populate cache with TTL.
```ts
const cached = await redis.get<User>(`user:${id}`);
if (cached) return cached;
const fresh = await db.getUser(id);
await redis.set(`user:${id}`, fresh, { ex: 3600 });
return fresh;
```

**Invalidation on write:**
```ts
await db.updateUser(id, data);
await redis.del(`user:${id}`);
```

## Rate Limiting

```ts
import { Ratelimit } from "@upstash/ratelimit";
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});
const { success } = await ratelimit.limit(ip);
if (!success) return new Response("Too Many Requests", { status: 429 });
```

Algorithms: `slidingWindow`, `fixedWindow`, `tokenBucket`. Use `fixedWindow` for multi-region — sliding window multiplies Redis commands across regions.

## QStash (Message Queues)

```ts
import { Client } from "@upstash/qstash";
const qstash = new Client({ token: process.env.QSTASH_TOKEN });

// Publish — QStash POSTs to your endpoint with retries
await qstash.publishJSON({
  url: "https://your-app.com/api/jobs/send-email",
  body: { userId: "123" },
  retries: 3,
});

// Schedule — cron syntax
await qstash.schedules.create({
  destination: "https://your-app.com/api/cron/daily",
  cron: "0 9 * * *",
});
```

Your endpoint must return 2xx or QStash retries with exponential backoff. Permanently failed messages go to the Dead Letter Queue.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Client initialized inside handler | Move `Redis.fromEnv()` to module scope |
| Using `ioredis` in serverless/edge | TCP won't work — use `@upstash/redis` HTTP client |
| No TTL on cached values | Always set `ex` — unbounded keys persist forever |
| Sliding window in multi-region | Use `fixedWindow` — fewer Redis commands |
| QStash endpoint not publicly reachable | Use ngrok locally — localhost is unreachable |

## Full Reference

See `reference.md` for complete docs: all data types, caching patterns, rate limiting algorithms, QStash publishing/scheduling, session storage, pub/sub, vector search, serverless considerations, and pricing.
