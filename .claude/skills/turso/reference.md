# Turso (libSQL) Developer Reference

Full API coverage for Turso — libSQL client, embedded replicas, Platform API, and Drizzle integration.

Last verified: February 2026. Check [docs.turso.tech](https://docs.turso.tech) for changes.

---

## 1. Setup

### Install

```bash
npm install @libsql/client
# TypeScript types included

# With Drizzle ORM
npm install drizzle-orm @libsql/client
npm install -D drizzle-kit
```

### Connection URLs

| URL format | Description |
|-----------|-------------|
| `libsql://your-db.turso.io` | Remote Turso database |
| `https://your-db.turso.io` | Remote via HTTP (Edge/no-WebSocket environments) |
| `file:local.db` | Local SQLite file |
| `file:local.db?mode=memory` | In-memory SQLite (resets on process exit) |
| `:memory:` | In-memory SQLite shorthand |

### Credentials

```bash
# From Turso CLI
turso db show your-db-name --url
turso db tokens create your-db-name

# Or from Turso dashboard → Database → Connect
TURSO_DATABASE_URL=libsql://your-db-name-your-org.turso.io
TURSO_AUTH_TOKEN=eyJhbGci...
```

---

## 2. libSQL Client (@libsql/client)

### createClient

```typescript
import { createClient, type Client } from '@libsql/client';

// Remote database
const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,    // required
  authToken: process.env.TURSO_AUTH_TOKEN, // required for remote
});

// Local SQLite file
const localDb = createClient({
  url: 'file:./local.db',
});

// In-memory (testing)
const memDb = createClient({
  url: ':memory:',
});
```

### createClient options

| Option | Type | Description |
|--------|------|-------------|
| `url` | string | Connection URL |
| `authToken` | string | JWT auth token (required for remote) |
| `syncUrl` | string | Remote primary URL (embedded replicas only) |
| `syncInterval` | number | Auto-sync interval in seconds |
| `encryptionKey` | string | Encryption at rest key |
| `fetch` | function | Custom fetch implementation (edge environments) |
| `concurrency` | number | Max concurrent requests (default: 20) |

---

## 3. Queries

### execute — single statement

```typescript
// Parameterized query (positional)
const result = await db.execute({
  sql: 'SELECT * FROM users WHERE id = ? AND active = ?',
  args: [userId, true],
});

// Named parameters
const result2 = await db.execute({
  sql: 'SELECT * FROM users WHERE id = :id',
  args: { id: userId },
});

// Using $ prefix (also valid)
const result3 = await db.execute({
  sql: 'INSERT INTO events (user_id, type) VALUES ($userId, $type)',
  args: { userId, type: 'click' },
});

// Simple string (no params — be careful with SQL injection)
const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table'");
```

### ResultSet structure

```typescript
interface ResultSet {
  columns: string[];        // column names
  columnTypes: string[];    // SQLite types
  rows: Row[];              // array of rows
  rowsAffected: number;     // for INSERT/UPDATE/DELETE
  lastInsertRowid: bigint | undefined; // for INSERT
}

// Access row data
for (const row of result.rows) {
  console.log(row.id, row.name, row.email);  // named access
  console.log(row[0], row[1], row[2]);        // positional access
}

// Type casting
const id = result.rows[0].id as number;
const name = result.rows[0].name as string;
```

### CRUD examples

```typescript
// INSERT
const inserted = await db.execute({
  sql: 'INSERT INTO users (name, email, created_at) VALUES (?, ?, ?)',
  args: ['Taylor', '[email protected]', new Date().toISOString()],
});
console.log(inserted.lastInsertRowid); // bigint

// SELECT
const users = await db.execute({
  sql: 'SELECT id, name, email FROM users WHERE active = ? LIMIT ?',
  args: [1, 50],
});

// UPDATE
const updated = await db.execute({
  sql: 'UPDATE users SET name = ?, updated_at = ? WHERE id = ?',
  args: ['New Name', new Date().toISOString(), userId],
});
console.log(updated.rowsAffected);

// DELETE
const deleted = await db.execute({
  sql: 'DELETE FROM users WHERE id = ?',
  args: [userId],
});
```

---

## 4. Batch Operations

Execute multiple statements in a single round-trip. All run in an **implicit transaction** — if any fails, all roll back.

```typescript
// batch — implicit transaction
const [createResult, indexResult] = await db.batch([
  {
    sql: 'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE)',
    args: [],
  },
  {
    sql: 'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    args: [],
  },
]);

// Batch with data
const insertResults = await db.batch(
  users.map((user) => ({
    sql: 'INSERT INTO users (name, email) VALUES (?, ?)',
    args: [user.name, user.email],
  }))
);
```

### Batch with transaction mode

```typescript
await db.batch(
  [
    { sql: 'UPDATE accounts SET balance = balance - ? WHERE id = ?', args: [100, fromAccountId] },
    { sql: 'UPDATE accounts SET balance = balance + ? WHERE id = ?', args: [100, toAccountId] },
  ],
  'write'   // 'write' | 'read' | 'deferred' — default: 'deferred'
);
```

---

## 5. Interactive Transactions

For complex workflows requiring conditional logic between statements.

**Warning:** Interactive transactions lock the database and have a **5-second timeout**. Prefer `batch()` when possible.

```typescript
const tx = await db.transaction('write');

try {
  // Check balance
  const balance = await tx.execute({
    sql: 'SELECT balance FROM accounts WHERE id = ?',
    args: [accountId],
  });

  if ((balance.rows[0].balance as number) < 100) {
    await tx.rollback();
    throw new Error('Insufficient funds');
  }

  // Perform transfer
  await tx.execute({
    sql: 'UPDATE accounts SET balance = balance - 100 WHERE id = ?',
    args: [accountId],
  });

  await tx.execute({
    sql: 'INSERT INTO transactions (account_id, amount, type) VALUES (?, ?, ?)',
    args: [accountId, -100, 'withdrawal'],
  });

  await tx.commit();
} catch (error) {
  await tx.rollback();
  throw error;
}
```

### Transaction modes

| Mode | Description |
|------|-------------|
| `write` | Immediate write lock — prevents other writers |
| `read` | Read-only transaction |
| `deferred` | Lock acquired on first write — default SQLite behavior |

---

## 6. Embedded Replicas

Run a local copy of your database within your application. Best for VMs, VPS, and mobile — **not for serverless**.

```typescript
import { createClient } from '@libsql/client';

const db = createClient({
  url: 'file:./replica.db',                  // local replica file
  syncUrl: process.env.TURSO_DATABASE_URL!,  // remote primary
  authToken: process.env.TURSO_AUTH_TOKEN,
  syncInterval: 60,                           // auto-sync every 60 seconds
});

// Initial sync on startup
await db.sync();
```

### Sync behavior

| Behavior | Detail |
|---------|--------|
| Reads | Always from local file — zero latency |
| Writes | Go to remote primary, then immediately visible locally |
| Auto-sync | Pulls remote changes every `syncInterval` seconds |
| Manual sync | Call `await db.sync()` anytime |
| Read-your-writes | Writes are visible locally immediately after `execute()` resolves |

### Manual sync pattern

```typescript
// For apps with periodic background sync (no syncInterval)
import { createClient } from '@libsql/client';

const db = createClient({
  url: 'file:./replica.db',
  syncUrl: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Sync on startup
await db.sync();

// Sync every 5 minutes in background
setInterval(async () => {
  try {
    await db.sync();
  } catch (e) {
    console.error('Sync failed:', e);
  }
}, 5 * 60 * 1000);
```

### Platform support

Embedded replicas require a **persistent filesystem**. Supported on:
- Node.js 18+ (Bun, Deno also supported)
- Fly.io, Railway, Render, Koyeb (persistent volumes)
- Self-hosted VMs/VPS

Not supported on:
- Vercel Serverless Functions
- AWS Lambda
- Cloudflare Workers (no filesystem)

For serverless, use `url: 'libsql://...'` directly (no replica).

---

## 7. Schema Setup

```typescript
// Create tables on startup
await db.batch([
  {
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        name      TEXT    NOT NULL,
        email     TEXT    UNIQUE NOT NULL,
        plan      TEXT    NOT NULL DEFAULT 'free',
        created_at TEXT   NOT NULL DEFAULT (datetime('now'))
      )
    `,
    args: [],
  },
  {
    sql: `
      CREATE TABLE IF NOT EXISTS events (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL REFERENCES users(id),
        type        TEXT    NOT NULL,
        properties  TEXT,   -- JSON blob
        created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
      )
    `,
    args: [],
  },
  {
    sql: 'CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id)',
    args: [],
  },
]);
```

---

## 8. Drizzle Integration

### drizzle.config.ts

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} satisfies Config;
```

### Schema definition

```typescript
// src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  plan: text('plan').notNull().default('free'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  properties: text('properties', { mode: 'json' }),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});
```

### Client initialization

```typescript
// src/db/index.ts
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
```

### Drizzle queries

```typescript
import { db } from './db';
import { users, events } from './db/schema';
import { eq, and, desc, gte } from 'drizzle-orm';

// SELECT
const allUsers = await db.select().from(users).limit(50);

// WHERE
const proUsers = await db
  .select()
  .from(users)
  .where(eq(users.plan, 'pro'))
  .orderBy(desc(users.createdAt));

// JOIN
const userEvents = await db
  .select({ user: users, event: events })
  .from(events)
  .innerJoin(users, eq(events.userId, users.id))
  .where(eq(users.id, userId));

// INSERT
const [newUser] = await db
  .insert(users)
  .values({ name: 'Taylor', email: '[email protected]', plan: 'free' })
  .returning();

// UPDATE
await db.update(users).set({ plan: 'pro' }).where(eq(users.id, userId));

// DELETE
await db.delete(users).where(eq(users.id, userId));

// Transaction
await db.transaction(async (tx) => {
  await tx.insert(events).values({ userId, type: 'upgrade', properties: { from: 'free', to: 'pro' } });
  await tx.update(users).set({ plan: 'pro' }).where(eq(users.id, userId));
});
```

### Migrations

```bash
# Generate migration files
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate

# Or push schema directly (dev only)
npx drizzle-kit push
```

---

## 9. Platform API

Programmatically create and manage Turso databases — perfect for multi-tenant architectures.

### Setup

```bash
npm install @tursodatabase/api
```

```typescript
import { createClient } from '@tursodatabase/api';

const turso = createClient({
  org: process.env.TURSO_ORG_SLUG!,   // your Turso organization slug
  token: process.env.TURSO_API_TOKEN!, // from: turso auth token
});
```

Generate a platform API token: `turso auth token` (or create in dashboard).

### Databases

```typescript
// List databases
const { databases } = await turso.databases.list();

// Get a database
const db = await turso.databases.get('my-database');

// Create a database
const newDb = await turso.databases.create('new-database', {
  group: 'default',   // required — assign to a group
  seed: {
    type: 'database',
    name: 'template-db',   // optional — seed from existing database
  },
});

// Get database URL and token
const info = await turso.databases.get('new-database');
const dbUrl = `libsql://${info.Hostname}`;

// Generate a database token
const { jwt } = await turso.databases.createToken('new-database');

// Delete a database
await turso.databases.delete('old-database');
```

### Groups

Groups are logical collections of databases that share a set of locations.

```typescript
// List groups
const { groups } = await turso.groups.list();

// Get a group
const group = await turso.groups.get('default');

// Create a group
const newGroup = await turso.groups.create('eu-group', { primary: 'ams' });

// Add a location to a group
await turso.groups.addLocation('default', 'ord');  // Chicago

// Remove a location
await turso.groups.removeLocation('default', 'ord');

// Generate a group token (connects to ALL databases in the group)
const { jwt } = await turso.groups.createToken('default');
```

### Locations

```typescript
// List all available locations
const { locations } = await turso.locations.list();
// { ams: 'Amsterdam', bos: 'Boston', cdg: 'Paris', den: 'Denver', ... }

// Find closest location to client
const { server } = await turso.locations.closest();
```

### API Tokens (platform management)

```typescript
// Create an API token
const { value } = await turso.apiTokens.create('my-token');
// Store value securely — shown only once

// List tokens
const { tokens } = await turso.apiTokens.list();

// Validate a token
const { exp } = await turso.apiTokens.validate('token-name');

// Revoke a token
await turso.apiTokens.revoke('token-name');
```

### Per-user database pattern (multi-tenant)

```typescript
async function createUserDatabase(userId: string) {
  const dbName = `user-${userId}`;

  // Create database
  const db = await turso.databases.create(dbName, { group: 'default' });

  // Generate a per-database auth token
  const { jwt } = await turso.databases.createToken(dbName, {
    expiration: '7d',           // optional — never expires if omitted
    authorization: 'read-only', // optional — 'full-access' | 'read-only'
  });

  // Return connection info
  return {
    url: `libsql://${db.Hostname}`,
    token: jwt,
  };
}

async function getUserDb(userId: string) {
  const { url, token } = await createUserDatabase(userId);

  return createClient({ url, authToken: token });
}
```

---

## 10. Connection Patterns

### Next.js App Router

```typescript
// lib/db.ts — module-level singleton
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

// Singleton pattern — reuse connection across hot reloads
const globalForDb = globalThis as unknown as { db?: ReturnType<typeof drizzle> };

function getDb() {
  if (!globalForDb.db) {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    globalForDb.db = drizzle(client);
  }
  return globalForDb.db;
}

export const db = getDb();
```

### Edge / Cloudflare Workers

Use HTTPS URL instead of libsql:// (WebSockets not always available):

```typescript
const db = createClient({
  url: process.env.TURSO_DATABASE_URL!.replace('libsql://', 'https://'),
  authToken: process.env.TURSO_AUTH_TOKEN,
  fetch: (url, init) => fetch(url, init),  // use native fetch
});
```

---

## 11. Common Mistakes

| Mistake | Fix |
|---------|-----|
| Embedded replica in serverless | Use `url: 'libsql://...'` directly — no local file, no `syncUrl` |
| Not calling `await db.sync()` on startup | Without initial sync, replica may be empty or stale |
| Interactive transaction exceeding 5s | Use `batch()` for bulk operations; keep transactions under 1-2 seconds |
| Missing `authToken` for remote URL | `libsql://` URLs require a token — local `file:` URLs don't |
| Opening local DB while sync is active | Can cause corruption — don't open the file externally during sync |
| Sharing interactive transaction across async boundaries | Transaction object is not thread-safe across awaits — commit or rollback in the same call stack |
| Platform API token vs database token | `turso auth token` = platform management token; `turso db tokens create` = database access token — different things |
| Using `mode=memory` in production | `:memory:` databases reset on every process restart — always use a file or remote URL for persistence |
| drizzle-kit push in production | `push` is for dev only — use `migrate` with generated SQL files in production |
