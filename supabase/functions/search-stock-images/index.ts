import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PEXELS_API_KEY = Deno.env.get('PEXELS_API_KEY');
    
    if (!PEXELS_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Pexels API key not configured', images: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { query, per_page = 12 } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required', images: [] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cap per_page at 20 to avoid abuse
    const limitedPerPage = Math.min(Math.max(per_page, 1), 20);

    console.log(`Searching Pexels for: "${query}" (${limitedPerPage} results)`);

    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${limitedPerPage}&orientation=landscape`,
      {
        headers: {
          'Authorization': PEXELS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pexels API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch from Pexels', images: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    // Format the response
    const images = data.photos.map((photo: any) => ({
      id: photo.id,
      title: photo.alt || 'Stock image',
      thumbnail_url: photo.src.medium,
      full_url: photo.src.large2x,
      photographer: photo.photographer,
      photographer_url: photo.photographer_url,
      pexels_url: photo.url,
      width: photo.width,
      height: photo.height,
    }));

    console.log(`Found ${images.length} stock images`);

    return new Response(
      JSON.stringify({ success: true, images, total: data.total_results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-stock-images:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage, images: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
