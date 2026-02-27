---
model: claude-sonnet-4-6
name: zustand
description: Use when managing client-side state with Zustand — global stores, slices, middleware, or persistence. Also use when choosing between state management solutions or migrating from Redux/Context to Zustand.
---

# Zustand

## Overview
Zustand (v5.0.x, released October 2024) is a minimal, unopinionated state management library for React. No providers, no reducers, no ceremony — just a store and a hook.

## Quick Reference

| Item | Value |
|------|-------|
| **Current Version** | 5.0.11 |
| **Install** | `npm install zustand` |
| **React Minimum** | React 18+ |
| **TypeScript Minimum** | 4.5+ |
| **Docs** | https://zustand.docs.pmnd.rs |

## Store Creation

```typescript
import { create } from 'zustand';

interface BearStore {
  count: number;
  increment: () => void;
  reset: () => void;
}

const useBearStore = create<BearStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  reset: () => set({ count: 0 }),
}));
```

## Component Usage — Always Use Selectors

```typescript
// ✓ Correct — only re-renders when count changes
const count = useBearStore((state) => state.count);

// ✗ Wrong — re-renders on every state change
const store = useBearStore();
```

## Persist Middleware

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create<BearStore>()(
  persist(
    (set) => ({ count: 0, increment: () => set((s) => ({ count: s.count + 1 })) }),
    { name: 'bear-storage' } // key in localStorage
  )
);
```

## SSR / Next.js App Router

Never export a plain module-level store — it leaks state across requests. Use a store factory per request:

```typescript
// lib/store.ts
import { createStore } from 'zustand/vanilla';
export const createBearStore = () => createStore<BearStore>()((set) => ({ count: 0 }));
```

Wrap in a context provider and hydrate client-side. See `reference.md` for full Next.js pattern.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Subscribing to whole store | Always pass a selector: `useStore((s) => s.value)` |
| Returning new object without `useShallow` | Use `import { useShallow } from 'zustand/react/shallow'` |
| Module-level store in Next.js App Router | Use `createStore` factory inside a context provider |
| Applying middleware inside slices | Only apply middleware at the combined store level |
| `setState({}, true)` in v5 | Replace flag requires a complete state object — partial state + `true` is a type error |

## Full Reference

See `reference.md` in this skill directory for complete docs: middleware stacking, slices pattern, devtools, immer, outside-React usage, testing patterns, and migration from Redux/Context.
