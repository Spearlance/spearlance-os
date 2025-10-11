import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

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
    console.log('Generating avatar image for client:', client_id);

    if (!client_id) {
      throw new Error('client_id is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch avatar data
    const { data: avatar, error: avatarError } = await supabase
      .from('avatars')
      .select('*')
      .eq('client_id', client_id)
      .single();

    if (avatarError) {
      console.error('Error fetching avatar:', avatarError);
      throw new Error('Avatar not found');
    }

    // Build image generation prompt
    const imagePrompt = `Create a professional, realistic portrait photograph of a person representing this customer avatar:

Name: ${avatar.avatar_name || 'Professional'}
Demographics: ${avatar.demographics || 'N/A'}
Firmographics: ${avatar.firmographics || 'N/A'}
Professional Context: ${avatar.goals || 'N/A'}

Style: Professional headshot, neutral background, business casual attire, friendly and approachable expression, high quality photography, natural lighting.`;

    console.log('Calling Lovable AI for image generation...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          { role: 'user', content: imagePrompt }
        ],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      throw new Error('No image in AI response');
    }

    // Update avatar with generated image URL
    const { error: updateError } = await supabase
      .from('avatars')
      .update({
        generated_image_url: imageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', avatar.id);

    if (updateError) {
      console.error('Error updating avatar:', updateError);
      throw new Error('Failed to update avatar');
    }

    console.log('Successfully generated avatar image');
    return new Response(
      JSON.stringify({ 
        success: true, 
        image_url: imageUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in avatar-generate-image:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
