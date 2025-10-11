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
      // Direct user to Cal.com settings page to connect their Google Calendar
      // Cal.com Platform API v2 uses their own OAuth flow internally
      const calSettingsUrl = `https://app.cal.com/settings/my-account/calendars`;
      
      console.log('Initiating calendar connection for user:', user.id);
      
      return new Response(
        JSON.stringify({ 
          message: 'Redirect to Cal.com to connect your Google Calendar',
          oauthUrl: calSettingsUrl,
          instructions: 'Click "Connect" next to Google Calendar, then return to complete setup'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (action === 'verify') {
      // Mark calendar as connected
      // In a full implementation, this would query Cal.com Platform API
      // to verify the managed user actually has Google Calendar connected
      
      console.log('Verifying calendar connection for user:', user.id);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ cal_connected: true })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

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

    if (action === 'disconnect') {
      // Disconnect calendar
      console.log('Disconnecting calendar for user:', user.id);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ cal_connected: false })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Calendar disconnected successfully' 
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
