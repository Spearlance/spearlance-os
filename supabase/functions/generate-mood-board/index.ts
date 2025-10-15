import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_id, brand_guide_id, title, keywords, custom_notes, brand_guide } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Generate 4 mood board images using AI
    const prompt = `Create a professional mood board image for a ${brand_guide.aesthetic} brand. 
    Colors: ${brand_guide.primary_color}, ${brand_guide.secondary_color}, ${brand_guide.accent_color}. 
    Keywords: ${keywords.join(', ')}. 
    ${custom_notes ? `Additional context: ${custom_notes}` : ''}
    Style: Clean, modern, suitable for brand inspiration.`;

    const images: string[] = [];
    
    for (let i = 0; i < 4; i++) {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [{ role: 'user', content: prompt }],
          modalities: ['image', 'text']
        }),
      });

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (imageUrl) images.push(imageUrl);
    }

    // Save mood board to database
    const { data: moodBoard, error } = await supabase
      .from('mood_boards')
      .insert({
        client_id,
        brand_guide_id,
        title,
        description: custom_notes,
        generated_images: images,
        inspiration_keywords: keywords,
        style_direction: brand_guide.aesthetic,
        is_ai_generated: true,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, mood_board: moodBoard }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
