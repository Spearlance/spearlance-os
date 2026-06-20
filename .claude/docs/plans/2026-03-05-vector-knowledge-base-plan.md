# Vector Knowledge Base Implementation Plan


**Goal:** Make SpearlanceAI know everything about each client by vectorizing all client data and providing semantic search + auto-injected context snapshots.

**Architecture:** Two-layer system — (1) a client snapshot injected into every system prompt for instant awareness, (2) a pgvector-backed RAG pipeline with `semantic_search` tool for deep retrieval. Database webhooks keep embeddings in sync on INSERT/UPDATE.

**Tech Stack:** Supabase pgvector (1536-dim), OpenAI `text-embedding-3-small`, Supabase Edge Functions (Deno), database webhooks via `pg_net`.

---

### Task 1: Create migration — embeddings table + match function

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_add_knowledge_embeddings.sql`

**Context:** The project already has pgvector enabled (extension in `extensions` schema), `vector(1536)` on `assets` table, and `match_assets` RPC. We follow the exact same pattern.

**Step 1: Write the migration SQL**

```sql
-- Create the polymorphic knowledge embeddings table
CREATE TABLE IF NOT EXISTS public.client_knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  content_text TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_table, source_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS knowledge_embedding_idx
  ON client_knowledge_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS knowledge_client_idx
  ON client_knowledge_embeddings (client_id);

CREATE INDEX IF NOT EXISTS knowledge_source_idx
  ON client_knowledge_embeddings (source_table, source_id);

-- Enable RLS
ALTER TABLE client_knowledge_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view embeddings for clients they have access to"
  ON client_knowledge_embeddings FOR SELECT
  USING (
    client_id IN (
      SELECT c.id FROM clients c
      JOIN user_roles ur ON ur.user_id = auth.uid()
      WHERE ur.role IN ('admin', 'fmm')
      UNION
      SELECT c.id FROM clients c WHERE c.id = client_id
    )
  );

-- Service role can insert/update (edge functions use service role)
CREATE POLICY "Service role can manage embeddings"
  ON client_knowledge_embeddings FOR ALL
  USING (auth.role() = 'service_role');

-- Similarity search function (follows match_assets pattern)
CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding text,
  match_client_id uuid,
  source_types text[] DEFAULT NULL,
  match_threshold double precision DEFAULT 0.2,
  match_count integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  source_table text,
  source_id uuid,
  content_text text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cke.id,
    cke.source_table,
    cke.source_id,
    cke.content_text,
    cke.metadata,
    1 - (cke.embedding <=> query_embedding::vector) AS similarity
  FROM client_knowledge_embeddings cke
  WHERE
    cke.client_id = match_client_id
    AND cke.embedding IS NOT NULL
    AND 1 - (cke.embedding <=> query_embedding::vector) >= match_threshold
    AND (source_types IS NULL OR cke.source_table = ANY(source_types))
  ORDER BY cke.embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$$;
```

**Step 2: Apply the migration**

Run: `npx supabase db push`
Expected: Migration applies successfully, table + function created.

**Step 3: Verify via Supabase dashboard**

Run: `npx supabase db reset --linked` is NOT needed — `db push` applies migrations incrementally.
Verify: Table `client_knowledge_embeddings` exists, `match_knowledge` function exists.

**Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(knowledge): add embeddings table and match_knowledge RPC"
```

---

### Task 2: Create shared embedding helper

**Files:**
- Create: `supabase/functions/_shared/embeddings.ts`

**Context:** The project uses `OPENAI_API_KEY` env var (already set in Supabase). The existing pattern in `analyze-asset/index.ts` (lines 107-130) calls `https://api.openai.com/v1/embeddings` with model `text-embedding-3-small`. We extract this into a reusable helper.

**Step 1: Write the helper**

```typescript
// supabase/functions/_shared/embeddings.ts

const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * Generate a 1536-dim embedding vector for the given text.
 * Uses OpenAI text-embedding-3-small (same model as asset embeddings).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  // Truncate to ~8000 tokens (~32000 chars) to stay within model limits
  const truncated = text.slice(0, 32000);

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: truncated,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Embedding API error:', response.status, errorText);
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  const embedding = data.data[0]?.embedding;

  if (!embedding || !Array.isArray(embedding)) {
    throw new Error('No embedding generated');
  }

  return embedding;
}

/**
 * Build embeddable text from a source row.
 * Each source_table has its own text composition strategy.
 */
export function buildContentText(sourceTable: string, row: any): string {
  switch (sourceTable) {
    case 'meetings':
      return [
        `Meeting: ${row.summary || 'Untitled'}`,
        row.date_time ? `Date: ${new Date(row.date_time).toLocaleDateString()}` : '',
        row.attendees ? `Attendees: ${row.attendees}` : '',
        row.decisions?.length ? `Decisions: ${row.decisions.join('; ')}` : '',
        row.next_steps?.length ? `Next Steps: ${row.next_steps.join('; ')}` : '',
        row.transcript_text ? `Transcript: ${row.transcript_text.slice(0, 5000)}` : '',
      ].filter(Boolean).join('\n');

    case 'tasks':
      return [
        `Task: ${row.title}`,
        row.description ? `Description: ${row.description}` : '',
        row.status ? `Status: ${row.status}` : '',
        row.priority ? `Priority: ${row.priority}` : '',
        row.due_date ? `Due: ${row.due_date}` : '',
        row.comments ? `Comments: ${row.comments.map((c: any) => c.content).join(' | ')}` : '',
      ].filter(Boolean).join('\n');

    case 'quarterly_goals':
      return [
        `Goal: ${row.title || row.goal}`,
        row.description ? `Description: ${row.description}` : '',
        row.target_metric ? `Target: ${row.target_metric}` : '',
        row.status ? `Status: ${row.status}` : '',
      ].filter(Boolean).join('\n');

    case 'website_form_submissions':
      return [
        `Lead/Submission from: ${row.form_name || 'Website Form'}`,
        row.submitter_name ? `Name: ${row.submitter_name}` : '',
        row.submitter_email ? `Email: ${row.submitter_email}` : '',
        row.form_data ? `Details: ${JSON.stringify(row.form_data).slice(0, 2000)}` : '',
        row.created_at ? `Date: ${new Date(row.created_at).toLocaleDateString()}` : '',
      ].filter(Boolean).join('\n');

    case 'reports':
      return [
        `Report: ${row.title}`,
        row.type ? `Type: ${row.type}` : '',
        row.content ? `Content: ${typeof row.content === 'string' ? row.content.slice(0, 5000) : JSON.stringify(row.content).slice(0, 5000)}` : '',
        row.created_at ? `Date: ${new Date(row.created_at).toLocaleDateString()}` : '',
      ].filter(Boolean).join('\n');

    case 'communication_logs':
      return [
        `Communication: ${row.subject || row.type || 'Log entry'}`,
        row.direction ? `Direction: ${row.direction}` : '',
        row.content ? `Content: ${row.content.slice(0, 3000)}` : '',
        row.created_at ? `Date: ${new Date(row.created_at).toLocaleDateString()}` : '',
      ].filter(Boolean).join('\n');

    case 'social_media_posts':
      return [
        `Social Post: ${row.platform || 'Unknown platform'}`,
        row.content ? `Content: ${row.content.slice(0, 2000)}` : '',
        row.status ? `Status: ${row.status}` : '',
        row.published_at ? `Published: ${new Date(row.published_at).toLocaleDateString()}` : '',
        row.analytics ? `Performance: ${JSON.stringify(row.analytics).slice(0, 500)}` : '',
      ].filter(Boolean).join('\n');

    case 'blog_posts':
      return [
        `Blog: ${row.title}`,
        row.content ? `Content: ${row.content.slice(0, 5000)}` : '',
        row.status ? `Status: ${row.status}` : '',
        row.published_at ? `Published: ${new Date(row.published_at).toLocaleDateString()}` : '',
      ].filter(Boolean).join('\n');

    case 'marketing_ideas':
      return [
        `Marketing Idea: ${row.title || row.idea}`,
        row.description ? `Description: ${row.description}` : '',
        row.category ? `Category: ${row.category}` : '',
        row.status ? `Status: ${row.status}` : '',
      ].filter(Boolean).join('\n');

    default:
      return JSON.stringify(row).slice(0, 5000);
  }
}
```

**Step 2: Commit**

```bash
git add supabase/functions/_shared/embeddings.ts
git commit -m "feat(knowledge): add shared embedding helper with content builders"
```

---

### Task 3: Create `embed-knowledge` edge function

**Files:**
- Create: `supabase/functions/embed-knowledge/index.ts`

**Context:** This function is called by database webhooks on INSERT/UPDATE. It receives the webhook payload (table name, record), builds content text, generates the embedding, and upserts into `client_knowledge_embeddings`. It uses `SUPABASE_SERVICE_ROLE_KEY` (not user auth) because it's called by the webhook system.

**Step 1: Write the edge function**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { generateEmbedding, buildContentText } from '../_shared/embeddings.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tables we embed + the columns needed for content building
const EMBEDDABLE_TABLES: Record<string, string[]> = {
  meetings: ['id', 'client_id', 'summary', 'date_time', 'attendees', 'decisions', 'next_steps', 'transcript_text'],
  tasks: ['id', 'client_id', 'title', 'description', 'status', 'priority', 'due_date'],
  quarterly_goals: ['id', 'client_id', 'title', 'goal', 'description', 'target_metric', 'status'],
  website_form_submissions: ['id', 'client_id', 'form_name', 'submitter_name', 'submitter_email', 'form_data', 'created_at'],
  reports: ['id', 'client_id', 'title', 'type', 'content', 'created_at'],
  communication_logs: ['id', 'client_id', 'subject', 'type', 'direction', 'content', 'created_at'],
  social_media_posts: ['id', 'client_id', 'platform', 'content', 'status', 'published_at'],
  blog_posts: ['id', 'client_id', 'title', 'content', 'status', 'published_at'],
  marketing_ideas: ['id', 'client_id', 'title', 'idea', 'description', 'category', 'status'],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { type, table, record, old_record } = payload;

    console.log(`[embed-knowledge] ${type} on ${table}, id: ${record?.id}`);

    // Validate this is a table we embed
    if (!EMBEDDABLE_TABLES[table]) {
      return new Response(JSON.stringify({ skipped: true, reason: `Table ${table} not embeddable` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE → remove the embedding
    if (type === 'DELETE') {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );

      await supabase
        .from('client_knowledge_embeddings')
        .delete()
        .eq('source_table', table)
        .eq('source_id', old_record?.id || record?.id);

      return new Response(JSON.stringify({ deleted: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // INSERT or UPDATE → build text, embed, upsert
    if (!record?.client_id) {
      return new Response(JSON.stringify({ skipped: true, reason: 'No client_id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For tasks, fetch comments to enrich the content
    let enrichedRecord = { ...record };
    if (table === 'tasks') {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data: comments } = await supabase
        .from('task_comments')
        .select('content')
        .eq('task_id', record.id)
        .order('created_at', { ascending: true })
        .limit(20);
      enrichedRecord.comments = comments || [];
    }

    const contentText = buildContentText(table, enrichedRecord);

    if (!contentText || contentText.length < 10) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Content too short' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate embedding
    const embedding = await generateEmbedding(contentText);

    // Upsert into knowledge embeddings table
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error } = await supabase
      .from('client_knowledge_embeddings')
      .upsert({
        client_id: record.client_id,
        source_table: table,
        source_id: record.id,
        content_text: contentText,
        embedding: embedding,
        metadata: {
          title: record.title || record.summary || record.subject || null,
          date: record.date_time || record.created_at || record.published_at || null,
        },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'source_table,source_id',
      });

    if (error) {
      console.error('[embed-knowledge] Upsert error:', error);
      throw error;
    }

    console.log(`[embed-knowledge] ✓ Embedded ${table}/${record.id} (${contentText.length} chars)`);

    return new Response(JSON.stringify({ embedded: true, chars: contentText.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[embed-knowledge] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

**Step 2: Deploy the function**

Run: `npx supabase functions deploy embed-knowledge --no-verify-jwt`
Expected: Deploys successfully.

**Step 3: Commit**

```bash
git add supabase/functions/embed-knowledge/
git commit -m "feat(knowledge): add embed-knowledge edge function"
```

---

### Task 4: Configure database webhooks

**Context:** Supabase database webhooks are configured via the Dashboard (not migrations). They use `pg_net` to call the edge function URL asynchronously on table events. We need 9 webhooks — one per embeddable table.

**Step 1: Create the webhooks via Supabase Dashboard**

For each of these tables, create a webhook:
- **meetings** → INSERT, UPDATE
- **tasks** → INSERT, UPDATE
- **quarterly_goals** → INSERT, UPDATE
- **website_form_submissions** → INSERT, UPDATE
- **reports** → INSERT, UPDATE
- **communication_logs** → INSERT, UPDATE
- **social_media_posts** → INSERT, UPDATE
- **blog_posts** → INSERT, UPDATE
- **marketing_ideas** → INSERT, UPDATE

Webhook configuration for each:
- **Name:** `embed_{table_name}`
- **Table:** `{table_name}`
- **Events:** INSERT, UPDATE
- **Type:** Supabase Edge Function
- **Edge Function:** `embed-knowledge`
- **HTTP Headers:** `Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}`

**Alternative:** Create via SQL migration using `pg_net`:

```sql
-- This can be done as a migration if preferred over Dashboard config
-- Each webhook calls the embed-knowledge function via pg_net

-- Example for meetings table:
CREATE OR REPLACE FUNCTION notify_embed_knowledge_meetings()
RETURNS trigger AS $$
BEGIN
  PERFORM net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/embed-knowledge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', to_jsonb(NEW),
      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Recommendation:** Use the Dashboard approach for simplicity. Document the webhook names in a comment in the migration file.

**Step 2: Verify by inserting a test row**

Create a test task or update an existing meeting, then check:
1. Supabase Edge Function logs show `embed-knowledge` was called
2. `client_knowledge_embeddings` table has a new row

**Step 3: Commit documentation**

```bash
git commit -m "docs(knowledge): document webhook configuration for embed pipeline"
```

---

### Task 5: Create backfill edge function

**Files:**
- Create: `supabase/functions/backfill-knowledge/index.ts`

**Context:** One-time (or re-runnable) function that processes all existing rows for a given client. Called manually or via admin API. Processes in batches to avoid timeout.

**Step 1: Write the backfill function**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { generateEmbedding, buildContentText } from '../_shared/embeddings.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TABLES_TO_BACKFILL = [
  { table: 'meetings', select: 'id, client_id, summary, date_time, attendees, decisions, next_steps, transcript_text' },
  { table: 'tasks', select: 'id, client_id, title, description, status, priority, due_date' },
  { table: 'quarterly_goals', select: 'id, client_id, title, goal, description, target_metric, status' },
  { table: 'website_form_submissions', select: 'id, client_id, form_name, submitter_name, submitter_email, form_data, created_at' },
  { table: 'reports', select: 'id, client_id, title, type, content, created_at' },
  { table: 'communication_logs', select: 'id, client_id, subject, type, direction, content, created_at' },
  { table: 'social_media_posts', select: 'id, client_id, platform, content, status, published_at' },
  { table: 'blog_posts', select: 'id, client_id, title, content, status, published_at' },
  { table: 'marketing_ideas', select: 'id, client_id, title, idea, description, category, status' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_id, tables } = await req.json();

    if (!client_id) {
      return new Response(JSON.stringify({ error: 'client_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const tablesToProcess = tables
      ? TABLES_TO_BACKFILL.filter(t => tables.includes(t.table))
      : TABLES_TO_BACKFILL;

    const results: Record<string, { processed: number; errors: number }> = {};

    for (const { table, select } of tablesToProcess) {
      let processed = 0;
      let errors = 0;

      // Fetch all rows for this client
      const { data: rows, error: fetchError } = await supabase
        .from(table)
        .select(select)
        .eq('client_id', client_id)
        .order('created_at', { ascending: false })
        .limit(500);

      if (fetchError) {
        console.error(`[backfill] Error fetching ${table}:`, fetchError);
        results[table] = { processed: 0, errors: 1 };
        continue;
      }

      for (const row of rows || []) {
        try {
          // For tasks, fetch comments
          let enrichedRow = { ...row };
          if (table === 'tasks') {
            const { data: comments } = await supabase
              .from('task_comments')
              .select('content')
              .eq('task_id', row.id)
              .order('created_at', { ascending: true })
              .limit(20);
            enrichedRow.comments = comments || [];
          }

          const contentText = buildContentText(table, enrichedRow);
          if (!contentText || contentText.length < 10) {
            continue;
          }

          const embedding = await generateEmbedding(contentText);

          const { error: upsertError } = await supabase
            .from('client_knowledge_embeddings')
            .upsert({
              client_id,
              source_table: table,
              source_id: row.id,
              content_text: contentText,
              embedding,
              metadata: {
                title: row.title || row.summary || row.subject || null,
                date: row.date_time || row.created_at || row.published_at || null,
              },
              updated_at: new Date().toISOString(),
            }, { onConflict: 'source_table,source_id' });

          if (upsertError) {
            console.error(`[backfill] Upsert error for ${table}/${row.id}:`, upsertError);
            errors++;
          } else {
            processed++;
          }
        } catch (err: any) {
          console.error(`[backfill] Error processing ${table}/${row.id}:`, err.message);
          errors++;
        }
      }

      results[table] = { processed, errors };
      console.log(`[backfill] ${table}: ${processed} embedded, ${errors} errors`);
    }

    return new Response(JSON.stringify({ client_id, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[backfill] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

**Step 2: Deploy**

Run: `npx supabase functions deploy backfill-knowledge --no-verify-jwt`

**Step 3: Test with a real client**

Run backfill for one client via curl or Supabase dashboard:
```bash
curl -X POST "https://{SUPABASE_URL}/functions/v1/backfill-knowledge" \
  -H "Authorization: Bearer {SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"client_id": "{SOME_CLIENT_UUID}"}'
```

Expected: Returns JSON with counts per table. Check `client_knowledge_embeddings` has rows.

**Step 4: Commit**

```bash
git add supabase/functions/backfill-knowledge/
git commit -m "feat(knowledge): add backfill-knowledge edge function"
```

---

### Task 6: Add `semantic_search` tool to chat assistant

**Files:**
- Create: `supabase/functions/chat-assistant/tools/queries/knowledge.ts`
- Modify: `supabase/functions/chat-assistant/tools/executor.ts` — add `semantic_search` handler
- Modify: `supabase/functions/chat-assistant/tools/registry.ts` — add tool definition

**Context:** This adds a new tool the AI can call. It embeds the user's query, calls `match_knowledge` RPC, and returns relevant knowledge chunks. The tool is available in all modes (default, offer, launchpad).

**Step 1: Write the query handler**

```typescript
// supabase/functions/chat-assistant/tools/queries/knowledge.ts

import { generateEmbedding } from '../../../_shared/embeddings.ts';

export async function semanticSearch(
  supabase: any,
  args: { query: string; source_types?: string[]; limit?: number },
  clientId: string,
) {
  const { query, source_types, limit = 8 } = args;

  try {
    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);

    // Call the match_knowledge RPC
    const { data, error } = await supabase.rpc('match_knowledge', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_client_id: clientId,
      source_types: source_types || null,
      match_threshold: 0.2,
      match_count: limit,
    });

    if (error) {
      console.error('[semantic_search] RPC error:', error);
      return { error: error.message };
    }

    return {
      results: (data || []).map((row: any) => ({
        source: row.source_table,
        source_id: row.source_id,
        content: row.content_text,
        metadata: row.metadata,
        relevance: Math.round(row.similarity * 100) / 100,
      })),
      result_count: data?.length || 0,
    };
  } catch (err: any) {
    console.error('[semantic_search] Error:', err);
    return { error: err.message };
  }
}
```

**Step 2: Add to executor.ts**

In `supabase/functions/chat-assistant/tools/executor.ts`, add import and handler:

```typescript
// Add import at top:
import { semanticSearch } from './queries/knowledge.ts';

// Add to TOOL_HANDLERS map:
semantic_search: (ctx, args) => semanticSearch(ctx.supabase, args, ctx.clientId),
```

**Step 3: Add tool definition to registry.ts**

Add to `QUERY_TOOLS` array in `supabase/functions/chat-assistant/tools/registry.ts`:

```typescript
{
  type: "function",
  function: {
    name: "semantic_search",
    description: "Search the client's entire knowledge base using semantic/meaning-based search. Use this when the user asks about past decisions, meeting discussions, specific leads, historical context, or anything that requires searching across meetings, tasks, reports, leads, communications, social posts, and blog content. Returns the most relevant pieces of information ranked by relevance.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Natural language search query describing what information to find. Be specific and descriptive for best results."
        },
        source_types: {
          type: "array",
          items: { type: "string" },
          description: "Optional filter to specific data types. Values: meetings, tasks, quarterly_goals, website_form_submissions, reports, communication_logs, social_media_posts, blog_posts, marketing_ideas"
        },
        limit: {
          type: "number",
          description: "Max results to return. Default 8."
        }
      },
      required: ["query"]
    }
  }
},
```

**Step 4: Deploy chat-assistant**

Run: `npx supabase functions deploy chat-assistant --no-verify-jwt`

**Step 5: Commit**

```bash
git add supabase/functions/chat-assistant/tools/queries/knowledge.ts \
  supabase/functions/chat-assistant/tools/executor.ts \
  supabase/functions/chat-assistant/tools/registry.ts
git commit -m "feat(knowledge): add semantic_search tool to chat assistant"
```

---

### Task 7: Add client snapshot to system prompt

**Files:**
- Create: `supabase/functions/chat-assistant/prompts/snapshot.ts`
- Modify: `supabase/functions/chat-assistant/index.ts` — inject snapshot into system prompt

**Context:** The client snapshot is fetched once per chat request and injected into the system prompt. It gives the AI instant awareness of the client's current state without needing tool calls.

**Step 1: Write the snapshot builder**

```typescript
// supabase/functions/chat-assistant/prompts/snapshot.ts

export async function buildClientSnapshot(
  supabase: any,
  clientId: string,
): Promise<string> {
  try {
    // Parallel fetch all snapshot data
    const [
      clientResult,
      servicesResult,
      avatarsResult,
      goalsResult,
      taskCountsResult,
      recentMeetingsResult,
      recentLeadsResult,
      brandVoiceResult,
    ] = await Promise.all([
      supabase.from('clients').select('name, industry, website_url').eq('id', clientId).maybeSingle(),
      supabase.from('services').select('name, description').eq('client_id', clientId).limit(10),
      supabase.from('avatars').select('name, description').eq('client_id', clientId).limit(5),
      supabase.from('quarterly_goals').select('title, goal, status, target_metric').eq('client_id', clientId).order('created_at', { ascending: false }).limit(5),
      supabase.from('tasks').select('status').eq('client_id', clientId),
      supabase.from('meetings').select('summary, date_time').eq('client_id', clientId).order('date_time', { ascending: false }).limit(5),
      supabase.from('website_form_submissions').select('id, created_at').eq('client_id', clientId).order('created_at', { ascending: false }).limit(20),
      supabase.from('client_brand_voice').select('voice_summary, tone_keywords').eq('client_id', clientId).maybeSingle(),
    ]);

    const client = clientResult.data;
    const services = servicesResult.data || [];
    const avatars = avatarsResult.data || [];
    const goals = goalsResult.data || [];
    const allTasks = taskCountsResult.data || [];
    const meetings = recentMeetingsResult.data || [];
    const leads = recentLeadsResult.data || [];
    const brandVoice = brandVoiceResult.data;

    // Task counts by status
    const tasksByStatus: Record<string, number> = {};
    for (const t of allTasks) {
      tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
    }
    const openTasks = (tasksByStatus['to_do'] || 0) + (tasksByStatus['in_progress'] || 0);

    // Recent leads (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentLeadCount = leads.filter((l: any) => new Date(l.created_at) > weekAgo).length;

    const parts: string[] = ['CLIENT KNOWLEDGE SNAPSHOT:'];

    if (client) {
      parts.push(`Business: "${client.name}"${client.industry ? ` — ${client.industry}` : ''}${client.website_url ? ` (${client.website_url})` : ''}`);
    }

    if (services.length > 0) {
      parts.push(`Services: ${services.map((s: any) => s.name).join(', ')}`);
    }

    if (avatars.length > 0) {
      parts.push(`Target Customers: ${avatars.map((a: any) => `${a.name}${a.description ? ` — ${a.description.slice(0, 80)}` : ''}`).join('; ')}`);
    }

    if (goals.length > 0) {
      parts.push(`Active Goals: ${goals.map((g: any) => `${g.title || g.goal}${g.status ? ` (${g.status})` : ''}`).join('; ')}`);
    }

    parts.push(`Tasks: ${allTasks.length} total, ${openTasks} open${tasksByStatus['in_progress'] ? `, ${tasksByStatus['in_progress']} in progress` : ''}`);

    if (meetings.length > 0) {
      parts.push(`Recent Meetings: ${meetings.slice(0, 3).map((m: any) => `"${(m.summary || 'Meeting').slice(0, 50)}" (${new Date(m.date_time).toLocaleDateString()})`).join('; ')}`);
    }

    if (recentLeadCount > 0) {
      parts.push(`Recent Leads: ${recentLeadCount} new this week`);
    }

    if (brandVoice?.voice_summary) {
      parts.push(`Brand Voice: ${brandVoice.voice_summary.slice(0, 150)}`);
    }

    parts.push('Use semantic_search tool for detailed information about any of the above.');

    return parts.join('\n');
  } catch (err: any) {
    console.error('[buildClientSnapshot] Error:', err);
    return 'CLIENT KNOWLEDGE SNAPSHOT: Error loading snapshot. Use tool calls for data.';
  }
}
```

**Step 2: Integrate into index.ts**

In `supabase/functions/chat-assistant/index.ts`, add import and call:

```typescript
// Add import:
import { buildClientSnapshot } from './prompts/snapshot.ts';

// After buildSystemPrompt() call, before contextualMessages construction:
const clientSnapshot = await buildClientSnapshot(supabaseClient, client_id);

// Modify the contextualMessages array to include snapshot:
const contextualMessages: Array<{ role: string; content: string }> = [
  { role: 'system', content: systemPrompt },
  { role: 'system', content: clientSnapshot },
];
```

**Step 3: Deploy**

Run: `npx supabase functions deploy chat-assistant --no-verify-jwt`

**Step 4: Commit**

```bash
git add supabase/functions/chat-assistant/prompts/snapshot.ts \
  supabase/functions/chat-assistant/index.ts
git commit -m "feat(knowledge): add client snapshot to system prompt"
```

---

### Task 8: Update system prompt to reference semantic search

**Files:**
- Modify: `supabase/functions/chat-assistant/prompts/system.ts`

**Context:** The system prompt needs to tell the AI about the `semantic_search` tool and when to use it. Add instructions to the default mode prompt.

**Step 1: Add semantic search instructions**

In the default prompt section of `system.ts`, add after the existing tool instructions:

```
SEMANTIC KNOWLEDGE BASE:
You have access to a semantic_search tool that searches across ALL client data — meetings, tasks, goals, leads, reports, communications, social posts, and blog content. Use it when:
- The user asks about past decisions or discussions
- The user references something vague ("that thing we talked about", "the lead from last week")
- You need historical context to give a better answer
- The client snapshot doesn't have enough detail
- The user asks "what do you know about X"

PROACTIVE CONTEXT: When a user asks about a topic, use semantic_search to pull relevant context BEFORE answering. For example:
- "How are we doing on goals?" → search for goals AND recent meeting decisions about goals
- "Tell me about our leads" → search for recent submissions AND any tasks/communications about leads
- "What happened in our last meeting?" → search meetings AND related tasks/decisions
```

**Step 2: Deploy**

Run: `npx supabase functions deploy chat-assistant --no-verify-jwt`

**Step 3: Commit**

```bash
git add supabase/functions/chat-assistant/prompts/system.ts
git commit -m "feat(knowledge): update system prompt with semantic search instructions"
```

---

### Task 9: Deploy all functions and verify end-to-end

**Files:** None new — verification only.

**Step 1: Deploy all modified functions**

```bash
npx supabase functions deploy chat-assistant --no-verify-jwt
npx supabase functions deploy embed-knowledge --no-verify-jwt
npx supabase functions deploy backfill-knowledge --no-verify-jwt
```

**Step 2: Run backfill for a test client**

Pick a client with data and run the backfill. Verify embeddings are created in `client_knowledge_embeddings`.

**Step 3: Test the chat**

Open the app, select the test client, and ask:
1. Basic: "What do you know about this client?" — should show snapshot data
2. Semantic: "What did we decide in our last meeting?" — should call `semantic_search`
3. Cross-reference: "Are there any tasks related to our goals?" — should combine snapshot + search

**Step 4: Verify webhook sync**

Create a new task for the test client. Wait 5-10 seconds. Ask the AI about the new task. It should find it via `semantic_search`.

**Step 5: Commit any fixes**

```bash
git commit -m "fix(knowledge): address deployment issues from e2e testing"
```
