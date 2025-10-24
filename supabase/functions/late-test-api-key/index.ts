import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lateApiKey = Deno.env.get('LATE_API_KEY');
    if (!lateApiKey) {
      throw new Error('LATE_API_KEY not configured');
    }

    const trimmedKey = lateApiKey.trim();

    // Diagnostic logging
    console.log('=== Late API Key Diagnostics ===');
    console.log('Original key length:', lateApiKey.length);
    console.log('Trimmed key length:', trimmedKey.length);
    console.log('Key starts with:', trimmedKey.substring(0, 4));
    console.log('Key ends with:', trimmedKey.substring(trimmedKey.length - 4));
    console.log('Has whitespace:', lateApiKey !== trimmedKey);

    // Test authentication with usage-stats endpoint
    const response = await fetch('https://getlate.dev/api/v1/usage-stats', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${trimmedKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Authentication failed',
          status: response.status,
          response: responseText,
          diagnostics: {
            original_length: lateApiKey.length,
            trimmed_length: trimmedKey.length,
            has_whitespace: lateApiKey !== trimmedKey,
            starts_with: trimmedKey.substring(0, 4),
            ends_with: trimmedKey.substring(trimmedKey.length - 4),
          }
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = JSON.parse(responseText);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Authentication successful!',
        usage_stats: data,
        diagnostics: {
          original_length: lateApiKey.length,
          trimmed_length: trimmedKey.length,
          has_whitespace: lateApiKey !== trimmedKey,
        }
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
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
