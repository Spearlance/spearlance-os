import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InitiateOAuthRequest {
  client_id: string;
  platform: 'facebook' | 'instagram';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { client_id, platform } = await req.json() as InitiateOAuthRequest;

    if (!client_id || !platform) {
      throw new Error('client_id and platform are required');
    }

    console.log('Initiating OAuth for platform:', platform, 'client:', client_id);

    // Fetch existing profile from database
    const { data: profile, error: profileError } = await supabase
      .from('late_profiles')
      .select('*')
      .eq('client_id', client_id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw profileError;
    }

    if (!profile) {
      throw new Error('Late profile not initialized. Please set up social media first.');
    }

    const lateProfileId = profile.late_profile_id;

    console.log('Using Late profile:', lateProfileId);

    // Get OAuth URL from Late API
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const callbackUrl = `${supabaseUrl}/functions/v1/late-oauth-callback`;

    const lateEndpoint = `https://getlate.dev/api/v1/connect/${platform}?` +
      `profileId=${lateProfileId}&` +
      `redirect_url=${encodeURIComponent(callbackUrl)}`;

    console.log('Calling Late API endpoint:', lateEndpoint);

    // Fetch the authUrl from Late
    const response = await fetch(lateEndpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Late API error:', errorText);
      throw new Error(`Failed to get OAuth URL from Late: ${response.status}`);
    }

    const lateResponse = await response.json();
    console.log('Late API response:', lateResponse);

    const oauthUrl = lateResponse.authUrl;

    if (!oauthUrl) {
      throw new Error('Late API did not return an authUrl');
    }

    console.log('Facebook OAuth URL:', oauthUrl);

    return new Response(
      JSON.stringify({ 
        success: true,
        oauth_url: oauthUrl,
        profile_id: lateProfileId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error initiating OAuth:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
