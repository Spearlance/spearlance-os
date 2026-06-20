---
model: claude-sonnet-4-6
name: hono
description: Use when building APIs or web servers with Hono — routing, middleware, edge deployment, or multi-runtime support. Also use when deploying to Cloudflare Workers, Vercel Edge, Bun, Deno, or Node.js with a lightweight framework.
---

# hono

Hono is a lightweight (~14KB), fast web framework built on Web Standards. Runs on Cloudflare Workers, Bun, Deno, Node.js, Vercel Edge, Netlify, and AWS Lambda from one codebase.

## Quick Reference

| | |
|---|---|
| **Version** | 4.12.0 (latest) |
| **Install** | `npm create hono@latest` |
| **Size** | <14KB minified |
| **Node.js min** | 18.14.1+ |

## Runtimes

| Runtime | Adapter | Port |
|---|---|---|
| Cloudflare Workers | built-in | 8787 |
| Node.js | `@hono/node-server` | 3000 |
| Bun | built-in | 3000 |
| Deno | built-in | 8000 |
| Vercel Edge | built-in | — |

## Setup

**Cloudflare Workers:**
```bash
npm create hono@latest my-app  # select cloudflare-workers
npx wrangler dev               # localhost:8787
npx wrangler deploy
```

**Node.js:**
```typescript
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
const app = new Hono()
app.get('/', (c) => c.text('Hello!'))
serve(app)
```

**Bun:**
```typescript
import { Hono } from 'hono'
const app = new Hono()
app.get('/', (c) => c.text('Hello!'))
export default app  // Bun reads this directly
```

## Routing

```typescript
app.get('/users/:id', (c) => c.json({ id: c.req.param('id') }))
app.post('/users', handler)
app.on(['GET', 'POST'], '/multi', handler)

const api = new Hono().basePath('/api')
app.route('/api', api)  // mount sub-router
```

## Middleware

```typescript
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { jwt } from 'hono/jwt'

app.use('*', logger())
app.use('/api/*', cors())
app.use('/auth/*', jwt({ secret: c.env.JWT_SECRET, alg: 'HS256' }))
```

## Common Mistakes

- `process.env` does not work in Cloudflare Workers — use `c.env.VAR`
- JWT middleware requires `alg` field explicitly (HS256 minimum)
- Zod validators must go in the route handler, not `app.use()`, for type inference
- Use `c.json()` with explicit status codes (not `c.notFound()`) for RPC type safety
- `export type AppType = typeof app` must be exported for RPC client

## Full Reference

See `reference.md` in this directory for complete docs: installation, all middleware, RPC/hc client, validation, testing, error handling, and per-runtime deployment.
