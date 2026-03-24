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
    const { client_id, auto_run_id, post_ids, flagged_post_ids, research_summary } = await req.json();

    if (!client_id || !auto_run_id) {
      return new Response(
        JSON.stringify({ error: 'client_id and auto_run_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get client's auto_blog_mode
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('auto_blog_mode')
      .eq('id', client_id)
      .maybeSingle();

    if (clientError) {
      console.error('Failed to fetch client:', clientError);
      return new Response(
        JSON.stringify({ error: clientError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mode = client?.auto_blog_mode ?? 'manual';

    // 2. Determine target status for passing posts
    const targetStatus = mode === 'auto_publish' ? 'scheduled' : 'pending_approval';

    const normalPostIds: string[] = Array.isArray(post_ids) ? post_ids : [];
    const flaggedIds: string[] = Array.isArray(flagged_post_ids) ? flagged_post_ids : [];

    // 3. Update passing posts to target status
    if (normalPostIds.length > 0) {
      const { error: passError } = await supabase
        .from('blog_posts')
        .update({ status: targetStatus })
        .in('id', normalPostIds);

      if (passError) {
        console.error('Failed to update passing posts:', passError);
        return new Response(
          JSON.stringify({ error: passError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 4. Update flagged posts to pending_approval (always needs human review)
    if (flaggedIds.length > 0) {
      const { error: flagError } = await supabase
        .from('blog_posts')
        .update({ status: 'pending_approval' })
        .in('id', flaggedIds);

      if (flagError) {
        console.error('Failed to update flagged posts:', flagError);
        return new Response(
          JSON.stringify({ error: flagError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 5. Update the auto_run record to completed
    const { error: runError } = await supabase
      .from('blog_auto_runs')
      .update({
        status: 'completed',
        articles_passed_gate: normalPostIds.length,
        articles_flagged: flaggedIds.length,
        research_summary: research_summary ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', auto_run_id);

    if (runError) {
      console.error('Failed to update auto_run record:', runError);
      return new Response(
        JSON.stringify({ error: runError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`blog-auto-queue: client=${client_id} mode=${mode} queued=${normalPostIds.length} flagged=${flaggedIds.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        posts_queued: normalPostIds.length,
        posts_flagged: flaggedIds.length,
        target_status: targetStatus,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in blog-auto-queue:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
