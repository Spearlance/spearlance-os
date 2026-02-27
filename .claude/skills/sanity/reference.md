# Sanity CMS Reference

> As of February 2026. Studio v4, `@sanity/client` v6+, API version `2025-05-16`. React 19.2 required.

## Table of Contents
1. [Setup](#1-setup)
2. [Content Modeling](#2-content-modeling)
3. [GROQ Queries](#3-groq-queries)
4. [Portable Text](#4-portable-text)
5. [Images](#5-images)
6. [Studio Customization](#6-studio-customization)
7. [TypeScript](#7-typescript)
8. [Preview & Draft Mode](#8-preview--draft-mode)
9. [Webhooks & API](#9-webhooks--api)
10. [Pricing & Limits](#10-pricing--limits)
11. [Common Mistakes](#11-common-mistakes)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1. Setup

### New Sanity Project

```bash
npm create sanity@latest
# prompts: project name, dataset (production), template
```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SANITY_PROJECT_ID=abc123
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=sk...   # server-only — never prefix with NEXT_PUBLIC_
```

### Sanity Client

```typescript
// sanity/client.ts
import { createClient } from '@sanity/client'

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2025-05-16',
  useCdn: true, // set false for mutations or draft preview
})
```

### Next.js App Router — Embedded Studio at `/studio`

```bash
npm install next-sanity
```

```typescript
// app/studio/[[...tool]]/page.tsx
'use client'
import { NextStudio } from 'next-sanity/studio'
import config from '@/sanity.config'

export default function StudioPage() {
  return <NextStudio config={config} />
}
```

Add CORS origin so Studio can talk to your app:

```bash
npx sanity cors add http://localhost:3000 --credentials
```

Fetch in a Server Component:

```typescript
// app/blog/page.tsx
import { client } from '@/sanity/client'

const POSTS_QUERY = `*[_type == "post" && !(_id in path("drafts.**"))]
  | order(publishedAt desc) { _id, title, "slug": slug.current, publishedAt }`

export default async function BlogPage() {
  const posts = await client.fetch<Post[]>(POSTS_QUERY)
  return <ul>{posts.map(p => <li key={p._id}>{p.title}</li>)}</ul>
}
```

### Astro Integration

```bash
npx astro add @sanity/astro @astrojs/react
```

```typescript
// astro.config.mjs
import sanity from '@sanity/astro'
import react from '@astrojs/react'

export default defineConfig({
  integrations: [
    react(),
    sanity({
      projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
      dataset: 'production',
      apiVersion: '2025-05-16',
      useCdn: false,
      studioBasePath: '/admin', // embeds Studio at /admin
    }),
  ],
})
```

```astro
---
// src/pages/blog/index.astro
import { useSanityClient } from '@sanity/astro'
const posts = await useSanityClient().fetch(
  `*[_type == "post"] | order(publishedAt desc) { title, slug }`
)
---
<ul>{posts.map(p => <li><a href={`/blog/${p.slug.current}`}>{p.title}</a></li>)}</ul>
```

Render Portable Text in Astro: `npm install astro-portabletext`, then `<PortableText value={body} />`.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 2. Content Modeling

All schemas go in `sanity/schemaTypes/`. Export an array from `index.ts` and register in `sanity.config.ts`.

### Document Type

```typescript
import { defineType, defineField } from 'sanity'

export const postType = defineType({
  name: 'post',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: Rule => Rule.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title', maxLength: 96 } }),
    defineField({ name: 'publishedAt', type: 'datetime' }),
    defineField({ name: 'author', type: 'reference', to: [{ type: 'author' }] }),
    defineField({ name: 'categories', type: 'array', of: [{ type: 'reference', to: [{ type: 'category' }] }] }),
    defineField({ name: 'mainImage', type: 'image', options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string' })] }),
    defineField({ name: 'body', type: 'array', of: [{ type: 'block' }, { type: 'image' }] }),
  ],
  preview: {
    select: { title: 'title', author: 'author.name', media: 'mainImage' },
    prepare({ title, author, media }) {
      return { title, subtitle: author ? `by ${author}` : '', media }
    },
  },
})
```

### Object Type (reusable, embedded — not a document)

```typescript
export const seoType = defineType({
  name: 'seo',
  type: 'object',
  fields: [
    defineField({ name: 'metaTitle', type: 'string' }),
    defineField({ name: 'metaDescription', type: 'text', rows: 2 }),
    defineField({ name: 'ogImage', type: 'image' }),
  ],
})
```

### Portable Text Field

```typescript
defineField({
  name: 'body',
  type: 'array',
  of: [
    {
      type: 'block',
      styles: [
        { title: 'Normal', value: 'normal' },
        { title: 'H2', value: 'h2' },
        { title: 'H3', value: 'h3' },
        { title: 'Quote', value: 'blockquote' },
      ],
      marks: {
        decorators: [{ title: 'Strong', value: 'strong' }, { title: 'Em', value: 'em' }],
        annotations: [
          { name: 'link', type: 'object', fields: [{ name: 'href', type: 'url' }] },
        ],
      },
    },
    { type: 'image', options: { hotspot: true } },
  ],
})
```

### Register Schemas

```typescript
// sanity.config.ts
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './sanity/schemaTypes'

export default defineConfig({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: 'production',
  schema: { types: schemaTypes },
  plugins: [structureTool()],
})
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 3. GROQ Queries

GROQ (Graph-Relational Object Queries) — Sanity's query language. Superset of JSON. Data flows left-to-right as a pipeline: `* [filter] { projection } | order(...) [slice]`.

### Filtering

```groq
*[_type == "post"]                                          // all of a type
*[_type == "post" && !(_id in path("drafts.**"))]           // exclude drafts
*[_type == "post" && popularity > 15]                       // comparison
*[_type == "post" && "typescript" in tags]                  // array contains
*[_type == "post" && defined(publishedAt)]                  // existence check
*[_type == "post" && title match "sanity*"]                 // text search
*[references("author-id-abc")]                              // references a doc
```

### Projections

```groq
*[_type == "post"] { _id, title, "slug": slug.current }    // select + rename
*[_type == "post"] { ..., "slug": slug.current }           // spread + override
*[_type == "post"] { title, "wordCount": length(pt::text(body)) } // computed
*[_type == "post"] {
  title,
  "tier": select(premium == true => "premium", featured == true => "featured", "standard")
}
```

### Joins via References

`->` dereferences a reference — follows it to the referenced document.

```groq
// Single reference
*[_type == "post"] { title, "authorName": author->name }

// Reference with projection
*[_type == "post"] { title, "author": author->{ name, bio } }

// Array of references
*[_type == "post"] { title, "categories": categories[]->{ title, slug } }
```

### Ordering & Pagination

```groq
*[_type == "post"] | order(publishedAt desc)                // single field
*[_type == "post"] | order(priority desc, _updatedAt desc)  // multiple fields
*[_type == "post"][0]                                       // first (returns object)
*[_type == "post"][0...10]                                  // exclusive slice — 0-9
*[_type == "post"] | order(publishedAt desc) [10...20]      // page 2
count(*[_type == "post"])                                   // total count
```

### Advanced

```groq
// Relevance scoring
*[_type == "post"] | score(title match $q, boost(body match $q, 0.5)) | order(_score desc)

// Array utilities
*[_type == "post"] { "tags": array::join(tags, ", "), "unique": array::unique(tags) }

// First non-null
*[_type == "post"] { "displayTitle": coalesce(seoTitle, title) }

// Plain text from Portable Text
*[_type == "post"] { "excerpt": pt::text(body)[0...200] }
```

### Parameterized Queries (always use — never interpolate)

```typescript
const POST_QUERY = `*[_type == "post" && slug.current == $slug][0] { title, body }`
const post = await client.fetch<Post>(POST_QUERY, { slug: 'my-post-slug' })
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 4. Portable Text

Rich text stored as a JSON array of blocks. Rendered with `@portabletext/react` (React) or `astro-portabletext` (Astro).

```bash
npm install @portabletext/react
```

```typescript
// components/PortableTextRenderer.tsx
import { PortableText } from '@portabletext/react'
import type { PortableTextBlock } from '@portabletext/types'
import { urlFor } from '@/sanity/image'

const components = {
  types: {
    image: ({ value }: any) => (
      <img src={urlFor(value).width(800).fit('max').url()} alt={value.alt ?? ''} className="my-8 rounded-lg" />
    ),
  },
  marks: {
    link: ({ value, children }: any) => (
      <a href={value.href} target={value.blank ? '_blank' : undefined} rel="noopener noreferrer">
        {children}
      </a>
    ),
    strong: ({ children }: any) => <strong className="font-bold">{children}</strong>,
  },
  block: {
    h2: ({ children }: any) => <h2 className="text-3xl font-bold mt-12 mb-4">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-2xl font-bold mt-8 mb-3">{children}</h3>,
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-gray-300 pl-6 italic my-6">{children}</blockquote>
    ),
    normal: ({ children }: any) => <p className="mb-4 leading-relaxed">{children}</p>,
  },
  list: {
    bullet: ({ children }: any) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
    number: ({ children }: any) => <ol className="list-decimal pl-6 mb-4">{children}</ol>,
  },
}

export function PortableTextRenderer({ value }: { value: PortableTextBlock[] }) {
  return <PortableText value={value} components={components} />
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 5. Images

### Image Schema (hotspot + alt)

```typescript
defineField({
  name: 'mainImage',
  type: 'image',
  options: { hotspot: true }, // enables focal point in Studio
  fields: [
    defineField({ name: 'alt', type: 'string', validation: Rule => Rule.required() }),
    defineField({ name: 'caption', type: 'string' }),
  ],
})
```

### URL Builder

```bash
npm install @sanity/image-url
```

```typescript
// sanity/image.ts
import imageUrlBuilder from '@sanity/image-url'
import type { SanityImageSource } from '@sanity/image-url/lib/types/types'
import { client } from './client'

const builder = imageUrlBuilder(client)
export const urlFor = (source: SanityImageSource) => builder.image(source)
```

Common transformations:

```typescript
urlFor(image).width(800).height(600).fit('crop').url()            // fixed crop
urlFor(image).width(1200).fit('max').url()                        // max bounds
urlFor(image).width(400).height(400).fit('crop').crop('focalpoint').url() // hotspot
urlFor(image).width(800).format('webp').quality(80).url()         // format + quality
urlFor(image).width(20).blur(10).url()                            // blur placeholder
```

### GROQ — Fetch Full Image with lqip

```groq
"mainImage": mainImage {
  asset->{ url, metadata { dimensions, lqip } },
  alt
}
```

### next/image Integration

```typescript
import Image from 'next/image'
import { urlFor } from '@/sanity/image'

export function SanityImage({ image }: { image: any }) {
  if (!image?.asset) return null
  const { width, height } = image.asset.metadata.dimensions
  return (
    <Image
      src={urlFor(image).url()}
      alt={image.alt ?? ''}
      width={width}
      height={height}
      placeholder={image.asset.metadata.lqip ? 'blur' : 'empty'}
      blurDataURL={image.asset.metadata.lqip}
    />
  )
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 6. Studio Customization

### Structure Builder

```typescript
// sanity.config.ts
import { structureTool } from 'sanity/structure'

export default defineConfig({
  plugins: [
    structureTool({
      structure: (S) =>
        S.list().title('Content').items([
          // Singleton document
          S.listItem().title('Settings').id('settings').child(
            S.document().schemaType('siteSettings').documentId('siteSettings')
          ),
          S.divider(),
          // Filtered list
          S.listItem().title('Posts').child(
            S.documentList()
              .title('All Posts')
              .filter('_type == "post"')
              .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }])
          ),
          // Auto-generate the rest
          ...S.documentTypeListItems().filter(
            item => !['siteSettings', 'post'].includes(item.getId() ?? '')
          ),
        ]),
    }),
  ],
})
```

### Custom Input Component

```typescript
// components/studio/ColorInput.tsx
import { set, unset } from 'sanity'
import type { StringInputProps } from 'sanity'

export function ColorInput({ value, onChange }: StringInputProps) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input type="color" value={value ?? '#000000'}
        onChange={e => onChange(e.target.value ? set(e.target.value) : unset())} />
      <span>{value ?? 'No color'}</span>
    </div>
  )
}

// In schema:
defineField({ name: 'brandColor', type: 'string', components: { input: ColorInput } })
```

### Plugins

```bash
npm install @sanity/vision         # GROQ playground in Studio
npm install @sanity/code-input     # Code blocks with syntax highlighting
npm install @sanity/media          # Media library browser
```

```typescript
import { visionTool } from '@sanity/vision'
import { codeInput } from '@sanity/code-input'

plugins: [structureTool(), visionTool(), codeInput()]
```

### Document Actions

```typescript
// sanity.config.ts
export default defineConfig({
  document: {
    actions: (prev, context) =>
      context.schemaType === 'post' ? [MyCustomAction, ...prev] : prev,
  },
})
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 7. TypeScript

### sanity-typegen

Generates TypeScript types from your schema and GROQ queries automatically.

```bash
npx sanity typegen generate
```

```typescript
// sanity.cli.ts
import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: { projectId: '...', dataset: '...' },
  typegen: { generateOn: 'build' },
})
```

Output: `sanity.types.ts` — auto-generated, do not edit.

### defineQuery for Type Safety

```typescript
// sanity/queries.ts
import { defineQuery } from 'groq'

export const POSTS_QUERY = defineQuery(`
  *[_type == "post" && !(_id in path("drafts.**"))] | order(publishedAt desc) {
    _id, title, "slug": slug.current, publishedAt,
    "author": author->{ name },
    "mainImage": mainImage { asset->{ url, metadata { dimensions, lqip } }, alt },
  }
`)

export const POST_BY_SLUG_QUERY = defineQuery(`
  *[_type == "post" && slug.current == $slug][0] {
    _id, title, body, publishedAt,
    "author": author->{ name, bio },
  }
`)
```

```typescript
// app/blog/page.tsx
import { client } from '@/sanity/client'
import { POSTS_QUERY } from '@/sanity/queries'
import type { POSTS_QUERYResult } from '@/sanity.types' // auto-generated

export default async function BlogPage() {
  const posts: POSTS_QUERYResult = await client.fetch(POSTS_QUERY)
  // Fully typed — autocomplete on post.author.name, etc.
  return <ul>{posts.map(p => <li key={p._id}>{p.title}</li>)}</ul>
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 8. Preview & Draft Mode

Draft documents are prefixed `drafts.` in Content Lake. The **Presentation tool** renders your site inside Studio for live click-to-edit.

### Presentation Tool

```bash
npm install @sanity/presentation
```

```typescript
// sanity.config.ts
import { presentationTool } from '@sanity/presentation'

plugins: [
  structureTool(),
  presentationTool({
    previewUrl: {
      origin: process.env.SANITY_STUDIO_PREVIEW_URL ?? 'http://localhost:3000',
      previewMode: { enable: '/api/draft-mode/enable' },
    },
  }),
]
```

### Next.js Draft Mode Routes

```typescript
// app/api/draft-mode/enable/route.ts
import { defineEnableDraftMode } from 'next-sanity/draft-mode'
import { client } from '@/sanity/client'
export const { GET } = defineEnableDraftMode({ client })

// app/api/draft-mode/disable/route.ts
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
export function GET(request: Request) {
  draftMode().disable()
  redirect(new URL(request.url).searchParams.get('redirect') ?? '/')
}
```

### SanityLive + sanityFetch

```typescript
// sanity/live.ts
import { defineLive } from 'next-sanity'
import { client } from './client'

export const { sanityFetch, SanityLive } = defineLive({
  client: client.withConfig({ useCdn: false }),
  serverToken: process.env.SANITY_API_TOKEN,
})
```

Add `<SanityLive />` to `app/layout.tsx`. Then use `sanityFetch` instead of `client.fetch` — it auto-switches between published and draft perspective based on draft mode state:

```typescript
// app/blog/page.tsx
import { sanityFetch } from '@/sanity/live'
import { POSTS_QUERY } from '@/sanity/queries'

export default async function BlogPage() {
  const { data: posts } = await sanityFetch({ query: POSTS_QUERY })
  return <ul>{posts.map(p => <li key={p._id}>{p.title}</li>)}</ul>
}
```

### Visual Editing Overlays

```bash
npm install @sanity/visual-editing
```

```typescript
// components/VisualEditing.tsx
'use client'
import { enableOverlays } from '@sanity/visual-editing'
import { useEffect } from 'react'

export function VisualEditing() {
  useEffect(() => enableOverlays(), [])
  return null
}
```

Render conditionally in layout:

```typescript
// app/layout.tsx
import { draftMode } from 'next/headers'
const { isEnabled } = draftMode()
// ...
{isEnabled && <VisualEditing />}
<SanityLive />
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 9. Webhooks & API

### GROQ-Powered Webhooks

Configure in Sanity dashboard → API → Webhooks.

**Filter** (which docs trigger it — standard GROQ filter syntax):

```groq
_type == "post" && !(_id in path("drafts.**"))
_type in ["post", "author"]
delta::operation() in ["create", "update"]
```

**Projection** (webhook payload shape — supports `delta::` namespace):

```groq
{
  "_id": _id,
  "slug": slug.current,
  "operation": delta::operation(),
  "titleChanged": delta::changedAny(title),
}
```

**Signature verification** (always do this):

```typescript
// app/api/revalidate/route.ts
import { parseBody } from 'next-sanity/webhook'
import { revalidateTag } from 'next/cache'

export async function POST(req: Request) {
  const { isValidSignature, body } = await parseBody<{ _type: string; slug?: string }>(
    req, process.env.SANITY_WEBHOOK_SECRET
  )
  if (!isValidSignature) return new Response('Invalid signature', { status: 401 })

  if (body._type === 'post') {
    revalidateTag('posts')
    if (body.slug) revalidateTag(`post:${body.slug}`)
  }
  return new Response('Revalidated')
}
```

### Client API

```typescript
const client = createClient({ projectId, dataset, apiVersion: '2025-05-16', useCdn: false, token })

// Fetch
const posts = await client.fetch(`*[_type == "post"] { title }`)
const post  = await client.fetch(`*[_type == "post" && slug.current == $slug][0]`, { slug })

// Mutations
await client.create({ _type: 'post', title: 'New Post' })
await client.patch('post-id').set({ title: 'Updated' }).commit()
await client.patch('post-id').inc({ views: 1 }).commit()
await client.patch('post-id').append('tags', ['new-tag']).commit()
await client.delete('post-id')

// Transaction (atomic)
await client.transaction()
  .create({ _type: 'post', title: 'Post A' })
  .patch('post-id', p => p.set({ published: true }))
  .commit()

// Real-time listener
const sub = client.listen(`*[_type == "post"]`).subscribe(update => {
  console.log(update.transition, update.result) // 'appear' | 'update' | 'disappear'
})
sub.unsubscribe()

// Upload asset
const asset = await client.assets.upload('image', fileBuffer, { filename: 'hero.jpg', contentType: 'image/jpeg' })
```

### HTTP REST API

```bash
# Read
GET https://abc123.api.sanity.io/v2025-05-16/data/query/production?query=*[_type=="post"]

# Write (requires token)
POST https://abc123.api.sanity.io/v2025-05-16/data/mutate/production
Authorization: Bearer <token>
{"mutations": [{"createOrReplace": {"_type": "post", "_id": "post-1", "title": "Hello"}}]}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 10. Pricing & Limits

> Verified February 2026. Check sanity.io/pricing for latest.

| Feature | Free | Growth | Enterprise |
|---------|------|--------|------------|
| **Price** | $0 | $15/seat/mo | Custom |
| **Users** | 20 | Up to 50 | Custom |
| **Permission roles** | 2 | 5 | Custom RBAC |
| **Datasets** | 2 (public only) | 2 (private/public) | Custom |
| **Documents** | 10,000 | 25,000 | Custom |
| **API requests/mo** | 250,000 | 250,000 + PAYG | Custom |
| **API CDN requests/mo** | 1,000,000 | 1M + PAYG | Custom |
| **Asset storage** | 100 GB | 100 GB + PAYG | Custom |
| **Bandwidth/mo** | 100 GB | 100 GB + PAYG | Custom |
| **History retention** | 30 days | 90 days | Custom |
| **Private datasets** | No | Yes | Yes |
| **AI Assist** | No | Yes | Yes |
| **Scheduled drafts** | No | Yes | Yes |
| **Comments + tasks** | No | Yes | Yes |
| **SAML SSO** | No | No | Yes |
| **Uptime SLA** | No | No | Yes |
| **Overages** | Blocked | PAYG ($1/25k API) | Negotiated |

Free tier: documents are blocked (not downgraded) when quota is hit. No overage allowed.

Growth PAYG: API requests overage at $1/25,000. Documents quota is also hard-blocked on Growth.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 11. Common Mistakes

| Mistake | Fix |
|---------|-----|
| `author.name` in GROQ | References need `->`: `author->name`. Without it you get `{ _ref, _type }` only |
| Raw `image.asset._ref` as image URL | Use `@sanity/image-url` builder — `_ref` is a Content Lake pointer, not a CDN URL |
| Draft docs appearing in production | Add `&& !(_id in path("drafts.**"))` to every production query |
| Missing `apiVersion` in client | Always set — use `'2025-05-16'`. Omitting falls back to an old version with different behavior |
| `SANITY_API_TOKEN` in `NEXT_PUBLIC_` | Write tokens are server-only. Client exposure lets anyone mutate your dataset |
| `useCdn: true` for mutations | CDN is read-only. Set `useCdn: false` for `client.create/patch/delete` |
| String interpolation in GROQ | Never `\`*[slug == "${slug}"]\``. Always parameterize: `*[slug == $slug]` with `{ slug }` arg |
| Fetching only `mainImage.asset._ref` | Fetch the full object: `mainImage { asset->{ url, metadata { dimensions, lqip } }, alt }` |
| No `hotspot: true` in image options | Focal point UI never appears in Studio — crop defaults to center |
| Forgetting `[0]` on single-doc queries | Without it you always get an array, even for `slug.current == $slug` queries |
| Not verifying webhook signatures | Anyone can POST to your revalidation route. Always use `parseBody` with `SANITY_WEBHOOK_SECRET` |
| Outdated `apiVersion` date | Studio and client should use the same version. `2025-05-16` is current |
