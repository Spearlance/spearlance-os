import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { AI_CHAT_URL, AI_MODELS, aiHeaders } from '../_shared/aiClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { avatar_id } = await req.json();
    console.log('Generating avatar image for avatar:', avatar_id);

    if (!avatar_id) {
      throw new Error('avatar_id is required');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch avatar data
    const { data: avatar, error: avatarError } = await supabase
      .from('avatars')
      .select('*')
      .eq('id', avatar_id)
      .single();

    if (avatarError) {
      console.error('Error fetching avatar:', avatarError);
      throw new Error('Avatar not found');
    }

    // Require AI summary to be generated first
    if (!avatar.ai_summary) {
      throw new Error('Please generate an AI summary first before creating avatar images');
    }

    // Build formatted service areas string
    const serviceAreasText = avatar.service_areas && avatar.service_areas.length > 0
      ? avatar.service_areas.join(', ')
      : 'general market area';

    // Build image generation prompt based on AI summary
    const diversityInstructions = [
      'Generate a diverse range of people across these images: vary ethnicity (Black, White, Hispanic, Asian, Middle Eastern, etc.), gender (men and women), and age ranges where appropriate.',
      'Each of the 3 images you generate should show different demographic combinations to represent the full diversity of potential customers.',
      'Do not default to any particular ethnicity or gender - actively vary these attributes.'
    ].join(' ');

    const imagePrompt = `${diversityInstructions}

Create a natural, cinematic-style portrait of the ideal customer described below. 
Focus on authenticity and realism rather than perfection or glamour. Capture their environment, posture, and facial expression in a way that tells a story about their daily life and work.

They should look approachable, confident, and genuine — not like a stock photo model. 
Avoid stiff poses, formal headshots, or generic office skyscraper backgrounds.

Depict them in a believable real-world setting that reflects their profession and location. 
Incorporate subtle environmental cues that match the client's service area (${serviceAreasText}), such as lighting, architecture, or surroundings common to that region. 
If the area is coastal, use warm natural light; if urban, show a soft city background; if suburban or rural, use open space or small-business scenery.

Clothing should match their industry — clean, casual-professional, or job-specific — rather than corporate suits. 
Lighting should feel natural, with soft shadows and a realistic depth of field. 
Facial expression should convey focus, thoughtfulness, or warmth, depending on the tone from the avatar summary. 
Props or background elements (like tools, a laptop, signage, or workspace items) should feel authentic but never cluttered.

Represent age naturally based on the description below, and ensure demographic representation is authentic without exaggeration or stereotyping.
Avoid hyper-realistic rendering, AI filters, or over-sharpened looks. 
This should look like a real photo of a genuine person running their business in their real environment.

DESCRIPTION:
${avatar.ai_summary}`;

    console.log('Calling AI for image generation (generating 3 images)...');
    
    // Generate 3 images
    const imageUrls: string[] = [];
    for (let i = 0; i < 3; i++) {
      console.log(`Generating image ${i + 1}/3...`);
      const response = await fetch(AI_CHAT_URL, {
        method: 'POST',
        headers: aiHeaders(),
        body: JSON.stringify({
          model: AI_MODELS.IMAGE,
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
      
      imageUrls.push(imageUrl);
    }

    // Update avatar with generated image URLs
    // Set first image as primary if no primary image exists
    const updateData: any = {
      generated_image_urls: imageUrls,
      updated_at: new Date().toISOString(),
    };
    
    if (!avatar.primary_image_url) {
      updateData.primary_image_url = imageUrls[0];
    }

    const { error: updateError } = await supabase
      .from('avatars')
      .update(updateData)
      .eq('id', avatar.id);

    if (updateError) {
      console.error('Error updating avatar:', updateError);
      throw new Error('Failed to update avatar');
    }

    console.log('Successfully generated 3 avatar images');
    return new Response(
      JSON.stringify({ 
        success: true, 
        image_urls: imageUrls,
        primary_image_url: updateData.primary_image_url || avatar.primary_image_url,
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
