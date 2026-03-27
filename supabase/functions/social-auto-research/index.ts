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

  // Validate auto-social or auto-blog API key (both use AUTO_BLOG_API_KEY)
  const autoBlogKey = Deno.env.get('AUTO_BLOG_API_KEY');
  const providedKey =
    req.headers.get('x-auto-social-key') ?? req.headers.get('x-auto-blog-key');

  if (!autoBlogKey || !providedKey || providedKey !== autoBlogKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized — invalid or missing x-auto-social-key or x-auto-blog-key' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { client_id, month, year } = await req.json();

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: 'client_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Derive month/year for strategy lookup — default to current
    const now = new Date();
    const targetMonth = month ?? now.getMonth() + 1;
    const targetYear = year ?? now.getFullYear();

    console.log('Fetching social brand context bundle for client:', client_id, { targetMonth, targetYear });

    // Cutoff for recent posts: last 60 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const cutoffISO = cutoff.toISOString();

    // Parallel-fetch all context in one shot
    const [
      clientResult,
      brandVoiceResult,
      strategyResult,
      recentPostsResult,
      servicesResult,
      assetsResult,
      brandGuideResult,
    ] = await Promise.all([
      supabase
        .from('clients')
        .select('id, name, brand_name, industry, website_url, service_areas')
        .eq('id', client_id)
        .maybeSingle(),

      supabase
        .from('brand_voice')
        .select('tone_adjectives, personality_traits, personality_description')
        .eq('client_id', client_id)
        .maybeSingle(),

      // Month-specific strategy first, fallback to global
      supabase
        .from('social_media_strategy')
        .select('*')
        .eq('client_id', client_id)
        .or(`and(is_global.eq.false,month.eq.${targetMonth},year.eq.${targetYear}),is_global.eq.true`)
        .order('is_global', { ascending: true })
        .limit(1)
        .maybeSingle(),

      supabase
        .from('social_media_posts')
        .select('topic_category, caption_text, scheduled_date, template_id')
        .eq('client_id', client_id)
        .gte('scheduled_date', cutoffISO)
        .order('scheduled_date', { ascending: false })
        .limit(90),

      supabase
        .from('client_services')
        .select('service_name, description')
        .eq('client_id', client_id),

      supabase
        .from('assets')
        .select('id, title, file_url, ai_description')
        .eq('client_id', client_id)
        .not('ai_description', 'is', null)
        .limit(50),

      supabase
        .from('brand_guides')
        .select('primary_color, secondary_color, accent_color, aesthetic, imagery_style')
        .eq('client_id', client_id)
        .maybeSingle(),
    ]);

    if (!clientResult.data) {
      return new Response(
        JSON.stringify({ error: `No client found with id: ${client_id}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log any non-critical fetch errors but don't crash
    const errors: Record<string, string> = {};
    if (clientResult.error) errors.client = clientResult.error.message;
    if (brandVoiceResult.error) errors.brand_voice = brandVoiceResult.error.message;
    if (strategyResult.error) errors.strategy = strategyResult.error.message;
    if (recentPostsResult.error) errors.recent_posts = recentPostsResult.error.message;
    if (servicesResult.error) errors.services = servicesResult.error.message;
    if (assetsResult.error) errors.assets = assetsResult.error.message;
    if (brandGuideResult.error) errors.brand_guide = brandGuideResult.error.message;

    if (Object.keys(errors).length > 0) {
      console.warn('Non-fatal fetch errors:', errors);
    }

    console.log('Social brand context bundle assembled for:', clientResult.data.name, {
      recent_posts: recentPostsResult.data?.length ?? 0,
      services: servicesResult.data?.length ?? 0,
      assets: assetsResult.data?.length ?? 0,
      has_strategy: !!strategyResult.data,
      has_brand_voice: !!brandVoiceResult.data,
      has_brand_guide: !!brandGuideResult.data,
    });

    return new Response(
      JSON.stringify({
        success: true,
        client: clientResult.data,
        brand_voice: brandVoiceResult.data ?? {
          tone_adjectives: [],
          personality_traits: [],
          personality_description: null,
        },
        strategy: strategyResult.data ?? null,
        recent_posts: recentPostsResult.data ?? [],
        services: servicesResult.data ?? [],
        assets: assetsResult.data ?? [],
        brand_guide: brandGuideResult.data ?? null,
        _meta: {
          fetched_at: new Date().toISOString(),
          target_month: targetMonth,
          target_year: targetYear,
          ...(Object.keys(errors).length > 0 ? { partial_errors: errors } : {}),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in social-auto-research:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
