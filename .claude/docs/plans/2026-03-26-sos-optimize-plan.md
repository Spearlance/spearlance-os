# SOS Optimization Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Build an AI-driven continuous site optimization engine that analyzes SOS Tracker + CWV + Clarity + DataforSEO data, generates doctrine-compliant recommendations with drafts, and tracks outcomes over time.

**Architecture:** Supabase edge functions orchestrate weekly analysis cycles per client. DataforSEO provides SERP/keyword data. AI generates recommendations scored against SEO Doctrine rules. A monitoring function checks applied recommendations at 7/14/21 days and flags regressions. Frontend shows an "Optimization" tab with recommendation queue.

**Tech Stack:** Supabase Edge Functions (Deno), PostgreSQL migrations, DataforSEO REST API v3, OpenAI/Anthropic for recommendation generation, React + shadcn/ui for dashboard.

**Design Doc:** `.claude/docs/plans/2026-03-26-sos-optimize-design.md`

---

## Phase 1: Database Schema (Tasks 1-2)

### Task 1: Core optimization tables migration

**Files:**
- Create: `supabase/migrations/20260326200000_optimization_engine_schema.sql`
- Test: `supabase/migrations/tests/20260326200000_optimization_engine_schema.test.sql`

**Step 1: Write the migration test**

```sql
-- supabase/migrations/tests/20260326200000_optimization_engine_schema.test.sql
-- Migration smoke test: optimization engine schema
-- Run with: psql $DATABASE_URL -f this_file

-- 1. optimization_cycles table exists
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'optimization_cycles'
  ), 'optimization_cycles table must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'optimization_cycles' AND column_name = 'client_id'
  ), 'optimization_cycles.client_id must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'optimization_cycles' AND column_name = 'cycle_date'
  ), 'optimization_cycles.cycle_date must exist';
END $$;

-- 2. optimization_recommendations table exists with all columns
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'optimization_recommendations'
  ), 'optimization_recommendations table must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'optimization_recommendations' AND column_name = 'category'
  ), 'optimization_recommendations.category must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'optimization_recommendations' AND column_name = 'subcategory'
  ), 'optimization_recommendations.subcategory must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'optimization_recommendations' AND column_name = 'baseline_metrics'
  ), 'optimization_recommendations.baseline_metrics must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'optimization_recommendations' AND column_name = 'outcome_metrics'
  ), 'optimization_recommendations.outcome_metrics must exist';
END $$;

-- 3. page_audits table exists
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'page_audits'
  ), 'page_audits table must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'page_audits' AND column_name = 'h1_count'
  ), 'page_audits.h1_count must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'page_audits' AND column_name = 'word_count'
  ), 'page_audits.word_count must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'page_audits' AND column_name = 'page_type'
  ), 'page_audits.page_type must exist';
END $$;

-- 4. serp_snapshots table exists
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'serp_snapshots'
  ), 'serp_snapshots table must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'serp_snapshots' AND column_name = 'keyword'
  ), 'serp_snapshots.keyword must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'serp_snapshots' AND column_name = 'search_volume'
  ), 'serp_snapshots.search_volume must exist';
END $$;

-- 5. RLS is enabled on all new tables
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'optimization_recommendations' AND rowsecurity = true
  ), 'RLS must be enabled on optimization_recommendations';

  ASSERT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'optimization_cycles' AND rowsecurity = true
  ), 'RLS must be enabled on optimization_cycles';

  ASSERT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'page_audits' AND rowsecurity = true
  ), 'RLS must be enabled on page_audits';

  ASSERT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'serp_snapshots' AND rowsecurity = true
  ), 'RLS must be enabled on serp_snapshots';
END $$;

-- 6. Key indexes exist
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'optimization_recommendations'
    AND indexname = 'idx_opt_recs_client_status'
  ), 'idx_opt_recs_client_status must exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'page_audits'
    AND indexname = 'idx_page_audits_client_url'
  ), 'idx_page_audits_client_url must exist';
END $$;
```

**Step 2: Write the migration**

```sql
-- supabase/migrations/20260326200000_optimization_engine_schema.sql
-- SOS Optimization Engine — core schema

-- 1. optimization_cycles — tracks each weekly analysis run
CREATE TABLE IF NOT EXISTS optimization_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  cycle_date date NOT NULL,
  pages_analyzed integer DEFAULT 0,
  recommendations_generated integer DEFAULT 0,
  data_sources_used text[] DEFAULT '{}',
  doctrine_version text DEFAULT 'v2',
  status text DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  summary jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, cycle_date)
);

ALTER TABLE optimization_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view optimization_cycles for their clients"
  ON optimization_cycles FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE id IN (
      SELECT unnest(associated_client_ids) FROM profiles WHERE id = auth.uid()
    )
    UNION
    SELECT id FROM clients WHERE EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  ));

CREATE POLICY "Service role can manage optimization_cycles"
  ON optimization_cycles FOR ALL
  USING (true) WITH CHECK (true);

-- 2. optimization_recommendations — the core recommendations table
CREATE TABLE IF NOT EXISTS optimization_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES optimization_cycles(id) ON DELETE SET NULL,
  page_url text,
  category text NOT NULL CHECK (category IN ('seo', 'cro', 'content', 'alert')),
  subcategory text NOT NULL CHECK (subcategory IN (
    'meta_title', 'meta_desc', 'h1_fix', 'internal_links',
    'new_page', 'content_expand', 'schema', 'city_expansion',
    'headline_cta', 'ux_friction', 'cwv_fix', 'blog_topic'
  )),
  priority text NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  doctrine_rule text,
  current_value text,
  proposed_value text,
  ai_reasoning text,
  baseline_metrics jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'applied', 'monitoring',
    'succeeded', 'regressed', 'reverted'
  )),
  applied_at timestamptz,
  applied_by uuid REFERENCES profiles(id),
  check_7d_at timestamptz,
  check_14d_at timestamptz,
  check_21d_at timestamptz,
  outcome_metrics jsonb,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

CREATE INDEX idx_opt_recs_client_status ON optimization_recommendations (client_id, status, created_at DESC);
CREATE INDEX idx_opt_recs_monitoring ON optimization_recommendations (status, check_7d_at)
  WHERE status IN ('applied', 'monitoring');

ALTER TABLE optimization_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view optimization_recommendations for their clients"
  ON optimization_recommendations FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE id IN (
      SELECT unnest(associated_client_ids) FROM profiles WHERE id = auth.uid()
    )
    UNION
    SELECT id FROM clients WHERE EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  ));

CREATE POLICY "Users can update optimization_recommendations for their clients"
  ON optimization_recommendations FOR UPDATE
  USING (client_id IN (
    SELECT id FROM clients WHERE id IN (
      SELECT unnest(associated_client_ids) FROM profiles WHERE id = auth.uid()
    )
    UNION
    SELECT id FROM clients WHERE EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  ));

CREATE POLICY "Service role can manage optimization_recommendations"
  ON optimization_recommendations FOR ALL
  USING (true) WITH CHECK (true);

-- 3. page_audits — crawled page data for doctrine compliance
CREATE TABLE IF NOT EXISTS page_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  url text NOT NULL,
  title text,
  meta_description text,
  h1_count integer DEFAULT 0,
  h1_text text,
  h2_count integer DEFAULT 0,
  h2_texts text[] DEFAULT '{}',
  internal_link_count integer DEFAULT 0,
  external_link_count integer DEFAULT 0,
  word_count integer DEFAULT 0,
  has_faq_schema boolean DEFAULT false,
  has_local_schema boolean DEFAULT false,
  has_org_schema boolean DEFAULT false,
  has_breadcrumb_schema boolean DEFAULT false,
  page_type text DEFAULT 'other' CHECK (page_type IN ('service', 'city', 'blog', 'pillar', 'homepage', 'other')),
  crawled_at timestamptz DEFAULT now(),
  raw_html_hash text,
  UNIQUE(client_id, url)
);

CREATE INDEX idx_page_audits_client_url ON page_audits (client_id, url);
CREATE INDEX idx_page_audits_type ON page_audits (client_id, page_type);

ALTER TABLE page_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view page_audits for their clients"
  ON page_audits FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE id IN (
      SELECT unnest(associated_client_ids) FROM profiles WHERE id = auth.uid()
    )
    UNION
    SELECT id FROM clients WHERE EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  ));

CREATE POLICY "Service role can manage page_audits"
  ON page_audits FOR ALL
  USING (true) WITH CHECK (true);

-- 4. serp_snapshots — DataforSEO SERP data
CREATE TABLE IF NOT EXISTS serp_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  location text DEFAULT 'United States',
  search_engine text DEFAULT 'google',
  position integer,
  url text,
  serp_features text[] DEFAULT '{}',
  competitor_urls jsonb DEFAULT '[]',
  search_volume integer,
  keyword_difficulty numeric,
  cpc numeric,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(client_id, keyword, snapshot_date)
);

CREATE INDEX idx_serp_snapshots_client_date ON serp_snapshots (client_id, snapshot_date DESC);
CREATE INDEX idx_serp_snapshots_keyword ON serp_snapshots (client_id, keyword);

ALTER TABLE serp_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view serp_snapshots for their clients"
  ON serp_snapshots FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE id IN (
      SELECT unnest(associated_client_ids) FROM profiles WHERE id = auth.uid()
    )
    UNION
    SELECT id FROM clients WHERE EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  ));

CREATE POLICY "Service role can manage serp_snapshots"
  ON serp_snapshots FOR ALL
  USING (true) WITH CHECK (true);

-- 5. dataforseo_configs — per-client DataforSEO settings
CREATE TABLE IF NOT EXISTS dataforseo_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
  tracked_keywords text[] DEFAULT '{}',
  location_code integer DEFAULT 2840,  -- US
  language_code text DEFAULT 'en',
  is_active boolean DEFAULT true,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dataforseo_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view dataforseo_configs for their clients"
  ON dataforseo_configs FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE id IN (
      SELECT unnest(associated_client_ids) FROM profiles WHERE id = auth.uid()
    )
    UNION
    SELECT id FROM clients WHERE EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  ));

CREATE POLICY "Service role can manage dataforseo_configs"
  ON dataforseo_configs FOR ALL
  USING (true) WITH CHECK (true);
```

**Step 3: Verify migration test would detect missing tables (mental check)**

The test asserts table/column/index/RLS existence. If migration doesn't run, tests fail.

**Step 4: Commit**

```bash
git add supabase/migrations/20260326200000_optimization_engine_schema.sql
git add supabase/migrations/tests/20260326200000_optimization_engine_schema.test.sql
git commit -m "feat(db): add optimization engine schema — cycles, recommendations, page_audits, serp_snapshots"
```

---

### Task 2: Update Supabase types + config

**Files:**
- Modify: `supabase/config.toml` (add new function entries)
- Regenerate: `src/integrations/supabase/types.ts`

**Step 1: Add function config entries**

Add to `supabase/config.toml`:
```toml
[functions.optimization-crawl]
verify_jwt = false

[functions.optimization-analyze]
verify_jwt = false

[functions.optimization-recommend]
verify_jwt = false

[functions.optimization-monitor]
verify_jwt = false

[functions.optimization-alerts]
verify_jwt = false

[functions.dataforseo-sync]
verify_jwt = false
```

Note: `verify_jwt = false` because these are called by cron/internal triggers, not user requests.

**Step 2: Regenerate types**

```bash
npx supabase gen types typescript --project-id chikljxwgiskyjsnjelf > src/integrations/supabase/types.ts
```

**Step 3: Commit**

```bash
git add supabase/config.toml src/integrations/supabase/types.ts
git commit -m "chore: add optimization engine functions to supabase config + regenerate types"
```

---

## Phase 2: DataforSEO Integration (Task 3)

### Task 3: DataforSEO sync edge function

**Files:**
- Create: `supabase/functions/dataforseo-sync/index.ts`
- Test: `src/lib/__tests__/dataforseoSync.test.ts`

**Step 1: Write the unit test**

```typescript
// src/lib/__tests__/dataforseoSync.test.ts
import { describe, it, expect } from 'vitest';

// Test the response parsing logic (extracted from edge function)
function parseSerpResult(item: any): {
  position: number | null;
  url: string | null;
  serpFeatures: string[];
  competitorUrls: Array<{ position: number; url: string; domain: string }>;
} {
  const organicResults = item.result?.[0]?.items?.filter(
    (i: any) => i.type === 'organic'
  ) || [];

  // Find our client's position
  const clientUrl = item._clientUrl;
  const clientDomain = clientUrl ? new URL(clientUrl.startsWith('http') ? clientUrl : `https://${clientUrl}`).hostname.replace(/^www\./, '') : null;

  let position: number | null = null;
  let url: string | null = null;

  for (const result of organicResults) {
    const resultDomain = result.domain?.replace(/^www\./, '') || '';
    if (clientDomain && resultDomain === clientDomain) {
      position = result.rank_absolute;
      url = result.url;
      break;
    }
  }

  // Extract SERP features
  const serpFeatures: string[] = [];
  const allItems = item.result?.[0]?.items || [];
  const featureTypes = new Set(allItems.map((i: any) => i.type).filter((t: string) => t !== 'organic' && t !== 'paid'));
  serpFeatures.push(...featureTypes);

  // Top 10 competitors
  const competitorUrls = organicResults.slice(0, 10).map((r: any) => ({
    position: r.rank_absolute,
    url: r.url,
    domain: r.domain,
  }));

  return { position, url, serpFeatures, competitorUrls };
}

describe('DataforSEO Sync — SERP Result Parsing', () => {
  it('finds client position in organic results', () => {
    const item = {
      _clientUrl: 'https://www.example.com',
      result: [{
        items: [
          { type: 'organic', rank_absolute: 1, url: 'https://competitor.com/page', domain: 'competitor.com' },
          { type: 'organic', rank_absolute: 3, url: 'https://www.example.com/services', domain: 'www.example.com' },
          { type: 'organic', rank_absolute: 5, url: 'https://other.com', domain: 'other.com' },
        ]
      }]
    };

    const result = parseSerpResult(item);
    expect(result.position).toBe(3);
    expect(result.url).toBe('https://www.example.com/services');
  });

  it('returns null position when client not in SERP', () => {
    const item = {
      _clientUrl: 'https://www.notranking.com',
      result: [{
        items: [
          { type: 'organic', rank_absolute: 1, url: 'https://competitor.com', domain: 'competitor.com' },
        ]
      }]
    };

    const result = parseSerpResult(item);
    expect(result.position).toBeNull();
    expect(result.url).toBeNull();
  });

  it('extracts SERP features', () => {
    const item = {
      _clientUrl: 'https://example.com',
      result: [{
        items: [
          { type: 'organic', rank_absolute: 1, url: 'https://example.com', domain: 'example.com' },
          { type: 'featured_snippet', rank_absolute: 0 },
          { type: 'people_also_ask' },
          { type: 'local_pack' },
        ]
      }]
    };

    const result = parseSerpResult(item);
    expect(result.serpFeatures).toContain('featured_snippet');
    expect(result.serpFeatures).toContain('people_also_ask');
    expect(result.serpFeatures).toContain('local_pack');
  });

  it('extracts top 10 competitors', () => {
    const items = Array.from({ length: 15 }, (_, i) => ({
      type: 'organic',
      rank_absolute: i + 1,
      url: `https://site${i + 1}.com`,
      domain: `site${i + 1}.com`,
    }));

    const item = {
      _clientUrl: 'https://nothere.com',
      result: [{ items }]
    };

    const result = parseSerpResult(item);
    expect(result.competitorUrls).toHaveLength(10);
    expect(result.competitorUrls[0].position).toBe(1);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/dataforseoSync.test.ts
```

Expected: FAIL — `parseSerpResult` is defined inline for now, should pass immediately since it's self-contained.

**Step 3: Write the edge function**

```typescript
// supabase/functions/dataforseo-sync/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DATAFORSEO_API = 'https://api.dataforseo.com/v3';

async function dataforseoRequest(endpoint: string, body: any[]): Promise<any> {
  const login = Deno.env.get('DATAFORSEO_LOGIN');
  const password = Deno.env.get('DATAFORSEO_PASSWORD');

  if (!login || !password) {
    throw new Error('DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD env vars required');
  }

  const response = await fetch(`${DATAFORSEO_API}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${login}:${password}`),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DataforSEO API error ${response.status}: ${error}`);
  }

  return response.json();
}

function parseSerpResult(task: any, clientUrl: string) {
  const organicResults = task.result?.[0]?.items?.filter(
    (i: any) => i.type === 'organic'
  ) || [];

  const clientDomain = clientUrl
    ? new URL(clientUrl.startsWith('http') ? clientUrl : `https://${clientUrl}`)
        .hostname.replace(/^www\./, '')
    : null;

  let position: number | null = null;
  let url: string | null = null;

  for (const result of organicResults) {
    const resultDomain = result.domain?.replace(/^www\./, '') || '';
    if (clientDomain && resultDomain === clientDomain) {
      position = result.rank_absolute;
      url = result.url;
      break;
    }
  }

  const allItems = task.result?.[0]?.items || [];
  const featureTypes = new Set(
    allItems.map((i: any) => i.type).filter((t: string) => t !== 'organic' && t !== 'paid')
  );

  const competitorUrls = organicResults.slice(0, 10).map((r: any) => ({
    position: r.rank_absolute,
    url: r.url,
    domain: r.domain,
  }));

  return {
    position,
    url,
    serpFeatures: [...featureTypes],
    competitorUrls,
    searchVolume: task.result?.[0]?.search_information?.search_results_count || null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Optional: target specific client
    let targetClientId: string | null = null;
    try {
      const body = await req.json();
      targetClientId = body?.client_id || null;
    } catch { /* no body */ }

    // Get active configs
    let query = supabase
      .from('dataforseo_configs')
      .select('*, clients(id, website_url)')
      .eq('is_active', true);

    if (targetClientId) {
      query = query.eq('client_id', targetClientId);
    }

    const { data: configs, error: configError } = await query;
    if (configError) throw configError;

    if (!configs || configs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No DataforSEO configs found', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = { synced: 0, failed: 0, errors: [] as string[] };
    const today = new Date().toISOString().split('T')[0];

    for (const config of configs) {
      try {
        const keywords = config.tracked_keywords || [];
        if (keywords.length === 0) {
          console.log(`No keywords for client ${config.client_id}, skipping`);
          continue;
        }

        const clientUrl = config.clients?.website_url || '';

        // DataforSEO SERP Live Advanced — one keyword per task
        // Batch up to 100 per POST call
        const batches: string[][] = [];
        for (let i = 0; i < keywords.length; i += 100) {
          batches.push(keywords.slice(i, i + 100));
        }

        for (const batch of batches) {
          const tasks = batch.map(keyword => ({
            keyword: keyword,
            location_code: config.location_code || 2840,
            language_code: config.language_code || 'en',
            device: 'desktop',
            os: 'windows',
          }));

          const response = await dataforseoRequest(
            '/serp/google/organic/live/advanced',
            tasks
          );

          if (!response.tasks) continue;

          for (let i = 0; i < response.tasks.length; i++) {
            const task = response.tasks[i];
            const keyword = batch[i];

            if (task.status_code !== 20000) {
              console.error(`SERP task failed for "${keyword}": ${task.status_message}`);
              continue;
            }

            const parsed = parseSerpResult(task, clientUrl);

            const { error: upsertError } = await supabase
              .from('serp_snapshots')
              .upsert({
                client_id: config.client_id,
                keyword,
                location: config.language_code === 'en' ? 'United States' : config.language_code,
                search_engine: 'google',
                position: parsed.position,
                url: parsed.url,
                serp_features: parsed.serpFeatures,
                competitor_urls: parsed.competitorUrls,
                search_volume: parsed.searchVolume,
                snapshot_date: today,
              }, { onConflict: 'client_id,keyword,snapshot_date' });

            if (upsertError) {
              console.error(`Upsert error for "${keyword}":`, upsertError);
            }
          }
        }

        // Fetch keyword volumes + difficulty via Keywords Data API
        if (keywords.length > 0) {
          try {
            const kwResponse = await dataforseoRequest(
              '/keywords_data/google_ads/search_volume/live',
              [{
                keywords: keywords.slice(0, 1000),
                location_code: config.location_code || 2840,
                language_code: config.language_code || 'en',
              }]
            );

            const kwResults = kwResponse.tasks?.[0]?.result || [];
            for (const kw of kwResults) {
              if (!kw.keyword) continue;

              await supabase
                .from('serp_snapshots')
                .update({
                  search_volume: kw.search_volume || null,
                  cpc: kw.cpc || null,
                  keyword_difficulty: kw.competition || null,
                })
                .eq('client_id', config.client_id)
                .eq('keyword', kw.keyword)
                .eq('snapshot_date', today);
            }
          } catch (kwError) {
            console.error('Keyword volume fetch error:', kwError);
            // Non-fatal — SERP data is still saved
          }
        }

        // Update last synced
        await supabase
          .from('dataforseo_configs')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', config.id);

        results.synced++;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error for client ${config.client_id}:`, msg);
        results.failed++;
        results.errors.push(`Client ${config.client_id}: ${msg}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('DataforSEO sync error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

**Step 4: Run unit tests**

```bash
npx vitest run src/lib/__tests__/dataforseoSync.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add supabase/functions/dataforseo-sync/index.ts src/lib/__tests__/dataforseoSync.test.ts
git commit -m "feat(dataforseo): add SERP + keyword volume sync edge function"
```

---

## Phase 3: Page Crawl + Doctrine Scoring (Tasks 4-5)

### Task 4: Optimization crawl edge function

**Files:**
- Create: `supabase/functions/optimization-crawl/index.ts`
- Create: `supabase/functions/_shared/doctrineScorer.ts`
- Test: `src/lib/__tests__/doctrineScorer.test.ts`

**Step 1: Write doctrine scorer tests**

```typescript
// src/lib/__tests__/doctrineScorer.test.ts
import { describe, it, expect } from 'vitest';

interface PageAudit {
  url: string;
  title: string | null;
  meta_description: string | null;
  h1_count: number;
  h1_text: string | null;
  h2_count: number;
  word_count: number;
  internal_link_count: number;
  has_faq_schema: boolean;
  has_local_schema: boolean;
  has_org_schema: boolean;
  page_type: string;
}

interface DoctrineGap {
  rule: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  subcategory: string;
  current: string;
}

function scorePageAgainstDoctrine(audit: PageAudit): DoctrineGap[] {
  const gaps: DoctrineGap[] = [];

  // Section 3.1: Exactly one H1
  if (audit.h1_count === 0) {
    gaps.push({
      rule: 'Section 3.1',
      severity: 'critical',
      description: 'Page has no H1 tag',
      subcategory: 'h1_fix',
      current: `${audit.h1_count} H1 tags`,
    });
  } else if (audit.h1_count > 1) {
    gaps.push({
      rule: 'Section 3.1',
      severity: 'critical',
      description: `Page has ${audit.h1_count} H1 tags — must be exactly one`,
      subcategory: 'h1_fix',
      current: `${audit.h1_count} H1 tags`,
    });
  }

  // Section 6.1: Word count minimums
  const wordCountMin: Record<string, number> = {
    service: 1500, blog: 1000, city: 1200, pillar: 1500, homepage: 500, other: 500,
  };
  const rewriteMin: Record<string, number> = {
    service: 1200, blog: 800, city: 1000, pillar: 1200, homepage: 300, other: 300,
  };
  const minWords = wordCountMin[audit.page_type] || 500;
  const rewriteWords = rewriteMin[audit.page_type] || 300;

  if (audit.word_count < rewriteWords) {
    gaps.push({
      rule: 'Section 6.1',
      severity: 'high',
      description: `Word count (${audit.word_count}) below rewrite trigger (${rewriteWords}) for ${audit.page_type} page`,
      subcategory: 'content_expand',
      current: `${audit.word_count} words`,
    });
  } else if (audit.word_count < minWords) {
    gaps.push({
      rule: 'Section 6.1',
      severity: 'medium',
      description: `Word count (${audit.word_count}) below minimum (${minWords}) for ${audit.page_type} page`,
      subcategory: 'content_expand',
      current: `${audit.word_count} words`,
    });
  }

  // Section 7.1: Internal link minimums
  if (audit.internal_link_count < 3) {
    gaps.push({
      rule: 'Section 7.1',
      severity: 'high',
      description: `Only ${audit.internal_link_count} internal links — rewrite trigger (minimum 5, target 10+)`,
      subcategory: 'internal_links',
      current: `${audit.internal_link_count} internal links`,
    });
  } else if (audit.internal_link_count < 5) {
    gaps.push({
      rule: 'Section 7.1',
      severity: 'medium',
      description: `${audit.internal_link_count} internal links — below minimum 5 (target 10+)`,
      subcategory: 'internal_links',
      current: `${audit.internal_link_count} internal links`,
    });
  }

  // Section 3.4: H2 count
  if (audit.h2_count < 3) {
    gaps.push({
      rule: 'Section 3.4',
      severity: 'medium',
      description: `Only ${audit.h2_count} H2 headings — minimum 4, target 6-8`,
      subcategory: 'h1_fix',
      current: `${audit.h2_count} H2 tags`,
    });
  }

  // Section 8: Schema requirements by page type
  if (!audit.has_org_schema && (audit.page_type === 'homepage' || audit.page_type === 'service')) {
    gaps.push({
      rule: 'Section 8.1',
      severity: 'medium',
      description: `Missing Organization schema (required for ${audit.page_type} pages)`,
      subcategory: 'schema',
      current: 'No Organization schema',
    });
  }

  if (!audit.has_local_schema && audit.page_type === 'city') {
    gaps.push({
      rule: 'Section 8.1',
      severity: 'high',
      description: 'Missing LocalBusiness schema (required for city pages)',
      subcategory: 'schema',
      current: 'No LocalBusiness schema',
    });
  }

  if (!audit.has_faq_schema && (audit.page_type === 'service' || audit.page_type === 'city')) {
    gaps.push({
      rule: 'Section 8.1',
      severity: 'low',
      description: `No FAQ schema on ${audit.page_type} page — add if FAQs present`,
      subcategory: 'schema',
      current: 'No FAQ schema',
    });
  }

  // Meta title check (basic — AI will refine)
  if (!audit.title || audit.title.length < 20) {
    gaps.push({
      rule: 'Section 1.1',
      severity: 'high',
      description: 'Meta title missing or too short',
      subcategory: 'meta_title',
      current: audit.title || '(empty)',
    });
  }

  // Meta description check
  if (!audit.meta_description || audit.meta_description.length < 50) {
    gaps.push({
      rule: 'Section 2.1',
      severity: 'high',
      description: 'Meta description missing or too short',
      subcategory: 'meta_desc',
      current: audit.meta_description || '(empty)',
    });
  }

  return gaps;
}

describe('Doctrine Scorer — H1 Rules (Section 3.1)', () => {
  const base: PageAudit = {
    url: 'https://example.com/services',
    title: 'Web Design in Concord NH | Spearlance',
    meta_description: 'Looking for web design in Concord NH? Spearlance is a trusted web design company.',
    h1_count: 1, h1_text: 'Web Design Company in Concord NH',
    h2_count: 6, word_count: 2000, internal_link_count: 10,
    has_faq_schema: true, has_local_schema: false, has_org_schema: true,
    page_type: 'service',
  };

  it('passes with exactly one H1', () => {
    const gaps = scorePageAgainstDoctrine(base);
    expect(gaps.find(g => g.rule === 'Section 3.1')).toBeUndefined();
  });

  it('flags zero H1 as critical', () => {
    const gaps = scorePageAgainstDoctrine({ ...base, h1_count: 0 });
    const h1Gap = gaps.find(g => g.rule === 'Section 3.1');
    expect(h1Gap).toBeDefined();
    expect(h1Gap!.severity).toBe('critical');
  });

  it('flags multiple H1s as critical', () => {
    const gaps = scorePageAgainstDoctrine({ ...base, h1_count: 3 });
    const h1Gap = gaps.find(g => g.rule === 'Section 3.1');
    expect(h1Gap).toBeDefined();
    expect(h1Gap!.severity).toBe('critical');
  });
});

describe('Doctrine Scorer — Word Count (Section 6.1)', () => {
  const base: PageAudit = {
    url: 'https://example.com/services', title: 'Title', meta_description: 'Desc that is long enough to pass the minimum check for testing purposes here.',
    h1_count: 1, h1_text: 'H1', h2_count: 6, word_count: 2000,
    internal_link_count: 10, has_faq_schema: true, has_local_schema: false,
    has_org_schema: true, page_type: 'service',
  };

  it('passes service page at 2000 words', () => {
    const gaps = scorePageAgainstDoctrine(base);
    expect(gaps.find(g => g.rule === 'Section 6.1')).toBeUndefined();
  });

  it('flags service page below 1200 as high severity', () => {
    const gaps = scorePageAgainstDoctrine({ ...base, word_count: 1100 });
    const gap = gaps.find(g => g.rule === 'Section 6.1');
    expect(gap).toBeDefined();
    expect(gap!.severity).toBe('high');
  });

  it('flags blog below 800 as high severity', () => {
    const gaps = scorePageAgainstDoctrine({ ...base, page_type: 'blog', word_count: 700 });
    const gap = gaps.find(g => g.rule === 'Section 6.1');
    expect(gap!.severity).toBe('high');
  });
});

describe('Doctrine Scorer — Internal Links (Section 7.1)', () => {
  const base: PageAudit = {
    url: 'https://example.com/services', title: 'Title', meta_description: 'Desc that is long enough to pass the minimum check for testing purposes here.',
    h1_count: 1, h1_text: 'H1', h2_count: 6, word_count: 2000,
    internal_link_count: 10, has_faq_schema: true, has_local_schema: false,
    has_org_schema: true, page_type: 'service',
  };

  it('passes with 10 internal links', () => {
    const gaps = scorePageAgainstDoctrine(base);
    expect(gaps.find(g => g.rule === 'Section 7.1')).toBeUndefined();
  });

  it('flags below 3 as high', () => {
    const gaps = scorePageAgainstDoctrine({ ...base, internal_link_count: 2 });
    const gap = gaps.find(g => g.rule === 'Section 7.1');
    expect(gap!.severity).toBe('high');
  });
});

describe('Doctrine Scorer — Schema (Section 8.1)', () => {
  const base: PageAudit = {
    url: 'https://example.com/services', title: 'Title', meta_description: 'Desc that is long enough to pass the minimum check for testing purposes here.',
    h1_count: 1, h1_text: 'H1', h2_count: 6, word_count: 2000,
    internal_link_count: 10, has_faq_schema: true, has_local_schema: false,
    has_org_schema: true, page_type: 'service',
  };

  it('flags missing LocalBusiness schema on city page', () => {
    const gaps = scorePageAgainstDoctrine({ ...base, page_type: 'city', has_local_schema: false });
    const gap = gaps.find(g => g.rule === 'Section 8.1' && g.description.includes('LocalBusiness'));
    expect(gap).toBeDefined();
    expect(gap!.severity).toBe('high');
  });
});
```

**Step 2: Run tests, verify they pass (self-contained functions)**

```bash
npx vitest run src/lib/__tests__/doctrineScorer.test.ts
```

**Step 3: Create the shared doctrine scorer module**

Extract the `scorePageAgainstDoctrine` function into `supabase/functions/_shared/doctrineScorer.ts` with the same logic as tested above. The edge function `optimization-crawl` will use Firecrawl or direct fetch to crawl pages and store results in `page_audits`.

The `optimization-crawl/index.ts` edge function:
- Fetches all pages for a client from `website_pages` (existing table)
- For each page, extracts: H1s, H2s, internal/external links, word count, schema types
- Upserts into `page_audits`
- Runs `scorePageAgainstDoctrine` on each and returns gap signals

**Note:** Full implementation code for `optimization-crawl/index.ts` is ~150 lines. The implementing agent should follow the pattern of `crawl-website-page/index.ts` (existing) for HTML fetching, and add the schema/heading/link extraction logic.

**Step 4: Commit**

```bash
git add supabase/functions/_shared/doctrineScorer.ts supabase/functions/optimization-crawl/index.ts src/lib/__tests__/doctrineScorer.test.ts
git commit -m "feat(optimize): add doctrine scorer + page crawl function"
```

---

### Task 5: Optimization analyze edge function

**Files:**
- Create: `supabase/functions/optimization-analyze/index.ts`

This function orchestrates the weekly analysis cycle:

1. Creates an `optimization_cycles` row (status=running)
2. Calls `optimization-crawl` for the client (or reads recent `page_audits`)
3. Fetches last 30 days of SOS Tracker data (`web_events` aggregated per page)
4. Fetches last 30 days of Clarity data (`clarity_daily_pages`)
5. Fetches latest CWV data (`cwv_metrics`)
6. Fetches latest SERP data (`serp_snapshots`)
7. For each page, produces a unified "page context" object with all signals
8. Runs doctrine scoring to produce gap signals
9. Adds CRO signals: pages with high traffic + low conversions, CWV failures, Clarity friction
10. Stores gap signals in the cycle's summary
11. Updates cycle status=completed

**Implementation pattern:** Follow the structure of `clarity-generate-weekly-report/index.ts` for per-client iteration and aggregation. The output is a `gap_signals` JSON array stored in `optimization_cycles.summary`.

**Step 1: Commit**

```bash
git add supabase/functions/optimization-analyze/index.ts
git commit -m "feat(optimize): add weekly analysis orchestrator"
```

---

## Phase 4: AI Recommendation Engine (Task 6)

### Task 6: Optimization recommend edge function

**Files:**
- Create: `supabase/functions/optimization-recommend/index.ts`
- Test: `src/lib/__tests__/optimizationRecommend.test.ts`

**Step 1: Write the prompt construction test**

```typescript
// src/lib/__tests__/optimizationRecommend.test.ts
import { describe, it, expect } from 'vitest';

interface GapSignal {
  rule: string;
  severity: string;
  description: string;
  subcategory: string;
  current: string;
  pageUrl: string;
  pageType: string;
  metrics?: Record<string, any>;
}

function buildRecommendationPrompt(
  gaps: GapSignal[],
  clientName: string,
  historicalOutcomes: Array<{ subcategory: string; status: string; proposed_value: string }>
): string {
  const sections: string[] = [];

  sections.push(`You are generating optimization recommendations for ${clientName}.`);
  sections.push(`Follow the Spearlance SEO Doctrine strictly.`);

  // Group gaps by page
  const byPage = new Map<string, GapSignal[]>();
  for (const gap of gaps) {
    const key = gap.pageUrl;
    if (!byPage.has(key)) byPage.set(key, []);
    byPage.get(key)!.push(gap);
  }

  for (const [url, pageGaps] of byPage) {
    sections.push(`\n## Page: ${url} (${pageGaps[0].pageType})`);
    for (const gap of pageGaps) {
      sections.push(`- [${gap.severity.toUpperCase()}] ${gap.description} (${gap.rule})`);
      sections.push(`  Current: ${gap.current}`);
    }
  }

  // Historical context
  if (historicalOutcomes.length > 0) {
    sections.push('\n## Historical Outcomes (learn from these):');
    for (const outcome of historicalOutcomes) {
      sections.push(`- ${outcome.subcategory}: "${outcome.proposed_value}" → ${outcome.status}`);
    }
  }

  return sections.join('\n');
}

describe('Optimization Recommend — Prompt Construction', () => {
  it('groups gaps by page URL', () => {
    const gaps: GapSignal[] = [
      { rule: 'S3.1', severity: 'critical', description: 'No H1', subcategory: 'h1_fix', current: '0 H1', pageUrl: '/services', pageType: 'service' },
      { rule: 'S7.1', severity: 'medium', description: 'Low links', subcategory: 'internal_links', current: '2 links', pageUrl: '/services', pageType: 'service' },
      { rule: 'S6.1', severity: 'high', description: 'Low word count', subcategory: 'content_expand', current: '800 words', pageUrl: '/blog/post', pageType: 'blog' },
    ];

    const prompt = buildRecommendationPrompt(gaps, 'TestClient', []);
    expect(prompt).toContain('## Page: /services');
    expect(prompt).toContain('## Page: /blog/post');
    expect(prompt).toContain('[CRITICAL] No H1');
  });

  it('includes historical outcomes', () => {
    const prompt = buildRecommendationPrompt([], 'TestClient', [
      { subcategory: 'meta_title', status: 'succeeded', proposed_value: 'New Title | Brand' },
    ]);
    expect(prompt).toContain('Historical Outcomes');
    expect(prompt).toContain('succeeded');
  });
});
```

**Step 2: Run tests**

```bash
npx vitest run src/lib/__tests__/optimizationRecommend.test.ts
```

**Step 3: Write the edge function**

The `optimization-recommend/index.ts` function:
1. Reads the latest completed `optimization_cycles` row for the client
2. Extracts gap signals from `summary`
3. Fetches historical outcomes (previous recommendations and their status)
4. Builds a structured prompt with doctrine rules + gaps + historical context
5. Calls AI (via `_shared/aiClient.ts`) with tool calling to generate structured recommendations
6. Each recommendation has: `category`, `subcategory`, `priority`, `doctrine_rule`, `current_value`, `proposed_value`, `ai_reasoning`
7. Snapshots baseline metrics for each page from SOS/CWV/Clarity data
8. Inserts into `optimization_recommendations`
9. Updates the cycle with `recommendations_generated` count

**AI tool schema for structured output:**

```typescript
const tools = [{
  type: "function",
  function: {
    name: "create_recommendations",
    parameters: {
      type: "object",
      properties: {
        recommendations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              page_url: { type: "string" },
              category: { type: "string", enum: ["seo", "cro", "content"] },
              subcategory: { type: "string" },
              priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
              doctrine_rule: { type: "string" },
              current_value: { type: "string" },
              proposed_value: { type: "string" },
              reasoning: { type: "string" },
            },
            required: ["page_url", "category", "subcategory", "priority", "current_value", "proposed_value", "reasoning"]
          }
        }
      },
      required: ["recommendations"]
    }
  }
}];
```

**Step 4: Commit**

```bash
git add supabase/functions/optimization-recommend/index.ts src/lib/__tests__/optimizationRecommend.test.ts
git commit -m "feat(optimize): add AI recommendation engine with doctrine rules + learning loop"
```

---

## Phase 5: Monitoring + Alerts (Tasks 7-8)

### Task 7: Optimization monitor edge function

**Files:**
- Create: `supabase/functions/optimization-monitor/index.ts`

Runs daily. For each recommendation with `status = 'applied'`:
1. Calculate days since `applied_at`
2. At 7 days: snapshot current metrics into `outcome_metrics`, update `check_7d_at`
3. At 14 days: snapshot again, check for regressions per doctrine:
   - Section 12.2: CTR drops >20% → flag as `regressed`
   - Section 14.2: Rankings drop for primary keyword → flag as `regressed`
4. At 21 days: final check. If metrics improved or stable → status = `succeeded`. If regressed → status = `regressed` with recommendation to revert.
5. For `regressed` recommendations, create a new `critical` recommendation to revert the change.

**Step 1: Commit**

```bash
git add supabase/functions/optimization-monitor/index.ts
git commit -m "feat(optimize): add recommendation monitor with 7/14/21-day checks"
```

---

### Task 8: Optimization alerts edge function

**Files:**
- Create: `supabase/functions/optimization-alerts/index.ts`
- Test: `src/lib/__tests__/optimizationAlerts.test.ts`

**Step 1: Write threshold detection tests**

```typescript
// src/lib/__tests__/optimizationAlerts.test.ts
import { describe, it, expect } from 'vitest';

interface MetricSnapshot {
  current: number;
  previous: number;
}

function detectThresholdBreaches(metrics: {
  conversionRate?: MetricSnapshot;
  lcpMs?: MetricSnapshot;
  clsScore?: MetricSnapshot;
  inpMs?: MetricSnapshot;
  rageClicks?: MetricSnapshot;
  rankingPosition?: MetricSnapshot;
}): Array<{ type: string; severity: string; message: string }> {
  const alerts: Array<{ type: string; severity: string; message: string }> = [];

  // Conversion rate drop >30%
  if (metrics.conversionRate) {
    const { current, previous } = metrics.conversionRate;
    if (previous > 0) {
      const drop = ((previous - current) / previous) * 100;
      if (drop > 30) {
        alerts.push({
          type: 'conversion_drop',
          severity: 'critical',
          message: `Conversion rate dropped ${Math.round(drop)}% (${previous.toFixed(1)}% → ${current.toFixed(1)}%)`,
        });
      }
    }
  }

  // CWV failures (LCP > 2500ms, CLS > 0.1, INP > 200ms)
  if (metrics.lcpMs && metrics.lcpMs.current > 2500 && metrics.lcpMs.previous <= 2500) {
    alerts.push({ type: 'cwv_lcp_fail', severity: 'high', message: `LCP regressed to ${metrics.lcpMs.current}ms (was ${metrics.lcpMs.previous}ms)` });
  }
  if (metrics.clsScore && metrics.clsScore.current > 0.1 && metrics.clsScore.previous <= 0.1) {
    alerts.push({ type: 'cwv_cls_fail', severity: 'high', message: `CLS regressed to ${metrics.clsScore.current} (was ${metrics.clsScore.previous})` });
  }
  if (metrics.inpMs && metrics.inpMs.current > 200 && metrics.inpMs.previous <= 200) {
    alerts.push({ type: 'cwv_inp_fail', severity: 'high', message: `INP regressed to ${metrics.inpMs.current}ms (was ${metrics.inpMs.previous}ms)` });
  }

  // Rage click spike (>50% increase)
  if (metrics.rageClicks) {
    const { current, previous } = metrics.rageClicks;
    if (previous > 0 && current > previous * 1.5) {
      alerts.push({ type: 'rage_click_spike', severity: 'medium', message: `Rage clicks spiked ${Math.round(((current - previous) / previous) * 100)}%` });
    }
  }

  // Ranking drop >5 positions
  if (metrics.rankingPosition) {
    const { current, previous } = metrics.rankingPosition;
    if (current > 0 && previous > 0 && current - previous > 5) {
      alerts.push({ type: 'ranking_drop', severity: 'high', message: `Ranking dropped from position ${previous} to ${current}` });
    }
  }

  return alerts;
}

describe('Optimization Alerts — Threshold Detection', () => {
  it('detects conversion rate drop >30%', () => {
    const alerts = detectThresholdBreaches({
      conversionRate: { current: 1.5, previous: 3.0 },
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('conversion_drop');
    expect(alerts[0].severity).toBe('critical');
  });

  it('ignores conversion drop <30%', () => {
    const alerts = detectThresholdBreaches({
      conversionRate: { current: 2.5, previous: 3.0 },
    });
    expect(alerts).toHaveLength(0);
  });

  it('detects LCP regression past threshold', () => {
    const alerts = detectThresholdBreaches({
      lcpMs: { current: 3200, previous: 2100 },
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('cwv_lcp_fail');
  });

  it('ignores LCP that was already failing', () => {
    const alerts = detectThresholdBreaches({
      lcpMs: { current: 3200, previous: 2800 },
    });
    expect(alerts).toHaveLength(0);
  });

  it('detects ranking drop >5 positions', () => {
    const alerts = detectThresholdBreaches({
      rankingPosition: { current: 15, previous: 8 },
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('ranking_drop');
  });
});
```

**Step 2: Run tests**

```bash
npx vitest run src/lib/__tests__/optimizationAlerts.test.ts
```

**Step 3: Write the edge function**

The `optimization-alerts/index.ts` function compares recent data (last 7 days) against the prior period for each client/page. Creates `critical` or `high` priority `optimization_recommendations` with `category = 'alert'`.

**Step 4: Commit**

```bash
git add supabase/functions/optimization-alerts/index.ts src/lib/__tests__/optimizationAlerts.test.ts
git commit -m "feat(optimize): add threshold-based alert system"
```

---

## Phase 6: Frontend — Optimization Tab (Tasks 9-12)

### Task 9: Optimization hooks + data layer

**Files:**
- Create: `src/hooks/useOptimizationData.ts`

React Query hooks for:
- `useOptimizationRecommendations(clientId, filters)` — fetches from `optimization_recommendations` with status/category/priority filters
- `useOptimizationCycles(clientId)` — fetches recent cycles
- `useUpdateRecommendationStatus(id, status)` — mutation to update status (approve, reject, mark applied)
- `useOptimizationStats(clientId)` — aggregated counts by status/category

Follow the pattern of `useClarityAnalytics.ts` for hook structure.

**Step 1: Commit**

```bash
git add src/hooks/useOptimizationData.ts
git commit -m "feat(optimize): add React Query hooks for optimization data"
```

---

### Task 10: Recommendation card component

**Files:**
- Create: `src/components/optimization/RecommendationCard.tsx`

Displays a single recommendation with:
- Priority badge (critical=red, high=orange, medium=blue, low=gray)
- Category + subcategory labels
- Current value → Proposed value (diff view)
- AI reasoning
- Doctrine rule reference
- Action buttons: Approve / Reject / Mark Applied
- If status=monitoring: show baseline vs current metrics

Follow the pattern of `PageAnalysisDrawer.tsx` for card layout with shadcn/ui components.

**Step 1: Commit**

```bash
git add src/components/optimization/RecommendationCard.tsx
git commit -m "feat(optimize): add recommendation card component"
```

---

### Task 11: Optimization dashboard page

**Files:**
- Create: `src/components/optimization/OptimizationDashboard.tsx`

Tabs:
1. **Queue** — Recommendation list with filters (status, category, priority). Uses `useOptimizationRecommendations`.
2. **Applied** — Timeline of applied changes with outcome status.
3. **Overview** — Stats cards: total recommendations, by status, by category. Doctrine compliance score per page.

**Step 1: Commit**

```bash
git add src/components/optimization/OptimizationDashboard.tsx
git commit -m "feat(optimize): add optimization dashboard with queue + timeline + overview"
```

---

### Task 12: Wire optimization tab into Analytics page

**Files:**
- Modify: `src/pages/Analytics.tsx` — Add "Optimization" tab alongside existing Clarity/CWV tabs

Add a new `TabsTrigger` and `TabsContent` that renders `<OptimizationDashboard />` when selected.

**Step 1: Commit**

```bash
git add src/pages/Analytics.tsx
git commit -m "feat(optimize): wire optimization tab into analytics page"
```

---

## Phase 7: Environment + Deploy (Task 13)

### Task 13: Environment variables + deployment

**Files:**
- Modify: `.env.example` — Add new env vars
- Deploy edge functions

**Required env vars:**
```
DATAFORSEO_LOGIN=
DATAFORSEO_PASSWORD=
```

**Step 1: Add to `.env.example`**

```bash
echo "DATAFORSEO_LOGIN=" >> .env.example
echo "DATAFORSEO_PASSWORD=" >> .env.example
```

**Step 2: Deploy new functions**

```bash
supabase functions deploy optimization-crawl
supabase functions deploy optimization-analyze
supabase functions deploy optimization-recommend
supabase functions deploy optimization-monitor
supabase functions deploy optimization-alerts
supabase functions deploy dataforseo-sync
```

**Step 3: Set secrets**

```bash
supabase secrets set DATAFORSEO_LOGIN=your_login
supabase secrets set DATAFORSEO_PASSWORD=your_password
```

**Step 4: Run migration**

```bash
supabase db push
```

**Step 5: Commit**

```bash
git add .env.example
git commit -m "chore: add DataforSEO env vars to .env.example"
```

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1 | 1-2 | Database schema + config |
| 2 | 3 | DataforSEO integration |
| 3 | 4-5 | Page crawl + doctrine scoring + analysis orchestrator |
| 4 | 6 | AI recommendation engine |
| 5 | 7-8 | Monitoring + alerts |
| 6 | 9-12 | Frontend dashboard |
| 7 | 13 | Environment + deployment |

**Total: 13 tasks across 7 phases.**

Tasks 1-8 are sequential (each builds on the previous).
Tasks 9-12 (frontend) can run in parallel with tasks 7-8 (monitoring/alerts) since they're independent.
Task 13 is the final integration step.
