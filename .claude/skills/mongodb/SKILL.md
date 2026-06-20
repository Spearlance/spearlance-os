---
model: claude-sonnet-4-6
name: mongodb
description: Use when working with MongoDB — document modeling, queries, aggregation pipelines, Atlas setup, or Mongoose ODM. Also use when deciding between MongoDB and relational databases or debugging MongoDB-specific issues.
---

# MongoDB

## Overview

MongoDB 8.2 (current) — document-oriented NoSQL database. Node.js driver v7.x (current; v6.x in maintenance). Mongoose ODM v9.x (current).

## Quick Reference

| Item | Value |
|------|-------|
| Current server | MongoDB 8.2 |
| Node.js driver | v7.x (`npm i mongodb`) |
| Mongoose ODM | v9.x (`npm i mongoose`) |
| Atlas connection | `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/<db>` |
| Default port | 27017 |

## Atlas Tiers (as of Feb 2026)

| Tier | Cost | Storage | Ops/sec |
|------|------|---------|---------|
| Free (M0) | $0 | 512 MB | shared |
| Flex | $8–$30/mo | 5 GB base | 100–500 |
| Dedicated (M10+) | $57+/mo | custom | custom |

> Serverless and M2/M5 tiers are deprecated — all migrated to Flex as of mid-2025.

## Connection (Node.js driver)

```ts
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI!);

export async function getDb() {
  await client.connect();
  return client.db('mydb');
}
```

For serverless/edge: cache the client at module scope, not per-request.

## Common Operations

```ts
const col = db.collection<User>('users');

// Insert
await col.insertOne({ name: 'Ada', email: 'ada@example.com' });

// Find
const user = await col.findOne({ email: 'ada@example.com' });

// Update
await col.updateOne({ _id }, { $set: { name: 'Ada L.' } });

// Delete
await col.deleteOne({ _id });
```

## Embed vs Reference (quick rule)

- **Embed** when child data is always read with the parent and has bounded growth
- **Reference** when child data is large, shared across documents, or grows unbounded

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| New `MongoClient` per request in serverless | Cache client at module scope |
| Querying without indexes | Run `explain()`, add compound index |
| Using `findOneAndRemove()` | Replaced by `findOneAndDelete()` |
| Storing large arrays as embedded docs | Use references once array exceeds ~100 items |
| ObjectId as string comparison | Always compare with `new ObjectId(id)` |

## Full Reference

See `reference.md` in this skill directory for:
Atlas setup, connection management, document modeling patterns, full CRUD with TypeScript, aggregation pipeline, indexing, Mongoose ODM, serverless considerations, security, pricing details, error codes.
