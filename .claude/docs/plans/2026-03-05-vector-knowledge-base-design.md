# Vector Knowledge Base for SpearlanceAI Chat

## Goal

Make the AI assistant "know everything" about each client account by vectorizing all client data and providing semantic search + auto-injected context snapshots.

## Architecture: Two-Layer Knowledge System

### Layer 1 — Client Snapshot (always in system prompt)

A compact summary auto-injected on every chat request via `buildClientSnapshot()`. No tool call needed — the AI just "knows" the basics:

- Business name, services, target avatars, brand voice
- Active quarterly goals
- Key metrics (this week's KPIs)
- Count summaries (open tasks, pending leads, upcoming meetings)

~200-400 tokens per request. Cheap to include always.

### Layer 2 — Vector RAG (semantic search for deep retrieval)

All client data embedded into a single polymorphic vector store. The AI calls `semantic_search` to find relevant knowledge for specific questions.

## Data Sources (Priority Order)

| Priority | Source Table | Chunk Strategy |
|----------|-------------|----------------|
| P0 | `meetings` | Per-meeting: summary + decisions + action items |
| P0 | `tasks` + `task_comments` | Per-task: title + description + rolled-up comments |
| P0 | `quarterly_goals` | Per-goal |
| P1 | `website_form_submissions` (leads) | Per-submission |
| P1 | `reports` | Per-report |
| P1 | `communication_logs` | Per-log entry |
| P2 | `social_media_posts` + `social_post_analytics` | Per-post with analytics |
| P2 | `blog_posts` | Per-post |
| P2 | `marketing_ideas` | Per-idea |

## Storage

New `client_knowledge_embeddings` table:

```sql
CREATE TABLE client_knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  content_text TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_table, source_id)
);

CREATE INDEX knowledge_embedding_idx
  ON client_knowledge_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX knowledge_client_idx
  ON client_knowledge_embeddings (client_id);
```

Polymorphic via `source_table` + `source_id`. Single table, simple queries.

## Similarity Search Function

```sql
CREATE FUNCTION match_knowledge(
  query_embedding text,
  match_client_id uuid,
  source_types text[] DEFAULT NULL,
  match_threshold double precision DEFAULT 0.2,
  match_count integer DEFAULT 10
) RETURNS TABLE (
  id uuid,
  source_table text,
  source_id uuid,
  content_text text,
  metadata jsonb,
  similarity double precision
)
```

Filters by `client_id` and optionally by `source_table` types.

## Embedding Pipeline

- **Model:** OpenAI `text-embedding-3-small` (1536-dim) — already in use for assets
- **Edge function:** `embed-knowledge` — accepts source_table, source_id, content_text
- **Sync:** Supabase database webhooks on INSERT/UPDATE of source tables → calls `embed-knowledge`
- **Backfill:** One-time edge function that processes all existing data per client

## Client Snapshot Helper

`buildClientSnapshot(supabaseClient, clientId)` — fetches:

1. `clients` → name, industry
2. `services` → list of services offered
3. `avatars` → target customer personas
4. `quarterly_goals` → active goals
5. `tasks` → count by status + top 3 high priority
6. `meetings` → count this week + next upcoming
7. `website_form_submissions` → count recent + unprocessed
8. `client_brand_voice` → voice summary
9. `channel_weekly_kpis` → this week's top metrics

Returns a formatted string injected into system prompt before the mode-specific content.

## New Chat Tool

```
semantic_search(query: string, source_types?: string[], limit?: number)
→ Embeds query, calls match_knowledge, returns top-N chunks with source links
```

Added to `tools/registry.ts` as a QUERY_TOOL available in all modes.

## Existing Infrastructure

- pgvector enabled (vector extension in `extensions` schema)
- `text-embedding-3-small` already used in `analyze-asset` and `recommend-assets` functions
- `match_assets` RPC exists for asset similarity — `match_knowledge` follows same pattern
- 48 client-scoped tables identified

## Cost

~$0.002 per 1000 embeddings. A client with 500 data rows costs ~$0.001 to backfill. Incremental updates are individual API calls (~$0.00001 each). Negligible.

## Components Summary

| Component | Type |
|-----------|------|
| `client_knowledge_embeddings` table + indexes | Migration |
| `match_knowledge` SQL function | Migration |
| `embed-knowledge` edge function | Supabase function |
| Database webhooks (9 source tables) | Supabase config |
| `backfill-knowledge` edge function | Supabase function |
| `buildClientSnapshot()` helper | Module in chat-assistant |
| `semantic_search` tool definition | Tool registry |
| `semantic_search` executor | Tool executor |
| System prompt integration | Prompt builder update |
