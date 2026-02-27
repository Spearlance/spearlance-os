---
model: claude-sonnet-4-6
name: swr
description: Use when fetching and caching remote data in React with SWR — useSWR, mutations with optimistic updates, pagination, infinite loading, or automatic revalidation. Also use when choosing between SWR and TanStack Query, or when integrating SWR with Next.js.
---

# SWR

React data fetching library built on the stale-while-revalidate caching strategy. Returns cached data immediately, then revalidates in the background. From Vercel.

Install: `npm install swr` · v2.x · React 16.8+

## Core Pattern

```tsx
import useSWR from "swr";

// 1. Define a fetcher (reuse across your app)
const fetcher = (url: string) => fetch(url).then((r) => r.json());

// 2. Use in any component — no Provider required
function UserProfile({ id }: { id: string }) {
  const { data, error, isLoading } = useSWR(`/api/users/${id}`, fetcher);

  if (isLoading) return <Skeleton />;
  if (error) return <Error message={error.message} />;

  return <div>{data.name}</div>;
}
```

Key behavior: if two components mount and both call `useSWR('/api/users/1', fetcher)`, only one request fires — automatic deduplication.

## Global Config

```tsx
// app/layout.tsx or _app.tsx
import { SWRConfig } from "swr";

export default function RootLayout({ children }) {
  return (
    <SWRConfig
      value={{
        fetcher: (url: string) => fetch(url).then((r) => r.json()),
        revalidateOnFocus: true,      // refetch when window regains focus
        revalidateOnReconnect: true,  // refetch when network restored
        dedupingInterval: 2000,       // dedupe requests within 2s window
        errorRetryCount: 3,           // max retries on error
        shouldRetryOnError: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
```

## Key Options

| Option | Default | What It Does |
|--------|---------|--------------|
| `revalidateOnFocus` | `true` | Refetch when tab comes back to focus |
| `revalidateOnReconnect` | `true` | Refetch when network reconnects |
| `revalidateIfStale` | `true` | Revalidate on mount if data is stale |
| `refreshInterval` | `0` (off) | Poll interval in ms — `0` = disabled |
| `dedupingInterval` | `2000` | Dedupe window — same key won't refetch within this period |
| `focusThrottleInterval` | `5000` | Min ms between focus-triggered revalidations |
| `errorRetryCount` | unlimited | Max retry attempts on failure |
| `errorRetryInterval` | `5000` | Base delay between retries (exponential backoff) |
| `keepPreviousData` | `false` | Show previous data while key changes (great for search) |
| `suspense` | `false` | Throw promise for React Suspense |
| `fallbackData` | — | Initial data before first fetch |
| `isPaused` | — | Function returning `true` to suspend fetching |

## Conditional Fetching

```tsx
// Don't fetch until userId exists
const { data } = useSWR(userId ? `/api/users/${userId}` : null, fetcher);

// Dependent fetch — waits for first request to complete
const { data: user } = useSWR("/api/me", fetcher);
const { data: posts } = useSWR(user ? `/api/users/${user.id}/posts` : null, fetcher);

// Suspend fetching based on condition
const { data } = useSWR("/api/data", fetcher, {
  isPaused: () => !isLoggedIn,
});
```

## Mutation (Bound)

Bound mutate revalidates the key attached to the current `useSWR` call.

```tsx
function TodoItem({ id }: { id: string }) {
  const { data, mutate } = useSWR(`/api/todos/${id}`, fetcher);

  const toggleDone = async () => {
    // Optimistic update — update cache immediately, revert on error
    await mutate(
      async (current) => {
        const updated = await fetch(`/api/todos/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ done: !current.done }),
        }).then((r) => r.json());
        return updated;
      },
      {
        optimisticData: { ...data, done: !data.done }, // immediate UI update
        rollbackOnError: true,                          // revert if request fails
        populateCache: true,                            // update cache with response
        revalidate: false,                              // don't refetch after mutation
      }
    );
  };

  return <input type="checkbox" checked={data.done} onChange={toggleDone} />;
}
```

## useSWRMutation (Explicit Trigger)

For mutations that shouldn't fire automatically — form submits, button clicks, etc.

```tsx
import useSWRMutation from "swr/mutation";

async function createUser(url: string, { arg }: { arg: { name: string; email: string } }) {
  return fetch(url, {
    method: "POST",
    body: JSON.stringify(arg),
  }).then((r) => r.json());
}

function NewUserForm() {
  const { trigger, isMutating, error } = useSWRMutation("/api/users", createUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await trigger({ name: "Alice", email: "alice@example.com" });
      console.log("Created:", user);
    } catch (err) {
      console.error("Failed:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" disabled={isMutating}>
        {isMutating ? "Creating..." : "Create User"}
      </button>
      {error && <p>{error.message}</p>}
    </form>
  );
}
```

## Global Mutate (Cache Invalidation)

```tsx
import { useSWRConfig } from "swr";

function PostActions({ postId }: { postId: string }) {
  const { mutate } = useSWRConfig();

  const deletePost = async () => {
    await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    // Invalidate and refetch
    mutate("/api/posts");               // exact key
    mutate((key) => key.startsWith("/api/posts")); // all matching keys
  };

  return <button onClick={deletePost}>Delete</button>;
}
```

## Pagination

```tsx
import { useState } from "react";

function PaginatedList() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isValidating } = useSWR(
    `/api/posts?page=${page}&limit=10`,
    fetcher,
    { keepPreviousData: true } // Show previous page while loading next
  );

  return (
    <div>
      {isLoading ? <Skeleton /> : data.posts.map((p) => <Post key={p.id} {...p} />)}
      <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}>Prev</button>
      <button onClick={() => setPage((p) => p + 1)} disabled={!data?.hasMore}>Next</button>
      {isValidating && <Spinner />}
    </div>
  );
}
```

## Infinite Loading (useSWRInfinite)

```tsx
import useSWRInfinite from "swr/infinite";

const PAGE_SIZE = 10;

function InfiniteFeed() {
  const { data, size, setSize, isLoading, isValidating } = useSWRInfinite(
    (pageIndex, previousPageData) => {
      // Return null to stop fetching
      if (previousPageData && !previousPageData.hasMore) return null;
      return `/api/posts?page=${pageIndex + 1}&limit=${PAGE_SIZE}`;
    },
    fetcher
  );

  const posts = data ? data.flatMap((page) => page.posts) : [];
  const isLoadingMore = isValidating && data && data.length === size;
  const isEmpty = data?.[0]?.posts.length === 0;
  const isReachingEnd = isEmpty || (data && !data[data.length - 1]?.hasMore);

  return (
    <div>
      {posts.map((post) => <Post key={post.id} {...post} />)}
      {isLoading && <Skeleton />}
      <button
        onClick={() => setSize(size + 1)}
        disabled={isLoadingMore || isReachingEnd}
      >
        {isLoadingMore ? "Loading..." : isReachingEnd ? "No more posts" : "Load more"}
      </button>
    </div>
  );
}
```

## Error Handling

```tsx
function DataComponent() {
  const { data, error, isLoading, mutate } = useSWR("/api/data", fetcher, {
    onError: (err) => console.error("SWR error:", err),
    onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
      // Never retry on 404
      if (error.status === 404) return;
      // Only retry 3 times
      if (retryCount >= 3) return;
      // Retry after 5 seconds
      setTimeout(() => revalidate({ retryCount }), 5000);
    },
  });

  if (error?.status === 401) return <SignIn />;
  if (error?.status === 404) return <NotFound />;
  if (error) return (
    <div>
      <p>Failed to load: {error.message}</p>
      <button onClick={() => mutate()}>Retry</button>
    </div>
  );
  if (isLoading) return <Spinner />;

  return <div>{data.title}</div>;
}
```

## Next.js Integration

```tsx
// Server-side prefetch (Pages Router)
export async function getServerSideProps() {
  const data = await fetchPosts();
  return {
    props: {
      fallback: { "/api/posts": data },
    },
  };
}

function Page({ fallback }) {
  return (
    <SWRConfig value={{ fallback }}>
      <PostList />
    </SWRConfig>
  );
}

// App Router — prefetch via server component + pass as fallback
// Or use TanStack Query for App Router (better SSR DX)
```

## SWR vs TanStack Query

| Feature | SWR | TanStack Query |
|---------|-----|----------------|
| Bundle size | ~4KB | ~13KB |
| Setup | Zero config | QueryClient + Provider |
| Mutations | `useSWRMutation` | `useMutation` (richer callbacks) |
| Devtools | Browser extension | Built-in panel |
| Offline support | Basic | Advanced |
| Background updates | ✓ | ✓ |
| Suspense | ✓ | ✓ |
| SSR/App Router | Manual | `HydrationBoundary` helper |
| Infinite scroll | `useSWRInfinite` | `useInfiniteQuery` |
| Pagination | Manual | `placeholderData: keepPreviousData` |

**Recommendation:** SWR for simple apps, Next.js Pages Router, or when bundle size matters. TanStack Query for complex mutation flows, rich devtools, or App Router with prefetching.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Creating fetcher inline | Define outside component — inline creates new reference every render |
| `null` key to pause but still using `data` | `data` is `undefined` when key is `null` — guard with `data?.field` |
| Mutating without `rollbackOnError` | Optimistic updates stick on failure — always set `rollbackOnError: true` |
| Using `refreshInterval` without `revalidateOnFocus: false` | Double-requests on focus + interval overlap — disable one |
| `useSWRInfinite` getKey returning same key for different pages | Every page must produce a unique key — include `pageIndex` |
| `dedupingInterval: 0` in tests | Can cause flaky tests from extra requests — use `provider: () => new Map()` per test |
| Missing `keepPreviousData` on paginated queries | UI flickers to empty on page change — add `keepPreviousData: true` |
| Calling `mutate` from outside a component | Use `useSWRConfig().mutate` — `import { mutate }` from `swr` is the global one |

## Related Skills

- `tanstack-query` — More feature-rich alternative; better for complex apps
- `nextjs` — App Router SSR patterns work differently with SWR
- `react-hook-form` — Forms that submit via `useSWRMutation`
- `vercel-ai-sdk` — Streaming AI responses (different pattern — not SWR)

---

Sources:
- [SWR — Vercel](https://swr.vercel.app/)
- [Mutation & Revalidation — SWR Docs](https://swr.vercel.app/docs/mutation)
- [Announcing SWR 2.0](https://swr.vercel.app/blog/swr-v2)
- [SWR API Reference](https://swr.vercel.app/docs/api)
- [Automatic Revalidation — SWR](https://swr.vercel.app/docs/revalidation)
