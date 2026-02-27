# Zustand Developer Reference

> v5.0.11 · React 18+ · TypeScript 4.5+ · https://zustand.docs.pmnd.rs · Updated February 2026

---

## Installation

```bash
npm install zustand
```

No peer dependencies beyond React 18. `use-sync-external-store` is bundled internally in v5.

---

## Store Creation

### Basic Store

```typescript
import { create } from 'zustand';

interface CountStore {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

const useCountStore = create<CountStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));
```

### With `get` for Reading State Inside Actions

```typescript
interface CartStore {
  items: string[];
  total: number;
  addItem: (item: string, price: number) => void;
  getItemCount: () => number;
}

const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  total: 0,
  addItem: (item, price) =>
    set((state) => ({
      items: [...state.items, item],
      total: state.total + price,
    })),
  getItemCount: () => get().items.length,
}));
```

### Async Actions

Actions are plain functions — no `async` middleware required.

```typescript
interface UserStore {
  user: User | null;
  loading: boolean;
  error: string | null;
  fetchUser: (id: string) => Promise<void>;
}

const useUserStore = create<UserStore>((set) => ({
  user: null,
  loading: false,
  error: null,
  fetchUser: async (id) => {
    set({ loading: true, error: null });
    try {
      const user = await api.getUser(id);
      set({ user, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },
}));
```

---

## Using in Components

### Always Subscribe With a Selector

Selectors are the single most important pattern in Zustand. Without them every component re-renders on every state change.

```typescript
// ✓ Correct — re-renders only when count changes
const count = useCountStore((state) => state.count);

// ✓ Correct — subscribes to action (stable reference, never triggers re-render)
const increment = useCountStore((state) => state.increment);

// ✗ Wrong — subscribes to entire store object
const store = useCountStore();
```

### Selecting Multiple Values — useShallow

When you need multiple values, use `useShallow` to prevent extra re-renders from new object references:

```typescript
import { useShallow } from 'zustand/react/shallow';

const { count, total } = useCountStore(
  useShallow((state) => ({ count: state.count, total: state.total }))
);

// Or with array
const [count, total] = useCountStore(
  useShallow((state) => [state.count, state.total])
);
```

`useShallow` does a shallow comparison of the returned value. Without it, returning a new `{}` or `[]` on every call triggers a re-render even if values haven't changed.

### Custom Equality (createWithEqualityFn)

For deep equality or custom logic:

```typescript
import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';

const useStore = createWithEqualityFn<MyStore>(
  (set) => ({ ... }),
  shallow // default equality function for this store
);
```

Note: `create` in v5 no longer accepts a second equality argument. Use `createWithEqualityFn` from `zustand/traditional` instead.

---

## Middleware — persist

Persists state to storage (localStorage by default).

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SettingsStore {
  theme: 'light' | 'dark';
  locale: string;
  setTheme: (theme: 'light' | 'dark') => void;
}

const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: 'light',
      locale: 'en',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'settings-storage',         // localStorage key
      storage: createJSONStorage(() => localStorage), // default
      partialize: (state) => ({ theme: state.theme }), // only persist theme
      onRehydrateStorage: () => (state) => {
        console.log('hydration complete', state);
      },
    }
  )
);
```

### Persist Options

| Option | Type | Description |
|--------|------|-------------|
| `name` | `string` | Storage key — required |
| `storage` | `StorageValue` | `createJSONStorage(() => sessionStorage)` for session |
| `partialize` | `(state) => partial` | Select which fields to persist |
| `onRehydrateStorage` | `() => (state, error) => void` | Callback after rehydration |
| `version` | `number` | Bump to invalidate old persisted state |
| `migrate` | `(persisted, version) => state` | Handle version mismatches |
| `skipHydration` | `boolean` | Defer hydration for SSR — call `rehydrate()` manually |

### Checking Hydration Status

```typescript
const hasHydrated = useSettingsStore((state) => state._hasHydrated);

// Or use the built-in
const isHydrated = useSettingsStore.persist.hasHydrated();

// Subscribe to hydration
useSettingsStore.persist.onFinishHydration((state) => {
  console.log('done', state);
});
```

### Custom Storage (e.g., AsyncStorage for React Native)

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

persist(
  (set) => ({ ... }),
  {
    name: 'my-store',
    storage: createJSONStorage(() => AsyncStorage),
  }
)
```

---

## Middleware — devtools

Integrates with Redux DevTools Extension for time-travel debugging and action labels.

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useStore = create<CountStore>()(
  devtools(
    (set) => ({
      count: 0,
      increment: () => set((s) => ({ count: s.count + 1 }), false, 'increment'),
      reset: () => set({ count: 0 }, false, 'reset'),
    }),
    { name: 'CountStore', enabled: process.env.NODE_ENV !== 'production' }
  )
);
```

The third argument to `set` is the action name shown in DevTools. The second argument is the `replace` flag — pass `false` to merge (default behavior).

### devtools Options

| Option | Type | Description |
|--------|------|-------------|
| `name` | `string` | Store label in DevTools |
| `enabled` | `boolean` | Disable in production |
| `anonymousActionType` | `string` | Label for unlabeled `set` calls |
| `store` | `string` | Instance name for multiple stores |

---

## Middleware — immer

Enables direct mutation syntax for nested state updates.

```typescript
npm install immer
```

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface TodoStore {
  todos: { id: string; text: string; done: boolean }[];
  toggle: (id: string) => void;
  addTodo: (text: string) => void;
}

const useTodoStore = create<TodoStore>()(
  immer((set) => ({
    todos: [],
    toggle: (id) =>
      set((state) => {
        const todo = state.todos.find((t) => t.id === id);
        if (todo) todo.done = !todo.done; // direct mutation — immer handles immutability
      }),
    addTodo: (text) =>
      set((state) => {
        state.todos.push({ id: crypto.randomUUID(), text, done: false });
      }),
  }))
);
```

Without immer, nested updates require spread:

```typescript
// Without immer — verbose for deep state
set((state) => ({
  user: { ...state.user, profile: { ...state.user.profile, name: 'Alice' } }
}))

// With immer — clean
set((state) => { state.user.profile.name = 'Alice'; })
```

---

## Stacking Middleware

Order matters. Outer middleware wraps inner. Apply middleware only at the combined store level, not inside slices.

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const useStore = create<MyStore>()(
  devtools(
    persist(
      immer((set) => ({
        // store definition
      })),
      { name: 'my-store' }
    ),
    { name: 'MyStore' }
  )
);
```

**Recommended order:** `devtools` → `persist` → `immer` (outermost to innermost).

### TypeScript — Middleware Mutators

When combining middleware with TypeScript, the `StateCreator` type requires explicit mutator tuples:

```typescript
import { StateCreator } from 'zustand';
import { PersistOptions } from 'zustand/middleware';

type MySlice = StateCreator<
  RootStore,
  [['zustand/devtools', never], ['zustand/persist', RootStore]],
  [],
  MySliceState
>;
```

For most projects, inference works without explicit mutators. Only reach for this when TypeScript complains about incompatible types.

---

## Slices Pattern

Split large stores into domain-scoped slices. Each slice is a `StateCreator` function. Combine at the top level.

```typescript
// store/bear-slice.ts
import { StateCreator } from 'zustand';

export interface BearSlice {
  bears: number;
  addBear: () => void;
}

export const createBearSlice: StateCreator<
  BearSlice & FishSlice, // full combined type
  [],
  [],
  BearSlice
> = (set) => ({
  bears: 0,
  addBear: () => set((state) => ({ bears: state.bears + 1 })),
});

// store/fish-slice.ts
export interface FishSlice {
  fish: number;
  addFish: () => void;
}

export const createFishSlice: StateCreator<
  BearSlice & FishSlice,
  [],
  [],
  FishSlice
> = (set) => ({
  fish: 0,
  addFish: () => set((state) => ({ fish: state.fish + 1 })),
});

// store/index.ts — combine slices, apply middleware here only
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useStore = create<BearSlice & FishSlice>()(
  devtools(
    (...args) => ({
      ...createBearSlice(...args),
      ...createFishSlice(...args),
    }),
    { name: 'AppStore' }
  )
);
```

### Accessing Sibling Slice State

Slices share the full combined store type, so actions can read from other slices:

```typescript
export const createBearSlice: StateCreator<BearSlice & FishSlice, [], [], BearSlice> = (set, get) => ({
  bears: 0,
  eatFish: () => {
    const { fish } = get(); // read from fish slice
    if (fish > 0) set({ bears: get().bears + 1 });
  },
});
```

---

## SSR & Hydration (Next.js App Router)

### The Problem

Zustand stores are module-level singletons. In Next.js App Router with server components, this means:
- The same store instance is shared across all incoming requests on the server — **state leaks between users**
- The server renders with one state, the client hydrates with different state — **hydration mismatch**

### The Solution — Store Factory + Context Provider

Create a new store instance per request using a factory, then provide it via React context.

```typescript
// lib/store.ts
import { createStore, StoreApi } from 'zustand/vanilla';

export interface BearStore {
  count: number;
  increment: () => void;
}

export type BearStoreApi = StoreApi<BearStore>;

export const createBearStore = (initialState?: Partial<BearStore>): BearStoreApi =>
  createStore<BearStore>((set) => ({
    count: 0,
    ...initialState,
    increment: () => set((s) => ({ count: s.count + 1 })),
  }));
```

```typescript
// providers/bear-store-provider.tsx
'use client';

import { createContext, useContext, useRef, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { createBearStore, BearStoreApi, BearStore } from '@/lib/store';

const BearStoreContext = createContext<BearStoreApi | null>(null);

interface BearStoreProviderProps {
  children: ReactNode;
  initialState?: Partial<BearStore>;
}

export function BearStoreProvider({ children, initialState }: BearStoreProviderProps) {
  const storeRef = useRef<BearStoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = createBearStore(initialState);
  }
  return (
    <BearStoreContext.Provider value={storeRef.current}>
      {children}
    </BearStoreContext.Provider>
  );
}

export function useBearStore<T>(selector: (state: BearStore) => T): T {
  const store = useContext(BearStoreContext);
  if (!store) throw new Error('useBearStore must be used within BearStoreProvider');
  return useStore(store, selector);
}
```

```typescript
// app/layout.tsx (Server Component)
import { BearStoreProvider } from '@/providers/bear-store-provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <BearStoreProvider>
          {children}
        </BearStoreProvider>
      </body>
    </html>
  );
}
```

### Persist + SSR — Avoiding Hydration Errors

When using `persist` with localStorage, the first server render and first client render will mismatch because the server has no localStorage.

```typescript
// Pattern: skip rendering persisted state until after hydration
'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const theme = useSettingsStore((s) => s.theme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null; // or a skeleton — matches server render

  return <button>{theme === 'dark' ? '☀️' : '🌙'}</button>;
}
```

Or use `skipHydration` in persist options and call `rehydrate()` after mount:

```typescript
const useStore = create()(
  persist(
    (set) => ({ ... }),
    { name: 'store', skipHydration: true }
  )
);

// In a client component
useEffect(() => {
  useStore.persist.rehydrate();
}, []);
```

---

## Persistence Strategies

| Strategy | Use Case | Storage |
|----------|----------|---------|
| `localStorage` | Auth tokens, UI prefs, theme | Browser only, sync |
| `sessionStorage` | Temporary session data | Tab-scoped, sync |
| `AsyncStorage` | React Native | Async |
| `IndexedDB` | Large data (via idb-keyval) | Browser, async |
| Custom | Database, cookie, server | Any — implement `StorageValue` interface |

### Custom Storage Adapter

```typescript
import { createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval'; // IndexedDB

const idbStorage = createJSONStorage(() => ({
  getItem: async (name) => (await get(name)) ?? null,
  setItem: (name, value) => set(name, value),
  removeItem: (name) => del(name),
}));

persist((set) => ({ ... }), { name: 'big-store', storage: idbStorage })
```

---

## Outside React

Read and write store state anywhere — server actions, utilities, WebSocket handlers.

```typescript
// Get current state snapshot
const count = useCountStore.getState().count;

// Mutate state
useCountStore.getState().increment();
useCountStore.setState({ count: 0 });

// Subscribe to changes (returns unsubscribe)
const unsub = useCountStore.subscribe(
  (state) => state.count,     // selector
  (count, prevCount) => {     // listener
    console.log('count changed:', prevCount, '→', count);
  }
);

// Later
unsub();
```

### Vanilla Store (no React)

```typescript
import { createStore } from 'zustand/vanilla';

const store = createStore<CountStore>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}));

store.getState().increment();
console.log(store.getState().count); // 1
store.destroy(); // cleanup
```

---

## Testing

### Reset Store Between Tests

The recommended pattern: mock `zustand` to auto-reset stores after each test.

```typescript
// __mocks__/zustand.ts
import { act } from '@testing-library/react';
import { create as _create, StateCreator } from 'zustand';

const storeResetFns = new Set<() => void>();

export const create = (<T>(stateCreator: StateCreator<T>) => {
  const store = _create(stateCreator);
  const initialState = store.getState();
  storeResetFns.add(() => store.setState(initialState, true));
  return store;
}) as typeof _create;

afterEach(() => {
  act(() => storeResetFns.forEach((fn) => fn()));
});
```

For Vitest, ensure the `__mocks__` directory is at `src/__mocks__/zustand.ts` if `root` is `./src`.

### Testing Store Logic Directly

```typescript
import { useCountStore } from '@/store/count';

describe('countStore', () => {
  beforeEach(() => {
    useCountStore.setState({ count: 0 });
  });

  it('increments', () => {
    useCountStore.getState().increment();
    expect(useCountStore.getState().count).toBe(1);
  });

  it('resets', () => {
    useCountStore.setState({ count: 10 });
    useCountStore.getState().reset();
    expect(useCountStore.getState().count).toBe(0);
  });
});
```

### Testing Components With Store

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Counter } from '@/components/Counter';
import { useCountStore } from '@/store/count';

beforeEach(() => useCountStore.setState({ count: 0 }));

it('shows count and increments', () => {
  render(<Counter />);
  expect(screen.getByText('0')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /increment/i }));
  expect(screen.getByText('1')).toBeInTheDocument();
});
```

### Mocking the Store in Unit Tests

When you want to test a component in isolation without the real store:

```typescript
vi.mock('@/store/count', () => ({
  useCountStore: vi.fn((selector) =>
    selector({ count: 42, increment: vi.fn(), reset: vi.fn() })
  ),
}));
```

---

## vs Alternatives

| | Zustand | Redux Toolkit | Jotai | Valtio |
|--|---------|---------------|-------|--------|
| **Bundle size** | ~1KB | ~15KB | ~3KB | ~3KB |
| **Boilerplate** | Minimal | Moderate | Minimal | Minimal |
| **DevTools** | ✓ via middleware | ✓ built-in | ✓ via extension | ✓ via middleware |
| **Async** | Plain functions | Thunks/RTK Query | Plain atoms | Plain mutations |
| **SSR safe** | With factory pattern | ✓ | ✓ | Partial |
| **Subscription** | Selector-based | Selector-based | Atom-based | Proxy-based |

**Use Zustand when:** Client-side global state, simple-to-moderate complexity, small bundle budget.

**Use Redux Toolkit when:** Large app, complex async flows, strong DevTools requirement, existing Redux codebase.

**Use Jotai when:** Atomic/fine-grained state, code-splitting state by feature, bottom-up composition.

**Use TanStack Query instead when:** The state is remote data — stores are not for fetching, caching, or revalidation.

---

## Migration from Redux / Context

### From Redux

```typescript
// Redux (before)
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state) => { state.value += 1; },
    decrement: (state) => { state.value -= 1; },
  },
});
const store = configureStore({ reducer: { counter: counterSlice.reducer } });
const count = useSelector((state) => state.counter.value);
const dispatch = useDispatch();
dispatch(increment());

// Zustand (after)
const useCountStore = create<CountStore>((set) => ({
  value: 0,
  increment: () => set((s) => ({ value: s.value + 1 })),
  decrement: () => set((s) => ({ value: s.value - 1 })),
}));
const count = useCountStore((s) => s.value);
useCountStore.getState().increment();
```

### From Context + useReducer

```typescript
// Context (before) — requires Provider, re-renders all consumers
const [state, dispatch] = useReducer(reducer, initialState);
<CountContext.Provider value={{ state, dispatch }}>

// Zustand (after) — no Provider, selective re-renders
const useCountStore = create<CountStore>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}));
// No provider needed — just use the hook anywhere
```

---

## Common Mistakes

| Mistake | Why It Hurts | Fix |
|---------|-------------|-----|
| No selector — `useStore()` | Every state change re-renders the component | `useStore((s) => s.value)` |
| Returning new object/array without `useShallow` | Infinite re-render loop in v5 | `useStore(useShallow((s) => ({ a: s.a, b: s.b })))` |
| Module-level store in Next.js SSR | State leaks between users' requests | Factory + context provider pattern |
| Middleware inside slices | Unexpected behavior, TypeScript errors | Apply middleware in combined store only |
| `setState({}, true)` in v5 | Type error — replace requires complete state | Provide full state or set `replace: false` |
| Putting server state in Zustand | Wrong tool — leads to cache invalidation hell | Use TanStack Query for remote data |
| Not resetting store between tests | Shared state contaminates test order | Mock `create` to collect and reset all stores |
| `import { shallow } from 'zustand/shallow'` as equality fn in `create` | Not supported in v5 | Use `createWithEqualityFn` from `zustand/traditional` |

---

## v4 → v5 Breaking Changes

| Change | v4 | v5 |
|--------|----|----|
| Default exports | Supported | Removed — use named `import { create }` |
| React minimum | 16.8+ | 18+ |
| TypeScript minimum | 4.4+ | 4.5+ |
| `create` equality arg | `create(fn, shallow)` | Use `createWithEqualityFn` |
| `setState` replace + partial | Allowed | Type error — must provide full state |
| `persist` rehydration behavior | Auto on import | Matches React's default, `skipHydration` available |
| UMD/SystemJS | Supported | Dropped |
| ES5 | Supported | Dropped |
| `useSyncExternalStore` | Polyfill | Native (React 18) |

For full migration notes: https://zustand.docs.pmnd.rs/migrations/migrating-to-v5
