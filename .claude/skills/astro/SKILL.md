---
model: claude-sonnet-4-6
name: astro
description: Use when working with Astro for content-focused websites, islands architecture, content collections, view transitions, or hybrid SSR/SSG rendering. Also use when integrating React/Vue/Svelte components into Astro or configuring Astro DB.
---

# Astro

## Overview

Astro (v5.x, as of February 2026) is a web framework for content-focused sites. Renders HTML at build time by default; ships zero JS unless you opt in per-component.

## Quick Reference

| Item | Value |
|------|-------|
| **Current Version** | 5.x (Vite 6 under the hood) |
| **Install** | `npm create astro@latest` |
| **Config file** | `astro.config.mjs` |
| **Content config** | `src/content.config.ts` (moved from `src/content/config.ts` in v5) |
| **Dev server** | `npx astro dev` |
| **Build** | `npx astro build` |
| **Docs** | https://docs.astro.build |

## Astro 5 Breaking Changes (from v4)

| Change | v4 | v5 |
|--------|----|----|
| Content config location | `src/content/config.ts` | `src/content.config.ts` |
| Collection entry ID field | `slug` | `id` |
| Render method | `entry.render()` | `import { render } from 'astro:content'` |
| View Transitions component | `<ViewTransitions />` | `<ClientRouter />` |
| Hybrid output mode | `output: 'hybrid'` | Removed — static is now the default |
| `Astro.glob()` | Available | Deprecated → use `getCollection()` |
| Script hoisting | Auto-hoisted to `<head>` | Scripts no longer auto-hoisted |
| Squoosh image service | Available | Removed → use Sharp |
| `compiledContent()` | Sync | Now async (`await entry.compiledContent()`) |

## Content Collections (Astro 5 Content Layer)

```typescript
// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
```

## Islands: Client Directives

| Directive | Hydrates When | Use For |
|-----------|--------------|---------|
| `client:load` | Immediately | Critical interactive UI |
| `client:idle` | Browser idle | Lower-priority widgets |
| `client:visible` | Enters viewport | Below-fold components |
| `client:media="(query)"` | CSS media matches | Responsive-only components |
| `client:only="react"` | Client only (no SSR) | Components using browser APIs |

## Server Islands (Astro 5)

```astro
<!-- Defer a component to render after the static shell loads -->
<UserDashboard server:defer>
  <div slot="fallback">Loading...</div>
</UserDashboard>
```

Requires an on-demand rendering adapter. Props are encrypted in the URL query string.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `entry.render()` | `import { render } from 'astro:content'` then `const { Content } = await render(entry)` |
| `src/content/config.ts` still used | Move to `src/content.config.ts` |
| Accessing `entry.slug` | Use `entry.id` in v5 collections |
| `output: 'hybrid'` in config | Remove it — static is now default |
| `<ViewTransitions />` import | Import `<ClientRouter />` from `astro:transitions` |
| Missing adapter for `server:defer` | Install an adapter: `npx astro add netlify` |
| Remote images not optimizing | Add domain to `image.domains` or `image.remotePatterns` |
| Env var not type-safe | Define schema with `envField` in `astro.config.mjs` |

## Full Reference

See `reference.md` in this skill directory for complete documentation including component syntax, dynamic routing, view transitions lifecycle, Astro DB, Astro Actions, image optimization, SSR/SSG patterns, integrations (React, Tailwind, MDX), and astro:env.
