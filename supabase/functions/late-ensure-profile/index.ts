import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { lateFetch } from "../_shared/lateClient.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnsureProfileRequest {
  client_id: string;
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

    const { client_id } = await req.json() as EnsureProfileRequest;

    if (!client_id) {
      throw new Error('client_id is required');
    }

    console.log('Ensuring Late profile exists for client:', client_id);

    // Check if profile already exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('late_profiles')
      .select('*')
      .eq('client_id', client_id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching existing profile:', fetchError);
      throw fetchError;
    }

    if (existingProfile) {
      console.log('Late profile already exists:', existingProfile.late_profile_id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          profile: existingProfile,
          created: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch client details
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('name')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    console.log('Creating new Late profile for client:', client.name);

    // Create profile in Late API
    const lateProfile = await lateFetch('/profiles', {
      method: 'POST',
      body: JSON.stringify({
        name: client.name,
        description: `Profile for ${client.name}`,
        color: '#6366f1'
      })
    });

    const lateProfileId = lateProfile.id;
    console.log('Late profile created:', lateProfileId);

    // Store profile in our database
    const { data: newProfile, error: insertError } = await supabase
      .from('late_profiles')
      .insert({
        client_id: client_id,
        late_profile_id: lateProfileId,
        profile_name: client.name
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing profile:', insertError);
      throw insertError;
    }

    console.log('Profile stored in database:', newProfile.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        profile: newProfile,
        created: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error ensuring profile:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
