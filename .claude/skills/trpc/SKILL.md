---
model: claude-sonnet-4-6
name: trpc
description: Use when building type-safe APIs with tRPC — procedure definitions, routers, middleware, or client integration. Also use when connecting Next.js/React frontends to tRPC backends or debugging type inference issues.
---

# tRPC

End-to-end typesafe APIs for TypeScript monorepos. No schemas, no codegen — the router IS the contract.

## Quick Reference

| Item | Value |
|------|-------|
| Current version | v11 (released March 21, 2025) |
| Node.js minimum | 18+ |
| TypeScript minimum | 5.7.2+ |
| Core install | `npm i @trpc/server @trpc/client @trpc/react-query @tanstack/react-query zod` |
| Next.js adapter | `@trpc/next` |
| Transformer | `superjson` (add to links in v11, not initTRPC) |

## Setup — Next.js App Router (Minimal)

```ts
// server/trpc.ts
import { initTRPC } from '@trpc/server';
const t = initTRPC.context<{ userId: string | null }>().create();
export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { userId: ctx.userId } });
});

// app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
const handler = (req: Request) =>
  fetchRequestHandler({ endpoint: '/api/trpc', req, router: appRouter, createContext });
export { handler as GET, handler as POST };
```

## Procedures

```ts
// Query
hello: publicProcedure.input(z.string()).query(({ input }) => `Hello ${input}`),

// Mutation
create: protectedProcedure
  .input(z.object({ title: z.string() }))
  .mutation(async ({ input, ctx }) => db.post.create({ data: { ...input, userId: ctx.userId } })),
```

## Client Hooks (Client Components)

```ts
const { data } = trpc.post.list.useQuery();
const { mutate } = trpc.post.create.useMutation({ onSuccess: () => utils.post.list.invalidate() });
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Transformer in `initTRPC.create()` | v11: move superjson to `httpBatchLink({ transformer: superjson })` |
| `createTRPCProxyClient` | Renamed to `createTRPCClient` in v11 |
| `isLoading` from React Query | Renamed to `isPending` in TanStack Query v5 |
| `inferHandlerInput<T>` | Replaced by `inferProcedureInput<T>` |
| `rawInput` in middleware | Now `getRawInput()` callback |
| Calling tRPC in RSC via hooks | Use `createCaller` for RSC, hooks only in Client Components |

## Full Reference

See `reference.md` for: full Next.js App Router setup, standalone/Express/Hono adapters, Zod input validation, middleware patterns, context & dependency injection, React hooks API, RSC integration, error handling, subscriptions/SSE/WebSockets, procedure unit testing, and when NOT to use tRPC.
