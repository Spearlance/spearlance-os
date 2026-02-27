---
model: claude-sonnet-4-6
name: drizzle
description: Use when working with Drizzle ORM — schema definition, queries, migrations, or database integration. Also use when choosing between Drizzle and Prisma, or setting up Drizzle with Neon, Supabase, PlanetScale, or Turso.
---

```
┏━ 🔧 drizzle ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ your friendly armadillo is here to serve you    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## Overview

Drizzle is a headless TypeScript ORM. ~31KB, zero binary deps. SQL-familiar API — if you know SQL, you know Drizzle. Two query styles: SQL-like Select API and relational Query API. Best choice for serverless/edge.

## Quick Reference

```bash
# Install
npm i drizzle-orm
npm i -D drizzle-kit

# + driver for your DB:
npm i @neondatabase/serverless     # Neon
npm i postgres                     # Supabase / pg
npm i better-sqlite3               # SQLite
npm i @libsql/client               # Turso
```

```bash
# drizzle-kit commands
npx drizzle-kit push               # push schema to DB (dev/prototyping)
npx drizzle-kit generate           # generate SQL migration files
npx drizzle-kit migrate            # apply generated migrations
npx drizzle-kit studio             # open Drizzle Studio UI
npx drizzle-kit introspect         # pull schema from existing DB
```

## Schema Definition

```typescript
import { pgTable, serial, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  age: integer('age'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});
```

## Query API vs Select API

```typescript
// Query API — relational, use with defineRelations
const user = await db.query.users.findFirst({
  where: { id: 1 },
  with: { posts: true },
});

// Select API — SQL-like, explicit joins
const user = await db.select()
  .from(users)
  .where(eq(users.id, 1))
  .leftJoin(posts, eq(posts.authorId, users.id));
```

**Rule:** Use Query API for nested data. Use Select API for custom joins, aggregates, subqueries.

## Migrations

| Command | Use When |
|---------|----------|
| `push` | Local dev, solo prototyping — no migration files |
| `generate` + `migrate` | Teams, production — versioned SQL files |

## Common Mistakes

- Missing `defineRelations` when using Query API with `with:` — relations must be registered
- Using `push` in production — no history, no rollback
- Forgetting `drizzle.config.ts` `dialect` field (required in v1+)
- `serial` vs `integer` with identity — prefer `integer().generatedAlwaysAsIdentity()` on PG

## Full Reference

See `reference.md` in this directory for:
setup (Neon/Supabase/Turso/SQLite), schema types, relations, Query API, Select API, transactions, prepared statements, adapters, Drizzle vs Prisma, common mistakes.
