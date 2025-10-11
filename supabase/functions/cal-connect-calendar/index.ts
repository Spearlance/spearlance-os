import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's profile to check for managed user ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('cal_managed_user_id, cal_username')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.cal_managed_user_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Cal.com managed user not found. Please contact support.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { action } = await req.json();

    if (action === 'connect') {
      // Generate OAuth URL for Google Calendar connection
      // This would typically involve Cal.com Platform API to get OAuth URL
      // For now, we'll return a placeholder
      
      return new Response(
        JSON.stringify({ 
          message: 'Calendar connection flow initiated',
          // In production, return actual OAuth URL from Cal.com Platform API
          oauthUrl: `https://app.cal.com/settings/my-account/calendars`
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (action === 'verify') {
      // Verify calendar connection status
      // This would check via Cal.com Platform API
      // For now, we'll just update the profile
      
      await supabase
        .from('profiles')
        .update({ cal_connected: true })
        .eq('id', user.id);

      return new Response(
        JSON.stringify({ 
          success: true,
          connected: true 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in cal-connect-calendar:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
