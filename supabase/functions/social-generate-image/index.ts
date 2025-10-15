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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { client_id, caption_text, image_mode, reference_image } = await req.json();

    if (!client_id || !caption_text) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch brand context
    const [brandGuide, moodBoards, client] = await Promise.all([
      supabaseClient.from('brand_guides').select('*').eq('client_id', client_id).maybeSingle(),
      supabaseClient.from('mood_boards').select('*').eq('client_id', client_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabaseClient.from('clients').select('industry, logo_url').eq('id', client_id).single(),
    ]);

    const brand = brandGuide.data;
    const moodBoard = moodBoards.data;
    const clientData = client.data;

    // Build image generation prompt
    let basePrompt = `Create a professional social media post image.

Caption context: "${caption_text}"

Brand Guidelines:
- Primary Color: ${brand?.primary_color || '#3B82F6'}
- Secondary Color: ${brand?.secondary_color || '#10B981'}
- Accent Color: ${brand?.accent_color || '#F59E0B'}
- Aesthetic: ${brand?.aesthetic || 'modern'}
- Mood: ${moodBoard?.title || 'professional and approachable'}

Design Requirements:
- Include 1-2 short text overlays (max 7 words each)
- Apply brand colors in design elements
- Style should match: ${brand?.aesthetic || 'modern'}
- High contrast for social media visibility
- Clean, scroll-stopping composition
- Professional quality suitable for Instagram/Facebook
- 1080x1080px square format

${brand?.imagery_style ? `Imagery Style: ${brand.imagery_style}` : ''}

Generate a clean, eye-catching image that represents this message visually.`;

    if (image_mode === 'with_upload' || image_mode === 'with_brand_asset') {
      basePrompt += `\n\nUse the provided reference image as the base and enhance it with brand elements.`;
    }

    const messages: any[] = [
      { role: 'user', content: basePrompt }
    ];

    // Add reference image if provided
    if (reference_image && (image_mode === 'with_upload' || image_mode === 'with_brand_asset')) {
      messages[0].content = [
        { type: 'text', text: basePrompt },
        { 
          type: 'image_url', 
          image_url: { url: reference_image }
        }
      ];
    }

    // Call Lovable AI image generation
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: messages,
        modalities: ['image', 'text']
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    
    // Extract images from chat completion response
    const generatedImages = aiData.choices?.[0]?.message?.images || [];
    const images = generatedImages.map((img: any, index: number) => ({
      image_url: img.image_url?.url,
      prompt_used: basePrompt,
      variation_number: index + 1
    }));

    return new Response(
      JSON.stringify({ images }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});