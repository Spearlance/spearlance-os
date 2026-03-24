import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1/scrape';
const MAX_COMPETITORS = 3;
const MAX_CONTENT_LENGTH = 5000;

interface CompetitorResult {
  name: string;
  website: string;
  blog_url: string;
  content?: string;
  error?: string;
}

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

    console.log('Fetching competitors for client:', client_id);

    const { data: competitors, error: dbError } = await supabase
      .from('client_competitors')
      .select('name, website')
      .eq('client_id', client_id)
      .not('website', 'is', null)
      .not('website', 'eq', '')
      .limit(MAX_COMPETITORS);

    if (dbError) {
      console.error('DB error fetching competitors:', dbError);
      return new Response(
        JSON.stringify({ error: dbError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!competitors || competitors.length === 0) {
      console.log('No competitors with websites found for client:', client_id);
      return new Response(
        JSON.stringify({ competitors: [], message: 'No competitors with websites found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');

    if (!firecrawlKey) {
      console.warn('FIRECRAWL_API_KEY not configured — returning competitors without content');
      const results: CompetitorResult[] = competitors.map((c) => ({
        name: c.name,
        website: c.website,
        blog_url: buildBlogUrl(c.website),
        error: 'FIRECRAWL_API_KEY not configured',
      }));
      return new Response(
        JSON.stringify({ competitors: results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Scrape all competitors in parallel — failures are isolated
    const settled = await Promise.allSettled(
      competitors.map((c) => scrapeCompetitorBlog(c.name, c.website, firecrawlKey))
    );

    const results: CompetitorResult[] = settled.map((result, i) => {
      const competitor = competitors[i];
      const blog_url = buildBlogUrl(competitor.website);

      if (result.status === 'fulfilled') {
        return result.value;
      }

      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      console.warn(`Scrape failed for ${competitor.name}:`, reason);
      return {
        name: competitor.name,
        website: competitor.website,
        blog_url,
        error: reason,
      };
    });

    console.log('Competitor scrape complete:', {
      total: results.length,
      succeeded: results.filter((r) => !r.error).length,
      failed: results.filter((r) => r.error).length,
    });

    return new Response(
      JSON.stringify({ competitors: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in blog-auto-competitors:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildBlogUrl(website: string): string {
  // Normalize base URL
  let base = website.trim();
  if (!base.startsWith('http://') && !base.startsWith('https://')) {
    base = `https://${base}`;
  }
  // Strip trailing slash, append /blog
  return `${base.replace(/\/$/, '')}/blog`;
}

async function scrapeCompetitorBlog(
  name: string,
  website: string,
  apiKey: string
): Promise<CompetitorResult> {
  const blog_url = buildBlogUrl(website);

  console.log(`Scraping competitor blog: ${name} → ${blog_url}`);

  const response = await fetch(FIRECRAWL_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: blog_url,
      formats: ['markdown'],
      onlyMainContent: true,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Firecrawl HTTP ${response.status}: ${text.substring(0, 200)}`);
  }

  const data = await response.json();

  // Firecrawl v1 response shape: { success, data: { markdown, ... } }
  const markdown: string = data?.data?.markdown ?? data?.markdown ?? '';

  if (!markdown) {
    throw new Error('No markdown content returned by Firecrawl');
  }

  return {
    name,
    website,
    blog_url,
    content: markdown.substring(0, MAX_CONTENT_LENGTH),
  };
}
