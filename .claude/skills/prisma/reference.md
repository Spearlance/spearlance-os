# Prisma ORM — Full Reference

> Verified: February 2026. Current stable: Prisma 7 (pure TypeScript). Prisma 6 still in production everywhere.

## Table of Contents

1. [Setup](#1-setup)
2. [Schema Definition](#2-schema-definition)
3. [Relations](#3-relations)
4. [Client Queries](#4-client-queries)
5. [Aggregations](#5-aggregations)
6. [Transactions](#6-transactions)
7. [Migrations](#7-migrations)
8. [Raw Queries](#8-raw-queries)
9. [Prisma Accelerate](#9-prisma-accelerate)
10. [Serverless Considerations](#10-serverless-considerations)
11. [Prisma 6 → 7 Migration](#11-prisma-6--7-migration)
12. [Prisma vs Drizzle](#12-prisma-vs-drizzle)
13. [Common Mistakes](#13-common-mistakes)

---

## 1. Setup

### Install

```bash
npm install @prisma/client
npm install -D prisma
npx prisma init
```

### With Neon (Serverless Postgres)

Neon requires two URLs: one pooled (for app), one direct (for CLI/migrations).

```bash
npm install @prisma/adapter-neon
```

```env
# .env
DATABASE_URL="postgresql://user:pass@ep-cool-name-pooler.us-east-2.aws.neon.tech/dbname?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-cool-name.us-east-2.aws.neon.tech/dbname?sslmode=require"
```

```prisma
// prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

```typescript
// src/db.ts (Prisma 7 with driver adapter)
import { PrismaClient } from './generated/prisma'
import { PrismaNeon } from '@prisma/adapter-neon'

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
export const prisma = new PrismaClient({ adapter })
```

Add `&connect_timeout=15` to `DATABASE_URL` if cold starts cause timeout errors.

### With Supabase

Supabase has no serverless driver adapter — use Supavisor connection pooler instead.

```env
# Session mode (persistent servers) — port 5432
DATABASE_URL="postgresql://prisma.PROJECTREF:PASSWORD@REGION.pooler.supabase.com:5432/postgres"

# Transaction mode (serverless) — port 6543
DATABASE_URL="postgresql://prisma.PROJECTREF:PASSWORD@REGION.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres:PASSWORD@db.PROJECTREF.supabase.co:5432/postgres"
```

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Use port **6543** for serverless (Next.js API routes, Edge functions). Use port **5432** for long-running servers. Always set `DIRECT_URL` so `prisma migrate` bypasses the pooler.

### With PlanetScale (MySQL)

```bash
npm install @prisma/adapter-planetscale
```

```env
DATABASE_URL="mysql://USER:PASS@HOST/DATABASE?sslaccept=strict"
```

```prisma
datasource db {
  provider     = "mysql"
  url          = env("DATABASE_URL")
  relationMode = "prisma" // PlanetScale doesn't support foreign keys
}
```

With `relationMode = "prisma"`, define `@@index` on all foreign key fields manually.

### With MySQL (self-hosted)

```env
DATABASE_URL="mysql://root:password@localhost:3306/mydb"
```

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

### With SQLite

```env
DATABASE_URL="file:./dev.db"
```

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

---

## 2. Schema Definition

### Field Types

| Prisma Type | PostgreSQL | MySQL | SQLite |
|-------------|-----------|-------|--------|
| `String` | `TEXT` / `VARCHAR` | `VARCHAR(191)` | `TEXT` |
| `Int` | `INTEGER` | `INT` | `INTEGER` |
| `BigInt` | `BIGINT` | `BIGINT` | `INTEGER` |
| `Float` | `DOUBLE PRECISION` | `DOUBLE` | `REAL` |
| `Decimal` | `DECIMAL` | `DECIMAL` | `DECIMAL` |
| `Boolean` | `BOOLEAN` | `TINYINT(1)` | `INTEGER` |
| `DateTime` | `TIMESTAMP` | `DATETIME` | `DATETIME` |
| `Json` | `JSONB` | `JSON` | `TEXT` |
| `Bytes` | `BYTEA` | `LONGBLOB` | `BLOB` |

### Field Modifiers and Attributes

```prisma
model Post {
  id          Int       @id @default(autoincrement())
  uuid        String    @id @default(uuid())          // UUID primary key
  cuid        String    @id @default(cuid())          // CUID primary key
  title       String
  content     String?                                  // optional field
  published   Boolean   @default(false)
  views       Int       @default(0)
  score       Decimal   @db.Decimal(10, 2)            // native type hint
  tags        String[]                                 // PostgreSQL array
  meta        Json?
  data        Bytes                                    // use Uint8Array in code (not Buffer)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  slug        String    @unique
  authorId    Int
  author      User      @relation(fields: [authorId], references: [id])

  @@index([authorId])                                  // index on foreign key
  @@index([title, published])                          // composite index
  @@unique([slug, authorId])                           // composite unique
  @@map("posts")                                       // custom table name
}
```

### Enums

```prisma
enum Role {
  USER
  ADMIN
  MODERATOR
}

model User {
  id   Int  @id @default(autoincrement())
  role Role @default(USER)
}
```

### Composite ID

```prisma
model PostTag {
  postId Int
  tagId  Int
  post   Post @relation(fields: [postId], references: [id])
  tag    Tag  @relation(fields: [tagId], references: [id])

  @@id([postId, tagId])
}
```

---

## 3. Relations

### One-to-One

```prisma
model User {
  id      Int      @id @default(autoincrement())
  profile Profile?
}

model Profile {
  id     Int  @id @default(autoincrement())
  bio    String?
  userId Int  @unique
  user   User @relation(fields: [userId], references: [id])
}
```

```typescript
// Query
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: { profile: true },
})
```

### One-to-Many

```prisma
model User {
  id    Int    @id @default(autoincrement())
  posts Post[]
}

model Post {
  id       Int  @id @default(autoincrement())
  authorId Int
  author   User @relation(fields: [authorId], references: [id])
}
```

```typescript
// Query with nested include
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    posts: {
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    },
  },
})
```

### Many-to-Many (explicit)

Explicit join table gives you extra fields on the relation.

```prisma
model Post {
  id         Int         @id @default(autoincrement())
  categories CategoryPost[]
}

model Category {
  id    Int          @id @default(autoincrement())
  posts CategoryPost[]
}

model CategoryPost {
  postId     Int
  categoryId Int
  assignedAt DateTime @default(now())
  post       Post     @relation(fields: [postId], references: [id])
  category   Category @relation(fields: [categoryId], references: [id])

  @@id([postId, categoryId])
}
```

### Many-to-Many (implicit)

Prisma manages the join table automatically. No extra fields possible.

```prisma
model Post {
  id         Int        @id @default(autoincrement())
  categories Category[]
}

model Category {
  id    Int    @id @default(autoincrement())
  posts Post[]
}
```

### Self-Relations

```prisma
model User {
  id          Int    @id @default(autoincrement())
  followedBy  User[] @relation("UserFollows")
  following   User[] @relation("UserFollows")
}

// Tree structure
model Category {
  id       Int        @id @default(autoincrement())
  parentId Int?
  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children Category[] @relation("CategoryTree")
}
```

---

## 4. Client Queries

### Singleton Pattern (serverless-safe)

```typescript
// src/db.ts
import { PrismaClient } from './generated/prisma'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### Create

```typescript
// Single
const user = await prisma.user.create({
  data: {
    email: 'alice@example.com',
    name: 'Alice',
    posts: {
      create: [{ title: 'Hello World' }],  // nested create
    },
  },
  include: { posts: true },
})

// Many
const users = await prisma.user.createMany({
  data: [
    { email: 'a@a.com' },
    { email: 'b@b.com' },
  ],
  skipDuplicates: true,
})

// createManyAndReturn (Prisma 5.14+)
const created = await prisma.user.createManyAndReturn({
  data: [{ email: 'c@c.com' }],
  select: { id: true, email: true },
})
```

### Read

```typescript
// findUnique — requires unique/id field
const user = await prisma.user.findUnique({ where: { email: 'alice@example.com' } })

// findUniqueOrThrow — throws P2025 if not found
const user = await prisma.user.findUniqueOrThrow({ where: { id: 1 } })

// findFirst — first match, any field
const post = await prisma.post.findFirst({
  where: { published: true },
  orderBy: { createdAt: 'desc' },
})

// findMany
const posts = await prisma.post.findMany({
  where: {
    published: true,
    author: { name: { contains: 'Alice' } },        // relation filter
  },
  include: { author: { select: { name: true } } },  // nested select
  orderBy: [{ createdAt: 'desc' }, { title: 'asc' }],
  skip: 20,
  take: 10,
})
```

### Filtering

```typescript
// String filters
where: { title: { contains: 'hello', mode: 'insensitive' } }
where: { email: { startsWith: 'alice' } }
where: { email: { endsWith: '.com' } }

// Number filters
where: { views: { gt: 100, lte: 1000 } }
where: { score: { gte: 4.5 } }

// Date filters
where: { createdAt: { gte: new Date('2024-01-01') } }

// Array filters (PostgreSQL)
where: { tags: { has: 'prisma' } }
where: { tags: { hasEvery: ['prisma', 'orm'] } }
where: { tags: { hasSome: ['prisma', 'drizzle'] } }
where: { tags: { isEmpty: false } }

// Null checks
where: { deletedAt: null }
where: { deletedAt: { not: null } }

// Logical operators
where: {
  AND: [{ published: true }, { views: { gt: 100 } }],
}
where: {
  OR: [{ email: { endsWith: '.org' } }, { role: 'ADMIN' }],
}
where: {
  NOT: { role: 'BANNED' },
}

// Relation filters
where: { posts: { some: { published: true } } }  // has at least one
where: { posts: { every: { published: true } } } // all match
where: { posts: { none: { published: false } } } // none match
```

### Update

```typescript
// Single
await prisma.user.update({
  where: { id: 1 },
  data: {
    name: 'Alice Updated',
    views: { increment: 1 },     // atomic increment
    score: { multiply: 1.1 },    // atomic multiply
    tags: { push: 'new-tag' },   // array push (PostgreSQL)
  },
})

// Many
const result = await prisma.post.updateMany({
  where: { published: false, createdAt: { lt: new Date('2023-01-01') } },
  data: { archived: true },
})
// result.count = number of updated records

// updateManyAndReturn (Prisma 5.14+)
const updated = await prisma.post.updateManyAndReturn({
  where: { published: false },
  data: { published: true },
  select: { id: true },
})
```

### Upsert

```typescript
const user = await prisma.user.upsert({
  where: { email: 'alice@example.com' },
  update: { name: 'Alice Smith' },
  create: { email: 'alice@example.com', name: 'Alice Smith' },
})
```

### Delete

```typescript
// Single
await prisma.user.delete({ where: { id: 1 } })

// Many
const result = await prisma.post.deleteMany({
  where: { createdAt: { lt: new Date('2020-01-01') } },
})
```

### Select vs Include

```typescript
// select — whitelist specific fields (no relation loading by default)
const user = await prisma.user.findUnique({
  where: { id: 1 },
  select: {
    id: true,
    email: true,
    posts: { select: { title: true } },  // select on relation
  },
})

// include — add relations on top of all scalar fields
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: { posts: true },
})

// Can't mix select and include at the top level
```

### Pagination

```typescript
// Offset pagination
const page = 2
const perPage = 10
const posts = await prisma.post.findMany({
  skip: (page - 1) * perPage,
  take: perPage,
  orderBy: { createdAt: 'desc' },
})

// Cursor-based pagination (better for large datasets)
const posts = await prisma.post.findMany({
  take: 10,
  cursor: { id: lastId },
  skip: 1,  // skip the cursor itself
  orderBy: { id: 'asc' },
})
```

### Relation Load Strategy (N+1 fix)

```typescript
// Use JOIN instead of multiple queries (PostgreSQL only, Prisma 5.9+)
const users = await prisma.user.findMany({
  relationLoadStrategy: 'join',  // default is 'query' (separate query per relation)
  include: { posts: true },
})
```

---

## 5. Aggregations

```typescript
// count
const total = await prisma.post.count({ where: { published: true } })

// aggregate
const stats = await prisma.post.aggregate({
  where: { published: true },
  _count: { id: true },
  _avg: { views: true },
  _sum: { views: true },
  _min: { views: true },
  _max: { views: true },
})
// stats._avg.views, stats._sum.views, etc.

// groupBy
const grouped = await prisma.post.groupBy({
  by: ['authorId'],
  where: { published: true },
  _count: { id: true },
  _avg: { views: true },
  having: {
    views: { _avg: { gt: 100 } },
  },
  orderBy: { _count: { id: 'desc' } },
})
```

---

## 6. Transactions

### Sequential (simple)

```typescript
// All or nothing — runs sequentially, rolls back on any failure
const [user, post] = await prisma.$transaction([
  prisma.user.create({ data: { email: 'a@b.com' } }),
  prisma.post.create({ data: { title: 'Hello', authorId: 1 } }),
])
```

### Interactive (complex logic)

```typescript
// Use when you need results from earlier queries to inform later ones
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: { email: 'a@b.com' } })

  const post = await tx.post.create({
    data: { title: 'Hello', authorId: user.id },
  })

  await tx.user.update({
    where: { id: user.id },
    data: { postCount: { increment: 1 } },
  })

  return { user, post }
}, {
  maxWait: 5000,   // ms to acquire transaction (default 2000)
  timeout: 10000,  // ms for entire transaction (default 5000)
  isolationLevel: 'Serializable',  // optional: ReadUncommitted, ReadCommitted, RepeatableRead, Serializable
})
```

---

## 7. Migrations

### Dev workflow

```bash
# Create + apply migration + regenerate client
npx prisma migrate dev --name add_users_table

# Just regenerate client (schema changed manually or via pull)
npx prisma generate

# Pull schema from existing DB (introspection)
npx prisma db pull

# Push schema to DB without migration (prototype mode, no history)
npx prisma db push
```

### Production

```bash
# Apply all pending migrations (no generate, no reset)
npx prisma migrate deploy
```

Run `migrate deploy` in CI/CD before starting the app. Never run `migrate dev` in production.

### Reset

```bash
# Drop DB, re-run all migrations, run seed
npx prisma migrate reset

# Reset without seed
npx prisma migrate reset --skip-seed
```

### Seeding

```typescript
// prisma/seed.ts
import { PrismaClient } from '../src/generated/prisma'
const prisma = new PrismaClient()

async function main() {
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { email: 'admin@example.com', name: 'Admin', role: 'ADMIN' },
  })
}

main().finally(() => prisma.$disconnect())
```

```json
// package.json
{
  "prisma": {
    "seed": "ts-node --transpile-only prisma/seed.ts"
  }
}
```

Run: `npx prisma db seed`

In Prisma 7: seed no longer runs automatically during `migrate reset` — always explicit.

### Custom Migration (raw SQL in migration file)

```bash
npx prisma migrate dev --create-only --name add_full_text_index
# Edit the generated SQL file, then:
npx prisma migrate dev
```

---

## 8. Raw Queries

### $queryRaw (typed result)

```typescript
import { Prisma } from './generated/prisma'

// Tagged template — safe, parameterized
const users = await prisma.$queryRaw<User[]>`
  SELECT * FROM "User"
  WHERE email = ${email}
  AND created_at > ${cutoff}
`

// Dynamic query with Prisma.sql
const column = 'email'
const result = await prisma.$queryRaw<{ count: bigint }[]>(
  Prisma.sql`SELECT COUNT(*) as count FROM "User" WHERE ${Prisma.raw(column)} IS NOT NULL`
)
// BigInt result: Number(result[0].count)
```

### $executeRaw (mutation, returns count)

```typescript
const affected = await prisma.$executeRaw`
  UPDATE "Post" SET views = views + 1
  WHERE id = ${postId}
`
```

### Unsafe variants (avoid in production)

```typescript
// Only use when you fully control the SQL string
const result = await prisma.$queryRawUnsafe('SELECT * FROM "User" WHERE id = $1', userId)
const count = await prisma.$executeRawUnsafe(`UPDATE "Post" SET published = true WHERE authorId = ${id}`)
```

---

## 9. Prisma Accelerate

Accelerate is a global connection pool + cache layer. Required for production serverless at scale. Works with Prisma Postgres or your own DB via the Data Platform.

### Setup

```bash
npm install @prisma/extension-accelerate
```

```typescript
import { PrismaClient } from './generated/prisma'
import { withAccelerate } from '@prisma/extension-accelerate'

const prisma = new PrismaClient().$extends(withAccelerate())
```

Replace `DATABASE_URL` with your Accelerate connection string from the Prisma Console:
```
DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=..."
```

### Caching

```typescript
// TTL: cache for N seconds
const posts = await prisma.post.findMany({
  where: { published: true },
  cacheStrategy: { ttl: 60 },  // cached for 60 seconds
})

// SWR: serve stale, revalidate in background
const posts = await prisma.post.findMany({
  cacheStrategy: { swr: 30 },  // serve stale up to 30 seconds while revalidating
})

// Combined TTL + SWR
const posts = await prisma.post.findMany({
  cacheStrategy: { ttl: 60, swr: 300 },
})

// Tags for invalidation
const posts = await prisma.post.findMany({
  cacheStrategy: { ttl: 3600, tags: ['posts'] },
})

// Invalidate by tag
await prisma.$accelerate.invalidate({ tags: ['posts'] })
```

### Prisma Postgres Connection Limits (as of Feb 2026)

| Plan | Direct connections | Pooled connections |
|------|-------------------|-------------------|
| Free | 10 | 10 |
| Starter | 10 | 100 |
| Pro | 50 | 500 |
| Business | 100 | 1000 |

Idle connections close after 60 minutes.

---

## 10. Serverless Considerations

### The Problem

Each serverless function invocation can create a new DB connection. With 100 concurrent functions, you hit Postgres connection limits immediately.

### Solutions (in order of preference)

1. **Neon** — use `@prisma/adapter-neon` + Neon's built-in HTTP-over-WebSocket pooler. No extra infra.
2. **Supabase** — use Supavisor on port 6543. No adapter available, but pooler handles it.
3. **Prisma Accelerate** — works with any database, adds global cache layer.
4. **PgBouncer** (self-hosted) — transaction mode pooling.

### Neon (recommended setup)

```typescript
// lib/db.ts
import { PrismaClient } from './generated/prisma'
import { PrismaNeon } from '@prisma/adapter-neon'

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })

export const prisma = new PrismaClient({ adapter })
```

```prisma
// schema.prisma — required for driver adapter
generator client {
  provider        = "prisma-client"
  previewFeatures = ["driverAdapters"]
}
```

### Edge Runtime

Prisma 7 with driver adapters runs on edge runtimes (Vercel Edge, Cloudflare Workers). Prisma 6 standard client does not — it requires Node.js APIs.

```typescript
// Next.js edge route with Neon adapter
export const runtime = 'edge'

import { PrismaClient } from '@/generated/prisma'
import { PrismaNeon } from '@prisma/adapter-neon'

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
})
```

### Bundle Size

| Version | Bundle Size |
|---------|------------|
| Prisma 6 | ~14MB (includes Rust binary) |
| Prisma 7 | ~1.6MB (pure TypeScript) |

For serverless cold starts, Prisma 7 is a significant improvement.

---

## 11. Prisma 6 → 7 Migration

### Breaking Changes in Prisma 7

| Change | Action Required |
|--------|----------------|
| ESM-only | Set `"type": "module"` in `package.json`; update `tsconfig.json` to `"module": "ESNext"` |
| `prisma-client-js` deprecated | Change generator `provider` to `"prisma-client"` |
| `output` field required | Set explicit path in generator block |
| Driver adapters mandatory | Install `@prisma/adapter-pg` (PostgreSQL) or `@prisma/adapter-better-sqlite3` (SQLite) |
| Config in `prisma.config.ts` | Move DB URL + migration config out of schema, into `prisma.config.ts` |
| No auto env loading | Use `dotenv` explicitly |
| Auto-seeding removed | Run `npx prisma db seed` manually |
| Client middleware removed | Replace with Client Extensions |

### Prisma 6 Breaking Changes (from v5)

| Change | Action Required |
|--------|----------------|
| `Buffer` → `Uint8Array` for Bytes | Replace `Buffer` with `Uint8Array` throughout |
| `NotFoundError` removed | Catch `PrismaClientKnownRequestError` with `code === 'P2025'` |
| `fullTextSearch` on Postgres split | Use `fullTextSearchPostgres` preview feature |
| Node.js minimum: 18.18.0, 20.9.0 | Upgrade Node if needed |
| TypeScript minimum: 5.1.0 | Upgrade TypeScript if needed |
| Implicit m:n unique → primary key | Run a migration immediately after upgrading |
| Reserved model names | Rename models named `async`, `await`, or `using` |

### Prisma 7 Generator Block

```prisma
generator client {
  provider = "prisma-client"            // was "prisma-client-js"
  output   = "../src/generated/prisma"  // now required
}
```

### Prisma 7 Config File

```typescript
// prisma.config.ts
import { defineConfig } from 'prisma/config'
import 'dotenv/config'

export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  migrate: {
    async adapter() {
      const { PrismaNeon } = await import('@prisma/adapter-neon')
      return new PrismaNeon({ connectionString: process.env.DIRECT_URL! })
    },
  },
})
```

---

## 12. Prisma vs Drizzle

### Decision Guide

| Factor | Choose Prisma | Choose Drizzle |
|--------|--------------|----------------|
| Schema definition | .prisma DSL — clean, auto-generates migrations | TypeScript — schema IS migrations |
| Migration experience | `migrate dev` does everything automatically | More manual, more control |
| Type safety approach | Generated client, types from schema | Full inference, no codegen |
| Feedback loop | Regenerate client after schema change | Instant — no codegen step |
| Bundle size (v7) | 1.6MB | ~7.4kb |
| Edge/serverless | Good with driver adapters | Excellent native support |
| Databases | PostgreSQL, MySQL, SQLite, MongoDB, SQL Server, CockroachDB | PostgreSQL, MySQL, SQLite, Turso, Neon, PlanetScale |
| N+1 protection | Built-in DataLoader for findUnique batching | Manual, but gives you full SQL control |
| Team SQL knowledge | Team prefers abstraction | Team knows SQL well |
| Raw query escape hatch | `$queryRaw` with tagged templates | Direct SQL, same syntax |
| Ecosystem | Larger, more integrations, Prisma Studio | Growing fast, lighter weight |

### When Prisma Wins

- Non-technical collaborators editing schema
- Automated migration history required
- MongoDB support needed
- Team wants to move fast without SQL expertise
- Prisma Studio for DB browsing is valuable

### When Drizzle Wins

- Edge runtime without driver adapter overhead
- Extreme bundle size constraints
- Direct SQL control required
- TypeScript-first team that finds .prisma DSL friction
- Turso or Cloudflare D1 as database

---

## 13. Common Mistakes

| Mistake | Fix |
|---------|-----|
| Multiple `PrismaClient` instances in dev | Use singleton pattern with `globalThis` |
| N+1 queries | Use `include`, `select` with nested relations, or `relationLoadStrategy: 'join'` |
| Using `Buffer` for Bytes | Use `Uint8Array` — `Buffer` is removed in Prisma 6+ |
| Catching `NotFoundError` | Catch `PrismaClientKnownRequestError` with `error.code === 'P2025'` |
| Running `migrate dev` in production | Use `migrate deploy` in CI/CD |
| Missing `DIRECT_URL` with Neon/Supabase | CLI migrations bypass pooler via `directUrl` — required |
| Supabase serverless on port 5432 | Use port 6543 (transaction mode) for serverless |
| `select` + `include` at same level | Pick one — they conflict |
| BigInt from raw queries | Wrap with `Number()` — raw SQL returns `BigInt` for integer aggregates |
| Missing `@@index` on FK fields with PlanetScale | No FK constraints — manually add `@@index` |
| `fullTextSearch` on Postgres in v6 | Use `fullTextSearchPostgres` preview feature flag |
| Forgetting `output` in Prisma 7 generator | Required field — set explicit path |
| Client middleware in Prisma 7 | Removed — use Client Extensions instead |
| No `output` field with monorepo | Generated client lands in wrong package — always set explicit `output` |

### Error Code Reference

| Code | Meaning |
|------|---------|
| `P1001` | Can't reach database server |
| `P1002` | Database server timeout |
| `P2000` | Value too long for column |
| `P2002` | Unique constraint violation |
| `P2003` | Foreign key constraint violation |
| `P2025` | Record not found (findUniqueOrThrow, findFirstOrThrow, update, delete) |
| `P3000` | Failed to create database |
| `P3001` | Migration possible with data loss |
| `P3002` | Migration rolled back |

```typescript
import { Prisma } from './generated/prisma'

try {
  await prisma.user.create({ data: { email: 'dupe@example.com' } })
} catch (e) {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') {
      console.error('Email already exists')
    }
    if (e.code === 'P2025') {
      console.error('Record not found')
    }
  }
  throw e
}
```
