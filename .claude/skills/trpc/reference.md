# tRPC Reference

**Version:** v11 (released March 21, 2025) · TypeScript ≥ 5.7.2 · Node.js ≥ 18

---

## Table of Contents

1. [Setup — Next.js App Router](#1-setup--nextjs-app-router)
2. [Setup — Standalone & Other Adapters](#2-setup--standalone--other-adapters)
3. [Router & Procedures](#3-router--procedures)
4. [Input Validation with Zod](#4-input-validation-with-zod)
5. [Middleware](#5-middleware)
6. [Context & Dependency Injection](#6-context--dependency-injection)
7. [Client Integration](#7-client-integration)
8. [Error Handling](#8-error-handling)
9. [Subscriptions & Real-time](#9-subscriptions--real-time)
10. [Testing](#10-testing)
11. [When NOT to Use tRPC](#11-when-not-to-use-trpc)
12. [Common Mistakes](#12-common-mistakes)

---

## 1. Setup — Next.js App Router

### Install

```bash
npm install @trpc/server @trpc/client @trpc/react-query @trpc/next \
  @tanstack/react-query zod superjson
```

### Recommended File Structure

```
src/
├── server/
│   ├── trpc.ts          # initTRPC, base procedures, middleware
│   ├── context.ts       # createContext function
│   └── routers/
│       ├── _app.ts      # root appRouter
│       ├── post.ts
│       └── user.ts
├── trpc/
│   ├── client.ts        # createTRPCClient for RSC/server usage
│   ├── react.tsx        # createTRPCReact + TRPCReactProvider
│   └── server.ts        # createCaller for Server Components
└── app/
    ├── api/trpc/[trpc]/route.ts
    └── layout.tsx
```

### 1a. Server — tRPC Init

```ts
// src/server/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context';
import superjson from 'superjson';

const t = initTRPC.context<Context>().create({
  // v11: transformer goes in links, NOT here
  // errorFormatter is still here
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
```

### 1b. Context

```ts
// src/server/context.ts
import { cookies } from 'next/headers';

export async function createContext() {
  const cookieStore = await cookies();
  const session = await getSession(cookieStore); // your auth logic
  return {
    session,
    userId: session?.user?.id ?? null,
    db,                                           // prisma/drizzle/etc
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
```

### 1c. Root Router

```ts
// src/server/routers/_app.ts
import { router } from '../trpc';
import { postRouter } from './post';
import { userRouter } from './user';

export const appRouter = router({
  post: postRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
```

### 1d. Route Handler

```ts
// src/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '~/server/routers/_app';
import { createContext } from '~/server/context';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => console.error(`tRPC error on '${path}':`, error)
        : undefined,
  });

export { handler as GET, handler as POST };
```

### 1e. React Client Provider

```tsx
// src/trpc/react.tsx
'use client';

import { createTRPCReact } from '@trpc/react-query';
import { type AppRouter } from '~/server/routers/_app';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson, // v11: transformer lives here
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
```

```tsx
// src/app/layout.tsx
import { TRPCReactProvider } from '~/trpc/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
```

### 1f. Server Component Caller

```ts
// src/trpc/server.ts
import { createCallerFactory } from '~/server/trpc';
import { appRouter } from '~/server/routers/_app';
import { createContext } from '~/server/context';

const createCaller = createCallerFactory(appRouter);

export const api = createCaller(createContext);
```

```tsx
// In any Server Component
import { api } from '~/trpc/server';

export default async function PostsPage() {
  const posts = await api.post.list();          // direct call, no HTTP round-trip
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
}
```

---

## 2. Setup — Standalone & Other Adapters

### Standalone (Express)

```bash
npm install @trpc/server express cors
```

```ts
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import express from 'express';

// Option A: Standalone server
const server = createHTTPServer({ router: appRouter, createContext });
server.listen(3000);

// Option B: Express middleware
const app = express();
app.use(cors());
app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }));
app.listen(3000);
```

### Hono

```bash
npm install @trpc/server hono @hono/node-server
```

```ts
import { trpcServer } from '@hono/trpc-server';
import { Hono } from 'hono';

const app = new Hono();
app.use('/trpc/*', trpcServer({ router: appRouter, createContext }));
```

### Fetch Adapter (Edge / Cloudflare Workers)

```ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

export default {
  fetch(request: Request) {
    return fetchRequestHandler({
      endpoint: '/trpc',
      req: request,
      router: appRouter,
      createContext: ({ req }) => ({ req }),
    });
  },
};
```

---

## 3. Router & Procedures

### Query (GET — read data)

```ts
export const postRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.post.findMany({ orderBy: { createdAt: 'desc' } });
  }),

  byId: publicProcedure
    .input(z.string().uuid())
    .query(async ({ input, ctx }) => {
      const post = await ctx.db.post.findUnique({ where: { id: input } });
      if (!post) throw new TRPCError({ code: 'NOT_FOUND' });
      return post;
    }),
});
```

### Mutation (POST — write data)

```ts
create: protectedProcedure
  .input(z.object({ title: z.string().min(1).max(200), body: z.string() }))
  .mutation(async ({ input, ctx }) => {
    return ctx.db.post.create({
      data: { ...input, authorId: ctx.userId },
    });
  }),

delete: protectedProcedure
  .input(z.string().uuid())
  .mutation(async ({ input, ctx }) => {
    const post = await ctx.db.post.findUnique({ where: { id: input } });
    if (!post) throw new TRPCError({ code: 'NOT_FOUND' });
    if (post.authorId !== ctx.userId) throw new TRPCError({ code: 'FORBIDDEN' });
    return ctx.db.post.delete({ where: { id: input } });
  }),
```

### Nested Routers

```ts
// Shorthand object syntax (v11)
export const appRouter = router({
  post: postRouter,
  user: userRouter,
  admin: {
    stats: adminProcedure.query(() => getAdminStats()),
  },
});
```

### Output Validation

```ts
byId: publicProcedure
  .input(z.string())
  .output(z.object({ id: z.string(), title: z.string(), body: z.string() }))
  .query(async ({ input }) => fetchPost(input)),
```

---

## 4. Input Validation with Zod

tRPC pairs with Zod by convention. Input is validated before the procedure runs — invalid input throws `BAD_REQUEST` automatically.

### Primitives

```ts
.input(z.string())
.input(z.number().int().positive())
.input(z.boolean())
.input(z.enum(['draft', 'published']))
```

### Objects

```ts
.input(
  z.object({
    id: z.string().uuid(),
    title: z.string().min(1).max(200),
    tags: z.array(z.string()).max(10).optional(),
    publishAt: z.date().optional(),
  })
)
```

### Unions & Discriminated Unions

```ts
.input(
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('email'), email: z.string().email() }),
    z.object({ type: z.literal('phone'), phone: z.string() }),
  ])
)
```

### Transforming Input

```ts
.input(
  z.object({
    search: z.string().trim().toLowerCase(),
    page: z.number().int().default(1),
    limit: z.number().int().min(1).max(100).default(20),
  })
)
```

### Accessing Zod Errors Client-Side

```ts
// With errorFormatter that extracts zodError (see section 1a):
if (error.data?.zodError) {
  const fieldErrors = error.data.zodError.fieldErrors;
  // { title: ['String must contain at least 1 character(s)'] }
}
```

---

## 5. Middleware

### Basic Structure

```ts
const myMiddleware = t.middleware(async ({ ctx, next, path, type, input }) => {
  // before
  const result = await next({ ctx }); // must call next and return its value
  // after — result.ok, result.data, result.error
  return result;
});

export const myProcedure = publicProcedure.use(myMiddleware);
```

### Auth Middleware (Protected Procedure)

```ts
// src/server/trpc.ts
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      // Narrows type: session.user is non-nullable downstream
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
```

### Role-Based Auth

```ts
const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  if (ctx.session.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
  return next({ ctx: { user: ctx.session.user } });
});

export const adminProcedure = t.procedure.use(isAdmin);
```

### Logging Middleware

```ts
const logger = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;
  console.log(`[tRPC] ${type} ${path} — ${duration}ms — ${result.ok ? 'OK' : 'ERR'}`);
  return result;
});

// Apply globally:
export const publicProcedure = t.procedure.use(logger);
```

### Rate Limiting Middleware

```ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

const rateLimited = t.middleware(async ({ ctx, next }) => {
  const identifier = ctx.session?.user?.id ?? ctx.ip ?? 'anonymous';
  const { success } = await ratelimit.limit(identifier);
  if (!success) throw new TRPCError({ code: 'TOO_MANY_REQUESTS' });
  return next();
});

export const publicProcedure = t.procedure.use(rateLimited);
```

### Chaining Middleware

```ts
// Middleware compose in order
export const adminProcedure = t.procedure
  .use(logger)
  .use(isAuthed)
  .use(isAdmin);
```

---

## 6. Context & Dependency Injection

### Basic Context

```ts
// src/server/context.ts
import { db } from '~/lib/db';

export async function createContext({ req }: { req: Request }) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const user = token ? await verifyToken(token) : null;
  return { db, user };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
```

### Next.js App Router Context (with cookies/headers)

```ts
import { headers, cookies } from 'next/headers';
import { auth } from '~/lib/auth'; // next-auth / lucia / clerk

export async function createContext() {
  const session = await auth();
  return {
    db,
    session,
    userId: session?.user?.id ?? null,
  };
}
```

### Accessing context in middleware input

In v11, `createContext` is called before input is materialized. Access input lazily:

```ts
// In middleware, input is available via getRawInput
const middleware = t.middleware(async ({ ctx, getRawInput, next }) => {
  const rawInput = await getRawInput(); // lazy — call only when needed
  return next();
});
```

---

## 7. Client Integration

### React Hooks (Client Components)

```tsx
'use client';
import { trpc } from '~/trpc/react';

export function PostList() {
  // Query
  const { data, isPending, error } = trpc.post.list.useQuery();

  // Query with options
  const { data: post } = trpc.post.byId.useQuery('some-uuid', {
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 min
    refetchOnWindowFocus: false,
  });

  // Mutation
  const utils = trpc.useUtils();
  const createPost = trpc.post.create.useMutation({
    onSuccess: () => utils.post.list.invalidate(),
    onError: (err) => console.error(err.message),
  });

  return (
    <button onClick={() => createPost.mutate({ title: 'Hello', body: '...' })}>
      {createPost.isPending ? 'Saving...' : 'Create Post'}
    </button>
  );
}
```

### Suspense Hooks

```tsx
'use client';
import { Suspense } from 'react';

// useSuspenseQuery returns [data, queryResult] tuple
function PostContent({ id }: { id: string }) {
  const [post] = trpc.post.byId.useSuspenseQuery(id);
  return <article>{post.title}</article>; // data always defined here
}

export function PostPage({ id }: { id: string }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PostContent id={id} />
    </Suspense>
  );
}
```

### Infinite Queries

```tsx
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
  trpc.post.infinite.useInfiniteQuery(
    { limit: 20 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor },
  );

// Flatten pages
const posts = data?.pages.flatMap((page) => page.items) ?? [];
```

### Cache Invalidation Patterns

```ts
const utils = trpc.useUtils();

// Invalidate entire router
utils.post.invalidate();

// Invalidate specific query
utils.post.byId.invalidate('some-uuid');

// Optimistic update
utils.post.list.setData(undefined, (old) =>
  old ? [newPost, ...old] : [newPost]
);
```

### React Server Components (RSC)

```tsx
// Server Component — no HTTP, direct procedure call
import { api } from '~/trpc/server';

export default async function HomePage() {
  const posts = await api.post.list();
  return <PostList initialPosts={posts} />;
}
```

### Vanilla Client (no React)

```ts
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '~/server/routers/_app';
import superjson from 'superjson';

// v11: createTRPCClient (was createTRPCProxyClient in v10)
const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
      transformer: superjson,
    }),
  ],
});

const posts = await client.post.list.query();
const newPost = await client.post.create.mutate({ title: 'Hi', body: '...' });
```

### Request Batching

`httpBatchLink` (default) batches all requests fired in the same tick into a single HTTP call. Disable per-request:

```ts
httpBatchLink({ url: '/api/trpc', maxURLLength: 2083 }) // GET batching

// Or use httpLink for no batching:
import { httpLink } from '@trpc/client';
httpLink({ url: '/api/trpc', transformer: superjson })
```

### Streaming Responses (v11)

```ts
import { httpBatchStreamLink } from '@trpc/client';

// Enables async iterable responses from queries
const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchStreamLink({
      url: '/api/trpc',
      transformer: superjson,
    }),
  ],
});
```

---

## 8. Error Handling

### TRPCError Codes

| Code | HTTP | When to throw |
|------|------|---------------|
| `BAD_REQUEST` | 400 | Invalid input not caught by Zod |
| `UNAUTHORIZED` | 401 | Not logged in |
| `FORBIDDEN` | 403 | Logged in but lacks permission |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `METHOD_NOT_SUPPORTED` | 405 | Wrong HTTP method |
| `TIMEOUT` | 408 | Request timed out |
| `CONFLICT` | 409 | Duplicate resource / race condition |
| `PRECONDITION_FAILED` | 412 | Condition not met |
| `PAYLOAD_TOO_LARGE` | 413 | Upload too big |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Wrong Content-Type (v11 enforces this) |
| `UNPROCESSABLE_CONTENT` | 422 | Semantic validation failure |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |
| `CLIENT_CLOSED_REQUEST` | 499 | Client disconnected |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |
| `NOT_IMPLEMENTED` | 501 | Feature not implemented |

### Throwing Errors

```ts
import { TRPCError } from '@trpc/server';

// Basic
throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' });

// Wrapping cause (preserves stack)
throw new TRPCError({
  code: 'INTERNAL_SERVER_ERROR',
  message: 'Database error',
  cause: originalError,
});
```

### Error Formatter (server-side)

```ts
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});
```

### onError Hook (logging)

```ts
// In your route handler
fetchRequestHandler({
  router: appRouter,
  createContext,
  onError({ path, error, type, input, ctx }) {
    if (error.code === 'INTERNAL_SERVER_ERROR') {
      Sentry.captureException(error, { extra: { path, input } });
    }
    console.error(`[${type}] ${path}:`, error.message);
  },
});
```

### Client-Side Error Handling

```tsx
const { error } = trpc.post.byId.useQuery(id);

if (error) {
  if (error.data?.code === 'NOT_FOUND') return <NotFound />;
  if (error.data?.code === 'UNAUTHORIZED') redirect('/login');
  return <ErrorBoundary message={error.message} />;
}

// Zod errors (with errorFormatter):
if (error?.data?.zodError?.fieldErrors.title) {
  // ['String must contain at least 1 character(s)']
}
```

### HTTP Status from Error

```ts
import { getHTTPStatusCodeFromError } from '@trpc/server/http';

// In custom error handler
const httpStatus = getHTTPStatusCodeFromError(error);
```

---

## 9. Subscriptions & Real-time

### Server-Sent Events (SSE — recommended for most cases)

SSE is simpler than WebSockets. No persistent connection setup, works through HTTP/2, and handles reconnection automatically.

```ts
// src/server/routers/post.ts
import { tracked } from '@trpc/server';

export const postRouter = router({
  onNew: publicProcedure.subscription(async function* (opts) {
    // Use EventEmitter or database polling
    for await (const [event] of on(ee, 'post:created', { signal: opts.signal })) {
      yield tracked(event.id, event); // tracked() enables client reconnection
    }
  }),
});
```

```ts
// Client config — use httpSubscriptionLink
import { httpSubscriptionLink } from '@trpc/client';

const client = createTRPCClient<AppRouter>({
  links: [
    httpSubscriptionLink({
      url: '/api/trpc',
      transformer: superjson,
    }),
  ],
});
```

```tsx
// React hook
function LiveFeed() {
  trpc.post.onNew.useSubscription(undefined, {
    onData: (post) => setPosts((prev) => [post, ...prev]),
    onError: (err) => console.error(err),
  });
}
```

### WebSockets

Use when you need bidirectional communication or subscriptions that also fire mutations.

```bash
npm install ws @types/ws
```

```ts
// ws-server.ts
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 3001 });
const handler = applyWSSHandler({ wss, router: appRouter, createContext });
wss.on('close', () => handler.broadcastReconnectNotification());
```

```ts
// Client config
import { wsLink, createWSClient } from '@trpc/client';

const wsClient = createWSClient({ url: 'ws://localhost:3001' });
const client = createTRPCClient<AppRouter>({
  links: [wsLink({ client: wsClient, transformer: superjson })],
});
```

### AsyncGenerator Pattern with Cleanup

```ts
onUpdate: publicProcedure
  .input(z.object({ roomId: z.string() }))
  .subscription(async function* ({ input, signal }) {
    try {
      while (!signal.aborted) {
        const events = await db.event.findMany({
          where: { roomId: input.roomId, after: lastSeen },
        });
        for (const event of events) {
          yield tracked(event.id, event);
          lastSeen = event.id;
        }
        await sleep(1000);
      }
    } finally {
      // cleanup — runs on unsubscribe or disconnect
      await cleanup();
    }
  }),
```

### Output Validation for Subscriptions

```ts
import { zAsyncIterable } from '@trpc/server/zod';

onNew: publicProcedure
  .output(zAsyncIterable({ yield: PostSchema }))
  .subscription(async function* () { /* ... */ }),
```

---

## 10. Testing

### Unit Testing Procedures (no HTTP)

```ts
// src/server/routers/post.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createCallerFactory } from '../trpc';
import { appRouter } from './_app';

const createCaller = createCallerFactory(appRouter);

describe('post router', () => {
  it('returns posts list', async () => {
    const caller = createCaller({
      db: mockDb,
      session: null,
      userId: null,
    });

    const posts = await caller.post.list();
    expect(posts).toHaveLength(3);
  });

  it('throws UNAUTHORIZED for protected procedure', async () => {
    const caller = createCaller({ db: mockDb, session: null, userId: null });

    await expect(
      caller.post.create({ title: 'Test', body: 'Body' })
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('creates a post when authenticated', async () => {
    const caller = createCaller({
      db: mockDb,
      session: { user: { id: 'user-1', role: 'user' } },
      userId: 'user-1',
    });

    const post = await caller.post.create({ title: 'My Post', body: 'Hello' });
    expect(post.title).toBe('My Post');
    expect(post.authorId).toBe('user-1');
  });
});
```

### Integration Testing with React Testing Library

```ts
// src/components/PostList.test.tsx
import { renderWithTRPC } from '~/test/utils'; // custom wrapper
import { PostList } from './PostList';

test('renders posts from query', async () => {
  const { findByText } = renderWithTRPC(<PostList />, {
    trpcHandlers: { post: { list: () => [{ id: '1', title: 'Test Post' }] } },
  });

  await findByText('Test Post');
});
```

### Custom Test Wrapper

```ts
// src/test/utils.tsx
import { createTRPCMsw } from 'msw-trpc'; // optional — for MSW integration
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc } from '~/trpc/react';

export function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

export function renderWithTRPC(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  const trpcClient = trpc.createClient({
    links: [httpBatchLink({ url: 'http://localhost:3000/api/trpc' })],
  });

  return render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </trpc.Provider>
  );
}
```

---

## 11. When NOT to Use tRPC

| Situation | Better choice |
|-----------|---------------|
| Public API consumed by third parties | REST (OpenAPI) or GraphQL |
| Multiple client platforms (mobile, third-party, non-TS) | REST or GraphQL |
| Team isn't using TypeScript end-to-end | REST — tRPC's value is the shared types |
| Microservices with independent deployments | gRPC or REST with OpenAPI contracts |
| Complex data requirements with flexible querying | GraphQL |
| Frontend and backend in separate repos with no shared types | REST or OpenAPI codegen |
| Need to version your API | REST with versioned routes |

**tRPC is best when:**
- Full-stack TypeScript monorepo
- Team controls both client and server
- Internal tools, dashboards, SaaS apps
- Rapid iteration speed matters more than public API compatibility

---

## 12. Common Mistakes

| Mistake | Fix |
|---------|-----|
| Transformer in `initTRPC.create()` | v11 breaking change: move to `httpBatchLink({ transformer: superjson })` |
| `createTRPCProxyClient` | Renamed to `createTRPCClient` in v11 |
| `inferHandlerInput<T>` | Replaced by `inferProcedureInput<T>` |
| `rawInput` in middleware | Now `getRawInput()` async callback |
| `isLoading` from useQuery | TanStack Query v5 renamed to `isPending` |
| `.interop()` mode | Removed in v11 — complete v9→v10 migration first |
| `resolveHTTPRequest()` | Renamed to `resolveRequest()` with Fetch API types |
| Calling hooks in Server Components | Use `createCaller` / `api.procedure.query()` in RSC |
| Node.js < 18 | v11 requires Node 18+ for native FormData, File, Blob |
| TypeScript < 5.7.2 | Update TypeScript — v11 requires ≥ 5.7.2 |
| Not exporting `AppRouter` type | Client can't infer types without `export type AppRouter = typeof appRouter` |
| Forgetting `'use client'` on hook components | tRPC React hooks only work in Client Components |
| Suspense with Next.js SSR | Queries that fail in RSC crash the full page even with ErrorBoundary |
| Missing `server-only` import in context | Add `import 'server-only'` to prevent context leaking to client bundles |
