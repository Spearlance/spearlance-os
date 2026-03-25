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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching all clients with auto-blog enabled');

    const { data, error } = await supabase
      .from('clients')
      .select('id, name, site_id, auto_blog_mode')
      .neq('auto_blog_mode', 'off')
      .not('auto_blog_mode', 'is', null);

    if (error) {
      console.error('Error fetching clients:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clients = data ?? [];

    console.log(`Found ${clients.length} clients with auto-blog enabled`);

    return new Response(
      JSON.stringify({ success: true, clients }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in blog-auto-list-clients:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
