import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateInviteRequest {
  client_id: string;
  platform: 'facebook' | 'instagram';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lateApiKey = Deno.env.get('LATE_API_KEY');
    if (!lateApiKey) {
      throw new Error('LATE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = token ? JSON.parse(atob(token.split('.')[1])) : null;
    const userId = payload?.sub;

    const { client_id, platform }: CreateInviteRequest = await req.json();

    if (!client_id || !platform) {
      throw new Error('client_id and platform are required');
    }

    if (!['facebook', 'instagram'].includes(platform)) {
      throw new Error('Platform must be facebook or instagram');
    }

    // Get Late profile for this client
    const { data: lateProfile, error: profileError } = await supabase
      .from('late_profiles')
      .select('*')
      .eq('client_id', client_id)
      .single();

    if (profileError || !lateProfile) {
      throw new Error('Late profile not found. Please create profile first.');
    }

    // Create platform invite in Late API
    const lateResponse = await fetch('https://getlate.dev/api/v1/platform-invites', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profileId: lateProfile.late_profile_id,
        platform,
      }),
    });

    if (!lateResponse.ok) {
      const errorText = await lateResponse.text();
      console.error('Late API error:', errorText);
      throw new Error(`Failed to create invite: ${errorText}`);
    }

    const lateInvite = await lateResponse.json();
    console.log('Late invite created:', lateInvite);

    // Store invite in database
    const { data: dbInvite, error: dbError } = await supabase
      .from('late_connection_invites')
      .insert({
        late_profile_id: lateProfile.id,
        platform,
        late_invite_id: lateInvite._id,
        invite_token: lateInvite.token,
        invite_url: lateInvite.inviteUrl,
        inviter_user_id: userId,
        expires_at: lateInvite.expiresAt,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Failed to store invite: ${dbError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        invite: dbInvite,
        invite_url: lateInvite.inviteUrl 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error creating connection invite:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});