import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateProfileRequest {
  client_id: string;
  profile_name?: string;
  profile_description?: string;
  color?: string;
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

    const { client_id, profile_name, profile_description, color }: CreateProfileRequest = await req.json();

    if (!client_id) {
      throw new Error('client_id is required');
    }

    // Get client details
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('name')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('late_profiles')
      .select('*')
      .eq('client_id', client_id)
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          profile: existingProfile,
          message: 'Profile already exists' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create profile in Late API
    const lateResponse = await fetch('https://getlate.dev/api/v1/profiles', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: profile_name || client.name,
        description: profile_description || `Social media profile for ${client.name}`,
        color: color || '#13cf48',
      }),
    });

    if (!lateResponse.ok) {
      const errorText = await lateResponse.text();
      console.error('Late API error:', errorText);
      throw new Error(`Failed to create profile in Late: ${errorText}`);
    }

    const lateProfile = await lateResponse.json();
    console.log('Late profile created:', lateProfile);

    // Store profile in database
    const { data: dbProfile, error: dbError } = await supabase
      .from('late_profiles')
      .insert({
        client_id,
        late_profile_id: lateProfile._id,
        late_profile_name: lateProfile.name,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Failed to store profile: ${dbError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        profile: dbProfile,
        late_profile: lateProfile 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error creating Late profile:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});