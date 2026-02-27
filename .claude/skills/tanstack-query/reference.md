# TanStack Query Reference

**Version:** v5.x · React 18+ · TypeScript 4.7+

---

## Table of Contents

1. [Setup](#1-setup)
2. [Queries](#2-queries)
3. [Mutations](#3-mutations)
4. [Optimistic Updates](#4-optimistic-updates)
5. [Pagination & Infinite Scroll](#5-pagination--infinite-scroll)
6. [Prefetching & SSR](#6-prefetching--ssr)
7. [Dependent Queries](#7-dependent-queries)
8. [Query Cancellation](#8-query-cancellation)
9. [Suspense Mode](#9-suspense-mode)
10. [Testing](#10-testing)
11. [v4 → v5 Migration](#11-v4--v5-migration)
12. [Common Mistakes](#12-common-mistakes)

---

## 1. Setup

### Install

```bash
npm install @tanstack/react-query
npm install -D @tanstack/react-query-devtools
```

### QueryClient Configuration

```tsx
// lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,       // 1 min — data considered fresh
      gcTime: 5 * 60 * 1000,      // 5 min — inactive cache GC window
      retry: 1,                    // retry failed queries once
      refetchOnWindowFocus: true,  // refetch when tab regains focus
    },
    mutations: {
      retry: 0,
    },
  },
});
```

Always create `QueryClient` outside components. Inside a component triggers a new instance on every render.

### Provider (App Router)

```tsx
// app/providers.tsx
'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/query-client';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

```tsx
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Type-safe Query Keys (Recommended Pattern)

```ts
// lib/query-keys.ts
export const queryKeys = {
  posts: {
    all: ['posts'] as const,
    list: (filters?: PostFilters) => ['posts', 'list', filters] as const,
    detail: (id: string) => ['posts', 'detail', id] as const,
  },
  users: {
    all: ['users'] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },
};
```

---

## 2. Queries

### Basic Query

```tsx
import { useQuery } from '@tanstack/react-query';

function Posts() {
  const { data, isPending, isError, error, isFetching } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const res = await fetch('/api/posts');
      if (!res.ok) throw new Error('Failed to fetch posts');
      return res.json() as Promise<Post[]>;
    },
    staleTime: 30_000,
  });

  if (isPending) return <Spinner />;
  if (isError) return <Error message={error.message} />;

  return (
    <div>
      {isFetching && <RefreshIndicator />}
      {data.map(post => <PostCard key={post.id} post={post} />)}
    </div>
  );
}
```

### Query States

| State | Description |
|-------|-------------|
| `isPending` | No data yet, query is loading (replaces `isLoading` in v5) |
| `isFetching` | Network request in flight (includes background refetches) |
| `isSuccess` | Data available |
| `isError` | Query failed |
| `isStale` | Data is past `staleTime`, will refetch on next opportunity |
| `isPlaceholderData` | Currently showing placeholder/previous data |

### Key Query Options

```ts
useQuery({
  queryKey: ['post', id],
  queryFn: () => fetchPost(id),

  // Freshness
  staleTime: Infinity,              // never goes stale
  gcTime: 10 * 60 * 1000,          // 10 min cache retention

  // Conditional execution
  enabled: !!id,                    // skip if id is falsy

  // Polling
  refetchInterval: 5000,            // poll every 5s
  refetchIntervalInBackground: true, // poll even when tab unfocused

  // Previous data while refetching
  placeholderData: keepPreviousData,

  // Error/retry
  retry: 3,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),

  // Transform data
  select: (data) => data.filter(post => post.published),
});
```

### useQueryClient — Common Imperative Operations

```ts
const queryClient = useQueryClient();
queryClient.invalidateQueries({ queryKey: ['posts'] });       // refetch if active
queryClient.setQueryData(['posts', id], updatedPost);         // write to cache directly
queryClient.prefetchQuery({ queryKey: ['posts'], queryFn: fetchPosts }); // warm cache
queryClient.getQueryData<Post[]>(['posts']);                   // read cache sync
```

---

## 3. Mutations

### Basic Mutation

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function CreatePost() {
  const queryClient = useQueryClient();

  const { mutate, mutateAsync, isPending, isSuccess, isError, error, reset } = useMutation({
    mutationFn: (newPost: CreatePostInput) =>
      fetch('/api/posts', {
        method: 'POST',
        body: JSON.stringify(newPost),
      }).then(r => r.json()),

    onMutate: (variables) => {
      // Fires immediately, before mutationFn resolves
      console.log('Creating post:', variables);
    },
    onSuccess: (data, variables, context) => {
      // Invalidate + refetch
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error, variables, context) => {
      console.error('Failed:', error);
    },
    onSettled: (data, error) => {
      // Always runs — like finally
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  return (
    <form onSubmit={e => {
      e.preventDefault();
      mutate({ title: 'New Post', body: 'Content' });
    }}>
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Post'}
      </button>
    </form>
  );
}
```

### mutate vs mutateAsync

```ts
// mutate — fire-and-forget, callbacks handle result
mutate({ title: 'Post' });

// mutateAsync — returns promise, use with try/catch
try {
  const result = await mutateAsync({ title: 'Post' });
  router.push(`/posts/${result.id}`);
} catch (error) {
  toast.error('Failed to create post');
}
```

### Mutation State Tracking Across Components

```tsx
import { useMutationState } from '@tanstack/react-query';

// Read state of any mutation by key from any component
const pendingPosts = useMutationState({
  filters: { mutationKey: ['createPost'], status: 'pending' },
  select: (mutation) => mutation.state.variables,
});
```

---

## 4. Optimistic Updates

### Method 1 — Variables-based (Simpler, v5 preferred)

Show the mutation's `variables` directly in the UI while it's pending. No cache manipulation required.

```tsx
function PostList() {
  const queryClient = useQueryClient();

  const { mutate, variables, isPending } = useMutation({
    mutationFn: createPost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  });

  const { data: posts } = useQuery({ queryKey: ['posts'], queryFn: fetchPosts });

  return (
    <ul>
      {posts?.map(post => <PostItem key={post.id} post={post} />)}
      {/* Show optimistic item while pending */}
      {isPending && (
        <PostItem key="optimistic" post={{ ...variables, id: 'temp', status: 'saving' }} />
      )}
    </ul>
  );
}
```

### Method 2 — Cache Manipulation (More Control)

```tsx
const mutation = useMutation({
  mutationFn: updatePost,

  onMutate: async (updatedPost) => {
    // Cancel in-flight refetches to avoid overwriting optimistic update
    await queryClient.cancelQueries({ queryKey: ['posts', updatedPost.id] });

    // Snapshot current data for rollback
    const previousPost = queryClient.getQueryData(['posts', updatedPost.id]);

    // Optimistically update cache
    queryClient.setQueryData(['posts', updatedPost.id], updatedPost);

    // Return context for rollback
    return { previousPost };
  },

  onError: (err, updatedPost, context) => {
    // Roll back to snapshot
    queryClient.setQueryData(['posts', updatedPost.id], context?.previousPost);
  },

  onSettled: (data, error, variables) => {
    // Always sync with server
    queryClient.invalidateQueries({ queryKey: ['posts', variables.id] });
  },
});
```

---

## 5. Pagination & Infinite Scroll

### Offset Pagination with placeholderData

```tsx
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

function PaginatedPosts() {
  const [page, setPage] = useState(1);

  const { data, isPending, isPlaceholderData } = useQuery({
    queryKey: ['posts', page],
    queryFn: () => fetchPosts({ page, limit: 10 }),
    placeholderData: keepPreviousData, // show previous page while next loads
  });

  return (
    <div>
      {isPending ? <Spinner /> : data?.posts.map(p => <Post key={p.id} post={p} />)}
      <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>Prev</button>
      <button
        onClick={() => setPage(p => p + 1)}
        disabled={isPlaceholderData || !data?.hasMore}
      >
        Next
      </button>
    </div>
  );
}
```

### Infinite Scroll with useInfiniteQuery

```tsx
import { useInfiniteQuery } from '@tanstack/react-query';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';

function InfinitePosts() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useInfiniteQuery({
    queryKey: ['posts', 'infinite'],
    queryFn: ({ pageParam }) => fetchPosts({ cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    maxPages: 10, // v5: cap stored pages (memory management)
  });

  const { ref, isIntersecting } = useIntersectionObserver();

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isPending) return <Spinner />;

  return (
    <div>
      {data.pages.flatMap(page => page.items).map(post => (
        <PostCard key={post.id} post={post} />
      ))}
      <div ref={ref}>
        {isFetchingNextPage ? <Spinner /> : hasNextPage ? 'Load more' : 'End of feed'}
      </div>
    </div>
  );
}
```

### Bidirectional Infinite Scroll

```tsx
useInfiniteQuery({
  queryKey: ['messages', threadId],
  queryFn: ({ pageParam }) => fetchMessages({ cursor: pageParam }),
  initialPageParam: latestMessageId,
  getNextPageParam: (lastPage) => lastPage.newerCursor,
  getPreviousPageParam: (firstPage) => firstPage.olderCursor,
});
```

---

## 6. Prefetching & SSR

### Next.js App Router — Per-Route Prefetch

```tsx
// app/posts/page.tsx (Server Component)
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { PostList } from '@/components/post-list';

export default async function PostsPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['posts'],
    queryFn: getPosts,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostList />
    </HydrationBoundary>
  );
}
```

```tsx
// components/post-list.tsx (Client Component)
'use client';
import { useQuery } from '@tanstack/react-query';

export function PostList() {
  // Data is already in cache from server prefetch — no loading state
  const { data } = useQuery({ queryKey: ['posts'], queryFn: fetchPosts });
  return <ul>{data?.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
}
```

### Shared QueryClient for App Router

```ts
// lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';
import { cache } from 'react';

// cache() memoizes per request in RSC — one QueryClient per request, not per component
export const getQueryClient = cache(() => new QueryClient({
  defaultOptions: { queries: { staleTime: 60 * 1000 } },
}));
```

```tsx
// app/posts/page.tsx
import { getQueryClient } from '@/lib/query-client';

export default async function PostsPage() {
  const queryClient = getQueryClient();
  // No need to await — dehydrate handles pending queries in v5.40+
  void queryClient.prefetchQuery({ queryKey: ['posts'], queryFn: getPosts });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostList />
    </HydrationBoundary>
  );
}
```

### Dehydrating Pending Queries (v5.40+)

As of v5.40.0, you can skip awaiting prefetches. Pending queries dehydrate and stream to the client.

```tsx
export default async function Page() {
  const queryClient = getQueryClient();

  // Both start in parallel, neither is awaited
  void queryClient.prefetchQuery({ queryKey: ['posts'], queryFn: getPosts });
  void queryClient.prefetchQuery({ queryKey: ['user', userId], queryFn: getUser });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<Skeleton />}>
        <PostList />
      </Suspense>
    </HydrationBoundary>
  );
}
```

### Router-level Prefetch (TanStack Router)

```ts
// routes/posts.$id.ts
export const Route = createFileRoute('/posts/$id')({
  loader: ({ context: { queryClient }, params }) =>
    queryClient.ensureQueryData({
      queryKey: ['post', params.id],
      queryFn: () => fetchPost(params.id),
    }),
});
```

---

## 7. Dependent Queries

### Sequential Dependencies

```tsx
function UserPosts({ userId }: { userId: string }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  const { data: posts } = useQuery({
    queryKey: ['posts', user?.teamId],
    queryFn: () => fetchTeamPosts(user!.teamId),
    enabled: !!user?.teamId, // only runs after user loads and has teamId
  });

  return <div>{posts?.map(p => <Post key={p.id} post={p} />)}</div>;
}
```

### Parallel Queries

```tsx
// Parallel independent queries
const results = useQueries({
  queries: userIds.map(id => ({
    queryKey: ['user', id],
    queryFn: () => fetchUser(id),
  })),
  combine: (results) => ({
    data: results.map(r => r.data),
    isPending: results.some(r => r.isPending),
  }),
});
```

---

## 8. Query Cancellation

TanStack Query provides an `AbortSignal` to every `queryFn`. Pass it to `fetch` or axios to cancel in-flight requests when a query becomes inactive.

```tsx
const { data } = useQuery({
  queryKey: ['post', id],
  queryFn: async ({ signal }) => {
    const res = await fetch(`/api/posts/${id}`, { signal });
    if (!res.ok) throw new Error('Fetch failed');
    return res.json();
  },
});
```

### Axios Cancellation

```tsx
queryFn: async ({ signal }) => {
  const { data } = await axios.get(`/api/posts/${id}`, { signal });
  return data;
},
```

### Manual Cancellation

```ts
const queryClient = useQueryClient();
// Cancel all queries matching key — reverts to previous state
await queryClient.cancelQueries({ queryKey: ['posts'] });
```

Queries are automatically cancelled when:
- Component unmounts before query resolves
- Query key changes (new query replaces old)
- `queryClient.cancelQueries()` is called explicitly

---

## 9. Suspense Mode

Use `useSuspenseQuery` to throw promises to the nearest `<Suspense>` boundary. Eliminates `isPending` branching.

```tsx
import { useSuspenseQuery } from '@tanstack/react-query';
import { Suspense } from 'react';

// Component never handles loading state — Suspense parent does
function PostDetail({ id }: { id: string }) {
  const { data } = useSuspenseQuery({
    queryKey: ['post', id],
    queryFn: () => fetchPost(id),
  });

  return <article>{data.title}</article>;
}

// Error boundary + Suspense wrapping
function PostPage({ id }: { id: string }) {
  return (
    <ErrorBoundary fallback={<ErrorMessage />}>
      <Suspense fallback={<PostSkeleton />}>
        <PostDetail id={id} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### useSuspenseQueries (Parallel)

```tsx
import { useSuspenseQueries } from '@tanstack/react-query';

function Dashboard() {
  const [{ data: user }, { data: posts }] = useSuspenseQueries({
    queries: [
      { queryKey: ['user', userId], queryFn: () => fetchUser(userId) },
      { queryKey: ['posts', userId], queryFn: () => fetchUserPosts(userId) },
    ],
  });

  // Both resolved here — no null checks needed
  return <div>{user.name}: {posts.length} posts</div>;
}
```

---

## 10. Testing

### Setup

```bash
npm install -D @testing-library/react @testing-library/user-event vitest jsdom
```

### Test Utilities

```tsx
// test/utils.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,         // don't retry in tests
        gcTime: Infinity,     // keep cache between test renders
      },
      mutations: { retry: false },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {},        // suppress error logs in tests
    },
  });
}

export function renderWithClient(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return {
    ...render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    ),
    queryClient,
  };
}
```

### Testing useQuery

```tsx
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { screen, waitFor } from '@testing-library/react';
import { renderWithClient } from '@/test/utils';

const server = setupServer(
  http.get('/api/posts', () => HttpResponse.json([{ id: 1, title: 'Test Post' }]))
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('displays posts', async () => {
  renderWithClient(<PostList />);

  await waitFor(() => {
    expect(screen.getByText('Test Post')).toBeInTheDocument();
  });
});

test('handles error state', async () => {
  server.use(http.get('/api/posts', () => new HttpResponse(null, { status: 500 })));

  renderWithClient(<PostList />);

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

### Testing useMutation

```tsx
import userEvent from '@testing-library/user-event';

test('creates post on submit', async () => {
  let requestBody: unknown;
  server.use(
    http.post('/api/posts', async ({ request }) => {
      requestBody = await request.json();
      return HttpResponse.json({ id: 2, title: 'New Post' });
    })
  );

  const { queryClient } = renderWithClient(<CreatePostForm />);

  await userEvent.type(screen.getByRole('textbox', { name: /title/i }), 'New Post');
  await userEvent.click(screen.getByRole('button', { name: /create/i }));

  await waitFor(() => expect(requestBody).toEqual({ title: 'New Post' }));
});
```

### Testing with Pre-populated Cache

```tsx
test('displays cached data immediately', () => {
  const { queryClient } = renderWithClient(<PostDetail id="1" />);

  // Pre-seed the cache
  queryClient.setQueryData(['post', '1'], { id: '1', title: 'Cached Post' });

  // Re-render with seeded data
  renderWithClient(<PostDetail id="1" />);
  expect(screen.getByText('Cached Post')).toBeInTheDocument();
});
```

---

## 11. v4 → v5 Migration

### Breaking Changes Summary

| v4 | v5 | Notes |
|----|-----|-------|
| `useQuery(key, fn, options)` | `useQuery({ queryKey, queryFn, ...options })` | Single object only |
| `cacheTime` | `gcTime` | Renamed to reflect behavior |
| `isLoading` | `isPending` | For queries without data |
| `keepPreviousData: true` | `placeholderData: keepPreviousData` | Import `keepPreviousData` from package |
| `onSuccess`, `onError`, `onSettled` in `useQuery` | Removed | Use `useEffect` or mutation callbacks |
| `suspense: true` option | `useSuspenseQuery` hook | Dedicated hook replaces option |
| `useErrorBoundary: true` | `throwOnError: true` | Renamed option |
| `refetchPage` in `useInfiniteQuery` | `refetchType` in `fetchNextPage` | API changed |
| `status: 'loading'` | `status: 'pending'` | Status string renamed |
| `QueryClient.clear()` | Still works | Not changed |

### Codemods

```bash
# Official codemod for most breaking changes
npx jscodeshift --extensions=ts,tsx --transform=@tanstack/react-query-codemods/v5/rename-properties src/
```

### onSuccess/onError Migration

```tsx
// v4 — callbacks on useQuery (removed in v5)
useQuery({
  queryKey: ['user'],
  queryFn: fetchUser,
  onSuccess: (user) => setUser(user),  // REMOVED
});

// v5 — use useEffect
const { data } = useQuery({ queryKey: ['user'], queryFn: fetchUser });
useEffect(() => {
  if (data) setUser(data);
}, [data]);
```

---

## 12. Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Creating `QueryClient` inside component | New cache on every render, flashing data | Create outside component or in `useState` |
| Unstable `queryKey` | Infinite refetch loop | Memoize objects/arrays: `['posts', userId]` not `['posts', { userId }]` every render |
| Missing `enabled: !!id` | Query fires with `undefined` arg | Always guard dependent queries |
| `queryKey` too broad | Unintended cache invalidation | Include all filter/id params in key |
| Using `isLoading` for mutation | `isLoading` doesn't exist on mutations | Use `isPending` (v5) |
| `onSuccess` in `useQuery` | Removed in v5 | Use `useEffect` watching `data` |
| `cacheTime` option | Unknown option warning | Renamed to `gcTime` in v5 |
| Not passing `signal` to fetch | Requests linger after navigation | Always forward `{ signal }` from `queryFn` args |
| `invalidateQueries` without await | Cache update race condition in mutations | `await queryClient.invalidateQueries(...)` in `onSuccess` |
| New `QueryClient` in every RSC | No shared cache across routes | Use `getQueryClient` with React `cache()` |
| `placeholderData` as static value | TypeScript mismatch | Import `keepPreviousData` helper from package |
| `useInfiniteQuery` missing `initialPageParam` | Runtime error in v5 | Required in v5 — set to `undefined` or first page value |
