---
model: claude-sonnet-4-6
name: sanity
description: Use when working with Sanity CMS — content modeling, GROQ queries, Sanity Studio customization, or real-time content. Also use when choosing a headless CMS or integrating Sanity with Next.js or Astro.
---

# Sanity CMS

## Overview

Sanity (Studio v3/v4, API version `2025-05-16`) is a headless CMS with a structured content model, GROQ query language, and a fully customizable React-based Studio. Content lives in the hosted **Content Lake**. React 19.2 required as of December 2025.

## Quick Reference

| Item | Value |
|------|-------|
| **Studio version** | v4 (v3 still supported) |
| **API version** | `2025-05-16` |
| **Install** | `npm create sanity@latest` |
| **Next.js toolkit** | `npm install next-sanity` |
| **Astro integration** | `npx astro add @sanity/astro @astrojs/react` |
| **Client** | `@sanity/client` |
| **Image URL** | `@sanity/image-url` |
| **Portable Text** | `@portabletext/react` |
| **TypeGen** | `npx sanity typegen generate` |
| **Docs** | https://www.sanity.io/docs |

## Core GROQ Patterns

```groq
// All published posts, latest first
*[_type == "post" && !(_id in path("drafts.**"))] | order(publishedAt desc) {
  _id, title, slug, "author": author->name
}

// Single doc by slug
*[_type == "post" && slug.current == $slug][0] {
  title, body, "image": mainImage.asset->url
}

// Paginated (page 2, 10 per page)
*[_type == "post"] | order(_createdAt desc) [10...20] { title }

// Join — dereference array of references
*[_type == "movie"] { title, "cast": castMembers[].person->{name, photo} }
```

## Schema Snippet

```typescript
// sanity/schemaTypes/post.ts
import { defineType, defineField } from 'sanity'

export const postSchema = defineType({
  name: 'post',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: Rule => Rule.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title' } }),
    defineField({ name: 'author', type: 'reference', to: [{ type: 'author' }] }),
    defineField({ name: 'body', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'mainImage', type: 'image', options: { hotspot: true } }),
  ],
})
```

## Image URL Builder

```typescript
import imageUrlBuilder from '@sanity/image-url'
import { client } from '@/sanity/client'

const builder = imageUrlBuilder(client)
const urlFor = (source: SanityImageSource) => builder.image(source)

// Usage
<img src={urlFor(post.mainImage).width(800).height(600).fit('crop').url()} />
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Querying `author.name` directly | References need `->`: `author->name` |
| Using raw `image.asset._ref` as URL | Build URL with `@sanity/image-url` |
| Forgetting `!(_id in path("drafts.**"))` | Drafts appear in queries without this filter |
| Missing `apiVersion` in client config | Always set — use `'2025-05-16'` |
| Secrets in `NEXT_PUBLIC_` vars | `SANITY_API_TOKEN` must be server-only |
| `useCdn: true` for mutations | CDN is read-only; set `useCdn: false` for writes |
| Forgetting `perspective: 'published'` | Default returns both drafts and published |

See reference.md for full API coverage.
