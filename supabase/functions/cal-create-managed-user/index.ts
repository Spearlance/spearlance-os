import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getValidToken(supabase: any): Promise<string> {
  const { data: tokenData } = await supabase
    .from('cal_platform_tokens')
    .select('token_value, expires_at')
    .eq('token_type', 'access_token')
    .single();

  if (!tokenData) {
    throw new Error('No access token found. Please complete OAuth flow first.');
  }

  // Check if expired
  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();

  if (expiresAt <= now) {
    // Refresh token
    const refreshResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/cal-oauth-exchange`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh' })
      }
    );

    const refreshData = await refreshResponse.json();
    if (!refreshData.success) {
      throw new Error('Failed to refresh token');
    }

    return refreshData.access_token;
  }

  return tokenData.token_value;
}

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

    if (profile.role !== 'fmm') {
      throw new Error('Only FMM users can have managed Cal.com accounts');
    }

    // Get valid access token
    const accessToken = await getValidToken(supabase);
    const orgSlug = Deno.env.get('CAL_ORG_SLUG');

    if (!orgSlug) {
      throw new Error('CAL_ORG_SLUG not configured');
    }

    // Generate username from email
    const username = profile.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

    // Create managed user in Cal.com
    const createUserResponse = await fetch('https://api.cal.com/v2/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'cal-api-version': '2024-08-13'
      },
      body: JSON.stringify({
        email: profile.email,
        name: profile.name,
        username: username,
        timeZone: 'America/New_York',
        weekStart: 'Monday',
        organizationId: orgSlug
      })
    });

    if (!createUserResponse.ok) {
      const errorText = await createUserResponse.text();
      console.error('Cal.com API error:', errorText);
      throw new Error(`Failed to create managed user: ${errorText}`);
    }

    const userData = await createUserResponse.json();
    const managedUserId = userData.data?.id || userData.id;
    
    console.log('Created managed user:', managedUserId);

    // Create default event type
    const createEventTypeResponse = await fetch('https://api.cal.com/v2/event-types', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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
    if (createEventTypeResponse.ok) {
      const eventTypeData = await createEventTypeResponse.json();
      eventTypeId = eventTypeData.data?.id || eventTypeData.id;
      console.log('Created event type:', eventTypeId);
    }

    // Update profile with Cal.com data
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        cal_managed_user_id: managedUserId.toString(),
        cal_username: username,
        cal_event_type_id: eventTypeId?.toString()
      })
      .eq('id', user_id);

    if (updateError) {
      console.error('Failed to update profile:', updateError);
      throw new Error('Failed to update profile with Cal.com data');
    }

    const bookingLink = `https://cal.com/${orgSlug}/${username}/strategy-session`;

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
