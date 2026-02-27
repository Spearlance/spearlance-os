# Drizzle ORM Reference

Version: v1+ (v1.0.0-beta released 2025). Check `orm.drizzle.team/docs/latest-releases` for updates.

---

## 1. Setup

### drizzle.config.ts (required for drizzle-kit)

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',        // 'postgresql' | 'mysql' | 'sqlite' | 'turso' | 'mssql'
  schema: './src/db/schema.ts',
  out: './drizzle',             // migration output dir
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Neon (serverless Postgres)

```bash
npm i drizzle-orm @neondatabase/serverless
npm i -D drizzle-kit
```

```typescript
// src/db/index.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql, schema });
```

```typescript
// For interactive transactions — use WebSocket driver
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = drizzle({ client: pool, schema });
```

### Supabase / node-postgres

```bash
npm i drizzle-orm postgres
npm i -D drizzle-kit
```

```typescript
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle({ client, schema });
```

### Turso (libSQL)

```bash
npm i drizzle-orm @libsql/client
npm i -D drizzle-kit
```

```typescript
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const client = createClient({ url: process.env.TURSO_URL!, authToken: process.env.TURSO_TOKEN });
export const db = drizzle({ client, schema });
```

```typescript
// drizzle.config.ts for Turso
export default defineConfig({
  dialect: 'turso',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_TOKEN,
  },
});
```

### SQLite (better-sqlite3)

```bash
npm i drizzle-orm better-sqlite3
npm i -D drizzle-kit @types/better-sqlite3
```

```typescript
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const sqlite = new Database('sqlite.db');
export const db = drizzle({ client: sqlite, schema });
```

---

## 2. Schema Definition

### PostgreSQL Column Types

```typescript
import {
  pgTable, pgEnum,
  serial, integer, bigint, smallint,
  text, varchar, char,
  boolean,
  real, doublePrecision, numeric,
  timestamp, timestamptz, date, time, interval,
  json, jsonb,
  uuid, pgArray,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['admin', 'user', 'guest']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  // prefer identity over serial in PG
  id2: integer('id2').generatedAlwaysAsIdentity().primaryKey(),
  uuid: uuid('uuid').defaultRandom().primaryKey(),

  name: text('name').notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  bio: text('bio'),

  age: integer('age'),
  score: doublePrecision('score'),
  price: numeric('price', { precision: 10, scale: 2 }),

  role: roleEnum('role').default('user'),
  active: boolean('active').default(true),
  metadata: jsonb('metadata').$type<{ theme: string }>(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
});
```

### Constraints and Indexes

```typescript
import { pgTable, text, integer, index, uniqueIndex, primaryKey, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const posts = pgTable('posts', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  authorId: integer('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  views: integer('views').default(0),
}, (table) => [
  uniqueIndex('posts_slug_idx').on(table.slug),
  index('posts_author_idx').on(table.authorId),
  check('views_positive', sql`${table.views} >= 0`),
]);
```

### MySQL Column Types

```typescript
import { mysqlTable, int, varchar, text, boolean, datetime, mysqlEnum } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  role: mysqlEnum('role', ['admin', 'user']).default('user'),
  active: boolean('active').default(true),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`),
});
```

### SQLite Column Types

```typescript
import { sqliteTable, integer, text, real, blob } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  score: real('score'),
  active: integer('active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
});
```

---

## 3. Relations

Relations are application-level only — they don't create FK constraints. Use `.references()` on columns for DB-level FKs.

### defineRelations (v1+ API)

```typescript
import { defineRelations } from 'drizzle-orm';

// One-to-many: users → posts
export const dbRelations = defineRelations({ users, posts, comments }, (r) => ({
  users: {
    posts: r.many.posts({
      from: r.users.id,
      to: r.posts.authorId,
    }),
  },
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
    comments: r.many.comments({
      from: r.posts.id,
      to: r.comments.postId,
    }),
  },
  comments: {
    post: r.one.posts({
      from: r.comments.postId,
      to: r.posts.id,
    }),
  },
}));
```

### One-to-One

```typescript
export const dbRelations = defineRelations({ users, profiles }, (r) => ({
  users: {
    profile: r.one.profiles({
      from: r.users.id,
      to: r.profiles.userId,
    }),
  },
  profiles: {
    user: r.one.users({
      from: r.profiles.userId,
      to: r.users.id,
    }),
  },
}));
```

### Many-to-Many (via junction table)

```typescript
export const usersToGroups = pgTable('users_to_groups', {
  userId: integer('user_id').notNull().references(() => users.id),
  groupId: integer('group_id').notNull().references(() => groups.id),
}, (t) => [primaryKey({ columns: [t.userId, t.groupId] })]);

export const dbRelations = defineRelations({ users, groups, usersToGroups }, (r) => ({
  users: {
    groups: r.many.groups({
      from: r.users.id.through(r.usersToGroups.userId),
      to: r.groups.id.through(r.usersToGroups.groupId),
    }),
  },
  groups: {
    members: r.many.users({
      from: r.groups.id.through(r.usersToGroups.groupId),
      to: r.users.id.through(r.usersToGroups.userId),
    }),
  },
}));
```

Pass relations to `drizzle()`:

```typescript
export const db = drizzle({ client: sql, schema: { ...schema, ...dbRelations } });
```

---

## 4. Query API (Relational)

Use when fetching nested/related data. Generates a single optimized SQL query.

```typescript
// findMany — returns array
const users = await db.query.users.findMany();

// findFirst — returns single record or undefined
const user = await db.query.users.findFirst({
  where: { id: 1 },
});
```

### With (eager loading)

```typescript
const users = await db.query.users.findMany({
  with: {
    posts: true,  // include all posts
  },
});

// Nested with
const users = await db.query.users.findMany({
  with: {
    posts: {
      with: {
        comments: true,
      },
    },
  },
});
```

### Filtering, Ordering, Pagination

```typescript
import { eq, gt, lt, gte, lte, ne, and, or, not, like, ilike, inArray, isNull } from 'drizzle-orm';

const users = await db.query.users.findMany({
  where: { active: true },           // simple equality
  orderBy: { createdAt: 'desc' },
  limit: 10,
  offset: 20,
});

// Select API operators in where (Query API v2 supports object syntax)
const adults = await db.query.users.findMany({
  where: { age: { gte: 18 } },
});
```

### Column Selection

```typescript
const users = await db.query.users.findMany({
  columns: {
    id: true,
    name: true,
    // email omitted — excluded
  },
  with: {
    posts: {
      columns: { id: true, title: true },
    },
  },
});
```

---

## 5. Select API (SQL-like)

Use for custom joins, aggregates, subqueries, and non-relational queries.

### Basic Select

```typescript
import { eq, and, or, desc, asc, count, avg, sum, max, min } from 'drizzle-orm';

// Select all
const allUsers = await db.select().from(users);

// Select specific columns
const names = await db.select({ id: users.id, name: users.name }).from(users);

// With where
const active = await db.select().from(users).where(eq(users.active, true));

// Compound conditions
const filtered = await db.select()
  .from(users)
  .where(and(eq(users.active, true), gte(users.age, 18)));
```

### Joins

```typescript
// Left join
const result = await db.select({
  user: users,
  post: posts,
}).from(users)
  .leftJoin(posts, eq(posts.authorId, users.id));

// Inner join
const result = await db.select()
  .from(posts)
  .innerJoin(users, eq(users.id, posts.authorId))
  .where(eq(users.active, true));

// Multiple joins
const result = await db.select({
  post: posts,
  author: users,
  category: categories,
}).from(posts)
  .leftJoin(users, eq(users.id, posts.authorId))
  .leftJoin(categories, eq(categories.id, posts.categoryId));
```

### Aggregates and Group By

```typescript
import { count, avg, sum, groupBy } from 'drizzle-orm';

const stats = await db.select({
  authorId: posts.authorId,
  postCount: count(posts.id),
  avgViews: avg(posts.views),
}).from(posts)
  .groupBy(posts.authorId)
  .having(gt(count(posts.id), 5));
```

### Order, Limit, Offset

```typescript
const page = await db.select()
  .from(posts)
  .orderBy(desc(posts.createdAt), asc(posts.title))
  .limit(20)
  .offset(40);
```

### Subqueries

```typescript
import { sql } from 'drizzle-orm';

const sq = db.select({ authorId: posts.authorId, count: count().as('count') })
  .from(posts)
  .groupBy(posts.authorId)
  .as('post_counts');

const result = await db.select().from(sq).where(gt(sq.count, 10));
```

### Insert

```typescript
// Single
await db.insert(users).values({ name: 'Alice', email: 'alice@example.com' });

// Batch
await db.insert(users).values([
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Bob', email: 'bob@example.com' },
]);

// Insert and return
const [inserted] = await db.insert(users)
  .values({ name: 'Alice', email: 'alice@example.com' })
  .returning();

// Upsert (on conflict)
await db.insert(users)
  .values({ id: 1, name: 'Alice', email: 'alice@example.com' })
  .onConflictDoUpdate({
    target: users.id,
    set: { name: 'Alice Updated' },
  });

// Ignore on conflict
await db.insert(users)
  .values({ email: 'alice@example.com', name: 'Alice' })
  .onConflictDoNothing();
```

### Update

```typescript
// Update with where
await db.update(users)
  .set({ active: false, updatedAt: new Date() })
  .where(eq(users.id, 1));

// Update and return
const [updated] = await db.update(users)
  .set({ name: 'New Name' })
  .where(eq(users.id, 1))
  .returning();
```

### Delete

```typescript
await db.delete(users).where(eq(users.id, 1));

// Delete and return
const [deleted] = await db.delete(users)
  .where(eq(users.id, 1))
  .returning();
```

### Raw SQL

```typescript
import { sql } from 'drizzle-orm';

// Inline raw SQL in queries
const result = await db.select({
  id: users.id,
  rank: sql<number>`rank() over (order by ${users.score} desc)`.as('rank'),
}).from(users);

// Execute raw SQL directly
await db.execute(sql`CREATE INDEX CONCURRENTLY ON posts (author_id)`);
```

---

## 6. Migrations

### Strategy Comparison

| | `push` | `generate` + `migrate` |
|---|---|---|
| Migration files | No | Yes (SQL files in `/drizzle`) |
| Use case | Local dev, solo prototyping | Teams, production |
| Rollback | No | Yes (keep SQL files in version control) |
| Speed | Fast | Slower (review step) |
| Safe for prod | No | Yes |

### drizzle-kit push

```bash
npx drizzle-kit push
```

Reads schema → diffs against DB → applies SQL directly. No files generated. Prompts before destructive changes. Use for rapid iteration only.

### drizzle-kit generate + migrate

```bash
# 1. Generate migration SQL from schema changes
npx drizzle-kit generate

# 2. Review the generated file in ./drizzle/
# 3. Apply to database
npx drizzle-kit migrate
```

Migration files are timestamped SQL: `0001_add_users_table.sql`. Commit them to version control.

### Run migrate at startup (programmatic)

```typescript
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

const db = drizzle(process.env.DATABASE_URL!);
await migrate(db, { migrationsFolder: './drizzle' });
```

### Drizzle Studio

```bash
npx drizzle-kit studio
```

Opens a browser UI at `https://local.drizzle.studio` to browse and edit data.

### Introspect existing DB

```bash
npx drizzle-kit introspect
```

Generates schema TypeScript from an existing database. Useful for migrating from another ORM.

---

## 7. Transactions

```typescript
// Basic transaction
await db.transaction(async (tx) => {
  const [user] = await tx.insert(users)
    .values({ name: 'Alice', email: 'alice@example.com' })
    .returning();

  await tx.insert(profiles)
    .values({ userId: user.id, bio: 'Hello' });
});

// Manual rollback
await db.transaction(async (tx) => {
  try {
    await tx.update(accounts).set({ balance: sql`balance - 100` }).where(eq(accounts.id, 1));
    await tx.update(accounts).set({ balance: sql`balance + 100` }).where(eq(accounts.id, 2));
  } catch (err) {
    tx.rollback();
    throw err;
  }
});

// Savepoints (nested transactions)
await db.transaction(async (tx) => {
  await tx.insert(users).values({ name: 'Alice', email: 'alice@example.com' });

  await tx.transaction(async (nestedTx) => {
    // This is a savepoint
    await nestedTx.insert(logs).values({ action: 'user_created' });
  });
});
```

---

## 8. Prepared Statements

```typescript
import { placeholder } from 'drizzle-orm';

// Prepare once, execute many
const prepared = db.select()
  .from(users)
  .where(eq(users.id, placeholder('id')))
  .prepare('getUserById');

// Execute with bound params
const user = await prepared.execute({ id: 1 });
const user2 = await prepared.execute({ id: 42 });

// Prepared insert
const preparedInsert = db.insert(users)
  .values({
    name: placeholder('name'),
    email: placeholder('email'),
  })
  .returning()
  .prepare('createUser');

const [user] = await preparedInsert.execute({ name: 'Alice', email: 'alice@example.com' });
```

---

## 9. Database Adapters

| Adapter | Package | Import |
|---------|---------|--------|
| Neon HTTP (serverless) | `@neondatabase/serverless` | `drizzle-orm/neon-http` |
| Neon WebSocket (transactions) | `@neondatabase/serverless` | `drizzle-orm/neon-serverless` |
| node-postgres | `pg` | `drizzle-orm/node-postgres` |
| postgres.js | `postgres` | `drizzle-orm/postgres-js` |
| Supabase | `postgres` | `drizzle-orm/postgres-js` |
| PlanetScale | `@planetscale/database` | `drizzle-orm/planetscale-serverless` |
| Turso / libSQL | `@libsql/client` | `drizzle-orm/libsql` |
| better-sqlite3 | `better-sqlite3` | `drizzle-orm/better-sqlite3` |
| Bun SQLite | built-in | `drizzle-orm/bun-sqlite` |
| MySQL2 | `mysql2` | `drizzle-orm/mysql2` |
| MSSQL | `mssql` | `drizzle-orm/mssql` (v1 beta) |

### node-postgres (pg)

```typescript
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
```

### PlanetScale

```typescript
import { connect } from '@planetscale/database';
import { drizzle } from 'drizzle-orm/planetscale-serverless';

const connection = connect({ url: process.env.DATABASE_URL! });
export const db = drizzle({ client: connection, schema });
```

---

## 10. Drizzle vs Prisma

Last updated: 2025-2026. Prisma 7 shipped late 2025 (pure TS, no Rust binary).

| | Drizzle | Prisma |
|--|---------|--------|
| **Philosophy** | SQL-first, minimal abstraction | Schema-first, high abstraction |
| **Schema** | TypeScript code | `.prisma` DSL file |
| **Bundle size** | ~31KB, zero native deps | Larger (Prisma 7 now pure TS) |
| **Serverless/Edge** | Excellent — native support | Good (improved in Prisma 7) |
| **Type safety** | Strong (inferred) | Strong (generated) |
| **Type-check speed** | Slower (5000+ instantiations) | Faster (few hundred instantiations) |
| **Migrations** | Manual (push or generate+migrate) | Automated (`prisma migrate dev`) |
| **Learning curve** | Low if you know SQL | Low if you don't know SQL |
| **Tooling** | Drizzle Studio | Prisma Studio, Prisma Accelerate |
| **Raw SQL** | First-class | Escape hatch |

### Choose Drizzle when:

- Deploying to edge/serverless (Cloudflare Workers, Vercel Edge, AWS Lambda)
- You prefer SQL control and minimal magic
- Bundle size and cold start are critical
- You want a lightweight, dependency-free setup
- Using SQLite (Turso, Bun, better-sqlite3)

### Choose Prisma when:

- Team is new to databases — abstracted API speeds onboarding
- You want automated migration tooling with less manual intervention
- You need Prisma Accelerate (global connection pooling)
- Rapid prototyping with auto-generated CRUD types
- Large teams where generated types reduce drift

---

## 11. Common Mistakes

| Mistake | Fix |
|---------|-----|
| Query API returns `undefined` on relations | Pass `schema` + `relations` to `drizzle()` |
| `Cannot find relation` error | Export `defineRelations` result and pass to `drizzle({ schema })` |
| Using `push` in CI/production | Switch to `generate` + `migrate` pipeline |
| `serial` on new PG schemas | Use `integer().generatedAlwaysAsIdentity()` instead |
| Missing `dialect` in `drizzle.config.ts` | Required field in v1+ |
| Neon HTTP driver with transactions | Use `neon-serverless` WebSocket driver for transactions |
| Type errors on `.returning()` | Only PG + SQLite support `RETURNING`; MySQL does not |
| Forgot to call `npx drizzle-kit migrate` after `generate` | `generate` only creates files — `migrate` applies them |
| `with:` on Select API | `with:` is Query API only; use `.leftJoin()` on Select API |
| Relations without FK constraints | `.references()` = DB FK. `defineRelations` = app-level only — you need both |

### Environment Setup Pattern

```typescript
// db/index.ts — safe pattern for Next.js dev (avoids hot-reload connection leaks)
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { dbRelations } from './relations';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql, schema: { ...schema, ...dbRelations } });
```

### drizzle-zod Integration (v1+)

Validator packages are now in `drizzle-orm` — no separate package needed.

```typescript
import { createInsertSchema, createSelectSchema } from 'drizzle-orm/zod';

const insertUserSchema = createInsertSchema(users, {
  email: (schema) => schema.email(),
  name: (schema) => schema.min(2).max(100),
});

const selectUserSchema = createSelectSchema(users);

// Use with server actions / API routes
const validated = insertUserSchema.parse(req.body);
await db.insert(users).values(validated);
```
