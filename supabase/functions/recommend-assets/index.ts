import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { caption_text, client_id } = await req.json();
    
    if (!caption_text || !client_id) {
      throw new Error('caption_text and client_id are required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`Finding assets for caption: "${caption_text.substring(0, 50)}..."`);

    // Step 1: Generate embedding for the caption
    const embeddingResponse = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        input: caption_text
      })
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('Embedding API error:', embeddingResponse.status, errorText);
      
      if (embeddingResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (embeddingResponse.status === 402) {
        throw new Error('AI credits depleted. Please add credits to your workspace.');
      }
      throw new Error(`Embedding API error: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const captionEmbedding = embeddingData.data[0]?.embedding;

    if (!captionEmbedding || !Array.isArray(captionEmbedding)) {
      throw new Error('Failed to generate caption embedding');
    }

    console.log(`Generated caption embedding with ${captionEmbedding.length} dimensions`);

    // Step 2: Query database for similar assets using vector similarity
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Use RPC to perform vector similarity search
    const { data: assets, error: queryError } = await supabaseClient.rpc(
      'match_assets',
      {
        query_embedding: JSON.stringify(captionEmbedding),
        match_client_id: client_id,
        match_threshold: 0.5,
        match_count: 3
      }
    );

    if (queryError) {
      console.error('Database query error:', queryError);
      throw new Error(`Database query failed: ${queryError.message}`);
    }

    console.log(`Found ${assets?.length || 0} matching assets`);

    return new Response(
      JSON.stringify({ 
        success: true,
        recommendations: assets || [],
        count: assets?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in recommend-assets:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
        recommendations: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});