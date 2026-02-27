# Payload CMS Reference

Version coverage: Payload 3.x (3.44+). Payload 3.0 ships as a Next.js-native framework — no separate server process.

---

## 1. Setup

### Requirements

- Node.js 20.9.0+
- Next.js 15.2.9+ (or 16.x canary)
- pnpm (recommended), yarn 2+, or npm
- PostgreSQL, MongoDB, or SQLite

### create-payload-app

```bash
npx create-payload-app@latest
# Follow prompts: project name, template, database adapter
```

Or into an existing Next.js project:

```bash
pnpm i payload @payloadcms/next @payloadcms/richtext-lexical sharp
pnpm i @payloadcms/db-postgres   # or db-mongodb / db-sqlite
```

### next.config.ts

```ts
import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // your Next.js config
}

export default withPayload(nextConfig)
```

The config must use ESM — either `.mjs` extension or `"type": "module"` in `package.json`.

### tsconfig.json & app structure

Add path alias: `"@payload-config": ["./payload.config.ts"]`

```
app/
├── (payload)/
│   ├── admin/[[...segments]]/page.tsx    ← admin panel
│   └── api/[...slug]/route.ts            ← REST + GraphQL
├── (my-app)/page.tsx
payload.config.ts
```

`(payload)` is a Next.js route group. Payload mounts admin UI and API endpoints there via `@payloadcms/next`.

### payload.config.ts

```ts
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { Posts } from './collections/Posts'
import { Users } from './collections/Users'
import { Media } from './collections/Media'

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET!,
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL!,

  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL! },
    push: false, // disable in production; use migrations
  }),

  editor: lexicalEditor(),

  collections: [Posts, Users, Media],

  globals: [
    {
      slug: 'site-settings',
      fields: [
        { name: 'siteName', type: 'text' },
        { name: 'logo', type: 'upload', relationTo: 'media' },
      ],
    },
  ],

  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
  },

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
```

Start the dev server: `pnpm dev` → admin at `http://localhost:3000/admin`.

---

## 2. Collections

### Full config structure

```ts
import type { CollectionConfig } from 'payload'

export const Posts: CollectionConfig = {
  slug: 'posts',                // required — URL-safe string
  labels: { singular: 'Post', plural: 'Posts' },
  timestamps: true,             // createdAt / updatedAt (default true)
  versions: { drafts: true },   // draft/publish workflow
  trash: true,                  // soft delete (3.x)
  orderable: true,              // drag-and-drop ordering

  admin: { useAsTitle: 'title', defaultColumns: ['title', 'status', 'updatedAt'] },

  access: {
    read: () => true,
    create: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => req.user?.role === 'admin',
  },

  hooks: { beforeChange: [], afterChange: [], beforeRead: [], afterRead: [], beforeDelete: [], afterDelete: [] },

  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true },
  ],
}
```

### Globals

Single-document singletons (site settings, navigation). Define in `globals: []` inside `buildConfig`. Access via `await payload.findGlobal({ slug: 'navigation' })` / `await payload.updateGlobal({ slug: 'navigation', data: {} })`.

---

## 3. Field Types

### Scalar fields

```ts
{ name: 'title',       type: 'text',     required: true, maxLength: 200 }
{ name: 'email',       type: 'email',    unique: true }                   // validates format
{ name: 'price',       type: 'number',   min: 0, max: 99999 }
{ name: 'featured',    type: 'checkbox', defaultValue: false }
{ name: 'publishedAt', type: 'date',     admin: { date: { pickerAppearance: 'dayAndTime' } } }
{ name: 'metadata',    type: 'json' }
{ name: 'location',    type: 'point' }   // [longitude, latitude] — geo queries supported
{
  name: 'status', type: 'select',
  options: [{ label: 'Draft', value: 'draft' }, { label: 'Published', value: 'published' }],
  defaultValue: 'draft',
}
```

### richText (Lexical)

Payload 3.x defaults to the Lexical editor. Slate is removed.

```ts
import { lexicalEditor, HeadingFeature, BoldTextFeature } from '@payloadcms/richtext-lexical'

{
  name: 'content',
  type: 'richText',
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [
      ...defaultFeatures,
      HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
    ],
  }),
}
```

### upload

```ts
{
  name: 'heroImage',
  type: 'upload',
  relationTo: 'media',   // must match the slug of your upload collection
  required: false,
}
```

### relationship

```ts
// Single
{ name: 'author', type: 'relationship', relationTo: 'users' }

// Multiple collections (polymorphic)
{ name: 'reference', type: 'relationship', relationTo: ['posts', 'pages'] }

// Has-many
{ name: 'tags', type: 'relationship', relationTo: 'tags', hasMany: true }
```

### array

Repeating groups of fields:

```ts
{
  name: 'testimonials',
  type: 'array',
  minRows: 1,
  maxRows: 10,
  fields: [
    { name: 'quote', type: 'textarea', required: true },
    { name: 'author', type: 'text', required: true },
    { name: 'role', type: 'text' },
  ],
}
```

### blocks

Polymorphic content — each block has its own schema:

```ts
const CallToAction = {
  slug: 'callToAction',
  fields: [
    { name: 'heading', type: 'text' },
    { name: 'buttonLabel', type: 'text' },
    { name: 'buttonUrl', type: 'text' },
  ],
}

const ImageBlock = {
  slug: 'imageBlock',
  fields: [
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'caption', type: 'text' },
  ],
}

{
  name: 'layout',
  type: 'blocks',
  blocks: [CallToAction, ImageBlock],
}
```

### group

Nests fields inside a keyed object (no repeat):

```ts
{
  name: 'seo',
  type: 'group',
  fields: [
    { name: 'title', type: 'text' },
    { name: 'description', type: 'textarea' },
    { name: 'image', type: 'upload', relationTo: 'media' },
  ],
}
// Stored as doc.seo.title, doc.seo.description, etc.
```

### tabs

Named tabs store data; unnamed tabs are UI-only:

```ts
{
  type: 'tabs',
  tabs: [
    {
      label: 'Content',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'body', type: 'richText' },
      ],
    },
    {
      label: 'SEO',
      name: 'seo',   // named tab = data stored under doc.seo
      fields: [
        { name: 'metaTitle', type: 'text' },
        { name: 'metaDescription', type: 'textarea' },
      ],
    },
  ],
}
```

---

## 4. Access Control

Access functions return `true` (allow), `false` (deny), or a **Payload query constraint** for row-level filtering.

### Collection-level

```ts
import type { CollectionConfig, Access } from 'payload'

const isAdmin: Access = ({ req }) => req.user?.role === 'admin'
const isOwner: Access = ({ req, doc }) => req.user?.id === doc?.author?.id

export const Articles: CollectionConfig = {
  slug: 'articles',
  access: {
    create: ({ req }) => !!req.user,
    read: ({ req }) => {
      if (req.user) return true
      // Unauthenticated: only show published docs
      return { status: { equals: 'published' } }
    },
    update: ({ req, doc }) => {
      if (req.user?.role === 'admin') return true
      return req.user?.id === doc?.author?.id
    },
    delete: isAdmin,
    readVersions: isAdmin,
  },
  fields: [],
}
```

### Field-level

```ts
import type { Field } from 'payload'

export const internalNoteField: Field = {
  name: 'internalNote',
  type: 'textarea',
  access: {
    read: ({ req }) => req.user?.role === 'admin',
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
  },
}
```

Field-level access does NOT support query constraints — only boolean.

### Document-level with PayloadRequest

```ts
import type { Access } from 'payload'

export const canUpdateUser: Access = ({ req, id }) => {
  if (!req.user) return false
  if (req.user.roles?.includes('admin')) return true
  // Users can only update their own document
  return { id: { equals: req.user.id } }
}
```

### Auth session pattern (v3.44+)

Auth sessions are enabled by default in v3.44+. Session tokens are stored server-side and validated on each request, providing stronger security than stateless JWTs alone. Disable with `auth: { sessionOptions: false }` if you need stateless-only JWT.

---

## 5. Hooks

Hooks are arrays — multiple handlers execute in order.

### Execution order (create/update)

```
beforeOperation → beforeValidate → beforeChange → [DB write] → afterChange → afterOperation
```

### Execution order (read)

```
beforeOperation → [DB read] → beforeRead → afterRead → afterOperation
```

### beforeChange — transform data before save

```ts
import type { CollectionBeforeChangeHook } from 'payload'

const slugifyTitle: CollectionBeforeChangeHook = async ({ data, operation }) => {
  if ((operation === 'create' || data.title) && !data.slug) {
    data.slug = data.title
      ?.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
  }
  return data
}
```

### afterChange — side effects after save

```ts
import type { CollectionAfterChangeHook } from 'payload'
import { revalidatePath } from 'next/cache'

const revalidatePost: CollectionAfterChangeHook = async ({ doc, operation }) => {
  if (operation === 'update') {
    revalidatePath(`/posts/${doc.slug}`)
    revalidatePath('/posts')
  }
  return doc
}
```

### beforeRead / afterRead / beforeDelete / afterDelete

```ts
// beforeRead — runs before locale flattening and hidden field removal
const logAccess: CollectionBeforeReadHook = async ({ doc, req }) => {
  console.log(`${doc.id} read by ${req.user?.email ?? 'anon'}`)
  return doc
}

// afterRead — add computed fields to the returned document
const withReadingTime: CollectionAfterReadHook = async ({ doc }) => {
  doc.readingTime = Math.ceil((doc.content?.length ?? 0) / 1000)
  return doc
}

// beforeDelete — cascade cleanup before removal
const cleanupRelated: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await req.payload.delete({ collection: 'comments', where: { post: { equals: id } } })
}

// afterDelete — return value is discarded; use for side effects only
const notifyDelete: CollectionAfterDeleteHook = async ({ id, doc }) => {
  console.log(`Deleted: ${doc.title} (${id})`)
}
```

### Context — pass data between hooks

Use `context` to share data between hooks in the same operation — fetch once in `beforeChange`, consume in `afterChange` with `context.myData`.

---

## 6. Admin Panel

### Collection admin config

```ts
admin: {
  useAsTitle: 'title',
  defaultColumns: ['title', 'status', 'author', 'updatedAt'],
  listSearchableFields: ['title', 'slug'],
  pagination: { defaultLimit: 25 },
  group: 'Content',
  enableListViewSelectAPI: true,
}
```

### Live Preview

```ts
// payload.config.ts — server side
admin: {
  livePreview: {
    url: ({ data, collectionConfig }) =>
      `${process.env.NEXT_PUBLIC_SERVER_URL}/${collectionConfig?.slug}/${data?.slug}`,
    collections: ['posts', 'pages'],
  },
}

// Client component in your preview page
'use client'
import { useLivePreview } from '@payloadcms/live-preview-react'
const { data } = useLivePreview<Post>({ initialData, serverURL: process.env.NEXT_PUBLIC_SERVER_URL!, depth: 2 })
```

### Custom components

All admin custom components are React Server Components by default. Reference by **file path string** — never import directly in config.

```ts
// payload.config.ts
admin: { components: { beforeDashboard: ['@/components/admin/Banner'], Nav: '@/components/admin/Nav' } }

// collection config
admin: { components: { edit: { SaveButton: '@/components/admin/SaveButton' } } }
```

For nested breadcrumbs: use `@payloadcms/plugin-nested-docs`.

---

## 7. Queries

### Local API

No network round-trip — use in Server Components, Server Actions, route handlers, and hooks.

```ts
import { getPayload } from 'payload'
import config from '@payload-config'
const payload = await getPayload({ config })

// find — paginated, filterable
const { docs, totalDocs } = await payload.find({
  collection: 'posts',
  where: { status: { equals: 'published' } },
  sort: '-publishedAt',
  limit: 10,
  depth: 2,         // populate relationship depth
})

// findByID
const post = await payload.findByID({ collection: 'posts', id: postId, depth: 1 })

// create
const newPost = await payload.create({
  collection: 'posts',
  data: { title: 'Hello', slug: 'hello', author: userId },
})

// update (by id or where)
await payload.update({ collection: 'posts', id: postId, data: { status: 'published' } })
await payload.update({ collection: 'posts', where: { status: { equals: 'draft' } }, data: { status: 'archived' } })

// delete
await payload.delete({ collection: 'posts', id: postId })

// globals
const settings = await payload.findGlobal({ slug: 'site-settings' })
await payload.updateGlobal({ slug: 'site-settings', data: { siteName: 'My Site' } })

// bypass access control (server-only, never expose to client)
const allDocs = await payload.find({ collection: 'posts', overrideAccess: true })
```

### REST API

Auto-mounted at `/api`. No setup.

```
GET    /api/posts                         ?where[status][equals]=published&sort=-publishedAt&limit=10
GET    /api/posts/:id
POST   /api/posts
PATCH  /api/posts/:id
DELETE /api/posts/:id
GET    /api/globals/site-settings
POST   /api/globals/site-settings
```

### GraphQL

Auto-generated at `/api/graphql`. Playground at `/api/graphql-playground`. No schema definition needed — Payload generates it from your collection configs.

```graphql
query { Posts(where: { status: { equals: "published" } }, limit: 10) { docs { id title slug } totalDocs } }
mutation { createPost(data: { title: "New", slug: "new" }) { id } }
```

---

## 8. Authentication

### Enable auth on a collection

```ts
export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 7200,          // seconds
    verify: false,                  // require email verification
    maxLoginAttempts: 5,
    lockTime: 600000,               // ms
    cookies: { secure: process.env.NODE_ENV === 'production', sameSite: 'Lax' },
    forgotPassword: {
      generateEmailHTML: ({ token }) =>
        `<a href="${process.env.NEXT_PUBLIC_SERVER_URL}/reset-password?token=${token}">Reset</a>`,
    },
    loginWithUsername: false,       // v3.x feature
  },
  fields: [
    { name: 'role', type: 'select', options: ['admin', 'editor', 'viewer'], defaultValue: 'viewer', required: true },
  ],
}
```

### Auth endpoints & JWT (auto-generated)

```
POST /api/users/login              → { token, user }   (also sets HTTP-only cookie)
POST /api/users/logout
GET  /api/users/me
POST /api/users/refresh-token
POST /api/users/forgot-password
POST /api/users/reset-password
POST /api/users/verify/:token
```

For API-only: `fetch('/api/posts', { headers: { Authorization: 'JWT <token>' } })`

Local API: `await payload.login({ collection: 'users', data: { email, password } })`

### Auth sessions (v3.44+)

Enabled by default. Sessions stored server-side — invalidated on logout, preventing token reuse. Disable with `auth: { sessionOptions: false }` for stateless-JWT-only.

---

## 9. Upload & Media

### Upload collection

```ts
import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticDir: 'public/media',        // where files are stored on disk
    mimeTypes: ['image/*', 'application/pdf'],
    imageSizes: [
      { name: 'thumbnail', width: 300, height: 300, crop: 'centre', fit: 'cover' },
      { name: 'card', width: 800, height: 600 },
      { name: 'hero', width: 1920, height: undefined },  // height auto
    ],
    adminThumbnail: 'thumbnail',
    focalPoint: true,   // enable focal-point cropping UI
    crop: true,         // enable crop tool in admin
  },
  fields: [
    { name: 'alt', type: 'text', required: true },
    { name: 'caption', type: 'textarea' },
  ],
}
```

### Image resizing output

Each `imageSizes` entry is stored alongside the original. Access via `doc.sizes.thumbnail.url`, `doc.sizes.card.url`, etc. The root `doc.url` is always the original.

### S3 storage adapter

```bash
pnpm i @payloadcms/storage-s3
```

```ts
import { s3Storage } from '@payloadcms/storage-s3'

export default buildConfig({
  plugins: [
    s3Storage({
      collections: {
        media: {
          prefix: 'media',
          disableLocalStorage: true,
        },
      },
      bucket: process.env.S3_BUCKET!,
      config: {
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY!,
          secretAccessKey: process.env.S3_SECRET_KEY!,
        },
        region: process.env.S3_REGION!,
      },
    }),
  ],
  // ...
})
```

For Vercel Blob, Cloudflare R2, and Uploadthing, swap in the respective `@payloadcms/storage-*` package. The API is identical — only the plugin import and config change.

---

## 10. Database

### PostgreSQL adapter (Drizzle)

```ts
import { postgresAdapter } from '@payloadcms/db-postgres'

postgresAdapter({
  pool: { connectionString: process.env.DATABASE_URL! },
  push: false,          // ALWAYS false in production
  migrationDir: './migrations',
  idType: 'uuid',       // 'serial' (default) or 'uuid'
  transactionOptions: {
    isolationLevel: 'serializable',
  },
})
```

### MongoDB adapter

```ts
import { mongooseAdapter } from '@payloadcms/db-mongodb'

mongooseAdapter({
  url: process.env.MONGODB_URI!,
})
```

### Migrations workflow

```bash
npx payload migrate:create   # generate migration from config diff
npx payload migrate          # run pending migrations
npx payload migrate:down     # roll back last migration
npx payload migrate:status   # check what's applied
npx payload generate:db-schema  # generate Drizzle schema for IDE
```

Vercel build command: `pnpm payload migrate && pnpm build`

### push mode vs migrations

| Mode | When |
|------|------|
| `push: true` (default in dev) | Local dev only — auto-syncs schema, no migration file created |
| `push: false` + migrations | Production and staging — explicit, reviewable, reversible |

Never mix push and migrations on the same database. If you started with push locally and switch to migrations, run `migrate:create` once to snapshot the current schema.

---

## 11. Deployment

### Required environment variables

```bash
PAYLOAD_SECRET=<random-256-bit-string>   # JWT signing key — never expose publicly
DATABASE_URL=postgresql://user:pass@host/db
NEXT_PUBLIC_SERVER_URL=https://myapp.com
```

### Self-hosted Node.js

```bash
pnpm build
pnpm start
```

Payload runs as a standard Next.js app. Requires a persistent server (not serverless for large media upload handling). Use PM2 or Docker for process management.

### Docker

Multi-stage Dockerfile: `node:20-alpine` base → `deps` (pnpm install) → `builder` (pnpm build with placeholder env vars) → `runner` (copy `.next`, `public`, `node_modules`). Expose port 3000, `CMD ["node_modules/.bin/next", "start"]`.

Docker Compose: wire `app` (your build) to a `postgres:16-alpine` service; pass `PAYLOAD_SECRET`, `DATABASE_URL`, and `NEXT_PUBLIC_SERVER_URL` as environment variables.

### Vercel

Payload supports Vercel with these constraints:

- Use `@payloadcms/db-vercel-postgres` or a pooled Postgres connection string (Neon, Supabase, etc.)
- Set `push: false` — migrations must run in the build step
- **No local file storage** — use S3, Vercel Blob, or R2 for uploads (`disableLocalStorage: true`)
- Admin panel routes are Next.js App Router pages — they work on Vercel's Node.js runtime (not Edge)
- Cold starts: avoid `migrate` in the server entrypoint; run it in the build command instead
- Set environment variables in Vercel dashboard: `PAYLOAD_SECRET`, `DATABASE_URL`, `NEXT_PUBLIC_SERVER_URL`

```ts
// For Vercel deployments
import { vercelPostgresAdapter } from '@payloadcms/db-vercel-postgres'

vercelPostgresAdapter({
  pool: { connectionString: process.env.POSTGRES_URL! },
  push: false,
})
```

---

## 12. Common Mistakes

| Mistake | What happens | Fix |
|---------|-------------|-----|
| Running Payload as a separate Express server | Breaks Next.js integration, misses RSC/Server Action support | Payload 3.x is Next.js native — it lives inside `/app`, not a standalone server |
| Not running migrations before deploying | Production DB schema mismatches config, Payload crashes or corrupts data | Always run `npx payload migrate` in your build/deploy pipeline before `next build` |
| Leaving `push: true` in production | Drizzle auto-pushes destructive schema changes without review or rollback | Set `push: false` in all non-local environments |
| Mixing push and migrations on the same DB | Payload's migration tracker desynchronizes from actual schema | Pick one strategy per DB; if switching, create a snapshot migration first |
| Importing React/JSX inside `payload.config.ts` | Config bundle bloats, hydration errors, or build failures | Reference custom components by string path (`'@/components/MyComp'`), not import |
| Calling `payload.update()` inside `beforeRead` or `afterRead` | Infinite recursive hook loop, server hangs | Only write from `beforeChange`/`afterChange`; never trigger write ops inside read hooks |
| Deep-cloning collection config with `JSON.parse(JSON.stringify(...))` | Strips all hook functions (they aren't serializable) — hooks silently disappear | Spread or use `structuredClone` with function restoration, or avoid cloning configs |
| Using Edge Runtime for Payload API routes | Drizzle/node-postgres and MongoDB don't run on the Edge | Payload's `(payload)` route group must use Node.js runtime — never add `export const runtime = 'edge'` |
| Not setting `PAYLOAD_SECRET` in production | JWT signing falls back to an insecure default or crashes | Set a strong random secret (`openssl rand -hex 32`) in all environments |
| Accessing `req.payload` inside Next.js middleware | Middleware runs on Edge; Payload's DB clients aren't Edge-compatible | Use Payload Local API only inside Server Components, route handlers, and server actions |
| Forgetting `depth` on relationship fields | Related documents come back as bare IDs, not populated objects | Set `depth: 1` (or higher) in Local API calls; REST API uses `?depth=1` param |
| Not generating types after schema changes | `payload-types.ts` goes stale, TypeScript loses type safety | Run `npx payload generate:types` after every collection change; add to build script |
