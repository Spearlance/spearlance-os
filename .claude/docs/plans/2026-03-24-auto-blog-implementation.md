# Auto-Blog System v2 Implementation Plan


**Goal:** Build an intelligent auto-blog pipeline where a scheduled Claude Code remote agent orchestrates edge functions to research, write, self-review, and queue SEO-optimized blog posts for approval.

**Architecture:** Hybrid — scheduled remote agent (Anthropic cloud) reads skill files/SEO doctrine from git, reads published blogs via Duda MCP, and orchestrates Supabase edge functions (which hold API keys) via curl. Edge functions are thin wrappers; the agent is the brain.

**Tech Stack:** Supabase (Deno edge functions, Postgres), OpenRouter AI (Claude Sonnet 4.6), Firecrawl (competitor scraping), React + shadcn/ui (frontend), Claude Code `/schedule` (remote triggers)

**Design Doc:** `.claude/docs/plans/2026-03-24-auto-blog-system-design.md`

---

## Phase 1: Database Schema

### Task 1: Create migration for auto-blog tables and columns

**Files:**
- Create: `supabase/migrations/20260324000001_auto_blog_system.sql`

**Step 1: Write the migration SQL**

```sql
-- Auto-blog run tracking
CREATE TABLE IF NOT EXISTS blog_auto_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  trigger_type text NOT NULL CHECK (trigger_type IN ('scheduled', 'manual')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  topics_generated int NOT NULL DEFAULT 0,
  articles_generated int NOT NULL DEFAULT 0,
  articles_passed_gate int NOT NULL DEFAULT 0,
  articles_flagged int NOT NULL DEFAULT 0,
  research_summary jsonb,
  completed_at timestamptz,
  error_log text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for querying runs by client
CREATE INDEX idx_blog_auto_runs_client_id ON blog_auto_runs(client_id);
CREATE INDEX idx_blog_auto_runs_status ON blog_auto_runs(status);

-- Enable RLS
ALTER TABLE blog_auto_runs ENABLE ROW LEVEL SECURITY;

-- RLS policies (authenticated users can read runs for their org's clients)
CREATE POLICY "Users can view blog auto runs"
  ON blog_auto_runs FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE id IN (
        SELECT client_id FROM user_client_access WHERE user_id = auth.uid()
      )
    )
  );

-- Add new columns to blog_posts
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS auto_run_id uuid REFERENCES blog_auto_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quality_scores jsonb,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS revision_count int NOT NULL DEFAULT 0;

-- Index for approval queue queries
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_auto_run_id ON blog_posts(auto_run_id);

-- Add auto-blog settings to clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS auto_blog_mode text NOT NULL DEFAULT 'off'
    CHECK (auto_blog_mode IN ('off', 'queue', 'auto_publish')),
  ADD COLUMN IF NOT EXISTS auto_blog_schedule text;
```

**Step 2: Apply migration to Supabase**

Run: `npx supabase db push`
Expected: Migration applies successfully, no errors.

**Step 3: Regenerate TypeScript types**

Run: `npx supabase gen types typescript --project-id <PROJECT_ID> > src/integrations/supabase/types.ts`
Expected: types.ts updated with `blog_auto_runs` table, new `blog_posts` columns, new `clients` columns.

**Step 4: Verify types include new schema**

Search `src/integrations/supabase/types.ts` for `blog_auto_runs`, `auto_run_id`, `quality_scores`, `rejection_reason`, `revision_count`, `auto_blog_mode`, `auto_blog_schedule`.
Expected: All present in Row, Insert, and Update types.

**Step 5: Commit**

```bash
git add supabase/migrations/20260324000001_auto_blog_system.sql src/integrations/supabase/types.ts
git commit -m "feat(db): add auto-blog schema — blog_auto_runs table, blog_posts quality columns, clients auto-mode settings"
```

---

## Phase 2: Edge Functions — Research & Data Layer

### Task 2: blog-auto-research edge function

Returns the complete brand context bundle for a client in a single call. This is what the remote agent curls to understand the client before generating content.

**Files:**
- Create: `supabase/functions/blog-auto-research/index.ts`

**Step 1: Write the edge function**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_id } = await req.json();
    if (!client_id) throw new Error('client_id is required');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parallel fetch all brand context
    const [
      { data: client },
      { data: brandVoice },
      { data: clientBrandVoice },
      { data: avatars },
      { data: services },
      { data: competitors },
      { data: aiPreferences },
      { data: strategy },
      { data: existingTopics },
      { data: publishedPosts },
      { data: analyzedPages },
    ] = await Promise.all([
      supabase.from('clients').select('*').eq('id', client_id).single(),
      supabase.from('brand_voice').select('*').eq('client_id', client_id).maybeSingle(),
      supabase.from('client_brand_voice').select('*').eq('client_id', client_id).maybeSingle(),
      supabase.from('avatars').select('*').eq('client_id', client_id).order('created_at', { ascending: false }),
      supabase.from('client_services').select('*').eq('client_id', client_id),
      supabase.from('client_competitors').select('*').eq('client_id', client_id),
      supabase.from('blog_ai_preferences').select('*').eq('client_id', client_id).maybeSingle(),
      supabase.from('blog_content_strategy').select('*').eq('client_id', client_id).eq('is_global', true).maybeSingle(),
      supabase.from('blog_topics').select('topic_title, category, keywords, suggested_publish_date, status')
        .eq('client_id', client_id).order('suggested_publish_date', { ascending: false }).limit(100),
      supabase.from('blog_posts').select('title, slug, status, seo_score, published_at, rejection_reason')
        .eq('client_id', client_id).order('created_at', { ascending: false }).limit(50),
      supabase.from('website_pages')
        .select('page_path, page_title, meta_description')
        .eq('client_id', client_id).eq('is_indexable', true)
        .not('page_path', 'like', '%my.duda.co%')
        .not('page_path', 'like', '%edit.duda.co%')
        .order('page_title'),
    ]);

    if (!client) throw new Error('Client not found');

    // Extract story summary
    const storySummary = clientBrandVoice?.story_summary as any;

    return new Response(JSON.stringify({
      client: {
        id: client.id,
        name: client.name,
        brand_name: client.brand_name,
        industry: client.industry,
        site_id: client.site_id,
        website_url: client.website_url,
        service_areas: client.service_areas,
        auto_blog_mode: client.auto_blog_mode,
      },
      brand_voice: {
        tone_adjectives: brandVoice?.tone_adjectives || [],
        personality_traits: brandVoice?.personality_traits || [],
        personality_description: brandVoice?.personality_description || '',
      },
      brand_story: {
        executive_summary: storySummary?.executive_summary || '',
        value_propositions: storySummary?.value_propositions || [],
        pain_points: storySummary?.pain_points || [],
        marketing_angles: storySummary?.marketing_angles || [],
      },
      avatars: (avatars || []).map(a => ({
        id: a.id,
        name: a.avatar_name,
        summary: a.ai_summary,
        pain_points: a.pains,
        goals: a.goals,
        keywords: a.keywords,
      })),
      services: (services || []).map(s => ({ name: s.name, description: s.description })),
      competitors: (competitors || []).map(c => ({
        name: c.name,
        website: c.website,
        differentiators: c.differentiators,
      })),
      ai_preferences: {
        topics_to_avoid: aiPreferences?.topics_to_avoid || '',
        custom_instructions: aiPreferences?.custom_instructions || '',
      },
      strategy: strategy ? {
        posting_frequency: strategy.posting_frequency,
        selected_days: strategy.selected_days,
        content_mix: strategy.content_mix,
      } : null,
      existing_topics: existingTopics || [],
      published_posts: publishedPosts || [],
      analyzed_pages: analyzedPages || [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in blog-auto-research:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

**Step 2: Deploy and test**

Run: `npx supabase functions deploy blog-auto-research`
Then test: `curl -X POST <SUPABASE_URL>/functions/v1/blog-auto-research -H "Authorization: Bearer <SERVICE_KEY>" -H "Content-Type: application/json" -d '{"client_id":"<TEST_CLIENT_ID>"}'`
Expected: JSON response with all brand context fields populated.

**Step 3: Commit**

```bash
git add supabase/functions/blog-auto-research/index.ts
git commit -m "feat(edge-fn): add blog-auto-research — returns complete brand context bundle for agent orchestration"
```

---

### Task 3: blog-auto-competitors edge function

Scrapes competitor blogs via Firecrawl to find content gaps and trending topics.

**Files:**
- Create: `supabase/functions/blog-auto-competitors/index.ts`

**Step 1: Write the edge function**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_id } = await req.json();
    if (!client_id) throw new Error('client_id is required');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get competitors with websites
    const { data: competitors } = await supabase
      .from('client_competitors')
      .select('name, website')
      .eq('client_id', client_id)
      .not('website', 'is', null);

    if (!competitors || competitors.length === 0) {
      return new Response(JSON.stringify({
        competitors: [],
        message: 'No competitors with websites found',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no Firecrawl key, return competitor list without scraping
    if (!firecrawlKey) {
      return new Response(JSON.stringify({
        competitors: competitors.map(c => ({
          name: c.name,
          website: c.website,
          recent_posts: [],
          error: 'FIRECRAWL_API_KEY not configured',
        })),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Scrape each competitor's blog (limit to 3 competitors)
    const results = await Promise.allSettled(
      competitors.slice(0, 3).map(async (competitor) => {
        const blogUrl = competitor.website?.replace(/\/$/, '') + '/blog';

        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: blogUrl,
            formats: ['markdown'],
            onlyMainContent: true,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Firecrawl error for ${blogUrl}: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        return {
          name: competitor.name,
          website: competitor.website,
          blog_url: blogUrl,
          content: data.data?.markdown?.substring(0, 5000) || '', // Limit size
        };
      })
    );

    const competitorData = results.map((result, idx) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        name: competitors[idx].name,
        website: competitors[idx].website,
        blog_url: '',
        content: '',
        error: result.reason?.message || 'Scrape failed',
      };
    });

    return new Response(JSON.stringify({ competitors: competitorData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in blog-auto-competitors:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

**Step 2: Add FIRECRAWL_API_KEY to .env.example**

Add `FIRECRAWL_API_KEY=` to `.env.example` if not already present.

**Step 3: Deploy and test**

Run: `npx supabase functions deploy blog-auto-competitors`
Test: `curl -X POST <SUPABASE_URL>/functions/v1/blog-auto-competitors -H "Authorization: Bearer <SERVICE_KEY>" -H "Content-Type: application/json" -d '{"client_id":"<TEST_CLIENT_ID>"}'`
Expected: JSON response with competitor blog data (or graceful degradation if no Firecrawl key).

**Step 4: Commit**

```bash
git add supabase/functions/blog-auto-competitors/index.ts
git commit -m "feat(edge-fn): add blog-auto-competitors — Firecrawl scraping for competitive content analysis"
```

---

### Task 4: blog-auto-write edge function

Upgraded article generation that accepts research context, SEO rules, and optional revision instructions. The intelligence of WHAT to write comes from the agent's prompt; this function handles the actual AI call.

**Files:**
- Create: `supabase/functions/blog-auto-write/index.ts`

**Step 1: Write the edge function**

This is a refactored version of `blog-generate-article` with these key differences:
- Accepts pre-built `system_prompt` and `user_prompt` from the agent (agent controls the intelligence)
- Accepts `revision_instructions` for quality gate fix cycles
- Returns structured quality metrics alongside content
- Saves to `blog_posts` with `auto_run_id` and `quality_scores`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AI_CHAT_URL, AI_MODELS, aiHeaders } from '../_shared/aiClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/--+/g, '-').trim();
}

function countWords(text: string): number {
  return text.replace(/<[^>]*>/g, '').split(/\s+/).filter(w => w.length > 0).length;
}

function countHeadings(html: string): { h1: number; h2: number; h3: number } {
  return {
    h1: (html.match(/<h1[\s>]/gi) || []).length,
    h2: (html.match(/<h2[\s>]/gi) || []).length,
    h3: (html.match(/<h3[\s>]/gi) || []).length,
  };
}

function countInternalLinks(html: string): number {
  return (html.match(/<a\s+href=["']\/[^"']*["']/gi) || []).length;
}

function calculateKeywordDensity(html: string, keyword: string): number {
  if (!keyword) return 0;
  const plainText = html.replace(/<[^>]*>/g, '').toLowerCase();
  const words = plainText.split(/\s+/);
  const keywordWords = keyword.toLowerCase().split(/\s+/);
  let count = 0;
  for (let i = 0; i <= words.length - keywordWords.length; i++) {
    const slice = words.slice(i, i + keywordWords.length).join(' ');
    if (slice === keyword.toLowerCase()) count++;
  }
  return words.length > 0 ? (count * keywordWords.length) / words.length * 100 : 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      client_id,
      auto_run_id,
      topic_id,
      title,
      meta_description,
      keywords = [],
      system_prompt,
      user_prompt,
      revision_instructions,
      existing_post_id,
    } = await req.json();

    if (!client_id || !title || !system_prompt) {
      throw new Error('client_id, title, and system_prompt are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: system_prompt },
    ];

    if (revision_instructions && existing_post_id) {
      // Fetch existing content for revision
      const { data: existingPost } = await supabase
        .from('blog_posts')
        .select('content')
        .eq('id', existing_post_id)
        .single();

      messages.push({
        role: 'user',
        content: `Here is the current article:\n\n${existingPost?.content || ''}\n\nRevision instructions:\n${revision_instructions}\n\nRewrite the article with these fixes applied. Return the complete revised article.`,
      });
    } else {
      messages.push({
        role: 'user',
        content: user_prompt || 'Write the complete blog article now.',
      });
    }

    console.log('Auto-write generating:', title, revision_instructions ? '(revision)' : '(initial)');

    const aiResponse = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify({
        model: AI_MODELS.TEXT,
        messages,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI API error: ${aiResponse.status} ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;

    // Calculate quality metrics
    const wordCount = countWords(content);
    const headings = countHeadings(content);
    const internalLinkCount = countInternalLinks(content);
    const primaryKeywordDensity = keywords[0] ? calculateKeywordDensity(content, keywords[0]) : 0;
    const secondaryKeywordDensity = keywords[1] ? calculateKeywordDensity(content, keywords[1]) : 0;

    const qualityScores = {
      word_count: wordCount,
      h1_count: headings.h1,
      h2_count: headings.h2,
      h3_count: headings.h3,
      internal_link_count: internalLinkCount,
      primary_keyword_density: Math.round(primaryKeywordDensity * 100) / 100,
      secondary_keyword_density: Math.round(secondaryKeywordDensity * 100) / 100,
    };

    const slug = slugify(title);
    const plainText = content.replace(/<[^>]*>/g, '');
    const excerpt = plainText.substring(0, 150).trim() + '...';

    if (existing_post_id) {
      // Update existing post (revision cycle)
      const { data: updatedPost, error } = await supabase
        .from('blog_posts')
        .update({
          content,
          excerpt,
          quality_scores: qualityScores,
          revision_count: supabase.rpc ? undefined : undefined, // Will increment in SQL
        })
        .eq('id', existing_post_id)
        .select()
        .single();

      // Increment revision_count
      await supabase.rpc('increment_revision_count', { post_id: existing_post_id }).catch(() => {
        // Fallback: raw update if RPC doesn't exist yet
        supabase.from('blog_posts')
          .update({ revision_count: (updatedPost?.revision_count || 0) + 1 })
          .eq('id', existing_post_id);
      });

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        blog_post_id: existing_post_id,
        quality_scores: qualityScores,
        is_revision: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert new post
    const { data: blogPost, error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        client_id,
        auto_run_id: auto_run_id || null,
        topic_id: topic_id || null,
        title,
        slug,
        meta_description: meta_description || excerpt,
        content,
        excerpt,
        focus_keyword: keywords[0] || null,
        target_keywords: keywords,
        quality_scores: qualityScores,
        status: 'auto_draft',
        ai_model: AI_MODELS.TEXT,
        generation_prompt: system_prompt.substring(0, 10000),
        revision_count: 0,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Link topic if provided
    if (topic_id) {
      await supabase
        .from('blog_topics')
        .update({ status: 'in_progress', blog_post_id: blogPost.id })
        .eq('id', topic_id);
    }

    return new Response(JSON.stringify({
      success: true,
      blog_post_id: blogPost.id,
      quality_scores: qualityScores,
      is_revision: false,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in blog-auto-write:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

**Step 2: Deploy and test**

Run: `npx supabase functions deploy blog-auto-write`
Expected: Function deploys successfully.

**Step 3: Commit**

```bash
git add supabase/functions/blog-auto-write/index.ts
git commit -m "feat(edge-fn): add blog-auto-write — AI article generation with quality metrics and revision support"
```

---

### Task 5: blog-auto-save-topics edge function

Batch saves agent-generated topics to Supabase.

**Files:**
- Create: `supabase/functions/blog-auto-save-topics/index.ts`

**Step 1: Write the edge function**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_id, auto_run_id, topics, month, year } = await req.json();

    if (!client_id || !topics || !Array.isArray(topics)) {
      throw new Error('client_id and topics array are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create batch record
    const { data: batch, error: batchError } = await supabase
      .from('blog_strategy_batches')
      .insert({
        client_id,
        month: month || new Date().getMonth() + 1,
        year: year || new Date().getFullYear(),
        total_topics: topics.length,
      })
      .select()
      .single();

    if (batchError) throw batchError;

    // Insert topics
    const topicsToInsert = topics.map((topic: any) => ({
      client_id,
      strategy_batch_id: batch.id,
      topic_title: topic.title,
      summary: topic.summary,
      category: topic.category,
      keywords: topic.keywords || [],
      suggested_publish_date: topic.suggested_publish_date,
      status: 'idea',
      priority: topic.priority || 'medium',
      ai_generated: true,
    }));

    const { data: created, error: topicsError } = await supabase
      .from('blog_topics')
      .insert(topicsToInsert)
      .select();

    if (topicsError) throw topicsError;

    return new Response(JSON.stringify({
      success: true,
      batch_id: batch.id,
      topics_created: created.length,
      topic_ids: created.map(t => t.id),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in blog-auto-save-topics:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

**Step 2: Deploy and commit**

```bash
npx supabase functions deploy blog-auto-save-topics
git add supabase/functions/blog-auto-save-topics/index.ts
git commit -m "feat(edge-fn): add blog-auto-save-topics — batch topic persistence for agent pipeline"
```

---

### Task 6: blog-auto-queue edge function

Sets post status and logs the auto-run completion.

**Files:**
- Create: `supabase/functions/blog-auto-queue/index.ts`

**Step 1: Write the edge function**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      client_id,
      auto_run_id,
      post_ids,
      flagged_post_ids = [],
      research_summary,
    } = await req.json();

    if (!client_id || !auto_run_id) {
      throw new Error('client_id and auto_run_id are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get client's auto-blog mode
    const { data: client } = await supabase
      .from('clients')
      .select('auto_blog_mode')
      .eq('id', client_id)
      .single();

    const mode = client?.auto_blog_mode || 'queue';

    // Set status based on mode
    const targetStatus = mode === 'auto_publish' ? 'scheduled' : 'pending_approval';

    // Update passed posts
    if (post_ids && post_ids.length > 0) {
      await supabase
        .from('blog_posts')
        .update({ status: targetStatus })
        .in('id', post_ids);
    }

    // Update flagged posts
    if (flagged_post_ids.length > 0) {
      await supabase
        .from('blog_posts')
        .update({ status: 'pending_approval' }) // Always queue flagged posts for review
        .in('id', flagged_post_ids);
    }

    // Update the auto-run record
    await supabase
      .from('blog_auto_runs')
      .update({
        status: 'completed',
        articles_passed_gate: post_ids?.length || 0,
        articles_flagged: flagged_post_ids.length,
        research_summary,
        completed_at: new Date().toISOString(),
      })
      .eq('id', auto_run_id);

    return new Response(JSON.stringify({
      success: true,
      mode,
      posts_queued: post_ids?.length || 0,
      posts_flagged: flagged_post_ids.length,
      target_status: targetStatus,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in blog-auto-queue:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

**Step 2: Deploy and commit**

```bash
npx supabase functions deploy blog-auto-queue
git add supabase/functions/blog-auto-queue/index.ts
git commit -m "feat(edge-fn): add blog-auto-queue — sets post status and logs run completion"
```

---

### Task 7: blog-auto-run-start edge function

Creates a new `blog_auto_runs` record and returns the run ID. Called by the agent at the start of each run.

**Files:**
- Create: `supabase/functions/blog-auto-run-start/index.ts`

**Step 1: Write the edge function**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_id, trigger_type = 'scheduled' } = await req.json();
    if (!client_id) throw new Error('client_id is required');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: run, error } = await supabase
      .from('blog_auto_runs')
      .insert({
        client_id,
        trigger_type,
        status: 'running',
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      auto_run_id: run.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in blog-auto-run-start:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

**Step 2: Deploy and commit**

```bash
npx supabase functions deploy blog-auto-run-start
git add supabase/functions/blog-auto-run-start/index.ts
git commit -m "feat(edge-fn): add blog-auto-run-start — creates auto-run tracking record"
```

---

## Phase 3: UI — Approval Queue & Auto-Mode

### Task 8: Approval Queue tab component

Shows `pending_approval` posts with quality scores, approve/reject actions.

**Files:**
- Create: `src/components/blog/BlogApprovalQueue.tsx`
- Modify: `src/components/blog/BlogWriterMain.tsx`

**Step 1: Write the BlogApprovalQueue component**

Build a component that:
- Queries `blog_posts` where `status = 'pending_approval'` for the selected client
- Displays each post as a card with title, quality scores (word count, SEO, readability), and excerpt
- Has Approve button (sets status to 'scheduled'), Reject button (prompts for reason, sets status to 'rejected'), and Edit button (opens BlogArticleEditor)
- Shows quality score badges with color coding (green if passes threshold, red if not)

**Step 2: Wire into BlogWriterMain**

Add an "Approval Queue" tab to the existing TabsList in `BlogWriterMain.tsx` with a badge showing pending count.

**Step 3: Verify it renders**

Run: `npm run dev`
Navigate to Blog Writer → Approval Queue tab.
Expected: Tab shows, queries run (even if empty results).

**Step 4: Commit**

```bash
git add src/components/blog/BlogApprovalQueue.tsx src/components/blog/BlogWriterMain.tsx
git commit -m "feat(ui): add blog approval queue — review, approve, and reject auto-generated drafts"
```

---

### Task 9: Auto-Mode toggle and settings

Per-client auto-blog mode toggle in the Strategy tab.

**Files:**
- Create: `src/components/blog/BlogAutoModeSettings.tsx`
- Modify: `src/components/blog/BlogWriterMain.tsx` (add to strategy tab)

**Step 1: Write the BlogAutoModeSettings component**

Build a component that:
- Reads `clients.auto_blog_mode` and `clients.auto_blog_schedule` for selected client
- Shows a RadioGroup: Off / Queue (B) / Auto-Publish (A)
- Shows warning for Auto-Publish mode
- Saves via mutation to `clients` table

**Step 2: Add to Strategy tab in BlogWriterMain**

Place below the existing `BlogAIPreferencesForm` in the strategy tab.

**Step 3: Verify it renders and saves**

Run: `npm run dev`
Navigate to Blog Writer → Strategy → scroll to Auto-Mode section.
Expected: Toggle renders, switching modes saves to DB.

**Step 4: Commit**

```bash
git add src/components/blog/BlogAutoModeSettings.tsx src/components/blog/BlogWriterMain.tsx
git commit -m "feat(ui): add auto-blog mode toggle — off/queue/auto-publish per client"
```

---

### Task 10: Auto-Run History component

Shows past auto-blog runs with stats.

**Files:**
- Create: `src/components/blog/BlogAutoRunHistory.tsx`
- Modify: `src/components/blog/BlogWriterMain.tsx`

**Step 1: Write the BlogAutoRunHistory component**

Build a component that:
- Queries `blog_auto_runs` for the selected client, ordered by `triggered_at` desc
- Displays in a table: date, trigger type, status, topics generated, articles passed, articles flagged
- Each row expandable to show `research_summary` and `error_log`

**Step 2: Add as a section in the Strategy tab or new tab**

Add below AutoModeSettings in the strategy tab.

**Step 3: Verify it renders**

Run: `npm run dev`
Expected: Component renders (empty state if no runs).

**Step 4: Commit**

```bash
git add src/components/blog/BlogAutoRunHistory.tsx src/components/blog/BlogWriterMain.tsx
git commit -m "feat(ui): add auto-run history — tracks past auto-blog pipeline runs with stats"
```

---

## Phase 4: Agent Prompt & Scheduled Trigger

### Task 11: Write the auto-blog agent prompt

The prompt that powers the scheduled remote agent. This is the brain of the system.

**Files:**
- Create: `.claude/prompts/auto-blog-agent.md`

**Step 1: Write the agent prompt**

This prompt must be self-contained (remote agent has zero context). It encodes the full pipeline:

1. Read SEO doctrine from `.claude/rules/seo-doctrine.md`
2. Read content strategy skill from git checkout
3. Curl `blog-auto-run-start` to create run record
4. Curl `blog-auto-research` for brand context
5. Read published blogs via Duda MCP (list blog posts)
6. Curl `blog-auto-competitors` for content gaps
7. Generate topic plan (agent does this itself using gathered context)
8. Curl `blog-auto-save-topics` to persist topics
9. For each topic (up to configured limit):
   a. Build system prompt with brand context + SEO doctrine rules
   b. Curl `blog-auto-write` to generate article
   c. Read quality scores from response
   d. If quality gate fails → build revision instructions → curl `blog-auto-write` again with `revision_instructions`
   e. Max 3 revision cycles
10. Curl `blog-auto-queue` to finalize statuses
11. Log completion

The prompt should reference the Supabase URL and service role key as environment variables the remote agent will need configured.

**Step 2: Commit**

```bash
git add .claude/prompts/auto-blog-agent.md
git commit -m "feat(agent): add auto-blog agent prompt — full pipeline for scheduled remote execution"
```

---

### Task 12: Create the scheduled trigger

Use `/schedule` to create the remote trigger on Anthropic's cloud.

**Step 1: Create the trigger**

Use `RemoteTrigger` tool with:
- Name: `auto-blog-pipeline`
- Cron: `0 10 * * 1` (every Monday at 10am UTC = 6am ET)
- Model: `claude-sonnet-4-6`
- Git repo: `https://github.com/garrett-handley/spearlance-os`
- MCP connections: Duda (for reading published blogs)
- Allowed tools: `Bash, Read, Write, Edit, Glob, Grep`
- Prompt: contents of `.claude/prompts/auto-blog-agent.md`

**Step 2: Verify trigger created**

List triggers and confirm `auto-blog-pipeline` appears with correct schedule.

**Step 3: Test run**

Run the trigger manually to verify the pipeline works end-to-end.
Expected: Agent starts, reads files, curls edge functions, generates topics and articles.

**Step 4: Commit any adjustments**

```bash
git add -A
git commit -m "feat(trigger): configure scheduled auto-blog agent — weekly Monday 6am ET"
```

---

## Phase 5: Populate Content Strategy Knowledge

### Task 13: Populate the content-strategy knowledge file

The `.claude/knowledge/client/content-strategy.md` is currently empty. Populate it with the framework the agent will reference.

**Files:**
- Modify: `.claude/knowledge/client/content-strategy.md`

**Step 1: Write the content strategy framework**

Populate with:
- Content pillars definition (maps to client verticals)
- Content types and their SEO doctrine thresholds
- Quality gate checklist (encoded from SEO doctrine)
- Learning loop signals
- Publishing cadence rules

This becomes the agent's reference for what good content looks like.

**Step 2: Commit**

```bash
git add .claude/knowledge/client/content-strategy.md
git commit -m "docs: populate content-strategy knowledge — framework for auto-blog quality standards"
```

---

## Summary

| Phase | Tasks | What |
|-------|-------|------|
| 1 — Database | 1 | Migration: `blog_auto_runs` table, `blog_posts` new columns, `clients` auto-mode columns |
| 2 — Edge Functions | 2-7 | `blog-auto-research`, `blog-auto-competitors`, `blog-auto-write`, `blog-auto-save-topics`, `blog-auto-queue`, `blog-auto-run-start` |
| 3 — UI | 8-10 | Approval queue, auto-mode toggle, run history |
| 4 — Agent | 11-12 | Agent prompt, scheduled trigger |
| 5 — Knowledge | 13 | Content strategy framework |

13 tasks · executing subagent-driven (reason: sequential DB → edge fns → UI → agent dependency chain, with review checkpoints between phases)

**Parallelizable within phases:**
- Tasks 2-3 (research + competitors) can run in parallel
- Tasks 5-7 (save-topics, queue, run-start) can run in parallel
- Tasks 8-10 (UI components) can run in parallel after Phase 2
