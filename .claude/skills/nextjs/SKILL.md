---
model: claude-sonnet-4-6
name: nextjs
description: Use when working with Next.js App Router, React Server Components, server actions, layouts, metadata API, or caching. Also use when configuring Next.js middleware/proxy, optimizing images/fonts, or debugging hydration errors.
---

# Next.js App Router

## Overview

Next.js (v16.1.6 LTS, February 2026) is a React framework with file-system routing, React Server Components, and a multi-layer caching model. The App Router is the default and only actively developed router.

## Quick Reference

| Item | Value |
|------|-------|
| **Current Version** | 16.1.6 LTS (February 2026) |
| **Install** | `npx create-next-app@latest` |
| **Config** | `next.config.ts` (TypeScript-native) |
| **Dev** | `next dev` (Turbopack default) |
| **Build** | `next build` (Turbopack default) |
| **Node.js** | 20.9.0+ |
| **TypeScript** | 5.1.0+ |
| **React** | 19.2 (App Router) |
| **Docs** | https://nextjs.org/docs |

## Key File Conventions

| File | Purpose |
|------|---------|
| `layout.tsx` | Shared UI, **persists across navigations**, wraps children |
| `page.tsx` | Unique route UI, exposed as public URL |
| `loading.tsx` | Suspense fallback shown during segment load |
| `error.tsx` | Error boundary for the segment (must be `'use client'`) |
| `not-found.tsx` | 404 UI, triggered by `notFound()` |
| `template.tsx` | Like layout but **remounts on every navigation** |
| `route.ts` | API endpoint (no UI, replaces pages/api) |
| `default.tsx` | Fallback for parallel route slots |
| `middleware.ts` | Edge runtime interceptor (deprecated — use `proxy.ts`) |
| `proxy.ts` | Node.js runtime request interceptor (Next.js 16+) |
| `instrumentation.ts` | Server lifecycle observability hook |

## Server vs Client Components

Server Components are the default. Mark client components with `'use client'` (first line, before imports).

**Use `'use client'` when:** useState, useEffect, onClick, useRouter, useOptimistic, browser APIs.
**Keep server when:** data fetching, direct DB/filesystem access, sensitive secrets, async/await.

## Common Operations

**Server Action with form:**
```typescript
// app/actions.ts
'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const schema = z.object({ name: z.string().min(1) });

export async function createProduct(prevState: any, formData: FormData) {
  const result = schema.safeParse({ name: formData.get('name') });
  if (!result.success) return { errors: result.error.flatten().fieldErrors };
  await db.products.create({ data: result.data });
  revalidatePath('/products');
}
```

**Caching fetch data:**
```typescript
// Not cached by default in Next.js 15+ — opt in explicitly
const data = await fetch('https://api.example.com/data', { cache: 'force-cache' });

// Time-based revalidation
const data = await fetch('https://api.example.com/data', { next: { revalidate: 3600 } });

// Tagged for on-demand invalidation
const data = await fetch('https://api.example.com/data', { next: { tags: ['products'] } });
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Expecting `fetch` to cache by default | Next.js 15+ does NOT cache fetch. Use `{ cache: 'force-cache' }` to opt in |
| Using `params`/`cookies()`/`headers()` synchronously | All are async in Next.js 15+: `const { id } = await params` |
| Using `middleware.ts` in Next.js 16 | Rename to `proxy.ts` and export `proxy` function (middleware.ts deprecated) |
| `revalidateTag(tag)` without second arg in Next.js 16 | Use `revalidateTag(tag, 'max')` — single arg is deprecated |
| Calling `revalidateTag` during render | Only valid in Server Actions and Route Handlers |
| Missing `default.js` in parallel routes | All parallel route slots require `default.js` in Next.js 16 |
| `experimental.ppr` flag in next.config | Removed in Next.js 16 — use `cacheComponents: true` instead |
| `useFormState` from react-dom | Replaced by `useActionState` from react in React 19 |

## Full Reference

See `reference.md` for: complete file conventions, routing patterns (dynamic, parallel, intercepting), all 4 caching layers, Server Actions with useOptimistic/useActionState, Metadata API, next/image, next/font, middleware/proxy, error handling, and full Next.js 15→16 migration guide.
