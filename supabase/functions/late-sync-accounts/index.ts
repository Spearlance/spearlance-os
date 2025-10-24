import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncAccountsRequest {
  client_id: string;
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

    const { client_id }: SyncAccountsRequest = await req.json();

    if (!client_id) {
      throw new Error('client_id is required');
    }

    // Get Late profile for this client
    const { data: lateProfile, error: profileError } = await supabase
      .from('late_profiles')
      .select('*')
      .eq('client_id', client_id)
      .single();

    if (profileError || !lateProfile) {
      throw new Error('Late profile not found');
    }

    // Fetch accounts from Late API
    const lateResponse = await fetch(`https://getlate.dev/api/v1/profiles/${lateProfile.late_profile_id}/accounts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${lateApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!lateResponse.ok) {
      const errorText = await lateResponse.text();
      console.error('Late API error:', errorText);
      throw new Error(`Failed to fetch accounts: ${errorText}`);
    }

    const lateAccounts = await lateResponse.json();
    console.log('Fetched accounts from Late:', lateAccounts);

    // Get existing accounts from database
    const { data: existingAccounts } = await supabase
      .from('late_social_accounts')
      .select('late_account_id')
      .eq('late_profile_id', lateProfile.id);

    const existingIds = new Set(existingAccounts?.map(a => a.late_account_id) || []);
    const synced = [];
    const added = [];

    // Upsert accounts
    for (const account of lateAccounts.data || []) {
      const accountData = {
        late_profile_id: lateProfile.id,
        late_account_id: account.id,
        platform: account.platform,
        username: account.username || account.name,
        display_name: account.name,
        profile_picture_url: account.profile_picture_url,
        is_active: account.is_active !== false,
        token_expires_at: account.token_expires_at,
        platform_specific_data: account,
      };

      const { data: upserted, error: upsertError } = await supabase
        .from('late_social_accounts')
        .upsert(accountData, { 
          onConflict: 'late_account_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (upsertError) {
        console.error('Error upserting account:', upsertError);
      } else {
        synced.push(upserted);
        if (!existingIds.has(account.id)) {
          added.push(upserted);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced_count: synced.length,
        added_count: added.length,
        accounts: synced 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error syncing accounts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});