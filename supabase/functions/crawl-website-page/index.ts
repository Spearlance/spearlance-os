import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { client_id, page_path } = await req.json();

    if (!client_id || !page_path) {
      throw new Error('client_id and page_path are required');
    }

    console.log('Crawling page:', { client_id, page_path });

    // Get client's website URL
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('website_url')
      .eq('id', client_id)
      .single();

    if (clientError || !client?.website_url) {
      throw new Error('Client website URL not found');
    }

    // Validate page_path doesn't contain editor/platform domains
    const isEditorPath = 
      page_path.includes('my.duda.co') ||
      page_path.includes('edit.duda.co') ||
      page_path.includes('mywebsitemanager.co') ||
      page_path.includes('/editor/') ||
      page_path.includes('/preview/') ||
      page_path.includes('/edit-site/') ||
      page_path.includes('/site/'); // Duda internal site editor paths

    if (isEditorPath) {
      console.log('Rejected editor page path:', page_path);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Editor and platform pages cannot be analyzed. Only pages from your client domain are allowed.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construct full URL - must use client's actual domain
    const fullUrl = new URL(page_path, client.website_url).toString();
    console.log('Full URL:', fullUrl);

    // Double-check the constructed URL is on client domain
    try {
      const constructedDomain = new URL(fullUrl).hostname.replace(/^www\./, '');
      const clientDomain = new URL(
        client.website_url.startsWith('http') 
          ? client.website_url 
          : `https://${client.website_url}`
      ).hostname.replace(/^www\./, '');
      
      if (constructedDomain !== clientDomain) {
        throw new Error('Page path must be on client domain');
      }
    } catch (e) {
      console.error('Domain validation error:', e);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid page path. Must be a path from your client domain.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch page with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(fullUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SpearlanceBot/1.0 (Page Analysis)'
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    if (!doc) throw new Error('Failed to parse HTML');

    // Extract content
    const title = doc.querySelector('title')?.textContent?.trim() || '';
    const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const noindex = doc.querySelector('meta[name="robots"]')?.getAttribute('content')?.includes('noindex') || false;

    // Remove non-content elements
    const elementsToRemove = doc.querySelectorAll('script, style, nav, header, footer, aside, iframe, noscript');
    for (const el of elementsToRemove) {
      el.parentNode?.removeChild(el);
    }

    const mainContent = doc.querySelector('main')?.textContent || doc.body?.textContent || '';
    const cleanContent = mainContent.replace(/\s+/g, ' ').trim();
    const wordCount = cleanContent.split(/\s+/).filter(w => w.length > 0).length;

    console.log('Extracted content:', { title, wordCount, is_indexable: !noindex });

    // Upsert to database
    const { data: pageData, error: upsertError } = await supabase
      .from('website_pages')
      .upsert({
        client_id,
        page_path,
        page_title: title,
        full_content: cleanContent.substring(0, 50000), // Limit content size
        meta_description: metaDesc,
        word_count: wordCount,
        is_indexable: !noindex,
        last_crawled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'client_id,page_path' })
      .select()
      .single();

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      throw upsertError;
    }

    console.log('Page crawled successfully:', pageData.id);

    return new Response(
      JSON.stringify({
        success: true,
        page: pageData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Crawl error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to crawl page',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
