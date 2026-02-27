---
model: claude-sonnet-4-6
name: postgresql-pgvector
description: Use when adding vector similarity search to a PostgreSQL database — storing embeddings, querying nearest neighbors, hybrid text+vector search, or indexing with IVFFlat or HNSW. Also use when building RAG systems, semantic search, or recommendation engines on top of Postgres.
---

# PostgreSQL + pgvector

Open-source extension that turns Postgres into a vector database. Stores embeddings as native `vector` columns alongside relational data — no separate vector DB required.

Requires: PostgreSQL 12+ · pgvector 0.7+

## Installation

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify
SELECT extversion FROM pg_extension WHERE extname = 'vector';
```

```bash
# Local (Homebrew)
brew install pgvector

# Docker
docker run -e POSTGRES_PASSWORD=postgres ankane/pgvector

# Cloud: Available on Supabase, Neon, RDS, AlloyDB out of the box
```

## Vector Column

```sql
-- Create table with vector column (dimension must match your embedding model)
CREATE TABLE documents (
  id          BIGSERIAL PRIMARY KEY,
  content     TEXT NOT NULL,
  embedding   vector(1536),        -- OpenAI text-embedding-3-small
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Add to existing table
ALTER TABLE documents ADD COLUMN embedding vector(1536);

-- Common dimensions by model
-- text-embedding-3-small:    1536
-- text-embedding-3-large:    3072 (or reduced via dimensions param)
-- text-embedding-ada-002:    1536
-- Gemini text-embedding-004: 768
-- nomic-embed-text:          768
```

## Distance Operators

| Operator | Distance Function | Best For |
|----------|------------------|----------|
| `<->` | L2 / Euclidean | General purpose; default choice |
| `<=>` | Cosine distance | Text embeddings; scale-invariant |
| `<#>` | Negative inner product | Normalized vectors (dot product) |
| `<+>` | L1 / Manhattan | Sparse vectors |

```sql
-- Find 10 most similar documents using cosine distance
SELECT id, content, embedding <=> '[0.1, 0.2, ...]'::vector AS distance
FROM documents
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 10;

-- With metadata filter (pre-filter before ANN — much faster with index)
SELECT id, content
FROM documents
WHERE metadata->>'language' = 'en'
ORDER BY embedding <=> $1::vector
LIMIT 10;

-- Convert cosine distance to similarity score (0–1)
SELECT id, content, 1 - (embedding <=> $1::vector) AS similarity
FROM documents
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

## Indexing

Without an index, pgvector does exact nearest-neighbor search (full scan). Add an index for approximate nearest-neighbor (ANN) at scale.

### HNSW (Recommended)

Graph-based. Better query performance and recall. Slower to build, uses more memory. **No need to pre-load data.**

```sql
-- Cosine distance (most common for text embeddings)
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);

-- L2 distance
CREATE INDEX ON documents USING hnsw (embedding vector_l2_ops);

-- Inner product
CREATE INDEX ON documents USING hnsw (embedding vector_ip_ops);

-- Tuned HNSW (higher m and ef_construction = better recall, slower build)
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
-- m: max connections per node (default 16, range 2–100)
-- ef_construction: build-time search width (default 64, range 4–1000)
```

```sql
-- Set query-time search width (higher = better recall, slower)
SET hnsw.ef_search = 100; -- default 40
```

### IVFFlat

Partitioned inverted lists. Faster build, smaller index, lower memory. **Must have data before creating index.**

```sql
-- Create with appropriate list count
-- Rule of thumb: lists ≈ rows / 1000 (min 1, max ~4096)
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

```sql
-- Set probe count (higher = better recall, slower)
SET ivfflat.probes = 10; -- default 1
```

### HNSW vs IVFFlat

| Factor | HNSW | IVFFlat |
|--------|------|---------|
| Query speed | Faster | Slower |
| Recall accuracy | Higher | Lower |
| Build time | Slower (no training) | Faster |
| Memory usage | Higher | Lower |
| Requires pre-loaded data | No | Yes |
| Best for | Production, low-latency | Batch workflows, infrequent builds |

**Recommendation:** HNSW for production. IVFFlat for periodic batch indexing of large static datasets.

## Hybrid Search (Vector + Full-Text)

Combines semantic vector search with lexical BM25-style keyword search using Reciprocal Rank Fusion (RRF).

```sql
-- Add full-text search column
ALTER TABLE documents ADD COLUMN fts TSVECTOR
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX ON documents USING GIN (fts);
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);

-- Hybrid search with RRF fusion
WITH semantic AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> $1::vector) AS rank
  FROM documents
  LIMIT 60
),
fulltext AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY ts_rank_cd(fts, query) DESC) AS rank
  FROM documents, to_tsquery('english', $2) query
  WHERE fts @@ query
  LIMIT 60
)
SELECT
  d.id,
  d.content,
  COALESCE(1.0 / (60 + s.rank), 0) + COALESCE(1.0 / (60 + f.rank), 0) AS rrf_score
FROM documents d
FULL OUTER JOIN semantic s USING (id)
FULL OUTER JOIN fulltext f USING (id)
WHERE s.id IS NOT NULL OR f.id IS NOT NULL
ORDER BY rrf_score DESC
LIMIT 10;
```

RRF formula: `1 / (k + rank)` where `k = 60`. Scale-independent — works regardless of distance metric range.

## Storing Embeddings (Node.js)

```typescript
import { Pool } from "pg";
import OpenAI from "openai";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const openai = new OpenAI();

async function upsertDocument(content: string, metadata: object) {
  // Generate embedding
  const { data } = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: content,
  });
  const embedding = data[0].embedding;

  // Store as Postgres array literal
  const vectorLiteral = `[${embedding.join(",")}]`;

  await pool.query(
    `INSERT INTO documents (content, embedding, metadata)
     VALUES ($1, $2::vector, $3)
     ON CONFLICT (id) DO UPDATE
     SET embedding = EXCLUDED.embedding`,
    [content, vectorLiteral, JSON.stringify(metadata)]
  );
}

async function similaritySearch(query: string, limit = 10) {
  const { data } = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });
  const vector = `[${data[0].embedding.join(",")}]`;

  const { rows } = await pool.query(
    `SELECT id, content, 1 - (embedding <=> $1::vector) AS similarity
     FROM documents
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [vector, limit]
  );

  return rows;
}
```

## Drizzle ORM Integration

```typescript
import { pgTable, bigserial, text, jsonb, customType } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Define vector type
const vector = (dimensions: number) =>
  customType<{ data: number[]; driverData: string }>({
    dataType() { return `vector(${dimensions})`; },
    toDriver(value) { return `[${value.join(",")}]`; },
    fromDriver(value) {
      return (value as string).slice(1, -1).split(",").map(Number);
    },
  });

export const documents = pgTable("documents", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  content: text("content").notNull(),
  embedding: vector(1536)("embedding"),
  metadata: jsonb("metadata").default({}),
});

// Similarity search query
const results = await db
  .select({
    id: documents.id,
    content: documents.content,
    similarity: sql<number>`1 - (embedding <=> ${vectorLiteral}::vector)`,
  })
  .from(documents)
  .orderBy(sql`embedding <=> ${vectorLiteral}::vector`)
  .limit(10);
```

## Prisma Integration

```typescript
// schema.prisma — vector is unsupported type
model Document {
  id        BigInt   @id @default(autoincrement())
  content   String
  embedding Unsupported("vector(1536)")?
  metadata  Json     @default("{}")
}
```

```typescript
// Use $queryRaw for vector operations — Prisma can't generate vector SQL
const results = await prisma.$queryRaw<Array<{ id: bigint; content: string; similarity: number }>>`
  SELECT id, content, 1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
  FROM documents
  ORDER BY embedding <=> ${vectorLiteral}::vector
  LIMIT 10
`;
```

## Index Tuning

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE indexname LIKE '%hnsw%' OR indexname LIKE '%ivfflat%';

-- Rebuild IVFFlat after major data changes
REINDEX INDEX CONCURRENTLY documents_embedding_idx;

-- Analyze table after bulk inserts
ANALYZE documents;

-- Check index size
SELECT pg_size_pretty(pg_relation_size('documents_embedding_idx'));
```

### Performance Tuning Checklist

| Setting | Recommendation |
|---------|---------------|
| `maintenance_work_mem` | `SET maintenance_work_mem = '1GB'` during index creation |
| `max_parallel_maintenance_workers` | `SET max_parallel_maintenance_workers = 4` for faster HNSW build |
| `hnsw.ef_search` | Start at 40, increase to 100–200 for higher recall |
| `ivfflat.probes` | `lists / 10` as starting point, benchmark from there |
| Chunk size for text | 256–512 tokens yields best retrieval quality for most models |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Dimension mismatch between model and column | Match exactly — `text-embedding-3-small` = 1536, not 1024 |
| Creating IVFFlat index on empty table | IVFFlat needs data for training — load data first, then index |
| No pre-filter on large tables | Add `WHERE` clause before ANN query to narrow candidate set |
| Using `<->` for text embeddings | Use `<=>` (cosine) — text embeddings are direction-dependent, not magnitude |
| `ORDER BY` without `LIMIT` | Full table scan even with index — always include `LIMIT` |
| Not setting `ef_search` in production | Default of 40 is low recall for large datasets — benchmark and tune |
| Storing raw JSON embedding strings | Use `::vector` cast — Postgres needs native type for index to activate |
| Indexing 3072-dim vectors without reduction | Use `dimensions` param in OpenAI SDK to reduce before storing |
| Missing `ANALYZE` after bulk load | Query planner won't use index without fresh statistics |

## Related Skills

- `supabase` — Managed Postgres with pgvector and vector search helpers built in
- `neon` — Serverless Postgres with pgvector support
- `drizzle` — Type-safe ORM with raw SQL escape hatch for vector queries
- `prisma` — ORM requiring `$queryRaw` for vector operations
- `anthropic-api` / `openai-api` / `google-genai` — Generate embeddings to store

---

Sources:
- [pgvector GitHub Repository](https://github.com/pgvector/pgvector)
- [Hybrid Search in PostgreSQL: The Missing Manual | ParadeDB](https://www.paradedb.com/blog/hybrid-search-in-postgresql-the-missing-manual)
- [pgvector: Key Features, Tutorial — Instaclustr 2026](https://www.instaclustr.com/education/vector-database/pgvector-key-features-tutorial-and-pros-and-cons-2026-guide/)
- [IVFFlat vs HNSW Deep Dive | AWS](https://aws.amazon.com/blogs/database/optimize-generative-ai-applications-with-pgvector-indexing-a-deep-dive-into-ivfflat-and-hnsw-techniques/)
- [Hybrid Search with pgvector | Jonathan Katz](https://jkatz05.com/post/postgres/hybrid-search-postgres-pgvector/)
