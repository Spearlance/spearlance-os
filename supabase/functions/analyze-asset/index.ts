import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
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
    const { asset_id } = await req.json();
    
    if (!asset_id) {
      throw new Error('asset_id is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch asset details
    const { data: asset, error: assetError } = await supabaseClient
      .from('assets')
      .select('*')
      .eq('id', asset_id)
      .single();

    if (assetError || !asset) {
      throw new Error(`Asset not found: ${assetError?.message}`);
    }

    // Only process images and videos
    if (asset.type !== 'image' && asset.type !== 'video') {
      console.log(`Skipping non-visual asset type: ${asset.type}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Asset type not supported for AI analysis' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate AI description for the image
    const imageUrl = asset.file_url || asset.preview_url;
    if (!imageUrl) {
      throw new Error('No image URL available for analysis');
    }

    console.log(`Analyzing asset: ${asset.title}`);

    // Step 1: Generate description using vision model
    const visionResponse = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify({
        model: AI_MODELS.TEXT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image for marketing purposes. Describe: 1) The mood and emotional tone 2) Visual elements and colors 3) Potential use-cases for social media 4) What message or theme it could support 5) The context or setting. Focus on semantic meaning, not literal descriptions. Be concise but thorough (100-150 words).'
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ]
      })
    });

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('Vision API error:', visionResponse.status, errorText);
      
      if (visionResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (visionResponse.status === 402) {
        throw new Error('AI credits depleted. Please add credits to your workspace.');
      }
      throw new Error(`Vision API error: ${visionResponse.status}`);
    }

    const visionData = await visionResponse.json();
    const description = visionData.choices[0]?.message?.content;

    if (!description) {
      throw new Error('No description generated');
    }

    console.log(`Generated description: ${description.substring(0, 100)}...`);

    // Step 2: Generate embedding from the description using OpenAI
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: description
      })
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('Embedding API error:', embeddingResponse.status, errorText);
      throw new Error(`Embedding API error: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0]?.embedding;

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('No embedding generated');
    }

    console.log(`Generated embedding with ${embedding.length} dimensions`);

    // Step 3: Update asset with description and embedding
    const { error: updateError } = await supabaseClient
      .from('assets')
      .update({
        ai_description: description,
        ai_embedding: embedding,
        ai_processed_at: new Date().toISOString()
      })
      .eq('id', asset_id);

    if (updateError) {
      throw new Error(`Failed to update asset: ${updateError.message}`);
    }

    console.log(`Successfully analyzed asset: ${asset.title}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        description,
        embedding_dimensions: embedding.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-asset:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});