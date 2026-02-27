# Redis / Upstash Reference

> **Last Updated:** February 2026
> **Console:** `https://console.upstash.com`
> **Docs:** `https://upstash.com/docs`
> **SDK (@upstash/redis):** `https://github.com/upstash/redis-js`

---

## Table of Contents

1. [Setup](#setup)
2. [Core Operations](#core-operations)
3. [Caching Patterns](#caching-patterns)
4. [Rate Limiting](#rate-limiting)
5. [QStash — Message Queues](#qstash--message-queues)
6. [Session Storage](#session-storage)
7. [Pub/Sub and Real-time](#pubsub-and-real-time)
8. [Vector Search](#vector-search)
9. [Serverless Considerations](#serverless-considerations)
10. [Pricing and Limits](#pricing-and-limits)
11. [Common Mistakes](#common-mistakes)

---

## Setup

### Create a Database

1. Go to `https://console.upstash.com`
2. Click **Create Database**
3. Select region closest to your compute (co-locate for lowest latency)
4. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from the database dashboard

### Install SDKs

```bash
# Core Redis SDK
npm install @upstash/redis

# Rate limiting
npm install @upstash/ratelimit

# Message queue / scheduler
npm install @upstash/qstash

# Vector search
npm install @upstash/vector
```

### Initialize the Client

```ts
import { Redis } from "@upstash/redis";

// Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from environment automatically
const redis = Redis.fromEnv();

// Or explicitly:
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

**Critical:** Initialize outside the request handler. The SDK instance caches HTTP connection state while the function is warm, reducing overhead on subsequent requests.

```ts
// Good — module-level singleton
const redis = Redis.fromEnv();

export async function GET(req: Request) {
  return redis.get("key");
}

// Bad — new client per request
export async function GET(req: Request) {
  const redis = Redis.fromEnv(); // wasteful
  return redis.get("key");
}
```

### REST API (Direct HTTP)

Every Redis command maps to a REST endpoint. Use this if you can't install npm packages.

```bash
# GET
curl https://<UPSTASH_REDIS_REST_URL>/get/mykey \
  -H "Authorization: Bearer <UPSTASH_REDIS_REST_TOKEN>"

# SET
curl https://<UPSTASH_REDIS_REST_URL>/set/mykey/myvalue \
  -H "Authorization: Bearer <UPSTASH_REDIS_REST_TOKEN>"
```

Response format:
```json
{ "result": "myvalue" }
```

### Redis Protocol (TCP)

Upstash also supports standard Redis protocol (for non-serverless environments):

```
redis://default:<password>@<host>:<port>
```

Use `ioredis` or `node-redis` with TCP in traditional Node.js servers. For serverless/edge, always use the HTTP SDK.

---

## Core Operations

### Strings

```ts
// Set with TTL (seconds)
await redis.set("user:session:abc", JSON.stringify(user), { ex: 3600 });

// Set only if not exists
await redis.set("lock:resource", "1", { ex: 30, nx: true });

// Get
const value = await redis.get<User>("user:123");

// Delete
await redis.del("user:session:abc");

// Atomic increment
await redis.incr("page:views");
await redis.incrby("page:views", 5);

// Expire (update TTL on existing key)
await redis.expire("user:123", 7200);

// Check TTL remaining
const ttl = await redis.ttl("user:123"); // -2 = missing, -1 = no TTL
```

### Hashes

```ts
// Set fields
await redis.hset("product:42", {
  name: "Widget",
  price: "9.99",
  stock: "100",
});

// Get single field
const name = await redis.hget("product:42", "name");

// Get all fields
const product = await redis.hgetall("product:42");

// Increment a hash field
await redis.hincrby("product:42", "stock", -1);

// Delete fields
await redis.hdel("product:42", "oldField");
```

### Lists

```ts
// Push to head/tail
await redis.lpush("queue:emails", JSON.stringify(job));
await redis.rpush("queue:emails", JSON.stringify(job));

// Pop from head/tail
const job = await redis.lpop<EmailJob>("queue:emails");
const job = await redis.rpop<EmailJob>("queue:emails");

// Blocking pop (waits up to 5 seconds)
const [list, job] = await redis.blpop("queue:emails", 5);

// Inspect without removing
const items = await redis.lrange("queue:emails", 0, -1); // 0 to end
const length = await redis.llen("queue:emails");
```

### Sorted Sets

```ts
// Add members with scores
await redis.zadd("leaderboard", {
  score: 1500,
  member: "user:alice",
});

// Get rank (0-indexed, lowest score first)
const rank = await redis.zrank("leaderboard", "user:alice");

// Get top N (highest scores — reverse order)
const top10 = await redis.zrange("leaderboard", 0, 9, { rev: true, withScores: true });

// Score for a member
const score = await redis.zscore("leaderboard", "user:alice");

// Remove member
await redis.zrem("leaderboard", "user:alice");
```

### Sets

```ts
// Add members
await redis.sadd("online:users", "alice", "bob");

// Check membership
const isOnline = await redis.sismember("online:users", "alice");

// Remove
await redis.srem("online:users", "alice");

// All members
const onlineUsers = await redis.smembers("online:users");

// Set size
const count = await redis.scard("online:users");
```

### Pipeline (Batch Commands)

Send multiple commands in a single HTTP request:

```ts
const pipeline = redis.pipeline();
pipeline.set("key1", "value1");
pipeline.set("key2", "value2");
pipeline.get("key1");
const results = await pipeline.exec();
// results = ["OK", "OK", "value1"]
```

### Transactions (MULTI/EXEC)

```ts
const tx = redis.multi();
tx.incr("counter");
tx.expire("counter", 60);
await tx.exec();
```

---

## Caching Patterns

### Cache-Aside (Lazy Loading)

Most common pattern — fetch from cache, fall back to source of truth on miss.

```ts
async function getUser(id: string): Promise<User> {
  const key = `user:${id}`;

  // 1. Check cache
  const cached = await redis.get<User>(key);
  if (cached) return cached;

  // 2. Fetch from DB
  const user = await db.users.findById(id);
  if (!user) throw new Error("Not found");

  // 3. Populate cache with TTL
  await redis.set(key, user, { ex: 3600 });

  return user;
}
```

### Write-Through

Update cache on every write — keeps cache warm, avoids stale reads.

```ts
async function updateUser(id: string, data: Partial<User>): Promise<User> {
  const user = await db.users.update(id, data);
  await redis.set(`user:${id}`, user, { ex: 3600 });
  return user;
}
```

### Write-Behind (Async)

Write to cache immediately, queue DB write — high throughput but risk of data loss on crash. Use only when eventual consistency is acceptable.

### Cache Invalidation

```ts
// Invalidate on update
async function updateUser(id: string, data: Partial<User>) {
  await db.users.update(id, data);
  await redis.del(`user:${id}`);
}

// Wildcard invalidation (use scan — avoid KEYS in production)
async function invalidateUserCache(id: string) {
  let cursor = 0;
  do {
    const [nextCursor, keys] = await redis.scan(cursor, {
      match: `user:${id}:*`,
      count: 100,
    });
    if (keys.length) await redis.del(...keys);
    cursor = Number(nextCursor);
  } while (cursor !== 0);
}
```

### TTL Strategies

| Pattern | TTL | Use Case |
|---------|-----|----------|
| Session data | 30–60 min | Auth tokens, user sessions |
| User profiles | 1–24 hours | Infrequently updated records |
| Product catalog | 5–30 min | E-commerce listings |
| Config/flags | 1–5 min | Feature flags, app config |
| API responses | 30–300 sec | Third-party API results |
| Rate limit counters | Window duration | Always matches the window |

### Memoization Helper

```ts
async function cached<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  const hit = await redis.get<T>(key);
  if (hit !== null) return hit;
  const value = await fn();
  await redis.set(key, value, { ex: ttl });
  return value;
}

// Usage
const products = await cached("products:featured", 300, () =>
  db.products.findFeatured()
);
```

---

## Rate Limiting

### Install

```bash
npm install @upstash/ratelimit @upstash/redis
```

### Algorithms

**Sliding Window** — smooth, prevents bursting at window boundaries. Costs 2 Redis commands per request.

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true, // logs to Upstash console
});
```

**Fixed Window** — cheaper (1 command), resets at fixed interval boundaries. Use for multi-region.

```ts
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(100, "1 m"),
});
```

**Token Bucket** — allows controlled bursting up to bucket capacity.

```ts
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.tokenBucket(10, "1 s", 50), // 10/sec refill, 50 max burst
});
```

### Next.js Middleware Integration

```ts
// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "10 s"),
});

export async function middleware(req: NextRequest) {
  const ip = req.ip ?? req.headers.get("x-forwarded-for") ?? "anonymous";
  const { success, limit, remaining, reset } = await ratelimit.limit(ip);

  if (!success) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": reset.toString(),
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
```

### Per-User Rate Limiting

```ts
const identifier = `api:${req.userId}`;
const { success } = await ratelimit.limit(identifier);
```

### Multi-Region Setup

```ts
import { MultiRegionRatelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new MultiRegionRatelimit({
  redis: [
    new Redis({ url: process.env.UPSTASH_US_URL!, token: process.env.UPSTASH_US_TOKEN! }),
    new Redis({ url: process.env.UPSTASH_EU_URL!, token: process.env.UPSTASH_EU_TOKEN! }),
  ],
  limiter: MultiRegionRatelimit.fixedWindow(10, "10 s"), // use fixedWindow for multi-region
});
```

### Response Object

```ts
const { success, limit, remaining, reset, pending } = await ratelimit.limit(id);
// success   — boolean: allowed or blocked
// limit     — max requests in window
// remaining — requests left in current window
// reset     — unix timestamp when window resets
// pending   — Promise to await if analytics enabled
```

---

## QStash — Message Queues

QStash is Upstash's HTTP-based message queue and job scheduler. No polling — QStash pushes to your endpoint via HTTP POST with automatic retries.

### Setup

```bash
npm install @upstash/qstash
```

```ts
import { Client } from "@upstash/qstash";

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });
```

Get `QSTASH_TOKEN` from `https://console.upstash.com` → QStash tab.

### Publish a Message

```ts
// Fire-and-forget: QStash calls your endpoint once
await qstash.publishJSON({
  url: "https://your-app.com/api/jobs/process-order",
  body: { orderId: "ord_123", userId: "usr_456" },
});
```

### Publish with Options

```ts
await qstash.publishJSON({
  url: "https://your-app.com/api/jobs/send-email",
  body: { to: "user@example.com", template: "welcome" },
  retries: 5,                          // retry up to 5 times on non-2xx
  delay: "30s",                        // deliver after 30 seconds
  headers: {
    "X-Custom-Header": "value",
  },
  timeout: 30,                         // endpoint must respond within 30s
  notBefore: Math.floor(Date.now() / 1000) + 3600, // unix timestamp — deliver in 1 hour
});
```

### Schedule with Cron

```ts
// Create a recurring schedule
const schedule = await qstash.schedules.create({
  destination: "https://your-app.com/api/cron/daily-report",
  cron: "0 9 * * *",  // 9am UTC every day
  body: JSON.stringify({ report: "daily" }),
  headers: { "Content-Type": "application/json" },
});

// List schedules
const schedules = await qstash.schedules.list();

// Delete a schedule
await qstash.schedules.delete(schedule.scheduleId);
```

### Receiving Messages (Your Endpoint)

Your endpoint receives a standard HTTP POST. Verify the QStash signature to prevent spoofing:

```ts
// app/api/jobs/process-order/route.ts
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

async function handler(req: Request) {
  const body = await req.json();
  const { orderId, userId } = body;

  // process job...

  return new Response("OK"); // Return 2xx — QStash considers delivered
}

export const POST = verifySignatureAppRouter(handler);
```

Add `QSTASH_CURRENT_SIGNING_KEY` and `QSTASH_NEXT_SIGNING_KEY` from the console to `.env`.

### Retry Behavior

| Attempt | Default Delay |
|---------|--------------|
| 1st retry | ~10 seconds |
| 2nd retry | ~30 seconds |
| 3rd retry | ~2 minutes |
| ... | Exponential backoff |

Max retries: 3 (Free), configurable on paid plans. Permanently failed messages go to the Dead Letter Queue (DLQ).

### Dead Letter Queue

```ts
// List failed messages
const dlq = await qstash.dlq.listMessages();

// Retry a failed message
await qstash.dlq.deleteMessages({ dlqIds: [dlq.messages[0].dlqId] });
```

### Local Development

QStash requires a public URL. Use a tunnel:

```bash
npx ngrok http 3000
# Use the ngrok URL as your destination
```

Or use QStash's built-in simulator for local testing:

```ts
import { Receiver } from "@upstash/qstash";
// Skip signature verification in development
```

---

## Session Storage

Store sessions in Redis with TTL-based expiration.

### Basic Session Pattern

```ts
import { Redis } from "@upstash/redis";
import { v4 as uuidv4 } from "uuid";

const redis = Redis.fromEnv();
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days in seconds

// Create session
async function createSession(userId: string, data: object): Promise<string> {
  const sessionId = uuidv4();
  await redis.set(`session:${sessionId}`, { userId, ...data }, { ex: SESSION_TTL });
  return sessionId;
}

// Read session
async function getSession(sessionId: string) {
  return redis.get<{ userId: string }>(`session:${sessionId}`);
}

// Extend session (sliding expiry)
async function touchSession(sessionId: string) {
  await redis.expire(`session:${sessionId}`, SESSION_TTL);
}

// Destroy session
async function destroySession(sessionId: string) {
  await redis.del(`session:${sessionId}`);
}
```

### With Next.js Cookies

```ts
// app/api/auth/login/route.ts
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const user = await authenticateUser(email, password);

  const sessionId = await createSession(user.id, { role: user.role });

  cookies().set("sid", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  return new Response(JSON.stringify({ ok: true }));
}
```

**Force-logout all sessions:** track session IDs in a Set keyed by user (`user:${userId}:sessions`), then `smembers` + `del` all.

---

## Pub/Sub and Real-time

Upstash Redis supports standard Redis pub/sub. Note: pub/sub requires a persistent connection — use TCP protocol (standard Redis client), not the HTTP SDK.

### Setup for Pub/Sub

```bash
npm install ioredis
```

```ts
import Redis from "ioredis";

// Use Redis protocol connection string from Upstash console
const publisher = new Redis(process.env.UPSTASH_REDIS_URL!);
const subscriber = new Redis(process.env.UPSTASH_REDIS_URL!);
```

### Publish

```ts
await publisher.publish("notifications", JSON.stringify({
  type: "order:shipped",
  orderId: "ord_123",
  userId: "usr_456",
}));
```

### Subscribe

```ts
subscriber.subscribe("notifications", (err) => {
  if (err) throw err;
});

subscriber.on("message", (channel, message) => {
  const event = JSON.parse(message);
  // handle event
});
```

### Serverless Limitation

Pub/sub requires a persistent TCP connection — it doesn't work well in serverless functions that terminate after each request. For real-time in serverless:
- Use **Server-Sent Events (SSE)** with a polling Redis key
- Use **Pusher/Ably** for managed WebSocket infrastructure
- Use **QStash** for event-driven background processing instead

---

## Vector Search

Upstash Vector is a separate product from Upstash Redis — create a separate index in the console.

### Setup

```bash
npm install @upstash/vector
```

```ts
import { Index } from "@upstash/vector";

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});
```

### Upsert Vectors

```ts
// With pre-computed embeddings
await index.upsert([
  {
    id: "doc-1",
    vector: [0.1, 0.2, 0.3, ...], // must match index dimensions
    metadata: { title: "Getting Started", source: "docs" },
  },
]);

// With built-in embedding models (text input)
await index.upsert([
  {
    id: "doc-1",
    data: "Getting started with Upstash Vector",
    metadata: { category: "docs" },
  },
]);
```

### Query

```ts
// Semantic similarity search
const results = await index.query({
  data: "how do I get started?", // query string (embedded automatically)
  topK: 5,
  includeMetadata: true,
  filter: "category = 'docs'",  // optional metadata filter
});

// results[0].score — cosine similarity (0-1, higher = more similar)
// results[0].metadata — attached metadata
// results[0].id — vector ID
```

### Hybrid Search (2025)

Combines dense (semantic) + sparse (keyword) vectors for better relevance:

```ts
const results = await index.query({
  data: "vector database tutorial",
  topK: 10,
  includeMetadata: true,
  fusionAlgorithm: "RRF", // Reciprocal Rank Fusion
});
```

### Delete Vectors

```ts
await index.delete(["doc-1", "doc-2"]);
```

### Index Info

```ts
const info = await index.info();
// info.vectorCount, info.dimension, info.similarityFunction
```

### Similarity Functions

| Function | Use Case |
|----------|----------|
| `COSINE` | Most common — text, semantic search |
| `EUCLIDEAN` | Image embeddings, spatial data |
| `DOT_PRODUCT` | When vectors are pre-normalized |

---

## Serverless Considerations

### HTTP vs TCP

| | Upstash HTTP SDK | Standard Redis (TCP) |
|---|---|---|
| **Protocol** | HTTPS REST | TCP |
| **Connections** | Stateless — no pool needed | Requires connection pool |
| **Serverless** | Native — works in Lambda, Vercel, Edge | Connection management overhead |
| **Edge Runtime** | Yes — runs in Cloudflare Workers, Vercel Edge | No — TCP not available |
| **Latency** | ~1ms same-region (when warm) | <1ms (persistent connection) |
| **Cold start** | No connection overhead | Connection establishment adds latency |

### Region Co-location

Upstash database region and your compute region must match. Cross-region adds 50–200ms latency.

| Compute | Recommended Upstash Region |
|---------|---------------------------|
| Vercel (us-east-1) | `us-east-1` |
| Vercel (eu-west-1) | `eu-west-1` |
| AWS Lambda us-east-2 | `us-east-2` |
| Cloudflare (global) | Enable global replication |

### Global Replication

Upstash can replicate data across multiple regions for edge deployments. Read from nearest region, write to primary. Available on paid plans.

```ts
// Global replication is transparent to SDK — same initialization
const redis = Redis.fromEnv();
```

### Edge Runtime Compatibility

Works in Cloudflare Workers, Vercel Edge Middleware, Deno Deploy — any runtime that supports `fetch`.

```ts
// Cloudflare Worker
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const redis = new Redis({ url: env.UPSTASH_URL, token: env.UPSTASH_TOKEN });
    const value = await redis.get("key");
    return new Response(value ?? "not found");
  },
};
```

---

## Pricing and Limits

### Redis (Updated March 2025)

| Plan | Price | Commands | Storage | Bandwidth |
|------|-------|----------|---------|-----------|
| **Free** | $0 | 500K/month | 256MB | 200GB/month |
| **Pay-as-You-Go** | Per command | Unlimited | 100GB | 200GB free, then $0.03/GB |
| **Fixed — 250MB** | Fixed monthly | Unlimited | 250MB | Included |
| **Fixed — 1GB** | Fixed monthly | Unlimited | 1GB | Included |
| **Fixed — 5GB+** | Fixed monthly | Unlimited | Up to 500GB | Included |

**Prod Pack** (optional add-on): production-grade features for individual databases — enhanced persistence, dedicated IP, SLA.

### QStash

| Plan | Price | Messages | Schedules |
|------|-------|----------|-----------|
| **Free** | $0 | 500 messages/day | 5 |
| **Pay-as-You-Go** | Per message | Unlimited | Unlimited |

### Vector

| Plan | Price | Storage | Queries |
|------|-------|---------|---------|
| **Free** | $0 | 10K vectors | 10K queries/day |
| **Pay-as-You-Go** | Per query | Unlimited | Unlimited |

### Limits

| Limit | Free | Paid |
|-------|------|------|
| Max value size | 100MB | 100MB |
| Max connections | 100 | 1000+ |
| Max key length | 512MB | 512MB |
| QStash max retries | 3 | Configurable |
| QStash max delay | 90 days | 90 days |
| QStash endpoint timeout | 15 min | 15 min |

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Client initialized inside handler | Move `Redis.fromEnv()` to module scope — reuse across warm invocations |
| Using `ioredis` / `redis` in edge/serverless | Those use TCP — use `@upstash/redis` (HTTP) in serverless/edge |
| Forgetting TTL on cached values | Always pass `{ ex: seconds }` — unbounded keys persist and consume storage |
| Using `KEYS *` in production | Use `SCAN` instead — `KEYS` blocks Redis while scanning all keys |
| Sliding window in multi-region | Use `fixedWindow` — sliding window issues 2x commands per region |
| Not verifying QStash signatures | Always use `verifySignatureAppRouter` — any public endpoint is spoofable |
| QStash pointing to localhost | QStash can't reach localhost — use ngrok or Upstash's local dev mode |
| Storing complex nested objects | Redis stores flat strings — serialize with `JSON.stringify` or use Hashes |
| Cross-region database placement | Place database in same region as compute — cross-region adds 50–200ms |
| Not handling null on cache miss | `redis.get()` returns `null` on miss — always check before using value |
| Large payloads without pipelines | Batch multiple operations with `redis.pipeline()` — one HTTP round-trip |
| Pub/sub in serverless functions | Pub/sub needs persistent TCP — use polling or QStash for event-driven serverless |
