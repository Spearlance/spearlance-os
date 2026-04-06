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
    const { client_id, trigger_type, month, year } = await req.json();

    if (!client_id || !trigger_type || month === undefined || year === undefined) {
      return new Response(
        JSON.stringify({ error: 'client_id, trigger_type, month, and year are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['scheduled', 'manual'].includes(trigger_type)) {
      return new Response(
        JSON.stringify({ error: 'trigger_type must be "scheduled" or "manual"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: run, error: runError } = await supabase
      .from('social_auto_runs')
      .insert({
        client_id,
        trigger_type,
        month,
        year,
        status: 'running',
      })
      .select('id')
      .single();

    if (runError || !run) {
      console.error('Failed to create social_auto_run record:', runError);
      return new Response(
        JSON.stringify({ error: runError?.message ?? 'Failed to create social_auto_run record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`social-auto-run-start: created run ${run.id} for client=${client_id} trigger=${trigger_type} month=${month} year=${year}`);

    return new Response(
      JSON.stringify({
        success: true,
        auto_run_id: run.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in social-auto-run-start:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
