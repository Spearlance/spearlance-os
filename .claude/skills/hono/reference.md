# Hono Reference

Hono v4.12.0 — Web framework built on Web Standards. Ultra-fast, multi-runtime, TypeScript-first.

---

## 1. Installation & Runtime Adapters

### Scaffold a New Project

```bash
npm create hono@latest my-app
# Prompts for runtime template: cloudflare-workers, nodejs, bun, deno, vercel, etc.
```

### Add to Existing Project

```bash
npm install hono           # core (all runtimes)
npm install @hono/node-server  # Node.js adapter only
```

### Runtime Adapter Table

| Runtime | Adapter Package | Export Pattern | Dev Command |
|---|---|---|---|
| Cloudflare Workers | built-in | `export default app` | `wrangler dev` |
| Node.js | `@hono/node-server` | `serve(app)` | `npm run dev` |
| Bun | built-in | `export default app` | `bun run dev` |
| Deno | built-in | `Deno.serve(app.fetch)` | `deno task dev` |
| Vercel Edge | built-in | `export default app` | `vercel dev` |
| AWS Lambda | `hono/aws-lambda` | `export const handler = handle(app)` | — |
| Netlify | `hono/netlify` | `export default { fetch: app.fetch }` | — |

---

### Cloudflare Workers

```typescript
import { Hono } from 'hono'

type Bindings = { MY_KV: KVNamespace; JWT_SECRET: string }

const app = new Hono<{ Bindings: Bindings }>()
app.get('/', (c) => c.text('Hello Cloudflare Workers!'))

export default app
```

`wrangler.toml` essentials: `name`, `main = "src/index.ts"`, `compatibility_date`. Bind KV/R2/D1 via `[[kv_namespaces]]` etc.

Env vars: use `.dev.vars` locally. Access all via `c.env.MY_VAR` — `process.env` does NOT work in Workers.

```bash
npx wrangler dev     # local
npx wrangler deploy  # prod
```

CI/CD: `cloudflare/wrangler-action@v3` with `CLOUDFLARE_API_TOKEN` secret.

---

### Node.js

```typescript
import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()
app.get('/', (c) => c.text('Hello Node!'))
serve({ fetch: app.fetch, port: 3000 })
```

Node.js minimum: **18.14.1+**. Static files: `serveStatic` from `@hono/node-server/serve-static`.

---

### Bun

```typescript
import { Hono } from 'hono'
const app = new Hono()
app.get('/', (c) => c.text('Hello Bun!'))
export default { port: 3000, fetch: app.fetch }
// or just: export default app
```

Static files: `serveStatic` from `hono/bun`.

---

### Deno

`import { Hono } from 'npm:hono'` (or `jsr:@hono/hono`), then `Deno.serve(app.fetch)`.

---

## 2. Routing

### Basic Methods

```typescript
app.get('/path', handler)
app.post('/path', handler)
app.put('/path', handler)
app.patch('/path', handler)
app.delete('/path', handler)
app.options('/path', handler)
app.all('/path', handler)          // all methods
app.on(['GET', 'POST'], '/path', handler)  // specific set
```

### Path Parameters

```typescript
// Named param
app.get('/users/:id', (c) => {
  const id = c.req.param('id')     // string
  return c.json({ id })
})

// Multiple params
app.get('/posts/:postId/comments/:commentId', (c) => {
  const { postId, commentId } = c.req.param()
  return c.json({ postId, commentId })
})

// Wildcard
app.get('/files/*', (c) => {
  const path = c.req.param('*')
  return c.text(`File: ${path}`)
})

// Optional param
app.get('/users/:id?', (c) => {
  const id = c.req.param('id') ?? 'all'
  return c.json({ id })
})
```

### Query Parameters

```typescript
app.get('/search', (c) => {
  const q = c.req.query('q')           // single
  const tags = c.req.queries('tags')   // array (?tags=a&tags=b)
  return c.json({ q, tags })
})
```

### Route Groups & Sub-routers

```typescript
// Chaining on same path
app
  .get('/users', listUsers)
  .post('/users', createUser)
  .get('/users/:id', getUser)
  .delete('/users/:id', deleteUser)

// Sub-router (recommended for large apps)
const userRouter = new Hono()
userRouter.get('/', listUsers)
userRouter.post('/', createUser)
userRouter.get('/:id', getUser)

app.route('/users', userRouter)

// basePath
const api = new Hono().basePath('/api/v1')
api.get('/health', (c) => c.json({ status: 'ok' }))
app.route('/', api)
```

Hono auto-selects its router (RegExpRouter for most cases). Force one: `new Hono({ router: new RegExpRouter() })`.

---

## 3. Middleware

Middleware runs before/after handlers. `await next()` passes control downstream.

### Custom Middleware

```typescript
import { createMiddleware } from 'hono/factory'

const authMiddleware = createMiddleware(async (c, next) => {
  const token = c.req.header('Authorization')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)
  c.set('user', decodeToken(token))
  await next()
})

app.use('/api/*', authMiddleware)
```

### Sharing Data Between Middleware and Handlers

```typescript
// Type-safe context variables
type Variables = { user: { id: string; role: string } }

const app = new Hono<{ Variables: Variables }>()

app.use('*', async (c, next) => {
  c.set('user', { id: '1', role: 'admin' })
  await next()
})

app.get('/profile', (c) => {
  const user = c.get('user')  // typed as { id: string; role: string }
  return c.json(user)
})
```

### Built-in Middleware

**CORS:**
```typescript
import { cors } from 'hono/cors'

// Permissive (dev)
app.use('*', cors())

// Strict (prod)
app.use('/api/*', cors({
  origin: ['https://app.example.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Authorization', 'Content-Type'],
  credentials: true,
  maxAge: 86400,
}))
```

**Logger:**
```typescript
import { logger } from 'hono/logger'
app.use('*', logger())
// Logs: --> GET /path  <-- GET /path 200 15ms
```

**JWT:**
```typescript
import { jwt } from 'hono/jwt'

// Apply to route group
app.use('/auth/*', (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,  // always from c.env in Workers
    alg: 'HS256',              // required — no default
  })
  return jwtMiddleware(c, next)
})

// Access payload in handler
app.get('/auth/profile', (c) => {
  const payload = c.get('jwtPayload')
  return c.json(payload)
})
```

Supported algorithms: HS256, HS384, HS512, RS256, RS384, RS512, PS256, PS384, PS512, ES256, ES384, ES512, EdDSA

**Sign a token manually:**
```typescript
import { sign } from 'hono/jwt'

const token = await sign(
  { sub: 'user_123', exp: Math.floor(Date.now() / 1000) + 3600 },
  secret,
  'HS256'
)
```

**Compress:**
```typescript
import { compress } from 'hono/compress'
app.use('*', compress())  // gzip/deflate based on Accept-Encoding
```

**Cache:**
```typescript
import { cache } from 'hono/cache'
app.use('/static/*', cache({ cacheName: 'static', cacheControl: 'max-age=3600' }))
```

**Bearer Auth:**
```typescript
import { bearerAuth } from 'hono/bearer-auth'
app.use('/api/*', bearerAuth({ token: c.env.API_TOKEN }))
```

**Basic Auth:**
```typescript
import { basicAuth } from 'hono/basic-auth'
app.use('/admin/*', basicAuth({
  username: 'admin',
  password: 'secret',
  onAuthSuccess: (c) => { c.set('isAdmin', true) },
}))
```

**Timeout:**
```typescript
import { timeout } from 'hono/timeout'
app.use('/slow/*', timeout(5000))  // 5s timeout, returns 408
```

**Request ID:** `import { requestId } from 'hono/request-id'`, access via `c.get('requestId')`.

**Rate Limiter (third-party):** `npm install @hono/rate-limiter`, then `import { rateLimiter } from '@hono/rate-limiter'`.

---

## 4. Request / Response Handling

### Reading Request Data

```typescript
// JSON body
const body = await c.req.json<{ name: string }>()

// Form data
const form = await c.req.formData()
const name = form.get('name')

// Raw text
const text = await c.req.text()

// Raw ArrayBuffer
const buffer = await c.req.arrayBuffer()

// Headers
const auth = c.req.header('Authorization')
const allHeaders = c.req.header()

// URL
const url = new URL(c.req.url)
const path = c.req.path
const method = c.req.method
```

### Sending Responses

```typescript
// JSON
return c.json({ message: 'ok' })
return c.json({ error: 'Not found' }, 404)

// Text
return c.text('Hello World')
return c.text('Not found', 404)

// HTML
return c.html('<h1>Hello</h1>')

// Redirect
return c.redirect('/new-path', 301)

// No content
return c.body(null, 204)

// Raw Response
return new Response('raw', { status: 200, headers: { 'X-Custom': 'value' } })
```

### Setting Headers & Cookies

```typescript
// Response headers
c.header('X-Custom-Header', 'value')
c.header('Cache-Control', 'no-store')

// Cookies
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'

setCookie(c, 'session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'Lax',
  maxAge: 3600,
})

const session = getCookie(c, 'session')
deleteCookie(c, 'session')
```

### Streaming

```typescript
import { stream, streamText, streamSSE } from 'hono/streaming'

// Binary / text stream
app.get('/stream', (c) => stream(c, async (s) => { await s.write(chunk) }))
app.get('/text', (c) => streamText(c, async (s) => { await s.writeln('line') }))

// Server-Sent Events
app.get('/events', (c) => streamSSE(c, async (s) => {
  while (true) {
    await s.writeSSE({ data: JSON.stringify({ time: Date.now() }), event: 'tick' })
    await new Promise(r => setTimeout(r, 1000))
  }
}))
```

---

## 5. Validation

### Manual Validation

```typescript
import { validator } from 'hono/validator'

app.post('/posts',
  validator('json', (value, c) => {
    const { title, body } = value as Record<string, unknown>
    if (!title || typeof title !== 'string') return c.json({ error: 'title required' }, 400)
    if (!body || typeof body !== 'string') return c.json({ error: 'body required' }, 400)
    return { title, body }
  }),
  (c) => {
    const { title, body } = c.req.valid('json')  // typed
    return c.json({ created: true, title, body }, 201)
  }
)
```

Validation targets: `'json'`, `'form'`, `'query'`, `'header'`, `'cookie'`, `'param'`

### Zod Integration

```bash
npm install zod @hono/zod-validator
```

```typescript
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().min(0).optional(),
})

app.post('/users',
  zValidator('json', createUserSchema),
  (c) => {
    const user = c.req.valid('json')  // typed as z.infer<typeof createUserSchema>
    return c.json({ id: crypto.randomUUID(), ...user }, 201)
  }
)
```

**Custom error response:**
```typescript
app.post('/users',
  zValidator('json', createUserSchema, (result, c) => {
    if (!result.success) {
      return c.json({
        error: 'Validation failed',
        issues: result.error.issues,
      }, 422)
    }
  }),
  handler
)
```

**Query param validation:**
```typescript
const searchSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

app.get('/search', zValidator('query', searchSchema), (c) => {
  const { q, page, limit } = c.req.valid('query')
  return c.json({ q, page, limit })
})
```

**Multiple validators on one route:**
```typescript
app.put('/users/:id',
  zValidator('param', z.object({ id: z.string().uuid() })),
  zValidator('json', updateUserSchema),
  async (c) => {
    const { id } = c.req.valid('param')
    const updates = c.req.valid('json')
    // ...
  }
)
```

**Placement rule:** Validators must be per-route, not via `app.use()`. Hono's type system cannot track global validators to specific routes.

---

## 6. RPC / Client

The `hc` client gives you fully type-safe API calls from client to server — no code generation, no schemas to maintain.

### Server Setup

```typescript
// server/routes/users.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const users = new Hono()
  .get('/', (c) => c.json([{ id: '1', name: 'Alice' }]))
  .post('/',
    zValidator('json', z.object({ name: z.string() })),
    async (c) => {
      const { name } = c.req.valid('json')
      return c.json({ id: crypto.randomUUID(), name }, 201)
    }
  )
  .get('/:id', (c) => c.json({ id: c.req.param('id'), name: 'Alice' }))

export default users

// server/index.ts
import { Hono } from 'hono'
import users from './routes/users'

const app = new Hono()
  .route('/users', users)

export type AppType = typeof app   // export this — client needs it
export default app
```

### Client Setup

```typescript
// client/api.ts
import { hc } from 'hono/client'
import type { AppType } from '../server'

const client = hc<AppType>('http://localhost:3000')

// Type-safe GET
const res = await client.users.$get()
const users = await res.json()     // typed as { id: string; name: string }[]

// Type-safe POST
const createRes = await client.users.$post({
  json: { name: 'Bob' },           // type error if shape is wrong
})
const newUser = await createRes.json()  // typed as { id: string; name: string }

// Type-safe param
const userRes = await client.users[':id'].$get({ param: { id: '1' } })
const user = await userRes.json()
```

### Type Inference Utilities

```typescript
import type { InferRequestType, InferResponseType } from 'hono/client'

// Infer request shape
type CreateUserReq = InferRequestType<typeof client.users.$post>

// Infer response shape
type CreateUserRes = InferResponseType<typeof client.users.$post, 201>
```

### $path() Helper

```typescript
// Returns path string (not full URL) — useful for routing libraries
const path = client.users[':id'].$path({ param: { id: '1' } })
// → '/users/1'
```

### Monorepo Setup

Both client and server `tsconfig.json` must have `"strict": true` for type inference to work correctly.

### Performance Note

Large apps with many routes can slow down IDE type checking. Mitigations:
- Compile TS before importing types
- Split into multiple sub-apps
- Use `turborepo` or project references in monorepos

---

## 7. Testing

### Node.js / Bun (vitest)

```typescript
// users.test.ts
import { describe, it, expect } from 'vitest'
import app from './src/index'

describe('Users API', () => {
  it('GET /users returns list', async () => {
    const res = await app.request('/users')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  it('POST /users creates user', async () => {
    const res = await app.request('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice' }),
    })
    expect(res.status).toBe(201)
    const user = await res.json()
    expect(user.name).toBe('Alice')
    expect(user.id).toBeDefined()
  })
})
```

### Cloudflare Workers (vitest-pool-workers)

```bash
npm install -D @cloudflare/vitest-pool-workers
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    pool: '@cloudflare/vitest-pool-workers',
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
      },
    },
  },
})
```

```typescript
// worker.test.ts
import { SELF } from 'cloudflare:test'
import { describe, it, expect } from 'vitest'

it('GET / returns 200', async () => {
  const res = await SELF.fetch('http://localhost/')
  expect(res.status).toBe(200)
})
```

Bun uses the same `app.request()` pattern — swap `vitest` imports for `bun:test`.

---

## 8. Error Handling

### Global Error Handler

```typescript
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: err.message }, 500)
})
```

### 404 Handler

```typescript
app.notFound((c) => {
  return c.json({ error: `${c.req.path} not found` }, 404)
})
```

### HTTPException

```typescript
import { HTTPException } from 'hono/http-exception'

app.get('/protected', (c) => {
  const token = c.req.header('Authorization')
  if (!token) throw new HTTPException(401, { message: 'Unauthorized' })
  return c.json({ ok: true })
})

// Handle in onError
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse()  // returns the built response with status
  }
  return c.json({ error: 'Internal Server Error' }, 500)
})
```

---

## 9. Deployment

### Cloudflare Workers

```bash
# Dev
npx wrangler dev

# Deploy
npx wrangler deploy

# Deploy to specific environment
npx wrangler deploy --env staging
```

**wrangler.toml environments:**
```toml
[env.staging]
name = "my-worker-staging"
vars = { ENVIRONMENT = "staging" }

[env.production]
name = "my-worker-production"
vars = { ENVIRONMENT = "production" }
```

**GitHub Actions:**
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### Node.js (Production)

```bash
npx tsc && node dist/index.js
# Or with PM2: pm2 start dist/index.js --name my-api
```

Use `serve({ port: process.env.PORT || 3000 })` for containerized deploys.

### Bun (Production)

```bash
bun run src/index.ts
# Or compile: bun build --compile --target=bun ./src/index.ts --outfile server
```

### Vercel Edge Functions

```typescript
// api/index.ts
import { Hono } from 'hono'
import { handle } from 'hono/vercel'

export const config = { runtime: 'edge' }

const app = new Hono().basePath('/api')
app.get('/hello', (c) => c.json({ hello: 'world' }))

export default handle(app)
```

### Deno Deploy

Use `import { Hono } from 'npm:hono'` (or `jsr:@hono/hono`), then `Deno.serve(app.fetch)`. Connect repo in Deno Deploy dashboard for auto-deploys.

---

## 10. Common Mistakes

| Mistake | Correct Approach |
|---|---|
| `process.env.VAR` in Cloudflare Workers | `c.env.VAR` via typed `Bindings` |
| `jwt({ secret })` without `alg` | Always pass `alg: 'HS256'` (or your algo) |
| `app.use('*', zValidator(...))` | Put validators per-route for type inference |
| `c.notFound()` in RPC routes | `c.json({ error: 'not found' }, 404)` for proper client types |
| Forgetting `export type AppType = typeof app` | Client `hc<AppType>()` requires this export |
| Using `.route()` after adding middleware | Add global middleware before `.route()` calls |
| `await c.req.json()` in GET handlers | GET requests have no body — use `c.req.query()` |
| Throwing plain `Error` without `onError` | Always register `app.onError()` for production |
| Headers with uppercase names in validation | Hono lowercases headers — use `'content-type'`, not `'Content-Type'` |
| Missing `"strict": true` in tsconfig for RPC | Required for `hc` type inference to work in monorepos |

