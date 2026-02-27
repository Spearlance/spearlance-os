# SvelteKit Developer Reference

> **Last Verified:** February 2026
> **Current Version:** SvelteKit 2.x / Svelte 5.x (Vite 5, Node >= 18.13)
> **Documentation:** https://svelte.dev/docs/kit

---

## Table of Contents

1. [Setup](#1-setup)
2. [Routing](#2-routing)
3. [Load Functions](#3-load-functions)
4. [Form Actions](#4-form-actions)
5. [Svelte 5 Runes](#5-svelte-5-runes)
6. [Components](#6-components)
7. [Hooks](#7-hooks)
8. [API Routes](#8-api-routes)
9. [Stores & State](#9-stores--state)
10. [Deployment](#10-deployment)
11. [SvelteKit vs Next.js](#11-sveltekit-vs-nextjs)
12. [Common Mistakes](#12-common-mistakes)

---

## 1. Setup

### Create a Project

```bash
npm create svelte@latest my-app
cd my-app
npm install
npm run dev
```

CLI prompts:
- **Template**: SvelteKit demo / Skeleton project / Library skeleton
- **Type checking**: TypeScript (recommended) or JSDoc
- **Additional tools**: ESLint, Prettier, Playwright, Vitest

### TypeScript Option

TypeScript is configured automatically when selected. The CLI adds `tsconfig.json`, `.svelte-check`, and `.ts` extensions to all generated files. You can also use `.js` with JSDoc comments — both are fully supported.

### Add Tailwind CSS

```bash
npx svelte-add@latest tailwindcss
npm install
```

`svelte-add` installs Tailwind, PostCSS, and configures `svelte.config.js` and `app.css` automatically. For Tailwind v4, the config is CSS-first — no `tailwind.config.js` needed.

### Project Structure

```
my-app/
├── src/
│   ├── lib/                  # Shared code — import as $lib/...
│   │   ├── server/           # Server-only modules ($lib/server/...)
│   │   └── components/       # Reusable Svelte components
│   ├── routes/               # Filesystem router
│   │   ├── +layout.svelte    # Root layout
│   │   ├── +layout.server.ts # Root layout server load
│   │   ├── +page.svelte      # Index page (/)
│   │   └── blog/
│   │       ├── +page.svelte
│   │       ├── +page.server.ts
│   │       └── [slug]/
│   │           ├── +page.svelte
│   │           └── +page.server.ts
│   ├── hooks.server.ts       # Server hooks (auth, middleware)
│   ├── hooks.ts              # Universal hooks
│   └── app.html              # HTML shell template
├── static/                   # Static assets (favicon, robots.txt)
├── svelte.config.js          # SvelteKit configuration
├── vite.config.ts            # Vite configuration
└── tsconfig.json
```

### svelte.config.js

```javascript
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      $components: 'src/lib/components',
    },
  },
};

export default config;
```

### App.html Template

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

---

## 2. Routing

SvelteKit uses a filesystem-based router. Every folder inside `src/routes/` maps to a URL path. Files get a `+` prefix to distinguish route files from utility files.

### File Conventions

| File | Route segment behavior |
|------|------------------------|
| `+page.svelte` | Page UI component |
| `+page.ts` | Universal load (runs on server + client) |
| `+page.server.ts` | Server-only load + form actions |
| `+layout.svelte` | Shared UI wrapper for all child routes |
| `+layout.ts` | Universal layout load |
| `+layout.server.ts` | Server-only layout load |
| `+server.ts` | API endpoint (no UI) |
| `+error.svelte` | Error boundary for the segment |

### Basic Routes

```
src/routes/
├── +page.svelte          → /
├── about/
│   └── +page.svelte      → /about
└── blog/
    ├── +page.svelte      → /blog
    └── [slug]/
        └── +page.svelte  → /blog/:slug
```

### Dynamic Parameters

```
[slug]          → /blog/hello-world   (params.slug = "hello-world")
[...rest]       → /files/a/b/c        (params.rest = "a/b/c")
[[optional]]    → /shop or /shop/sale (params.optional = "sale" | undefined)
```

Access in load:
```typescript
export const load: PageServerLoad = async ({ params }) => {
  const { slug } = params; // string
};
```

### Route Groups (Parentheses)

Group routes without affecting the URL:

```
src/routes/
├── (marketing)/
│   ├── +layout.svelte    # Applies to all routes in group
│   ├── +page.svelte      → /
│   └── about/
│       └── +page.svelte  → /about
└── (app)/
    ├── +layout.svelte    # Auth layout
    └── dashboard/
        └── +page.svelte  → /dashboard
```

Groups allow different layouts for different sections without URL nesting.

### Param Matchers

Validate a parameter format with a matcher:

```typescript
// src/params/integer.ts
import type { ParamMatcher } from '@sveltejs/kit';

export const match: ParamMatcher = (param) => {
  return /^\d+$/.test(param);
};
```

```
src/routes/items/[id=integer]/+page.svelte
```

### Layout Nesting

Layouts wrap child routes. A `+layout.svelte` in a parent directory wraps all children:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  let { children } = $props();
</script>

<nav>...</nav>
<main>
  {@render children()}
</main>
```

---

## 3. Load Functions

Load functions fetch data before a route renders. They run on the server during SSR and may re-run on the client during navigation.

### Universal Load (+page.ts)

Runs on both server (during SSR) and client (during navigation). Cannot access databases, private env vars, cookies, or `locals` directly.

```typescript
// src/routes/blog/+page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, url, params }) => {
  // Use the provided fetch — it's credential-aware and handles SSR/CSR
  const response = await fetch('/api/posts');
  const posts = await response.json();
  return { posts };
};
```

```svelte
<!-- +page.svelte -->
<script lang="ts">
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

{#each data.posts as post}
  <h2>{post.title}</h2>
{/each}
```

### Server Load (+page.server.ts)

Runs on the server only. Has access to `cookies`, `locals`, `clientAddress`, `platform`, and can hit databases directly. Data must be serializable (JSON, Date, Map, Set, BigInt, RegExp).

```typescript
// src/routes/dashboard/+page.server.ts
import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals, cookies }) => {
  if (!locals.user) redirect(303, '/login');

  const projects = await db.project.findMany({
    where: { userId: locals.user.id },
  });

  if (!projects) error(500, 'Failed to load projects');

  return { projects, user: locals.user };
};
```

### Layout Load Inheritance

Child load functions can access parent layout data via `await parent()`:

```typescript
// src/routes/(app)/+layout.server.ts
export const load: LayoutServerLoad = async ({ locals }) => {
  return { user: locals.user };
};

// src/routes/(app)/settings/+page.server.ts
export const load: PageServerLoad = async ({ parent }) => {
  // Don't await parent() before other async work — causes a waterfall
  const [{ user }, settings] = await Promise.all([
    parent(),
    db.settings.findOne({ userId: '...' }),
  ]);
  return { user, settings };
};
```

### Streaming with Promises

Return a promise from `+page.server.ts` to stream data progressively:

```typescript
export const load: PageServerLoad = async () => {
  return {
    // Awaited immediately — blocks render
    user: await getUser(),
    // Not awaited — streams after initial render
    comments: getComments(),
  };
};
```

```svelte
<script lang="ts">
  let { data }: PageProps = $props();
</script>

{#await data.comments}
  <p>Loading comments...</p>
{:then comments}
  {#each comments as c}<p>{c.text}</p>{/each}
{/await}
```

### Dependency Tracking

```typescript
export const load: PageLoad = async ({ depends, fetch }) => {
  // Declare custom dependency key
  depends('app:user');

  const user = await fetch('/api/user').then(r => r.json());
  return { user };
};
```

```svelte
<script lang="ts">
  import { invalidate } from '$app/navigation';
  // Re-run the load function anywhere
  invalidate('app:user');
</script>
```

---

## 4. Form Actions

Form actions are the SvelteKit way to handle `POST` requests from HTML forms. They run server-side and support progressive enhancement via `use:enhance`.

### Default Action

One action per page with no query parameter:

```typescript
// src/routes/contact/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const email = data.get('email') as string | null;
    const message = data.get('message') as string | null;

    if (!email || !message) {
      return fail(400, { email, message, missing: true });
    }

    await sendEmail({ email, message });
    return { success: true };
  },
};
```

```svelte
<!-- +page.svelte -->
<script lang="ts">
  import type { ActionData } from './$types';
  let { form }: { form: ActionData } = $props();
</script>

<form method="POST">
  <input name="email" value={form?.email ?? ''} />
  <textarea name="message">{form?.message ?? ''}</textarea>
  {#if form?.missing}<p class="error">All fields required</p>{/if}
  {#if form?.success}<p>Sent!</p>{/if}
  <button>Send</button>
</form>
```

### Named Actions

Multiple actions on one page, selected via query param:

```typescript
export const actions: Actions = {
  login: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = data.get('email') as string;
    const password = data.get('password') as string;

    if (!email || !password) return fail(400, { missing: true });

    const user = await verifyUser(email, password);
    if (!user) return fail(401, { invalid: true });

    cookies.set('session', createSession(user.id), {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    redirect(303, '/dashboard');
  },

  register: async ({ request }) => {
    // ...
  },
};
```

```svelte
<!-- Named action via action="?/login" -->
<form method="POST" action="?/login" use:enhance>
  <input name="email" type="email" />
  <input name="password" type="password" />
  <button>Login</button>
</form>

<!-- Named action via formaction on button -->
<form method="POST">
  <input name="email" type="email" />
  <button formaction="?/login">Login</button>
  <button formaction="?/register">Register</button>
</form>
```

### Progressive Enhancement (use:enhance)

`use:enhance` from `$app/forms` intercepts form submission with JS, preventing full-page reload while maintaining the same server action behavior.

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';

  let loading = $state(false);

  const handleSubmit: SubmitFunction = () => {
    loading = true;
    return async ({ result, update }) => {
      loading = false;
      // result.type: 'success' | 'failure' | 'redirect' | 'error'
      if (result.type === 'success') {
        // Custom success handling
      }
      // Call update() to apply result to the form prop
      await update();
    };
  };
</script>

<form method="POST" use:enhance={handleSubmit}>
  <button disabled={loading}>
    {loading ? 'Saving...' : 'Save'}
  </button>
</form>
```

### Validation Pattern with Zod

```typescript
// src/routes/signup/+page.server.ts
import { z } from 'zod';
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const raw = Object.fromEntries(formData);

    const result = schema.safeParse(raw);
    if (!result.success) {
      return fail(400, {
        errors: result.error.flatten().fieldErrors,
        values: raw,
      });
    }

    await createUser(result.data);
    redirect(303, '/onboarding');
  },
};
```

---

## 5. Svelte 5 Runes

Svelte 5 introduces runes — compiler directives that replace the old Options API (`export let`, `$:`, `let` for reactivity). Runes only work in `.svelte` files (and `.svelte.ts` files with `svelte` preprocessor).

### $state

Declares reactive state. Deep reactivity for arrays and plain objects via proxy.

```svelte
<script lang="ts">
  let count = $state(0);
  let user = $state({ name: 'Alice', age: 30 });
  let tags = $state<string[]>([]);

  // Mutations are reactive
  function addTag(tag: string) {
    tags.push(tag); // triggers update
  }

  // $state.raw — opt out of deep reactivity (better perf for large lists)
  let bigList = $state.raw<number[]>([]);
  // Must reassign, not mutate:
  bigList = [...bigList, 4];

  // $state.snapshot — get a plain (non-proxy) copy
  function logState() {
    console.log($state.snapshot(user));
  }
</script>

<button onclick={() => count++}>{count}</button>
<p>{user.name}</p>
```

### $derived

Computed values. Recalculates only when dependencies change. No side effects allowed.

```svelte
<script lang="ts">
  let items = $state<{ price: number; qty: number }[]>([]);

  // Simple expression
  let total = $derived(items.reduce((sum, i) => sum + i.price * i.qty, 0));

  // $derived.by for multi-line logic
  let summary = $derived.by(() => {
    const count = items.length;
    const avg = count > 0 ? total / count : 0;
    return { count, avg };
  });
</script>

<p>Total: ${total.toFixed(2)}</p>
<p>Items: {summary.count}, Avg: ${summary.avg.toFixed(2)}</p>
```

### $effect

Runs after the DOM updates when dependencies change. Return a cleanup function for subscriptions.

```svelte
<script lang="ts">
  let query = $state('');

  // Runs on mount + whenever `query` changes
  $effect(() => {
    const controller = new AbortController();
    fetch(`/api/search?q=${query}`, { signal: controller.signal })
      .then(r => r.json())
      .then(results => { /* update state */ });

    // Cleanup runs before next effect or on unmount
    return () => controller.abort();
  });

  // $effect.pre — runs before DOM updates (rare use case)
  $effect.pre(() => {
    // Useful for measuring DOM before paint
  });
</script>
```

### $props

Declares component props. Replaces `export let`. Supports destructuring with defaults and TypeScript types.

```svelte
<script lang="ts">
  interface Props {
    name: string;
    count?: number;
    onchange?: (value: string) => void;
  }

  let { name, count = 0, onchange }: Props = $props();
</script>

<p>{name}: {count}</p>
```

Pass all props to a child with `$props()` spread:

```svelte
<script lang="ts">
  let { class: className, ...rest } = $props();
</script>

<button class={className} {...rest} />
```

### $bindable

Mark a prop as two-way bindable (opt-in):

```svelte
<!-- Child.svelte -->
<script lang="ts">
  let { value = $bindable('') }: { value?: string } = $props();
</script>
<input bind:value />

<!-- Parent.svelte -->
<script lang="ts">
  let text = $state('hello');
</script>
<Child bind:value={text} />
```

---

## 6. Components

### Svelte File Structure

```svelte
<script lang="ts">
  // Component logic — runs on mount (client) and during SSR
  let { title }: { title: string } = $props();
  let count = $state(0);
</script>

<!-- Template — reactive HTML -->
<h1>{title}</h1>
<button onclick={() => count++}>{count}</button>

<style>
  /* Scoped by default — no class name collisions */
  h1 { color: var(--color-primary); }
</style>
```

### Slots (Svelte 4) vs Snippets (Svelte 5)

Svelte 5 replaces `<slot>` with snippets — typed, composable content blocks.

```svelte
<!-- Card.svelte (Svelte 5) -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    header,
    children,
    footer,
  }: {
    header?: Snippet;
    children: Snippet;
    footer?: Snippet<[{ closeCard: () => void }]>;
  } = $props();

  let open = $state(true);
</script>

{#if open}
  <div class="card">
    {#if header}{@render header()}{/if}
    {@render children()}
    {#if footer}{@render footer({ closeCard: () => open = false })}{/if}
  </div>
{/if}
```

```svelte
<!-- Usage -->
<Card>
  {#snippet header()}
    <h2>Title</h2>
  {/snippet}

  <p>Main content</p>

  {#snippet footer({ closeCard })}
    <button onclick={closeCard}>Close</button>
  {/snippet}
</Card>
```

### Event Handling

Svelte 5 uses standard DOM event attributes (no `on:` directive):

```svelte
<script lang="ts">
  function handleClick(e: MouseEvent) {
    console.log(e.target);
  }

  // Inline
  // <button onclick={() => count++}>
  // Named handler
  // <button onclick={handleClick}>
</script>

<button onclick={handleClick}>Click</button>
<input
  oninput={(e) => (value = e.currentTarget.value)}
  onkeydown={(e) => e.key === 'Enter' && submit()}
/>
```

### Bindings

```svelte
<script lang="ts">
  let name = $state('');
  let checked = $state(false);
  let selected = $state('a');
  let el: HTMLInputElement;
</script>

<input bind:value={name} />
<input type="checkbox" bind:checked />
<select bind:value={selected}>
  <option value="a">A</option>
  <option value="b">B</option>
</select>
<!-- DOM element reference -->
<input bind:this={el} />
```

### Transitions

```svelte
<script lang="ts">
  import { fade, fly, slide } from 'svelte/transition';
  let visible = $state(true);
</script>

{#if visible}
  <div transition:fade={{ duration: 300 }}>Fades in/out</div>
  <p in:fly={{ y: 20 }} out:fade>Flies in, fades out</p>
{/if}
```

### Control Flow

```svelte
{#if user.admin}
  <AdminPanel />
{:else if user.editor}
  <EditorPanel />
{:else}
  <p>No access</p>
{/if}

{#each items as item, i (item.id)}
  <div>{i}: {item.name}</div>
{:else}
  <p>No items</p>
{/each}

{#await promise}
  <p>Loading...</p>
{:then data}
  <p>{data.result}</p>
{:catch error}
  <p>Error: {error.message}</p>
{/await}
```

---

## 7. Hooks

Hooks run for every request. Declare in `src/hooks.server.ts` (server only) or `src/hooks.ts` (universal).

### hooks.server.ts

```typescript
import type { Handle, HandleFetch, HandleServerError } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

// handle() — intercepts every server request
export const handle: Handle = async ({ event, resolve }) => {
  // Read session cookie
  const sessionId = event.cookies.get('session');
  if (sessionId) {
    event.locals.user = await getUserFromSession(sessionId);
  }

  // Guard protected routes
  const isProtected = event.url.pathname.startsWith('/dashboard');
  if (isProtected && !event.locals.user) {
    redirect(303, '/login');
  }

  // Modify response (e.g., add headers)
  const response = await resolve(event, {
    transformPageChunk: ({ html }) => html.replace('%user%', event.locals.user?.name ?? 'Guest'),
  });

  response.headers.set('X-Custom-Header', 'value');
  return response;
};

// handleFetch() — intercept server-side fetch calls
export const handleFetch: HandleFetch = async ({ request, fetch, event }) => {
  // Rewrite public API URL to internal URL during SSR
  if (request.url.startsWith('https://api.example.com/')) {
    const url = request.url.replace('https://api.example.com/', 'http://localhost:9999/');
    return fetch(new Request(url, request));
  }
  return fetch(request);
};

// handleError() — catch unexpected errors
export const handleServerError: HandleServerError = async ({ error, event, status }) => {
  const id = crypto.randomUUID();
  // Log to your error tracking service
  console.error({ id, error, path: event.url.pathname });
  return {
    message: status === 404 ? 'Page not found' : 'Something went wrong',
    id,
  };
};
```

### App.Locals Type

Extend `locals` with TypeScript for type safety across all hooks and load functions:

```typescript
// src/app.d.ts
declare global {
  namespace App {
    interface Locals {
      user: { id: string; name: string; admin: boolean } | null;
    }
    interface Error {
      message: string;
      id?: string;
    }
    interface PageData {
      user?: App.Locals['user'];
    }
  }
}

export {};
```

### Sequence Multiple Hooks

```typescript
// src/hooks.server.ts
import { sequence } from '@sveltejs/kit/hooks';
import { auth } from './hooks/auth';
import { logging } from './hooks/logging';

export const handle = sequence(auth, logging);
```

### hooks.ts (Universal)

```typescript
import type { HandleClientError } from '@sveltejs/kit';

// handleError for the client side
export const handleError: HandleClientError = ({ error, event }) => {
  console.error('Client error:', error);
  return { message: 'An unexpected error occurred' };
};
```

### Observability (SvelteKit 2.x)

```typescript
// src/instrumentation.server.ts (new in SvelteKit 2.x)
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

---

## 8. API Routes

`+server.ts` files export HTTP method handlers. No page rendering — pure API endpoints.

### Basic API Route

```typescript
// src/routes/api/posts/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, locals }) => {
  const page = Number(url.searchParams.get('page') ?? '1');
  const limit = 20;

  const posts = await db.post.findMany({
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return json(posts);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Unauthorized');

  const body = await request.json();
  const post = await db.post.create({
    data: { ...body, authorId: locals.user.id },
  });

  return json(post, { status: 201 });
};
```

### PUT, PATCH, DELETE

```typescript
// src/routes/api/posts/[id]/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) error(401, 'Unauthorized');

  const body = await request.json();
  const post = await db.post.update({
    where: { id: params.id, authorId: locals.user.id },
    data: body,
  });

  if (!post) error(404, 'Post not found');
  return json(post);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  const body = await request.json();
  // partial update
  return json(await db.post.update({ where: { id: params.id }, data: body }));
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) error(401, 'Unauthorized');
  await db.post.delete({ where: { id: params.id } });
  return new Response(null, { status: 204 });
};
```

### Fallback Handler

```typescript
export const fallback: RequestHandler = async ({ request }) => {
  return new Response(`Method ${request.method} not allowed`, { status: 405 });
};
```

### Response Helpers

```typescript
import { json, text, error, redirect } from '@sveltejs/kit';

json({ key: 'value' })                     // Content-Type: application/json
json(data, { status: 201, headers: {} })   // With options
text('plain text')                          // Content-Type: text/plain
error(400, 'Bad request')                  // Throws HttpError
error(400, { message: 'Bad', code: 'X' }) // Custom error shape
redirect(303, '/login')                    // Throws Redirect
```

---

## 9. Stores & State

### Svelte Stores (svelte/store)

Still available and useful for sharing state across components — especially outside of `.svelte` files.

```typescript
// src/lib/stores/cart.ts
import { writable, readable, derived } from 'svelte/store';

// writable — read/write
export const cart = writable<CartItem[]>([]);

// readable — read-only with initializer
export const time = readable(new Date(), (set) => {
  const interval = setInterval(() => set(new Date()), 1000);
  return () => clearInterval(interval);
});

// derived — computed from other stores
export const cartTotal = derived(cart, ($cart) =>
  $cart.reduce((sum, item) => sum + item.price * item.qty, 0)
);
```

```svelte
<script lang="ts">
  import { cart, cartTotal } from '$lib/stores/cart';

  // $store auto-subscribes and unsubscribes
  // Works only inside .svelte files
</script>

<p>Items: {$cart.length}</p>
<p>Total: ${$cartTotal.toFixed(2)}</p>
<button onclick={() => cart.update(items => [...items, newItem])}>Add</button>
```

### Svelte 5 Replaces Stores for Component State

In Svelte 5, use `$state` and `$derived` instead of stores for component-level reactivity. Stores are still needed for cross-module (non-component) reactive state.

```typescript
// Svelte 5 global state — works in .svelte.ts files
// src/lib/state/app.svelte.ts

export const appState = (() => {
  let user = $state<User | null>(null);
  let theme = $state<'light' | 'dark'>('light');

  return {
    get user() { return user; },
    get theme() { return theme; },
    setUser(u: User | null) { user = u; },
    toggleTheme() { theme = theme === 'light' ? 'dark' : 'light'; },
  };
})();
```

```svelte
<script lang="ts">
  import { appState } from '$lib/state/app.svelte.ts';
</script>

<p>{appState.user?.name}</p>
<button onclick={appState.toggleTheme}>Toggle</button>
```

### Context API

For passing data down a component tree without prop drilling:

```svelte
<!-- Parent.svelte -->
<script lang="ts">
  import { setContext } from 'svelte';
  import type { Theme } from '$lib/types';

  const theme = $state<Theme>({ primary: 'blue' });
  setContext('theme', { get theme() { return theme; } });
</script>

<!-- Child.svelte (any depth) -->
<script lang="ts">
  import { getContext } from 'svelte';
  const { theme } = getContext<{ theme: Theme }>('theme');
</script>

<div style="color: {theme.primary}">...</div>
```

### Page Stores ($app/stores)

```svelte
<script lang="ts">
  import { page, navigating, updated } from '$app/stores';
</script>

<!-- Current route info -->
<p>{$page.url.pathname}</p>
<p>{$page.params.slug}</p>
<p>{$page.data.user?.name}</p>

<!-- Navigation state -->
{#if $navigating}
  <p>Loading...</p>
{/if}
```

---

## 10. Deployment

SvelteKit adapts to different deployment targets via adapters. Configure in `svelte.config.js`.

### adapter-auto (Default)

Detects environment automatically. Works with Vercel, Netlify, and Cloudflare out of the box. Falls back to Node.js.

```javascript
import adapter from '@sveltejs/adapter-auto';

export default {
  kit: { adapter: adapter() },
};
```

### adapter-node

For Node.js servers and Docker:

```bash
npm install @sveltejs/adapter-node
```

```javascript
import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter({
      out: 'build',          // Output directory
      precompress: true,     // gzip + brotli static assets
      envPrefix: 'APP_',    // Prefix for runtime env vars
    }),
  },
};
```

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY build ./build
COPY package.json .
RUN npm install --production
CMD ["node", "build"]
```

### adapter-static

For fully static sites (no server):

```bash
npm install @sveltejs/adapter-static
```

```javascript
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      pages: 'build',        // HTML output directory
      assets: 'build',       // Asset output directory
      fallback: '200.html',  // SPA fallback (omit for strict SSG)
      precompress: false,
    }),
  },
};
```

Requires prerendering all routes. Add to `+layout.ts`:

```typescript
export const prerender = true;
```

### adapter-vercel

```bash
npm install @sveltejs/adapter-vercel
```

```javascript
import adapter from '@sveltejs/adapter-vercel';

export default {
  kit: {
    adapter: adapter({
      runtime: 'nodejs22.x',   // Lambda runtime
      regions: ['iad1'],        // Deploy region
      split: false,             // One function per route
    }),
  },
};
```

Per-route config:

```typescript
// src/routes/api/+server.ts
export const config = {
  runtime: 'edge',   // Edge Function for this route
};
```

### adapter-cloudflare

```bash
npm install @sveltejs/adapter-cloudflare
```

```javascript
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: {
    adapter: adapter({
      routes: {
        include: ['/*'],
        exclude: ['<all>'],
      },
    }),
  },
};
```

Access Cloudflare bindings via `event.platform`:

```typescript
export const load: PageServerLoad = async ({ platform }) => {
  const kv = platform?.env?.MY_KV;
  const value = await kv?.get('key');
  return { value };
};
```

### adapter-netlify

```bash
npm install @sveltejs/adapter-netlify
```

```javascript
import adapter from '@sveltejs/adapter-netlify';

export default {
  kit: {
    adapter: adapter({
      edge: false,       // Use Netlify Edge Functions
      split: false,      // Bundle all routes into one function
    }),
  },
};
```

### Environment Variables

```typescript
// Private (server-only) — from $env/static/private or $env/dynamic/private
import { DATABASE_URL } from '$env/static/private';
import { env } from '$env/dynamic/private';

// Public (client-safe) — must be prefixed with PUBLIC_
import { PUBLIC_API_URL } from '$env/static/public';
import { env } from '$env/dynamic/public';
```

Static variables are inlined at build time. Dynamic variables are read at runtime (use for values that change between deploys).

---

## 11. SvelteKit vs Next.js

| Dimension | SvelteKit | Next.js |
|-----------|-----------|---------|
| **Framework model** | Compiler — no runtime | React runtime (~40KB) |
| **Bundle size** | ~20–40 KB typical | ~70 KB+ typical |
| **Learning curve** | Low — standard JS/HTML/CSS | Medium — React concepts required |
| **Ecosystem** | Smaller — growing fast | Massive — React ecosystem |
| **SSR / SSG** | Built-in, config per route | Built-in, config per segment |
| **Form handling** | Built-in form actions | Server Actions (React 19) |
| **Routing** | File-based, `+` prefix | File-based, App Router |
| **Auth ecosystem** | Lucia, Auth.js (limited) | Auth.js, Clerk, NextAuth |
| **UI libraries** | Any (no React dependency) | shadcn/ui, Radix, MUI |
| **Database** | Drizzle, Prisma | Drizzle, Prisma |
| **Hosting** | Vercel, Cloudflare, Node | Primarily Vercel-optimized |
| **TypeScript** | First-class | First-class |
| **Streaming** | Built-in with promises | React Suspense |
| **Performance** | Excellent — no VDOM overhead | Very good — RSC reduces client JS |
| **Maturity** | v2.x — stable | v16.x — very mature |
| **Choose when** | Performance-first, small bundles, Svelte team | React team, large ecosystem, enterprise |

---

## 12. Common Mistakes

| Mistake | What Happens | Fix |
|---------|-------------|-----|
| Database call in `+page.ts` | Runs on client — credentials exposed, no DB access | Move to `+page.server.ts` |
| `export let` for props in Svelte 5 | Still compiles but legacy — misses rune benefits | Use `let { x } = $props()` |
| `$:` reactive declarations in Svelte 5 | Legacy syntax — still works but avoid new code | Use `$derived()` or `$effect()` |
| `on:click` in Svelte 5 | Deprecated event directive | Use `onclick={handler}` (standard attribute) |
| Default + named actions mixed | SvelteKit error at runtime | Named actions only — no `default` action with named |
| Form `method="GET"` for action | Action never fires — GET triggers load only | Use `method="POST"` for all actions |
| `redirect()` without `throw` in Svelte 4 | No redirect — just returns object | Call as `redirect(303, '/path')` — in SK2, no throw needed |
| No middleware file | Trying to add Express-style middleware | Use `handle()` in `hooks.server.ts` — it IS the middleware |
| Runes in `.ts` files | Compile error — runes are compile-time only | Use `.svelte.ts` extension or a `.svelte` file |
| Calling `await parent()` first | Waterfall — blocks child load until layout resolves | Fetch data in parallel: `Promise.all([parent(), fetch(...)])` |
| Private env in public load | Bundled into client JS — secret exposed | `$env/static/private` only in `+page.server.ts` or `+server.ts` |
| Missing `lang="ts"` in script tag | No TypeScript — `./$types` imports silently fail | Always add `<script lang="ts">` |
| `use:enhance` on GET form | Enhance only enhances POST forms | Only add `use:enhance` to `method="POST"` forms |
