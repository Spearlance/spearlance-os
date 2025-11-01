import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!authHeader || !supabaseAnonKey || !authHeader.includes(supabaseAnonKey)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('Starting materialized view refresh...');

    const startTime = Date.now();
    
    const results = await Promise.allSettled([
      supabase.rpc('refresh_materialized_view', { view_name: 'page_daily' }),
      supabase.rpc('refresh_materialized_view', { view_name: 'content_daily' }),
      supabase.rpc('refresh_materialized_view', { view_name: 'sources_daily' })
    ]);

    const duration = Date.now() - startTime;
    
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.error('Some views failed to refresh:', failures);
    }

    console.log(`Views refreshed in ${duration}ms`);

    return new Response(JSON.stringify({ 
      success: true,
      duration_ms: duration,
      results: results.map((r, i) => ({
        view: ['page_daily', 'content_daily', 'sources_daily'][i],
        status: r.status,
        error: r.status === 'rejected' ? r.reason : null
      }))
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error refreshing views:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to refresh views',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
