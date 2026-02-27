---
model: claude-sonnet-4-6
name: tanstack-query
description: Use when managing server state with TanStack Query (React Query) — data fetching, caching, mutations, optimistic updates, or infinite scrolling. Also use when replacing manual useEffect data fetching or integrating with tRPC.
---

# TanStack Query

Async state management for TypeScript. Replaces `useEffect` + `useState` for all server state.

Install: `npm install @tanstack/react-query` · v5.x · React 18+

## Provider Setup

```tsx
// Create outside component — inside triggers fresh cache on every render
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, gcTime: 300_000, retry: 1 } },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

## useQuery

```tsx
const { data, isPending, isError, error } = useQuery({
  queryKey: ['posts', { userId }],
  queryFn: () => fetchPosts(userId),
  staleTime: 30_000,
  enabled: !!userId,
});
```

## useMutation

```tsx
const mutation = useMutation({
  mutationFn: (newPost) => createPost(newPost),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  onError: (error) => console.error(error),
});

mutation.mutate({ title: 'Hello' });
```

## Key Concepts

| Concept | What it does |
|---------|-------------|
| `staleTime` | How long data is considered fresh (no refetch) |
| `gcTime` | How long inactive cache entries survive before GC |
| `queryKey` | Cache key — array, must be serializable |
| `enabled` | Gate a query — `false` skips fetch entirely |
| `placeholderData` | Show previous data while refetching (replaces `keepPreviousData`) |

## SSR / Next.js App Router

```tsx
// app/page.tsx (Server Component)
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';

export default async function Page() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({ queryKey: ['posts'], queryFn: getPosts });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostList />
    </HydrationBoundary>
  );
}
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `queryKey: ['user']` (no scope) | Include all variables: `['user', userId]` |
| `cacheTime` option | Renamed to `gcTime` in v5 |
| `isLoading` for mutations | Use `isPending` — `isLoading` removed in v5 |
| Callbacks in `useQuery` (`onSuccess`) | Removed in v5 — use `useEffect` or mutation callbacks |
| New `QueryClient()` inside component | Always create outside component or use `useState` |
| Missing `enabled: !!id` on dependent query | Query fires with `undefined` param without guard |

## Full Reference

See `reference.md` for: setup, queries, mutations, optimistic updates, pagination/infinite scroll, prefetching/SSR, dependent queries, cancellation, Suspense mode, testing, v4→v5 migration, and common mistakes.
