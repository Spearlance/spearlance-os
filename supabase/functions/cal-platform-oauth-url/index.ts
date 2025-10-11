const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get('CAL_PLATFORM_CLIENT_ID');
    
    if (!clientId) {
      throw new Error('CAL_PLATFORM_CLIENT_ID not configured in secrets');
    }

    // Get the origin from the request
    const { origin } = await req.json();
    
    if (!origin) {
      throw new Error('Origin is required');
    }

    // Generate state for CSRF protection
    const state = crypto.randomUUID();
    
    // Build redirect URI - must match what's used in token exchange
    const redirectUri = `${origin}/calendar/platform-callback`;
    
    // Build OAuth URL
    const oauthUrl = `https://app.cal.com/oauth/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}`;

    console.log('Generated OAuth URL with redirect_uri:', redirectUri);

    return new Response(
      JSON.stringify({ url: oauthUrl, state }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('OAuth URL generation error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
