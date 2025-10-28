import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { lateFetch } from "../_shared/lateClient.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateTeamInviteRequest {
  client_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { client_id }: CreateTeamInviteRequest = await req.json();

    if (!client_id) {
      throw new Error('client_id is required');
    }

    console.log('Creating team invite for client:', client_id);

    // Get or create Late profile
    const { data: lateProfile, error: profileError } = await supabase
      .from('late_profiles')
      .select('*')
      .eq('client_id', client_id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching late profile:', profileError);
      throw profileError;
    }

    let profile = lateProfile;

    // Create Late profile if it doesn't exist
    if (!profile) {
      console.log('Creating new Late profile...');
      
      const { data: clientData } = await supabase
        .from('clients')
        .select('name, brand_name')
        .eq('id', client_id)
        .single();

      const profileName = clientData?.brand_name || clientData?.name || 'Client Profile';

      const lateProfileData = await lateFetch('/profiles', {
        method: 'POST',
        body: JSON.stringify({
          name: profileName,
          description: `Social media profile for ${profileName}`,
          color: '#4ade80'
        })
      });

      console.log('Late profile created:', lateProfileData._id);

      const { data: newProfile, error: insertError } = await supabase
        .from('late_profiles')
        .insert({
          client_id,
          late_profile_id: lateProfileData._id,
          late_profile_name: lateProfileData.name
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting late profile:', insertError);
        throw insertError;
      }

      profile = newProfile;
    }

    // Check if invite already exists and is still valid
    const now = new Date();
    const expiresAt = profile.team_invite_expires_at 
      ? new Date(profile.team_invite_expires_at) 
      : null;

    if (profile.team_invite_url && expiresAt && expiresAt > now) {
      console.log('Returning existing valid invite');
      return new Response(
        JSON.stringify({
          inviteUrl: profile.team_invite_url,
          token: profile.team_invite_token,
          expiresAt: profile.team_invite_expires_at
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new team invite
    console.log('Creating new team invite for profile:', profile.late_profile_id);
    
    const inviteData = await lateFetch('/invite/tokens', {
      method: 'POST',
      body: JSON.stringify({
        scope: 'profiles',
        profileIds: [profile.late_profile_id]
      })
    });

    console.log('Team invite created:', inviteData.token);

    // Store invite in database
    const { error: updateError } = await supabase
      .from('late_profiles')
      .update({
        team_invite_token: inviteData.token,
        team_invite_url: inviteData.inviteUrl,
        team_invite_expires_at: inviteData.expiresAt,
        team_invite_created_at: new Date().toISOString()
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('Error updating late profile with invite:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        inviteUrl: inviteData.inviteUrl,
        token: inviteData.token,
        expiresAt: inviteData.expiresAt
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error creating team invite:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create team invite' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
