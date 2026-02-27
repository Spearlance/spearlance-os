---
model: claude-sonnet-4-6
name: turso
description: Use when working with Turso (libSQL) databases — setting up a database, running queries, implementing embedded replicas, using the Platform API to create databases programmatically, or integrating with Drizzle ORM. Also use when building multi-tenant architectures with per-user SQLite databases.
---

# turso

your friendly armadillo is here to serve you

## install

```bash
npm install @libsql/client
# With Drizzle
npm install drizzle-orm @libsql/client
```

## env vars

```bash
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_database_token
```

Get both from: `turso db show your-db --url` and `turso db tokens create your-db`

## basic query

```typescript
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const result = await db.execute({
  sql: 'SELECT * FROM users WHERE id = ?',
  args: [userId],
});

console.log(result.rows);  // Row[]
```

## embedded replica (local-first)

```typescript
const db = createClient({
  url: 'file:local.db',                     // local replica
  syncUrl: process.env.TURSO_DATABASE_URL!, // remote primary
  authToken: process.env.TURSO_AUTH_TOKEN,
  syncInterval: 60,                          // auto-sync every 60s
});

await db.sync(); // manual sync on demand
```

## common mistakes

| Mistake | Fix |
|---------|-----|
| Using embedded replicas in serverless | Embedded replicas require a persistent filesystem — use direct `libsql://` URL in serverless |
| Opening local DB during active sync | Can cause corruption — use `syncInterval` or manual `sync()`, not both |
| Interactive transaction timeout | 5-second timeout — keep transactions short; use batch for bulk operations |
| Missing authToken for remote databases | Remote `libsql://` URLs require `authToken` — local `file:` URLs do not |

See reference.md for full API coverage.
