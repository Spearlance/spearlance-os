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

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: 'client_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching brand context bundle for client:', client_id);

    // Parallel-fetch all context in one shot
    const [
      clientResult,
      brandVoiceResult,
      clientBrandVoiceResult,
      avatarsResult,
      servicesResult,
      competitorsResult,
      blogPrefsResult,
      contentStrategyResult,
      topicsResult,
      postsResult,
      websitePagesResult,
    ] = await Promise.all([
      supabase
        .from('clients')
        .select('id, name, brand_name, industry, site_id, website_url, service_areas, auto_blog_mode')
        .eq('id', client_id)
        .maybeSingle(),

      supabase
        .from('brand_voice')
        .select('tone_adjectives, personality_traits, personality_description')
        .eq('client_id', client_id)
        .maybeSingle(),

      supabase
        .from('client_brand_voice')
        .select('story_summary')
        .eq('client_id', client_id)
        .maybeSingle(),

      supabase
        .from('avatars')
        .select('*')
        .eq('client_id', client_id)
        .order('created_at', { ascending: false }),

      supabase
        .from('client_services')
        .select('*')
        .eq('client_id', client_id),

      supabase
        .from('client_competitors')
        .select('*')
        .eq('client_id', client_id),

      supabase
        .from('blog_ai_preferences')
        .select('topics_to_avoid, custom_instructions')
        .eq('client_id', client_id)
        .maybeSingle(),

      supabase
        .from('blog_content_strategy')
        .select('*')
        .eq('client_id', client_id)
        .maybeSingle(),

      supabase
        .from('blog_topics')
        .select('*')
        .eq('client_id', client_id)
        .order('created_at', { ascending: false })
        .limit(100),

      supabase
        .from('blog_posts')
        .select('title, slug, status, seo_score, published_at, rejection_reason')
        .eq('client_id', client_id)
        .order('created_at', { ascending: false })
        .limit(50),

      supabase
        .from('website_pages')
        .select('page_path, page_title, meta_description')
        .eq('client_id', client_id)
        .eq('is_indexable', true)
        .not('page_path', 'like', '%my.duda.co%')
        .not('page_path', 'like', '%edit.duda.co%')
        .not('page_path', 'like', '%/editor/%')
        .not('page_path', 'like', '%/preview/%')
        .order('page_title'),
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
    if (clientBrandVoiceResult.error) errors.client_brand_voice = clientBrandVoiceResult.error.message;
    if (avatarsResult.error) errors.avatars = avatarsResult.error.message;
    if (servicesResult.error) errors.services = servicesResult.error.message;
    if (competitorsResult.error) errors.competitors = competitorsResult.error.message;
    if (blogPrefsResult.error) errors.blog_preferences = blogPrefsResult.error.message;
    if (contentStrategyResult.error) errors.content_strategy = contentStrategyResult.error.message;
    if (topicsResult.error) errors.topics = topicsResult.error.message;
    if (postsResult.error) errors.posts = postsResult.error.message;
    if (websitePagesResult.error) errors.website_pages = websitePagesResult.error.message;

    if (Object.keys(errors).length > 0) {
      console.warn('Non-fatal fetch errors:', errors);
    }

    const storySummary = clientBrandVoiceResult.data?.story_summary as Record<string, unknown> | null ?? null;

    const bundle = {
      client: clientResult.data,
      brand_voice: brandVoiceResult.data ?? {
        tone_adjectives: [],
        personality_traits: [],
        personality_description: null,
      },
      brand_story: {
        executive_summary: (storySummary?.executive_summary as string) ?? null,
        value_propositions: (storySummary?.value_propositions as string[]) ?? [],
        pain_points: (storySummary?.pain_points as string[]) ?? [],
        marketing_angles: (storySummary?.marketing_angles as string[]) ?? [],
      },
      avatars: avatarsResult.data ?? [],
      services: servicesResult.data ?? [],
      competitors: competitorsResult.data ?? [],
      blog_preferences: blogPrefsResult.data ?? {
        topics_to_avoid: null,
        custom_instructions: null,
      },
      content_strategy: contentStrategyResult.data ?? null,
      recent_topics: topicsResult.data ?? [],
      recent_posts: postsResult.data ?? [],
      website_pages: websitePagesResult.data ?? [],
      _meta: {
        fetched_at: new Date().toISOString(),
        ...(Object.keys(errors).length > 0 ? { partial_errors: errors } : {}),
      },
    };

    console.log('Brand context bundle assembled for:', clientResult.data.name, {
      avatars: bundle.avatars.length,
      services: bundle.services.length,
      competitors: bundle.competitors.length,
      recent_topics: bundle.recent_topics.length,
      recent_posts: bundle.recent_posts.length,
      website_pages: bundle.website_pages.length,
    });

    return new Response(
      JSON.stringify({ success: true, bundle }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in blog-auto-research:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
