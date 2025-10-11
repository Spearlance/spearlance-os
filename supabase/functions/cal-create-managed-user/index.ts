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
    const { user_id } = await req.json();

    if (!user_id) {
      throw new Error('user_id is required');
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, email, role')
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      throw new Error('User not found');
    }

    if (profile.role !== 'fmm' && profile.role !== 'admin') {
      throw new Error('Only FMM and Admin users can have managed Cal.com accounts');
    }

    // Get Cal.com credentials
    const clientId = Deno.env.get('CAL_PLATFORM_CLIENT_ID');
    const clientSecret = Deno.env.get('CAL_PLATFORM_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Cal.com credentials not configured');
    }

    // Generate username from email
    const username = profile.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

    console.log('Creating managed user with email:', profile.email);

    // Create managed user using Managed Users API
    const createUserResponse = await fetch(`https://api.cal.com/v2/oauth-clients/${clientId}/users`, {
      method: 'POST',
      headers: {
        'x-cal-secret-key': clientSecret,
        'Content-Type': 'application/json',
        'cal-api-version': '2024-08-13'
      },
      body: JSON.stringify({
        email: profile.email,
        name: profile.name,
        timeZone: 'America/New_York',
        weekStart: 'Monday'
      })
    });

    if (!createUserResponse.ok) {
      const errorText = await createUserResponse.text();
      console.error('Cal.com API error:', errorText);
      throw new Error(`Failed to create managed user: ${errorText}`);
    }

    const userData = await createUserResponse.json();
    const managedUserId = userData.data?.id || userData.id;
    const accessToken = userData.data?.accessToken;
    const refreshToken = userData.data?.refreshToken;
    
    console.log('Created managed user:', managedUserId);

    if (!accessToken || !refreshToken) {
      throw new Error('Failed to get access and refresh tokens from Cal.com');
    }

    // Calculate token expiry (60 minutes from now)
    const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Create default event type
    const createEventTypeResponse = await fetch('https://api.cal.com/v2/event-types', {
      method: 'POST',
      headers: {
        'x-cal-secret-key': clientSecret,
        'Content-Type': 'application/json',
        'cal-api-version': '2024-08-13'
      },
      body: JSON.stringify({
        title: 'Client Strategy Session',
        slug: 'strategy-session',
        length: 60,
        description: 'Schedule a strategy session to discuss your marketing goals',
        userId: managedUserId
      })
    });

    let eventTypeId = null;
    let bookingLink = null;
    
    if (createEventTypeResponse.ok) {
      const eventTypeData = await createEventTypeResponse.json();
      eventTypeId = eventTypeData.data?.id || eventTypeData.id;
      console.log('Created event type:', eventTypeId);
      
      // Construct booking link using the username from user data
      const calUsername = userData.data?.username || username;
      bookingLink = `https://cal.com/${calUsername}/strategy-session`;
    }

    // Update profile with Cal.com data including access tokens
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        cal_managed_user_id: managedUserId.toString(),
        cal_username: username,
        cal_event_type_id: eventTypeId?.toString(),
        cal_access_token: accessToken,
        cal_refresh_token: refreshToken,
        cal_token_expires_at: tokenExpiresAt
      })
      .eq('id', user_id);

    if (updateError) {
      console.error('Failed to update profile:', updateError);
      throw new Error('Failed to update profile with Cal.com data');
    }

    console.log('Managed user created successfully:', bookingLink);

    return new Response(
      JSON.stringify({
        success: true,
        managed_user_id: managedUserId,
        username: username,
        event_type_id: eventTypeId,
        booking_link: bookingLink
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Managed user creation error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
