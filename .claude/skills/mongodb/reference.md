# MongoDB Reference

> Last verified: February 2026. MongoDB 8.2, Node.js driver v7.x, Mongoose v9.x.

## Table of Contents

1. [Atlas Setup](#1-atlas-setup)
2. [Client Setup](#2-client-setup)
3. [Document Modeling](#3-document-modeling)
4. [CRUD Operations](#4-crud-operations)
5. [Aggregation Pipeline](#5-aggregation-pipeline)
6. [Indexing](#6-indexing)
7. [Mongoose ODM](#7-mongoose-odm)
8. [Serverless Considerations](#8-serverless-considerations)
9. [Security](#9-security)
10. [Pricing & Limits](#10-pricing--limits)
11. [Common Mistakes](#11-common-mistakes)

---

## 1. Atlas Setup

### Create a Cluster

1. Sign up at [cloud.mongodb.com](https://cloud.mongodb.com)
2. **New Project** → **Build a Database**
3. Select tier:
   - **Free (M0)** — dev/hobby, 512 MB, no credit card
   - **Flex** — $8–$30/mo, 5 GB base, auto-scales to 500 ops/sec
   - **Dedicated (M10+)** — production, full feature set
4. Choose provider + region (keep close to your app servers)
5. Set cluster name → **Create**

> Note: M2, M5, and Serverless tiers are deprecated (migrated to Flex as of mid-2025). Do not create them — use Flex instead.

### Network Access (IP Allowlist)

**Security → Network Access → Add IP Address**

```
0.0.0.0/0   # allow all — fine for dev, bad for prod
```

For production, allowlist only your app server IPs or VPC CIDR range.

### Database Access (Users)

**Security → Database Access → Add New Database User**

- Choose **Password** auth (or AWS IAM / X.509 for production)
- Grant **readWrite** on your specific database (avoid Atlas Admin for app users)
- Save credentials in environment variables — never commit them

### Connection String

**Database → Connect → Drivers → Node.js**

```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
```

Store as `MONGODB_URI` in `.env`. The `+srv` protocol handles host discovery automatically.

---

## 2. Client Setup

### Node.js Driver vs Mongoose

| | Node.js Driver | Mongoose |
|---|---|---|
| Level | Low-level | ODM (schema layer) |
| TypeScript | Good — generics on collections | Excellent — schema-driven types |
| Validation | Manual | Built-in schema validation |
| Best for | Microservices, high throughput, fine control | Application servers, complex data models |

### Node.js Driver (v7.x)

```bash
npm i mongodb
```

```ts
// lib/db.ts
import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI!;
const options = {};

let client: MongoClient;
let db: Db;

// In production/serverless, cache at module level
if (process.env.NODE_ENV === 'production') {
  client = new MongoClient(uri, options);
  db = client.db();
} else {
  // In dev, use global to survive HMR restarts
  let globalWithMongo = global as typeof globalThis & {
    _mongoClient?: MongoClient;
  };
  if (!globalWithMongo._mongoClient) {
    globalWithMongo._mongoClient = new MongoClient(uri, options);
  }
  client = globalWithMongo._mongoClient;
  db = client.db();
}

export { db, client };
```

**v7 driver** is the current major version (v6 is in maintenance). Key changes from v6:
- `findOneAndRemove()` removed — use `findOneAndDelete()`
- `count()` removed — use `countDocuments()` or `estimatedDocumentCount()`
- `addUser()` removed — use `createUser` via shell command
- SSL options (`ssl`, `sslCert`, etc.) removed — use `tls`/`tlsCertificateKeyFile`
- ObjectId constructor no longer accepts 12-char strings

### Mongoose (v9.x)

```bash
npm i mongoose
```

```ts
// lib/mongoose.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

declare global {
  var mongoose: { conn: typeof import('mongoose') | null; promise: Promise<typeof import('mongoose')> | null };
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDb() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
```

**Breaking changes in Mongoose v8 → v9:**
- `findOneAndRemove()` removed — use `findOneAndDelete()`
- `count()` removed — use `countDocuments()`
- Browser build removed — use `@mongoosejs/browser` instead
- `schematype.caster` / `casterConstructor` removed — use `embeddedSchemaType` / `Constructor`

---

## 3. Document Modeling

### Embed vs Reference Decision

**Embed when:**
- Child data always read with parent (no separate queries needed)
- Child data bounded in size (< ~100 items, < 16 MB total doc limit)
- Child data is not shared across multiple parent documents

**Reference when:**
- Child data is large or unbounded (comments, messages, events)
- Child data is shared (e.g., same product in many orders)
- Child data queried independently

```ts
// Embed — address is small, always read with user
interface User {
  name: string;
  address: {        // embedded
    street: string;
    city: string;
    zip: string;
  };
}

// Reference — posts are unbounded and queried independently
interface User {
  name: string;
  postIds: ObjectId[];  // reference
}
```

### Schema Design Patterns

| Pattern | When | Approach |
|---------|------|----------|
| **Bucket** | Unbounded time-series events | Group events into per-hour/day docs with array of readings |
| **Outlier** | Arrays that sometimes go viral | Embed first N, set `hasOverflow: true` + reference collection |
| **Attribute** | Wildcard filterable attributes | `specs: [{ k, v }]` array + compound index on `k`+`v` |

### 16 MB Document Limit

MongoDB documents have a hard 16 MB size limit. Design schemas to stay well under this. Arrays with unbounded growth will hit this limit — use references instead.

---

## 4. CRUD Operations

All examples use TypeScript with the Node.js driver v7.x.

```ts
import { ObjectId, Collection } from 'mongodb';

interface User {
  _id?: ObjectId;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Date;
}

const users: Collection<User> = db.collection<User>('users');
```

### Insert

```ts
// Single
const result = await users.insertOne({
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  role: 'user',
  createdAt: new Date(),
});
console.log(result.insertedId); // ObjectId

// Many
const result = await users.insertMany([
  { name: 'Grace', email: 'grace@example.com', role: 'admin', createdAt: new Date() },
  { name: 'Alan', email: 'alan@example.com', role: 'user', createdAt: new Date() },
]);
console.log(result.insertedCount); // 2
```

### Find

```ts
// Single document
const user = await users.findOne({ email: 'ada@example.com' });

// With projection (include/exclude fields)
const user = await users.findOne(
  { email: 'ada@example.com' },
  { projection: { name: 1, email: 1, _id: 0 } }
);

// Multiple documents
const admins = await users.find({ role: 'admin' }).toArray();

// With sort, skip, limit
const page = await users
  .find({ role: 'user' })
  .sort({ createdAt: -1 })
  .skip(0)
  .limit(20)
  .toArray();

// Find by ObjectId — always use new ObjectId()
const user = await users.findOne({ _id: new ObjectId(idString) });
```

### Update

```ts
// Update one
await users.updateOne(
  { email: 'ada@example.com' },
  {
    $set: { name: 'Ada L.' },
    $currentDate: { updatedAt: true },
  }
);

// Update many
await users.updateMany(
  { role: 'user' },
  { $set: { tier: 'free' } }
);

// Upsert — insert if not found
await users.updateOne(
  { email: 'ada@example.com' },
  { $setOnInsert: { createdAt: new Date() }, $set: { name: 'Ada' } },
  { upsert: true }
);

// Common update operators
// $set      — set field value
// $unset    — remove field
// $inc      — increment numeric field
// $push     — append to array
// $pull     — remove from array by value
// $addToSet — append to array only if unique
```

### Delete

```ts
// Delete one
const result = await users.deleteOne({ email: 'ada@example.com' });
console.log(result.deletedCount); // 0 or 1

// Delete many
await users.deleteMany({ role: 'user', createdAt: { $lt: cutoffDate } });
```

### Query Operators

```ts
// Comparison
{ age: { $gt: 18, $lte: 65 } }
{ status: { $in: ['active', 'pending'] } }
{ status: { $nin: ['banned'] } }
{ email: { $ne: null } }

// Logical
{ $and: [{ role: 'admin' }, { active: true }] }
{ $or: [{ role: 'admin' }, { role: 'superuser' }] }
{ $not: { role: 'banned' } }

// Element
{ phone: { $exists: true } }
{ age: { $type: 'number' } }

// Array
{ tags: 'mongodb' }             // contains 'mongodb'
{ tags: { $all: ['a', 'b'] } } // contains both
{ tags: { $size: 3 } }         // exactly 3 elements

// Text search (requires text index)
{ $text: { $search: 'mongodb atlas' } }

// Regex
{ name: { $regex: /^ada/i } }
```

---

## 5. Aggregation Pipeline

The aggregation pipeline processes documents through a sequence of stages. Each stage transforms the data.

### Common Stages

```ts
const pipeline = [
  // $match — filter (put early to use indexes)
  { $match: { role: 'user', active: true } },

  // $project — reshape document
  { $project: { name: 1, email: 1, _id: 0 } },

  // $sort
  { $sort: { createdAt: -1 } },

  // $skip + $limit — pagination
  { $skip: 0 },
  { $limit: 20 },

  // $group — aggregate
  {
    $group: {
      _id: '$role',
      count: { $sum: 1 },
      avgAge: { $avg: '$age' },
      names: { $push: '$name' },
    },
  },

  // $unwind — flatten array field
  { $unwind: '$tags' },

  // $addFields — add computed fields
  {
    $addFields: {
      fullName: { $concat: ['$firstName', ' ', '$lastName'] },
    },
  },

  // $count
  { $count: 'total' },
];

const results = await db.collection('users').aggregate(pipeline).toArray();
```

### $lookup (Join)

```ts
// Join orders → users
{
  $lookup: {
    from: 'users',
    localField: 'userId',
    foreignField: '_id',
    as: 'user',
  },
},
{ $unwind: '$user' },  // flatten array result

// Pipeline-style lookup (MongoDB 5+, more powerful)
{
  $lookup: {
    from: 'users',
    let: { userId: '$userId' },
    pipeline: [
      { $match: { $expr: { $eq: ['$_id', '$$userId'] } } },
      { $project: { name: 1, email: 1 } },
    ],
    as: 'user',
  },
},
```

> In MongoDB 8.0+, `$lookup` on sharded collections is supported within transactions.

### $facet (Multi-dimensional Aggregation)

```ts
// Paginated results + total count in one pass
{
  $facet: {
    data: [{ $sort: { createdAt: -1 } }, { $skip: 0 }, { $limit: 20 }],
    total: [{ $count: 'count' }],
  },
},
```

> MongoDB 8.0 delivers 200%+ faster aggregation on time-series collections. Use `db.createCollection('metrics', { timeseries: { timeField: 'timestamp', metaField: 'sensorId', granularity: 'minutes' } })`.

---

## 6. Indexing

Indexes are the single biggest performance lever in MongoDB. Every production query should hit an index.

### Index Types

```ts
// Single field
await col.createIndex({ email: 1 });         // ascending
await col.createIndex({ createdAt: -1 });    // descending (for sort)

// Compound — order matters: equality fields first, then sort, then range
await col.createIndex({ role: 1, createdAt: -1 });

// Unique
await col.createIndex({ email: 1 }, { unique: true });

// Sparse — only index documents where field exists
await col.createIndex({ phone: 1 }, { sparse: true });

// TTL — automatically delete documents after N seconds
await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Or: delete 24 hours after createdAt
await col.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 });

// Text — for full-text search
await col.createIndex({ name: 'text', bio: 'text' });

// Wildcard — index all fields in a subdocument
await col.createIndex({ 'metadata.$**': 1 });
```

### Compound Index Rule (ESR)

Order compound index fields as: **Equality → Sort → Range**

```ts
// Query: role = 'user' AND createdAt > lastWeek, sorted by createdAt
// Correct index order: equality (role) → sort+range (createdAt)
await col.createIndex({ role: 1, createdAt: -1 });
```

### Explain Plans

```ts
// Check if query uses an index
const explanation = await col.find({ email: 'ada@example.com' }).explain('executionStats');
console.log(explanation.queryPlanner.winningPlan);

// Look for:
// COLLSCAN  — bad, no index used
// IXSCAN    — good, index used
// nReturned vs totalDocsExamined — should be close
```

### Index Management

```ts
await col.listIndexes().toArray();       // list indexes
await col.dropIndex('email_1');          // drop by name
```

---

## 7. Mongoose ODM

### Schema + Model with TypeScript

```ts
import mongoose, { Schema, model, Document, Types } from 'mongoose';

// Define the interface
interface IUser {
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Date;
}

// Schema
const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
  },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
});

// Model — use singleton pattern to avoid "Cannot overwrite model" error in dev
const User = mongoose.models.User || model<IUser>('User', userSchema);
export default User;
```

### Virtuals

```ts
userSchema.virtual('displayName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Enable virtuals in JSON output
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });
```

### Middleware (Hooks)

```ts
// Pre-save — hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

```

### Populate (References)

```ts
const postSchema = new Schema({
  title: String,
  author: { type: Types.ObjectId, ref: 'User' },  // reference
});

const Post = model('Post', postSchema);

// Populate reference
const post = await Post.findById(id).populate('author', 'name email');

```

### Query Helpers

```ts
// Lean queries — return plain JS objects (faster, no Mongoose overhead)
const users = await User.find({ role: 'admin' }).lean();

// Select fields
const user = await User.findById(id).select('name email -_id');

// Pagination
const page = await User.find()
  .sort({ createdAt: -1 })
  .skip(page * limit)
  .limit(limit)
  .lean();
```

---

## 8. Serverless Considerations

### Connection Pooling Problem

Standard Node.js apps keep a persistent connection. Serverless functions (Vercel, Lambda, Cloudflare Workers) spawn/kill instances constantly — naively calling `new MongoClient()` per request creates thousands of connections and hammers Atlas.

**The fix: cache the client at module scope.**

```ts
// lib/db.ts — cached client (Next.js / Vercel pattern)
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI!;

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // Use a global var to survive HMR in dev
  let g = global as typeof globalThis & { _mongoClientPromise?: Promise<MongoClient> };
  if (!g._mongoClientPromise) {
    client = new MongoClient(uri);
    g._mongoClientPromise = client.connect();
  }
  clientPromise = g._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;
```

```ts
// In API route
import clientPromise from '@/lib/db';

export async function GET() {
  const client = await clientPromise;
  const db = client.db('mydb');
  const users = await db.collection('users').find().toArray();
  return Response.json(users);
}
```

### maxPoolSize

For serverless, reduce the connection pool — each function instance needs fewer connections:

```ts
const client = new MongoClient(uri, {
  maxPoolSize: 10,  // default is 100 — too high for serverless
});
```

### Cold Starts

First invocation of a function is slower (cold start). The `MongoClient.connect()` call adds ~200–500ms. Mitigations:
- Use Atlas connection string with `appName` parameter for connection labeling
- Keep functions warm via scheduled pings in critical paths
- Atlas Flex tier auto-scales — no connection limit config needed

### Atlas Flex vs Dedicated for Serverless

- **Flex** — best for low/variable traffic apps; auto-scales, capped cost at $30/mo
- **Dedicated M10+** — needed when you need consistent high-throughput or advanced features (VPC peering, dedicated encryption)

---

## 9. Security

### Authentication

```ts
// Connection string auth — always use env vars
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster.mongodb.net/mydb`;

// Never hardcode credentials
const uri = 'mongodb+srv://admin:password@...'; // DO NOT DO THIS
```

### Least Privilege Users

Create a dedicated database user with only the permissions your app needs:

```js
// In Atlas UI: Security → Database Access → Add User
// Grant: readWrite on specific database only
// Never use Atlas Admin for application users
```

### Prevent NoSQL Injection

MongoDB is not SQL — there's no SQL injection. But operator injection is possible:

```ts
// Vulnerable — user can pass { $gt: '' } as email
const user = await col.findOne({ email: req.body.email });

// Safe — validate and sanitize input
import { z } from 'zod';
const { email } = z.object({ email: z.string().email() }).parse(req.body);
const user = await col.findOne({ email });
```

### Encryption at Rest

Atlas encrypts data at rest by default on all tiers using AES-256. For Dedicated tiers, you can bring your own key (BYOK) via AWS KMS, Azure Key Vault, or GCP KMS.

### Queryable Encryption (MongoDB 8.0+)

MongoDB 8.0 adds range query support on encrypted fields (previously only equality):

```ts
// Supports $lt, $gt, $lte, $gte on encrypted fields
const result = await col.findOne({
  salary: { $gt: 50000, $lt: 100000 }  // even when field is encrypted
});
```

### TLS

All Atlas connections use TLS by default. For self-hosted:

```ts
const client = new MongoClient(uri, {
  tls: true,
  tlsCAFile: '/path/to/ca.pem',
  tlsCertificateKeyFile: '/path/to/client.pem',
});
```

Note: The old `ssl`/`sslCert` options are **removed** in driver v6+. Use `tls`/`tlsCertificateKeyFile`.

---

## 10. Pricing & Limits

### Atlas Tiers (as of February 2026)

| Tier | Monthly Cost | Storage | Ops/sec | RAM | Notes |
|------|-------------|---------|---------|-----|-------|
| Free (M0) | $0 | 512 MB | shared | shared | No credit card; max 500 connections |
| Flex | $8–$30 | 5 GB base | 100–500 | auto | Replaces M2/M5/Serverless; usage-based |
| M10 | ~$57 | 10 GB | - | 2 GB | Entry dedicated; full feature set |
| M20 | ~$114 | 20 GB | - | 4 GB | |
| M30 | ~$228 | 40 GB | - | 8 GB | |
| M40+ | custom | custom | custom | custom | Auto-scaling available |

### Flex Tier Details

- Base fee: **$8/month** (includes 5 GB storage, 100 ops/sec)
- Usage cap: **$30/month** maximum
- Scales automatically up to 500 ops/sec
- No connection limit configuration required
- Replaces deprecated: Serverless, M2 ($9/mo), M5 ($25/mo)

**Migration complete:** All Serverless instances migrated to Flex by March 2025. All M2/M5 clusters migrated by May 2025. Old API endpoints removed January 2026.

### Free Tier Limits (M0)

- Storage: 512 MB
- Max connections: 500
- No dedicated RAM
- No VPC peering
- No backups
- No analytics nodes
- Restricted to 1 M0 per project

---

## 11. Common Mistakes

| Mistake | Why it's wrong | Fix |
|---------|---------------|-----|
| `new MongoClient()` per request in serverless | Exhausts connection pool; Atlas kills connections | Cache client at module scope |
| Comparing ObjectId as string | `'64abc...' === ObjectId('64abc...')` is always false | `new ObjectId(idString)` before querying |
| No indexes on query fields | Full collection scan on every query | Run `explain()` — add index for COLLSCAN queries |
| Storing images/files in documents | Hits 16 MB doc limit fast | Use GridFS or S3 + store URL in document |
| Using `count()` | Removed in driver v6+, Mongoose v8+ | Use `countDocuments()` or `estimatedDocumentCount()` |
| Using `findOneAndRemove()` | Removed in driver v6+, Mongoose v8+ | Use `findOneAndDelete()` |
| `ssl` connection option | Removed in driver v6+ | Use `tls: true` |
| Unindexed text search with regex | Slow; no index benefit | Create text index + use `$text: { $search: '...' }` |
| Embedding unbounded arrays | Hits 16 MB document limit | Reference once array > ~100 items |
| $lookup on non-indexed foreign field | Slow join | Index `foreignField` on the joined collection |
| Mongoose: `model()` called multiple times in dev | "Cannot overwrite model" error | Use `mongoose.models.ModelName \|\| model(...)` |
| Querying without `lean()` in read-heavy paths | Mongoose hydrates documents — significant overhead | `.lean()` for read-only queries |
| ObjectId constructor with 12-char string | Removed in driver v6 | Use 24-char hex string or `Buffer` |
| Storing full documents in sessions | Session cookie limits; slow reads | Store only IDs; fetch documents when needed |

### Error Codes

| Code | Meaning | Fix |
|------|---------|-----|
| 11000 | Duplicate key violation | Field value already exists; check unique indexes |
| 121 | Document validation failure | Document doesn't match schema validation rules |
| 112 | Write conflict | Concurrent write on same document; retry with backoff |
| 251 | Transaction not found | Transaction expired or session invalid; retry transaction |
| 13 | Unauthorized | DB user lacks permission for this operation |
| 26 | Namespace not found | Collection doesn't exist; check collection name |
| MongoNetworkError | Connection failed | Check URI, IP allowlist, TLS config |
| MongoServerSelectionError | No server available | Cluster paused (free tier auto-pauses after 60 days of inactivity) |
