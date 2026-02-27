# Astro 5 Developer Reference

> **Last Verified:** February 2026
> **Current Version:** 5.x (Vite 6, Node >= 18.17.1)
> **Documentation:** https://docs.astro.build

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Components (.astro syntax, props, slots)](#2-components)
3. [Content Collections (Content Layer API)](#3-content-collections)
4. [Islands Architecture (client directives)](#4-islands-architecture)
5. [Routing (file-based, dynamic, rest params)](#5-routing)
6. [View Transitions (setup, lifecycle, persistence)](#6-view-transitions)
7. [SSR / SSG / Hybrid Rendering](#7-ssr--ssg--hybrid-rendering)
8. [Integrations (React, Tailwind, MDX, Sitemap)](#8-integrations)
9. [Server Islands (Astro 5)](#9-server-islands)
10. [Astro DB](#10-astro-db)
11. [Astro Actions](#11-astro-actions)
12. [Image Optimization (astro:assets)](#12-image-optimization)
13. [Environment Variables (astro:env)](#13-environment-variables)
14. [Recent Changes (v4 → v5)](#14-recent-changes-v4--v5)

---

## 1. Project Structure

```
my-project/
├── public/               # Static assets served as-is (favicons, robots.txt)
├── src/
│   ├── components/       # .astro, React, Vue, Svelte components
│   ├── content/          # Markdown/MDX content files
│   ├── data/             # JSON/YAML data files (or anywhere you point loaders)
│   ├── layouts/          # Shared page layouts
│   ├── pages/            # File-based routing — every file = a route
│   │   ├── index.astro
│   │   ├── blog/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   │   └── api/
│   │       └── search.ts
│   ├── styles/           # Global CSS
│   └── actions/          # Astro Actions (src/actions/index.ts)
├── db/                   # Astro DB config and seed files
│   ├── config.ts
│   └── seed.ts
├── src/content.config.ts # Content collections config (v5 location)
└── astro.config.mjs
```

### astro.config.mjs

```javascript
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://example.com',
  integrations: [react(), tailwind()],
  output: 'static', // 'static' | 'server'
  image: {
    domains: ['cdn.example.com'],
    remotePatterns: [{ protocol: 'https', hostname: '**.cloudinary.com' }],
  },
});
```

---

## 2. Components

### .astro File Structure

```astro
---
// Component Script (runs at build time / SSR)
// This is TypeScript by default
interface Props {
  title: string;
  description?: string;
}

const { title, description = 'Default description' } = Astro.props;
const data = await fetch('https://api.example.com/data').then(r => r.json());
---

<!-- Component Template (HTML + expressions) -->
<article>
  <h1>{title}</h1>
  {description && <p>{description}</p>}

  <!-- Conditional rendering -->
  {data.items.length > 0 ? (
    <ul>
      {data.items.map(item => <li>{item.name}</li>)}
    </ul>
  ) : (
    <p>No items found.</p>
  )}
</article>

<style>
  /* Scoped by default — auto-prefixed with unique class */
  article { padding: 1rem; }
  /* Global override */
  :global(.external-class) { color: red; }
</style>
```

### Layouts

```astro
---
// src/layouts/BaseLayout.astro
interface Props {
  title: string;
}
const { title } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>{title}</title>
  </head>
  <body>
    <header><!-- nav --></header>
    <main>
      <slot />            <!-- default slot -->
    </main>
    <slot name="footer" /> <!-- named slot -->
  </body>
</html>
```

Using a layout:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="My Page">
  <p>Main content goes here.</p>
  <footer slot="footer">Custom footer</footer>
</BaseLayout>
```

### Special Directives

```astro
<!-- Raw HTML (trust the source) -->
<div set:html={richTextContent} />

<!-- Inline styles as object -->
<div style={{ color: 'red', fontSize: '1rem' }} />

<!-- Class list utility -->
<div class:list={['base', { active: isActive, disabled: !isEnabled }]} />

<!-- Inline scripts (not bundled) -->
<script is:inline>
  console.log('Runs every page load, not bundled');
</script>

<!-- Global styles -->
<style is:global>
  body { margin: 0; }
</style>
```

### Accessing Request Info (SSR)

```astro
---
// Available in server-rendered pages
const url = new URL(Astro.request.url);
const query = url.searchParams.get('q');
const cookie = Astro.cookies.get('session')?.value;
---
```

---

## 3. Content Collections

Content collections are the Astro way to manage local Markdown, MDX, JSON, and YAML with type safety. Astro 5 replaced the legacy v2 API with the Content Layer API.

### Config File

The config now lives at `src/content.config.ts` (not `src/content/config.ts`).

```typescript
// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    cover: image().optional(),   // image() helper validates and resolves local images
    description: z.string().optional(),
  }),
});

const authors = defineCollection({
  loader: file('./src/data/authors.json'),
  schema: z.object({
    name: z.string(),
    bio: z.string(),
    avatar: z.string().url(),
  }),
});

export const collections = { blog, authors };
```

### Sample Post (Markdown frontmatter)

```markdown
---
title: 'Getting Started with Astro 5'
date: 2026-01-15
tags: ['astro', 'web']
draft: false
cover: './cover.jpg'
description: 'An intro to Astro 5 content collections.'
---

# Getting Started with Astro 5

Content goes here...
```

### Querying Collections

```typescript
import { getCollection, getEntry, render } from 'astro:content';

// Get all entries (filter drafts in production)
const allPosts = await getCollection('blog', ({ data }) => {
  return import.meta.env.PROD ? !data.draft : true;
});

// Sort by date descending
const posts = allPosts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

// Get a single entry by ID
const post = await getEntry('blog', 'getting-started-with-astro-5');
```

### Rendering Markdown Content

```astro
---
// src/pages/blog/[id].astro
import { getCollection, render } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map(post => ({
    params: { id: post.id },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content, headings } = await render(post);  // v5: render() is a named import
---
<article>
  <h1>{post.data.title}</h1>
  <time>{post.data.date.toLocaleDateString()}</time>
  <Content />   <!-- Renders the Markdown body -->
</article>
```

### Custom Loaders (Remote Data)

```typescript
// src/content.config.ts
import { defineCollection } from 'astro:content';

const products = defineCollection({
  loader: async () => {
    const response = await fetch('https://api.example.com/products');
    const data = await response.json();
    // Must return array of objects with `id` field
    return data.map((item: any) => ({ id: String(item.productId), ...item }));
  },
});
```

---

## 4. Islands Architecture

Astro renders components as static HTML by default. Add a `client:*` directive to hydrate a component on the client.

### Install Integration

```bash
npx astro add react   # or vue, svelte, solid, preact
```

### Client Directives

```astro
---
import ReactCarousel from '../components/Carousel.jsx';
import VueCounter from '../components/Counter.vue';
import HeavyWidget from '../components/HeavyWidget.jsx';
import MobileNav from '../components/MobileNav.jsx';
import BrowserOnlyMap from '../components/Map.jsx';
---

<!-- Hydrate immediately — for above-the-fold interactive UI -->
<VueCounter client:load />

<!-- Hydrate when browser is idle — lower-priority widgets -->
<VueCounter client:idle />
<VueCounter client:idle={{timeout: 500}} />  <!-- force hydrate after 500ms max -->

<!-- Hydrate when element enters viewport — ideal for below-fold -->
<ReactCarousel client:visible />
<ReactCarousel client:visible={{rootMargin: "200px"}} />  <!-- pre-hydrate 200px early -->

<!-- Hydrate when CSS media query matches — responsive-only UI -->
<MobileNav client:media="(max-width: 768px)" />

<!-- Skip SSR entirely — for components that use browser APIs -->
<BrowserOnlyMap client:only="react" />
```

### Decision Table

| Directive | JS loads | Hydrates when | Best for |
|-----------|----------|--------------|---------|
| `client:load` | Immediately | Page load | Navbars, modals, buy buttons |
| `client:idle` | Deferred | Browser idle | Non-critical widgets |
| `client:visible` | Lazy | Enters viewport | Carousels, charts, comments |
| `client:media` | Conditional | Media query matches | Sidebars, mobile menus |
| `client:only` | Immediately | Page load (client only) | Maps, WebGL, browser-API-heavy |

### Mixing Frameworks

Multiple framework components can coexist on the same page. Each hydrates independently in its own scope.

```astro
<ReactCarousel client:visible />
<VueCounter client:load />
<SvelteNewsletter client:idle />
```

### Passing Props to Islands

```astro
---
const items = await getCollection('blog');
---
<!-- Props are serialized and sent to the client -->
<ReactCarousel items={items.map(p => ({ id: p.id, title: p.data.title }))} client:visible />
```

---

## 5. Routing

### File-Based Routes

```
src/pages/
├── index.astro          → /
├── about.astro          → /about
├── blog/
│   ├── index.astro      → /blog
│   └── [slug].astro     → /blog/:slug
├── [...path].astro      → /* (catch-all)
└── api/
    └── search.ts        → /api/search (API endpoint)
```

### Dynamic Routes with getStaticPaths

```astro
---
// src/pages/blog/[slug].astro
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map(post => ({
    params: { slug: post.id },
    props: { post },
  }));
}

const { post } = Astro.props;
---
```

### Rest Parameters (Catch-All)

```astro
---
// src/pages/docs/[...path].astro
// Matches /docs/intro, /docs/api/reference, /docs/a/b/c
const { path } = Astro.params;  // "intro" | "api/reference" | "a/b/c"
---
```

### API Endpoints

```typescript
// src/pages/api/search.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q') ?? '';
  const results = await searchDatabase(query);
  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  // handle POST
  return new Response(JSON.stringify({ ok: true }));
};
```

### Redirects

```javascript
// astro.config.mjs
export default defineConfig({
  redirects: {
    '/old-page': '/new-page',
    '/blog/[slug]': '/posts/[slug]',  // pattern redirects
  },
});
```

### Pagination

```astro
---
export async function getStaticPaths({ paginate }) {
  const posts = await getCollection('blog');
  return paginate(posts, { pageSize: 10 });
}

const { page } = Astro.props;
// page.data: current page items
// page.currentPage: 1-indexed
// page.url.prev / page.url.next
---
```

---

## 6. View Transitions

### Enable Site-Wide

```astro
---
// src/layouts/BaseLayout.astro
import { ClientRouter } from 'astro:transitions';  // renamed from <ViewTransitions /> in v5
---
<head>
  <ClientRouter />
</head>
```

### Transition Directives

```astro
<!-- Match elements across pages by name for morphing animation -->
<h1 transition:name="page-title">{title}</h1>

<!-- Built-in animations: fade (default), slide, initial, none -->
<main transition:animate="slide">

<!-- Prevent transition animation on specific element -->
<div transition:animate="none">

<!-- Persist element across navigations (keeps DOM node + state) -->
<audio src="/music.mp3" transition:persist />
<video transition:persist="player" />  <!-- named persist for disambiguation -->
```

### Lifecycle Events

Events fire on `document` during every navigation:

```javascript
// Runs after every page load (initial + transitions)
document.addEventListener('astro:page-load', () => {
  initializeWidgets();
  setupAnalytics();
});

// Before new content is fetched — good for loading indicators
document.addEventListener('astro:before-preparation', (e) => {
  showLoadingSpinner();
});

// After new content is fetched, before swap
document.addEventListener('astro:after-preparation', () => {
  hideLoadingSpinner();
});

// Before old DOM is replaced — modify incoming document here
document.addEventListener('astro:before-swap', (e) => {
  // e.newDocument is the incoming document
  e.newDocument.documentElement.setAttribute('data-theme', getCurrentTheme());
});

// After DOM swap, before paint — restore state
document.addEventListener('astro:after-swap', () => {
  restoreTheme();
  restoreScrollPosition();
});
```

### Persistent Music Player Pattern

```astro
---
// src/layouts/BaseLayout.astro
import { ClientRouter } from 'astro:transitions';
---
<html>
  <head>
    <ClientRouter />
  </head>
  <body>
    <!-- transition:persist keeps the audio element alive across navigations -->
    <!-- transition:name="music-player" ensures correct DOM node is matched -->
    <div id="music-player" transition:persist transition:name="music-player">
      <audio id="player" src="/stream.mp3" controls></audio>
      <span id="now-playing">Now playing: Track 1</span>
    </div>

    <main>
      <slot />
    </main>
  </body>
</html>

<script>
  // astro:page-load fires on both initial load and after each transition
  document.addEventListener('astro:page-load', () => {
    // Safe to re-attach event listeners here
    const player = document.getElementById('player');
    // The audio element itself is preserved — no need to re-initialize
  });
</script>
```

### Force Full Reload for Specific Links

```html
<a href="/logout" data-astro-reload>Log Out</a>
```

### Custom Animations

```astro
---
import { fade } from 'astro:transitions';
---
<div transition:animate={fade({ duration: '0.4s' })}>
  Animated content
</div>
```

---

## 7. SSR / SSG / Hybrid Rendering

### Output Modes

| Mode | Config | Default page behavior |
|------|--------|----------------------|
| `static` (default) | `output: 'static'` | Prerendered at build |
| `server` | `output: 'server'` | On-demand SSR |

The `hybrid` mode was removed in Astro 5. Static is now the default, and individual pages can opt in to server rendering using `export const prerender = false`.

### Install an Adapter (Required for SSR)

```bash
npx astro add netlify    # Netlify
npx astro add vercel     # Vercel
npx astro add cloudflare # Cloudflare Pages/Workers
npx astro add node       # Node.js (self-hosted)
```

### Per-Page Rendering Control

```astro
---
// In static output mode: opt specific pages into SSR
export const prerender = false;

// In server output mode: opt specific pages back to static
// export const prerender = true;
---
```

### SSR Page Patterns

```astro
---
export const prerender = false;

// Read cookies
const session = Astro.cookies.get('session')?.value;
if (!session) return Astro.redirect('/login');

// Access request info
const url = new URL(Astro.request.url);
const lang = Astro.request.headers.get('accept-language');

// Set response headers
Astro.response.headers.set('Cache-Control', 'private, max-age=60');

const user = await getUserFromSession(session);
---
<h1>Welcome, {user.name}</h1>
```

### Middleware

```typescript
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, redirect, url } = context;

  // Auth check
  const token = cookies.get('token')?.value;
  if (url.pathname.startsWith('/admin') && !token) {
    return redirect('/login');
  }

  // Attach data to locals
  context.locals.user = token ? await getUserFromToken(token) : null;

  return next();
});
```

Access `locals` in any page or endpoint:

```astro
---
const { user } = Astro.locals;
---
```

---

## 8. Integrations

### React

```bash
npx astro add react
```

```astro
---
import Counter from '../components/Counter.jsx';
---
<Counter initialCount={5} client:load />
```

React components work normally — hooks, state, context all function as expected inside an island.

### Tailwind CSS

```bash
npx astro add tailwind
```

Add classes directly to Astro templates. Scoped `<style>` blocks and Tailwind coexist.

### MDX

```bash
npx astro add mdx
```

Use `.mdx` files in content collections or pages. Import and use Astro/React/Vue components inside MDX:

```mdx
---
title: "My Post"
---
import CodeBlock from '../components/CodeBlock.astro';

# My Post

<CodeBlock language="ts">
  const x = 1;
</CodeBlock>

Regular **Markdown** still works.
```

### Sitemap

```bash
npx astro add sitemap
```

```javascript
// astro.config.mjs
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://example.com',  // Required
  integrations: [sitemap()],
});
```

Generates `/sitemap-index.xml` and `/sitemap-0.xml` at build time automatically.

### Partytown (Third-Party Scripts)

```bash
npx astro add partytown
```

Offloads analytics scripts (GA, GTM) to a Web Worker so they don't block the main thread:

```astro
<script type="text/partytown" src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
```

---

## 9. Server Islands

Server islands are Astro 5's mechanism for on-demand server rendering of individual components inside an otherwise static page. They load independently via a fetch request after the static HTML shell is displayed.

### Requirements

- An adapter must be installed (Node, Netlify, Vercel, or Cloudflare)
- The component must be an `.astro` component

### Basic Usage

```astro
---
// src/pages/index.astro
import UserDashboard from '../components/UserDashboard.astro';
import GenericPlaceholder from '../components/GenericPlaceholder.astro';
---
<h1>My Site</h1>           <!-- Static, renders immediately -->

<UserDashboard
  userId="123"
  server:defer              <!-- Deferred: fetched after page load -->
>
  <GenericPlaceholder slot="fallback" />  <!-- Shown while island loads -->
</UserDashboard>
```

### Server Island Component

```astro
---
// src/components/UserDashboard.astro
// This renders on the server, per-request
interface Props {
  userId: string;
}
const { userId } = Astro.props;
const user = await db.getUser(userId);
---
<div class="dashboard">
  <img src={user.avatar} alt={user.name} />
  <p>Welcome, {user.name}. You have {user.notifications} notifications.</p>
</div>
```

### Accessing the Host Page URL

Server islands run in an isolated context. To access the referring page URL:

```astro
---
const referer = Astro.request.headers.get('Referer');
const pageUrl = referer ? new URL(referer) : null;
const currentPath = pageUrl?.pathname;
---
```

### Props Limitations

Props are encrypted and sent via URL query string. Supported types:

- `string`, `number`, `boolean`, `BigInt`, `Infinity`
- `Array`, `Map`, `Set`, `RegExp`, `Date`, `URL`
- `Uint8Array`, `Uint16Array`, `Uint32Array`
- Plain objects (no circular references)
- Functions are NOT supported

### Caching

Props are sent as GET requests by default, enabling standard HTTP caching:

```astro
---
Astro.response.headers.set('Cache-Control', 'public, max-age=300');
---
```

When props exceed ~2048 bytes, Astro switches to POST (not cacheable).

### Multi-Region Deployments

Encryption keys are regenerated per build. For rolling deployments across multiple servers:

```bash
astro create-key
# → ASTRO_KEY=base64encodedkey...
```

Set `ASTRO_KEY` as an environment variable so all instances share the same key.

---

## 10. Astro DB

Astro DB is a managed SQLite/libSQL database built into Astro. Powered by Drizzle ORM under the hood.

### Installation

```bash
npx astro add db
```

Creates `db/config.ts` and `db/seed.ts`.

### Define Tables

```typescript
// db/config.ts
import { defineDb, defineTable, column } from 'astro:db';

const Comment = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    author: column.text(),
    body: column.text(),
    postId: column.text(),
    createdAt: column.date({ default: 'now' }),
    pinned: column.boolean({ default: false }),
  },
});

const Author = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text(),
    email: column.text({ unique: true }),
  },
});

// Foreign key reference
const PostWithAuthor = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    title: column.text(),
    authorId: column.number({ references: () => Author.columns.id }),
  },
});

export default defineDb({ tables: { Comment, Author, PostWithAuthor } });
```

### Column Types

| Type | Method | Notes |
|------|--------|-------|
| String | `column.text()` | |
| Integer | `column.number()` | Use `primaryKey: true` for auto-increment |
| Float | `column.number()` | Stored as real |
| Boolean | `column.boolean()` | |
| Date | `column.date()` | JS Date object; `default: 'now'` for timestamps |
| JSON | `column.json()` | Untyped; stored as text |

### Seeding

```typescript
// db/seed.ts
import { db, Comment, Author } from 'astro:db';

export default async function seed() {
  await db.insert(Author).values([
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
  ]);

  await db.insert(Comment).values([
    { author: 'alice@example.com', body: 'Hello!', postId: 'post-1' },
  ]);
}
```

### Querying

```typescript
import { db, Comment, Author, eq, like, gt } from 'astro:db';

// Select all
const comments = await db.select().from(Comment);

// Filter with where
const pinned = await db.select().from(Comment).where(eq(Comment.pinned, true));

// Select specific columns
const titles = await db.select({ body: Comment.body }).from(Comment);

// Join
const withAuthors = await db
  .select()
  .from(Comment)
  .innerJoin(Author, eq(Comment.author, Author.email));

// Insert
await db.insert(Comment).values({ author: 'bob@example.com', body: 'Great post!', postId: 'post-1' });

// Update
await db.update(Comment)
  .set({ pinned: true })
  .where(eq(Comment.id, 1));

// Delete
await db.delete(Comment).where(eq(Comment.id, 1));

// Batch (multiple operations in one request)
await db.batch([
  db.insert(Comment).values({ author: 'c@test.com', body: 'Batch 1', postId: 'p1' }),
  db.insert(Comment).values({ author: 'd@test.com', body: 'Batch 2', postId: 'p2' }),
]);
```

### Remote Database (Production)

```bash
# Push schema to remote
astro db push --remote

# Build using remote DB
astro build --remote

# Execute a seed/migration file on remote
astro db execute db/seed.ts --remote
```

Set environment variables:

```bash
ASTRO_DB_REMOTE_URL=libsql://your-db.turso.io
ASTRO_DB_APP_TOKEN=your-token
```

Supported URL schemes: `memory:`, `file:path`, `libsql://`, `http://`, `ws://`

---

## 11. Astro Actions

Actions provide type-safe server functions callable from client code and HTML forms. Defined in `src/actions/index.ts`.

### Define Actions

```typescript
// src/actions/index.ts
import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro/zod';

export const server = {
  newsletter: {
    subscribe: defineAction({
      input: z.object({
        email: z.string().email(),
        name: z.string().min(1),
      }),
      handler: async ({ email, name }) => {
        const exists = await db.getUserByEmail(email);
        if (exists) {
          throw new ActionError({
            code: 'CONFLICT',
            message: 'Email already subscribed.',
          });
        }
        await db.addSubscriber({ email, name });
        return { success: true, email };
      },
    }),
  },

  contact: {
    submit: defineAction({
      accept: 'form',    // Parse HTML form submissions
      input: z.object({
        name: z.string(),
        message: z.string().min(10),
      }),
      handler: async ({ name, message }) => {
        await sendEmail({ to: 'admin@example.com', subject: `Message from ${name}`, body: message });
        return { sent: true };
      },
    }),
  },
};
```

### Call from Client JavaScript

```astro
<script>
import { actions, isInputError } from 'astro:actions';

const form = document.getElementById('subscribe-form');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = new FormData(form);

  const { data: result, error } = await actions.newsletter.subscribe({
    email: data.get('email'),
    name: data.get('name'),
  });

  if (isInputError(error)) {
    // Zod validation errors — error.fields.email, error.fields.name
    showFieldErrors(error.fields);
  } else if (error) {
    showError(error.message);
  } else {
    showSuccess(`Subscribed ${result.email}`);
  }
});
</script>
```

### HTML Form (Zero JS)

```astro
---
// src/pages/contact.astro
export const prerender = false;  // Required for getActionResult
import { actions } from 'astro:actions';

const result = Astro.getActionResult(actions.contact.submit);
if (result?.data?.sent) {
  return Astro.redirect('/contact/thanks');
}
---

<form method="POST" action={actions.contact.submit}>
  <input name="name" type="text" required />
  <textarea name="message" required></textarea>
  {result?.error && <p class="error">{result.error.message}</p>}
  <button type="submit">Send</button>
</form>
```

### ActionError Codes

```typescript
throw new ActionError({ code: 'UNAUTHORIZED', message: 'Must be logged in.' });
throw new ActionError({ code: 'NOT_FOUND', message: 'Resource not found.' });
throw new ActionError({ code: 'CONFLICT', message: 'Already exists.' });
throw new ActionError({ code: 'BAD_REQUEST', message: 'Invalid input.' });
throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Server error.' });
```

### Middleware Integration

```typescript
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { getActionContext } from 'astro:actions';

export const onRequest = defineMiddleware(async (context, next) => {
  const { action, setActionResult, serializeActionResult } = getActionContext(context);

  if (action?.calledFrom === 'form') {
    // Gate form actions with auth
    const token = context.cookies.get('token')?.value;
    if (!token) {
      setActionResult(action.name, serializeActionResult({
        error: { code: 'UNAUTHORIZED', message: 'Login required.' }
      }));
      return context.redirect('/login');
    }
  }

  return next();
});
```

---

## 12. Image Optimization

Astro's `astro:assets` module optimizes images at build time (static) or request time (SSR).

### Image Component

```astro
---
import { Image, Picture } from 'astro:assets';
import heroImage from '../assets/hero.jpg';  // Local images: import them
---

<!-- Local image — width/height inferred automatically -->
<Image src={heroImage} alt="Hero" />

<!-- Explicit dimensions + format -->
<Image
  src={heroImage}
  alt="Hero"
  width={800}
  height={400}
  format="webp"
  quality={80}
/>

<!-- Remote image — dimensions required (or use inferSize) -->
<Image
  src="https://cdn.example.com/photo.jpg"
  alt="Photo"
  width={600}
  height={400}
/>

<!-- inferSize: pull dimensions from remote image automatically -->
<Image
  src="https://cdn.example.com/photo.jpg"
  alt="Photo"
  inferSize
/>

<!-- Responsive formats -->
<Picture
  src={heroImage}
  alt="Hero"
  formats={['avif', 'webp']}
  fallbackFormat="jpeg"
  width={1200}
/>
```

### Images in Markdown/MDX

```markdown
<!-- Standard Markdown — optimized automatically -->
![Alt text](./local-image.jpg)

<!-- MDX — can import and use the Image component -->
```

```mdx
import { Image } from 'astro:assets';
import diagram from './diagram.png';

<Image src={diagram} alt="Architecture diagram" width={800} height={600} />
```

### getImage() for Programmatic Use

```typescript
// src/pages/og-image.ts — generate OG images in API routes
import { getImage } from 'astro:assets';
import backgroundImg from '../assets/og-bg.jpg';

export async function GET() {
  const optimized = await getImage({
    src: backgroundImg,
    width: 1200,
    height: 630,
    format: 'jpeg',
  });
  // optimized.src = URL to the generated image
  // optimized.attributes = { width, height, ... }
}
```

### Configuration

```javascript
// astro.config.mjs
export default defineConfig({
  image: {
    // Authorize remote image domains for optimization
    domains: ['cdn.example.com', 'images.unsplash.com'],
    remotePatterns: [
      { protocol: 'https', hostname: '**.cloudinary.com' },
    ],
    // Image service (Sharp is default)
    // For Deno/Cloudflare where Sharp doesn't work:
    // service: passthroughImageService()
  },
});
```

### Default Service

Sharp is the default image service. It's fast and handles JPEG, PNG, WebP, AVIF. For environments that don't support Sharp (Cloudflare Workers, Deno):

```javascript
import { passthroughImageService } from 'astro/config';

export default defineConfig({
  image: { service: passthroughImageService() },
});
```

---

## 13. Environment Variables

### Legacy: import.meta.env

Still works for simple cases:

```typescript
const apiKey = import.meta.env.SECRET_API_KEY;    // Server only (not PUBLIC_)
const siteUrl = import.meta.env.PUBLIC_SITE_URL;   // Available on client
const isProd = import.meta.env.PROD;               // Built-in boolean
const isDev = import.meta.env.DEV;                 // Built-in boolean
const mode = import.meta.env.MODE;                 // "development" | "production"
```

### Astro 5: astro:env (Type-Safe Schema)

Define a schema in `astro.config.mjs` to get type safety, validation on startup, and clear client/server separation:

```javascript
// astro.config.mjs
import { defineConfig, envField } from 'astro/config';

export default defineConfig({
  env: {
    schema: {
      // Public client variable — available in browser and server
      PUBLIC_API_URL: envField.string({
        context: 'client',
        access: 'public',
      }),

      // Public server variable — server only, not secret
      PORT: envField.number({
        context: 'server',
        access: 'public',
        default: 4321,
      }),

      // Secret server variable — never sent to client
      DATABASE_URL: envField.string({
        context: 'server',
        access: 'secret',
      }),

      // Optional with default
      CACHE_TTL: envField.number({
        context: 'server',
        access: 'public',
        optional: true,
        default: 3600,
      }),

      // Enum
      LOG_LEVEL: envField.enum({
        context: 'server',
        access: 'public',
        values: ['debug', 'info', 'warn', 'error'],
        default: 'info',
      }),
    },
  },
});
```

Import from the correct module:

```typescript
// Client-accessible (context: "client", access: "public")
import { PUBLIC_API_URL } from 'astro:env/client';

// Server-only variables (context: "server")
import { PORT, DATABASE_URL, CACHE_TTL, LOG_LEVEL } from 'astro:env/server';
```

Generate types without starting dev server:

```bash
npx astro sync
```

**Rule:** Secret client variables (`context: "client", access: "secret"`) are not supported — there is no safe way to send secrets to the browser.

---

## 14. Recent Changes (v4 → v5)

### Breaking Changes

| Area | v4 | v5 |
|------|----|----|
| Content config path | `src/content/config.ts` | `src/content.config.ts` |
| Entry ID field | `entry.slug` | `entry.id` |
| Render method | `entry.render()` (instance method) | `import { render } from 'astro:content'` |
| View Transitions component | `<ViewTransitions />` from `astro:transitions` | `<ClientRouter />` from `astro:transitions` |
| Hybrid output mode | `output: 'hybrid'` exists | Removed — `static` is now the default |
| `Astro.glob()` | Works | Deprecated (use `getCollection()` or `import.meta.glob()`) |
| Script hoisting | Auto-hoisted to `<head>` | No longer auto-hoisted; use `is:inline` for conditionals |
| `compiledContent()` | Synchronous | Async — requires `await` |
| Squoosh image service | Available | Removed — use Sharp or `passthroughImageService()` |
| Lit integration | `@astrojs/lit` | Removed — use script tags or community packages |
| CSRF protection | `checkOrigin: false` by default | `checkOrigin: true` by default |
| Shiki CSS vars | `--astro-code-color-text` | `--astro-code-foreground` |
| Shiki CSS vars | `--astro-code-color-background` | `--astro-code-background` |
| Build paths | `build.client`/`build.server` from project root | Now resolved from `outDir` |
| TypeScript env types | `src/env.d.ts` | `.astro/types.d.ts` |
| Action form resubmit | Redirect with cookie | POST response (may show browser resubmit dialog) |

### New in Astro 5

| Feature | Description |
|---------|-------------|
| Content Layer API | Pluggable loaders, remote data sources, up to 5x faster builds |
| Server Islands (`server:defer`) | Per-component server rendering in static pages |
| `astro:env` | Type-safe environment variable schema with client/server segmentation |
| Vite 6 | Updated build tooling with Environment API |
| Simplified rendering | Static default + per-page `prerender = false`, no hybrid config needed |
| Encrypted server island props | Props encrypted automatically before URL transmission |
| `astro create-key` | CLI command to generate stable encryption keys for multi-region deploys |

### Migration Steps (v4 → v5)

```bash
# 1. Upgrade
npm install astro@latest

# 2. Move content config
mv src/content/config.ts src/content.config.ts

# 3. Update collection definitions to use loaders
# Before: { type: 'content' }
# After:  { loader: glob({ pattern: '**/*.md', base: './src/content/blog' }) }

# 4. Replace slug with id in queries and getStaticPaths

# 5. Update render() calls
# Before: const { Content } = await entry.render()
# After:  import { render } from 'astro:content'; const { Content } = await render(entry)

# 6. Replace <ViewTransitions /> with <ClientRouter />

# 7. Remove output: 'hybrid' from astro.config.mjs

# 8. Update TypeScript config from src/env.d.ts to .astro/types.d.ts

# 9. Check script tags — remove reliance on auto-hoisting

# 10. Run astro dev and check console for deprecation warnings
```

---

*Documentation: https://docs.astro.build | Upgrade guide: https://docs.astro.build/en/guides/upgrade-to/v5/*
