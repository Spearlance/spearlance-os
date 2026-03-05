import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { generateEmbedding, buildContentText } from '../_shared/embeddings.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // INSERT or UPDATE
    if (!record?.client_id) {
      // For website_form_submissions, client_id might come from site_id lookup
      // For now, skip rows without client_id
      return new Response(JSON.stringify({ skipped: true, reason: 'No client_id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For tasks, fetch comments to enrich content
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

    const embedding = await generateEmbedding(contentText);

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
