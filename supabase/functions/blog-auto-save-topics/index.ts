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

  // Validate auto-blog API key
  const autoBlogKey = Deno.env.get('AUTO_BLOG_API_KEY');
  const providedKey = req.headers.get('x-auto-blog-key');

  if (!autoBlogKey || !providedKey || providedKey !== autoBlogKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized — invalid or missing x-auto-blog-key' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { client_id, auto_run_id, topics, month, year } = await req.json();

    if (!client_id || !topics || !Array.isArray(topics) || topics.length === 0 || !month || !year) {
      return new Response(
        JSON.stringify({ error: 'client_id, topics (non-empty array), month, and year are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Create the strategy batch record
    const { data: batch, error: batchError } = await supabase
      .from('blog_strategy_batches')
      .insert({
        client_id,
        auto_run_id: auto_run_id ?? null,
        month,
        year,
        total_topics: topics.length,
      })
      .select('id')
      .single();

    if (batchError || !batch) {
      console.error('Failed to create strategy batch:', batchError);
      return new Response(
        JSON.stringify({ error: batchError?.message ?? 'Failed to create strategy batch' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const batchId = batch.id;

    // 2. Insert all topics
    const topicRows = topics.map((t: {
      title: string;
      summary?: string;
      category?: string;
      keywords?: string[];
      suggested_publish_date?: string;
      priority?: number;
    }) => ({
      client_id,
      strategy_batch_id: batchId,
      auto_run_id: auto_run_id ?? null,
      title: t.title,
      summary: t.summary ?? null,
      category: t.category ?? null,
      keywords: t.keywords ?? null,
      suggested_publish_date: t.suggested_publish_date ?? null,
      priority: t.priority ?? null,
      ai_generated: true,
      status: 'idea',
    }));

    const { data: insertedTopics, error: topicsError } = await supabase
      .from('blog_topics')
      .insert(topicRows)
      .select('id');

    if (topicsError) {
      console.error('Failed to insert topics:', topicsError);
      return new Response(
        JSON.stringify({ error: topicsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const topicIds = (insertedTopics ?? []).map((t: { id: string }) => t.id);

    console.log(`Saved ${topicIds.length} topics for client ${client_id}, batch ${batchId}`);

    return new Response(
      JSON.stringify({
        success: true,
        batch_id: batchId,
        topics_created: topicIds.length,
        topic_ids: topicIds,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in blog-auto-save-topics:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
