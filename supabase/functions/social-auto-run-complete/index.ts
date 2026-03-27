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

  // Validate auto-social / auto-blog API key
  const autoBlogKey = Deno.env.get('AUTO_BLOG_API_KEY');
  const providedKey = req.headers.get('x-auto-social-key') ?? req.headers.get('x-auto-blog-key');

  if (!autoBlogKey || !providedKey || providedKey !== autoBlogKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized — invalid or missing x-auto-social-key' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const {
      auto_run_id,
      status,
      posts_generated,
      assets_matched,
      assets_ai_generated,
      error_log,
    } = await req.json();

    if (!auto_run_id || !status) {
      return new Response(
        JSON.stringify({ error: 'auto_run_id and status are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['completed', 'failed', 'partial'].includes(status)) {
      return new Response(
        JSON.stringify({ error: 'status must be "completed", "failed", or "partial"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const updatePayload: Record<string, unknown> = {
      status,
      completed_at: new Date().toISOString(),
    };

    if (posts_generated !== undefined) updatePayload.posts_generated = posts_generated;
    if (assets_matched !== undefined) updatePayload.assets_matched = assets_matched;
    if (assets_ai_generated !== undefined) updatePayload.assets_ai_generated = assets_ai_generated;
    if (error_log !== undefined) updatePayload.error_log = error_log;

    const { error: updateError } = await supabase
      .from('social_auto_runs')
      .update(updatePayload)
      .eq('id', auto_run_id);

    if (updateError) {
      console.error('Failed to update social_auto_run record:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`social-auto-run-complete: run ${auto_run_id} marked ${status} — posts=${posts_generated ?? 'n/a'} assets_matched=${assets_matched ?? 'n/a'} assets_ai=${assets_ai_generated ?? 'n/a'}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in social-auto-run-complete:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
