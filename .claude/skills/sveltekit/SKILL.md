---
model: claude-sonnet-4-6
name: sveltekit
description: Use when building web applications with SvelteKit — routing, server-side rendering, form actions, or load functions. Also use when choosing between SvelteKit and Next.js or building a full-stack Svelte application.
---

# SvelteKit

SvelteKit (v2.x, February 2026) — compiler-first, no virtual DOM. Svelte 5 with runes is current; the old Options API is legacy. Install: `npm create svelte@latest my-app` · Config: `svelte.config.js` · Node 18.13+ · Docs: https://svelte.dev/docs/kit

## Routing Conventions

| File | Purpose |
|------|---------|
| `+page.svelte` | Page component — renders on server + client |
| `+page.ts` | Universal load (runs both sides — no DB access) |
| `+page.server.ts` | Server-only load + form actions |
| `+layout.svelte` | Shared wrapper — persists across child routes |
| `+layout.server.ts` | Layout-level server load (auth, etc.) |
| `+server.ts` | API route — export GET/POST/PUT/DELETE |
| `+error.svelte` | Error boundary for the route segment |

## Load Function

```typescript
// +page.server.ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
export const load: PageServerLoad = async ({ params, locals }) => {
  const post = await db.post.findUnique({ where: { slug: params.slug } });
  if (!post) error(404, 'Not found');
  return { post };
};
```
```svelte
<script lang="ts">
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>
<h1>{data.post.title}</h1>
```

## Form Action

```typescript
// +page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
export const actions: Actions = {
  login: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = data.get('email') as string;
    if (!email) return fail(400, { missing: true });
    cookies.set('session', token, { path: '/' });
    redirect(303, '/dashboard');
  },
};
```
```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  let { form } = $props();
</script>
<form method="POST" action="?/login" use:enhance>
  <input name="email" />
  {#if form?.missing}<p>Email required</p>{/if}
  <button>Login</button>
</form>
```

## Svelte 5 Runes

```svelte
<script lang="ts">
  let count = $state(0);                          // reactive (replaces let)
  let doubled = $derived(count * 2);              // computed (replaces $:)
  $effect(() => console.log(count));              // side effect
  let { name, age = 18 } = $props();             // props (replaces export let)
</script>
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| DB call in `+page.ts` | Move to `+page.server.ts` |
| `export let` in Svelte 5 | Use `let { x } = $props()` |
| `$:` in Svelte 5 | Use `$derived()` or `$effect()` |
| `on:click` event syntax | Use `onclick={handler}` (standard attribute) |
| Form `method="GET"` for actions | Actions require `method="POST"` |
| No middleware file | Use `handle()` in `hooks.server.ts` |
| Runes in `.ts` files | Runes only work in `.svelte` / `.svelte.ts` files |

See reference.md for full API coverage.
