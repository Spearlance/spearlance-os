import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { lateFetch } from "../_shared/lateClient.ts";

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

    // Fetch accounts from Late API using correct endpoint
    const data = await lateFetch(`/accounts?profileId=${encodeURIComponent(lateProfile.late_profile_id)}`);
    console.log('Fetched accounts from Late:', data);

    // Get existing accounts from database
    const { data: existingAccounts } = await supabase
      .from('late_social_accounts')
      .select('late_account_id')
      .eq('late_profile_id', lateProfile.id);

    const existingIds = new Set(existingAccounts?.map(a => a.late_account_id) || []);
    const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
    let addedCount = 0;
    let syncedCount = 0;

    // Upsert accounts with correct Late API field names
    for (const a of accounts) {
      const { data: existing } = await supabase
        .from('late_social_accounts')
        .select('*')
        .eq('late_account_id', a._id)
        .maybeSingle();

      if (existing) {
        // Update existing account
        await supabase
          .from('late_social_accounts')
          .update({
            username: a.username ?? null,
            display_name: a.displayName ?? null,
            profile_picture_url: a.profilePicture ?? null,
            is_active: a.isActive ?? true,
            token_expires_at: a.tokenExpiresAt ?? null,
            platform: a.platform ?? existing.platform,
            platform_specific_data: a,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        syncedCount++;
      } else {
        // Insert new account
        await supabase
          .from('late_social_accounts')
          .insert({
            id: crypto.randomUUID(),
            late_profile_id: lateProfile.id,
            late_account_id: a._id,
            platform: a.platform,
            username: a.username ?? null,
            display_name: a.displayName ?? null,
            profile_picture_url: a.profilePicture ?? null,
            is_active: a.isActive ?? true,
            token_expires_at: a.tokenExpiresAt ?? null,
            platform_specific_data: a,
          });
        addedCount++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced_count: syncedCount,
        added_count: addedCount,
        total_accounts: accounts.length
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