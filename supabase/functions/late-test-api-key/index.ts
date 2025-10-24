import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getLateApiKey, lateFetch } from "../_shared/lateClient.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const key = getLateApiKey();
    console.log('Late key diagnostics:', {
      length: key.length,
      first4: key.substring(0, 4),
      last4: key.substring(Math.max(0, key.length - 4))
    });

    const data = await lateFetch('/usage-stats', { method: 'GET' });
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Authentication successful!',
        usage_stats: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error testing Late API key:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
