import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_id } = await req.json();
    
    if (!client_id) {
      throw new Error('client_id is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all assets without AI embeddings
    const { data: assets, error: fetchError } = await supabaseClient
      .from('assets')
      .select('id, title, type')
      .eq('client_id', client_id)
      .in('type', ['image', 'video'])
      .is('ai_embedding', null)
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch assets: ${fetchError.message}`);
    }

    if (!assets || assets.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'All assets already processed',
          processed: 0,
          total: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${assets.length} assets...`);

    const batchSize = 5;
    let processedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process in batches
    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(assets.length / batchSize)}`);

      // Process batch items sequentially to avoid rate limits
      for (const asset of batch) {
        try {
          const analyzeResponse = await supabaseClient.functions.invoke('analyze-asset', {
            body: { asset_id: asset.id }
          });

          if (analyzeResponse.error) {
            throw new Error(analyzeResponse.error.message);
          }

          processedCount++;
          console.log(`✓ Processed: ${asset.title}`);
          
          // Small delay between items
          await delay(1000);
        } catch (error) {
          errorCount++;
          const errorMsg = `Failed to process ${asset.title}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // Longer delay between batches
      if (i + batchSize < assets.length) {
        console.log('Waiting before next batch...');
        await delay(3000);
      }
    }

    console.log(`Backfill complete. Processed: ${processedCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: processedCount,
        total: assets.length,
        errors: errorCount,
        error_details: errors.length > 0 ? errors.slice(0, 5) : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in backfill-asset-embeddings:', error);
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