import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const body = await req.json();
    const { code, action, origin } = body;

    // Get client credentials from secrets
    const clientId = Deno.env.get('CAL_PLATFORM_CLIENT_ID');
    const clientSecret = Deno.env.get('CAL_PLATFORM_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Cal.com client credentials not configured');
    }

    // Handle token refresh
    if (action === 'refresh') {
      const { data: refreshTokenData } = await supabase
        .from('cal_platform_tokens')
        .select('token_value')
        .eq('token_type', 'refresh_token')
        .single();

      if (!refreshTokenData) {
        throw new Error('No refresh token found');
      }

      const refreshResponse = await fetch('https://api.cal.com/v2/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshTokenData.token_value,
          client_id: clientId,
          client_secret: clientSecret
        })
      });

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh token');
      }

      const tokens: TokenResponse = await refreshResponse.json();

      // Update access token
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      await supabase
        .from('cal_platform_tokens')
        .update({
          token_value: tokens.access_token,
          expires_at: expiresAt.toISOString()
        })
        .eq('token_type', 'access_token');

      console.log('Token refreshed successfully');

      return new Response(
        JSON.stringify({ success: true, access_token: tokens.access_token }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle initial token exchange
    if (action === 'exchange' && code) {
      const redirectUri = origin ? `${origin}/calendar/platform-callback` : `${Deno.env.get('SUPABASE_URL')}/calendar/platform-callback`;
      
      console.log('Exchanging code with redirect_uri:', redirectUri);
      
      const tokenResponse = await fetch('https://api.cal.com/v2/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code: code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri
        })
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${error}`);
      }

      const tokens: TokenResponse = await tokenResponse.json();

      // Calculate expiry
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      // Delete existing tokens
      await supabase.from('cal_platform_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Store new tokens
      await supabase.from('cal_platform_tokens').insert([
        {
          token_type: 'access_token',
          token_value: tokens.access_token,
          expires_at: expiresAt.toISOString()
        },
        {
          token_type: 'refresh_token',
          token_value: tokens.refresh_token
        }
      ]);

      console.log('OAuth tokens stored successfully');

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle getting current valid token
    if (action === 'get_token') {
      const { data: accessTokenData } = await supabase
        .from('cal_platform_tokens')
        .select('token_value, expires_at')
        .eq('token_type', 'access_token')
        .single();

      if (!accessTokenData) {
        throw new Error('No access token found');
      }

      // Check if token is expired
      const expiresAt = new Date(accessTokenData.expires_at);
      const now = new Date();

      if (expiresAt <= now) {
        // Token expired, trigger refresh
        const refreshResult = await fetch(req.url, {
          method: 'POST',
          headers: req.headers,
          body: JSON.stringify({ action: 'refresh' })
        });
        
        const refreshData = await refreshResult.json();
        return new Response(
          JSON.stringify(refreshData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, access_token: accessTokenData.token_value }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('OAuth error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
