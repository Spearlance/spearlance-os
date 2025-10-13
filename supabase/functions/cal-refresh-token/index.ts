import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Validate the caller's identity using a valid session token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const sessionToken = authHeader.replace('Bearer ', '');

    // Authenticate the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(sessionToken);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      throw new Error('Invalid session token');
    }

    console.log('Refreshing tokens for authenticated user:', user.id);

    // Fetch tokens for the authenticated user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('cal_refresh_token, cal_access_token')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.cal_refresh_token) {
      throw new Error('User not found or refresh token missing');
    }

    // Get Cal.com credentials
    const clientId = Deno.env.get('CAL_PLATFORM_CLIENT_ID');
    const clientSecret = Deno.env.get('CAL_PLATFORM_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Cal.com credentials not configured');
    }

    // Call Cal.com refresh endpoint
    const refreshResponse = await fetch('https://api.cal.com/v2/oauth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cal-api-version': '2024-08-13'
      },
      body: JSON.stringify({
        clientId,
        clientSecret,
        refreshToken: profile.cal_refresh_token
      })
    });

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      console.error('Cal.com refresh error:', errorText);
      throw new Error(`Failed to refresh tokens: ${errorText}`);
    }

    const refreshData = await refreshResponse.json();
    const newAccessToken = refreshData.data?.accessToken || refreshData.accessToken;
    const newRefreshToken = refreshData.data?.refreshToken || refreshData.refreshToken;

    if (!newAccessToken || !newRefreshToken) {
      throw new Error('No tokens returned from refresh endpoint');
    }

    // Calculate new token expiry (60 minutes from now)
    const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Update user's tokens in database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        cal_access_token: newAccessToken,
        cal_refresh_token: newRefreshToken,
        cal_token_expires_at: tokenExpiresAt
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update tokens:', updateError);
      throw new Error('Failed to save new tokens');
    }

    console.log('Tokens refreshed successfully for user:', user.id);

    // Return new access token in the format atoms expect
    return new Response(
      JSON.stringify({ accessToken: newAccessToken }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Token refresh error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
    );
  }
});
