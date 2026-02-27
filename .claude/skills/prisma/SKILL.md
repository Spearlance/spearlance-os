---
model: claude-sonnet-4-6
name: prisma
description: Use when working with Prisma ORM — schema modeling, client queries, migrations, or database management. Also use when setting up Prisma with Neon, Supabase, PlanetScale, or when debugging Prisma-specific query issues.
---

# Prisma ORM

## Overview

Prisma is a TypeScript-first ORM for Node.js. Current stable: **Prisma 7** (pure TypeScript, no Rust engine, ~1.6MB bundle). Prisma 6 (stable) still widely deployed.

## Quick Reference

| Item | Value |
|------|-------|
| Install (client) | `npm install @prisma/client` |
| Install (dev) | `npm install -D prisma` |
| Init | `npx prisma init` |
| Generate client | `npx prisma generate` |
| Dev migration | `npx prisma migrate dev --name <name>` |
| Deploy migration | `npx prisma migrate deploy` |
| Reset DB | `npx prisma migrate reset` |
| Studio | `npx prisma studio` |
| Seed | `npx prisma db seed` |
| Introspect | `npx prisma db pull` |

## Schema Definition

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // required for Neon/Supabase
}

generator client {
  provider = "prisma-client"  // Prisma 7: was "prisma-client-js" in v6
  output   = "../src/generated/prisma" // required in Prisma 7
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Client Queries (Common)

```typescript
import { PrismaClient } from './generated/prisma'
const prisma = new PrismaClient()

// Create
const user = await prisma.user.create({ data: { email: 'a@b.com', name: 'Alice' } })

// Find
const users = await prisma.user.findMany({ where: { name: { contains: 'Ali' } }, include: { posts: true } })

// Update
await prisma.user.update({ where: { id: 1 }, data: { name: 'Alicia' } })

// Delete
await prisma.user.delete({ where: { id: 1 } })

// Upsert
await prisma.user.upsert({ where: { email: 'a@b.com' }, update: {}, create: { email: 'a@b.com' } })
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `Buffer` for Bytes fields | Use `Uint8Array` (Prisma 6+) |
| Catching `NotFoundError` | Catch `PrismaClientKnownRequestError` with `code === 'P2025'` |
| N+1 queries with relations | Use `include` or set `relationLoadStrategy: 'join'` |
| Connection exhaustion in serverless | Use Prisma Accelerate or Neon/Supabase connection pooler + `DIRECT_URL` |
| `prisma-client-js` provider in Prisma 7 | Switch to `prisma-client` |
| No `output` field in Prisma 7 generator | Required — set explicit output path |
| `fullTextSearch` on Postgres in v6 | Use `fullTextSearchPostgres` preview feature flag |

## Full Reference

See `reference.md` in this skill directory for: setup with Neon/Supabase/PlanetScale/MySQL/SQLite, schema relations (1:1, 1:n, m:n, self), filtering/ordering/pagination, aggregations, transactions, raw queries, Prisma Accelerate, serverless config, Prisma 6 vs 7 migration, and Prisma vs Drizzle decision guide.
