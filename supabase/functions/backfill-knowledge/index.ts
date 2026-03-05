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
          if (!contentText || contentText.length < 10) continue;

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
