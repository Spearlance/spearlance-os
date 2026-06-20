---
model: claude-sonnet-4-6
name: payload
description: Use when working with Payload CMS — collection configuration, field types, access control, or Next.js integration. Also use when choosing a code-first CMS or self-hosting a headless CMS.
---

Payload 3.x runs **inside** your Next.js app — no separate server, no SaaS, no extra process.

## Collection (quick reference)

```ts
import type { CollectionConfig } from 'payload'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: { useAsTitle: 'title' },
  access: {
    read: () => true,
    create: ({ req }) => !!req.user,
    update: ({ req, doc }) => req.user?.id === doc.author?.id,
    delete: ({ req }) => req.user?.role === 'admin',
  },
  hooks: {
    beforeChange: [({ data }) => ({ ...data, updatedAt: new Date() })],
    afterChange: [({ doc }) => revalidatePath(`/posts/${doc.slug}`)],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true },
    { name: 'author', type: 'relationship', relationTo: 'users' },
    { name: 'content', type: 'richText' },
  ],
}
```

## Key field types

| Type | Use for |
|------|---------|
| `text` | Short strings |
| `richText` | Long-form with Lexical editor |
| `relationship` | Links to other collections |
| `upload` | Files/images |
| `array` | Repeating groups of fields |
| `blocks` | Polymorphic content blocks |
| `group` | Nested object (no repeat) |
| `tabs` | UI organization with data |
| `select` | Enum / picklist |
| `json` | Arbitrary JSON blob |

## Access control pattern

```ts
// Field-level: use access property on the field
{ name: 'internalNote', type: 'text', access: { read: ({ req }) => req.user?.role === 'admin' } }

// Document-level: return a Payload query constraint from read
read: ({ req }) => req.user?.role === 'admin'
  ? true
  : { author: { equals: req.user?.id } }
```

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Running Payload as a separate server | Payload 3.x is Next.js native — add it to `/app` |
| Editing schema in prod without a migration | Always run `npx payload migrate` before deploying |
| Leaving `push: true` in production Postgres | Set `push: false` and use migrations only |
| Importing JSX/React inside `payload.config.ts` | Keep config server-only; use string paths for custom components |
| Infinite loop in hooks | Never call `payload.update()` inside `beforeRead`/`afterRead` |

See reference.md for full API coverage.
