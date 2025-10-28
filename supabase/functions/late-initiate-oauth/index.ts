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

    // Ensure profile exists
    const { data: ensureResult, error: ensureError } = await supabase.functions.invoke(
      'late-ensure-profile',
      { body: { client_id } }
    );

    if (ensureError) {
      console.error('Error ensuring profile:', ensureError);
      throw ensureError;
    }

    const profile = ensureResult.profile;
    const lateProfileId = profile.late_profile_id;

    console.log('Using Late profile:', lateProfileId);

    // Build OAuth URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const callbackUrl = `${supabaseUrl}/functions/v1/late-oauth-callback`;
    
    const oauthUrl = `https://getlate.dev/api/v1/connect/${platform}?` +
      `profileId=${lateProfileId}&` +
      `redirect_url=${encodeURIComponent(callbackUrl)}`;

    console.log('OAuth URL generated:', oauthUrl);

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
