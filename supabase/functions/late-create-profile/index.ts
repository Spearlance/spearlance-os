import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { lateFetch } from "../_shared/lateClient.ts";

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
    // DIAGNOSTIC: Verify API key hash
    const raw = Deno.env.get("LATE_API_KEY") ?? "";
    const key = raw.trim();
    const data = new TextEncoder().encode(key);
    const digest = await crypto.subtle.digest("SHA-256", data);
    const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,"0")).join("");
    console.log("late_api_key_sha256:", hex);
    console.log("late_api_key_length:", key.length);

    // DIAGNOSTIC: Test authentication with usage-stats endpoint
    const testRes = await fetch("https://getlate.dev/api/v1/usage-stats", {
      headers: { Authorization: `Bearer ${key}` }
    });
    const testBody = await testRes.text();
    console.log("usage_stats_status:", testRes.status, testRes.statusText, "body:", testBody.slice(0,500));

    if (testRes.status === 401) {
      throw new Error(`API key authentication failed. Status: ${testRes.status}. The API key is not valid for Late API.`);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { client_id, profile_name, profile_description, color }: CreateProfileRequest = await req.json();

    if (!client_id) {
      throw new Error('client_id is required');
    }

    // Get client details
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('name')
      .eq('id', client_id)
      .single();

    if (clientError || !clientData) {
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
    const lateProfile = await lateFetch('/profiles', {
      method: 'POST',
      body: JSON.stringify({
        name: profile_name || clientData.name || 'Client Profile',
        description: profile_description || `Social media profile for ${clientData.name}`,
        color: color || '#13cf48',
      }),
    });
    console.log('Late profile created:', lateProfile);

    // Store profile in database
    const { data: dbProfile, error: dbError } = await supabase
      .from('late_profiles')
      .insert({
        id: crypto.randomUUID(),
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