import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateClientRequest {
  name: string;
  industry?: string;
  primaryContactEmail?: string;
  primaryContactName?: string;
}

async function checkAdminRateLimit(
  supabase: any,
  adminUserId: string,
  operation: string,
  maxRequests: number
): Promise<{ allowed: boolean; message?: string }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('admin_rate_limits')
    .select('*')
    .eq('admin_user_id', adminUserId)
    .eq('operation', operation)
    .gte('window_start', oneHourAgo.toISOString())
    .maybeSingle();

  if (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true };
  }

  if (!data) {
    await supabase.from('admin_rate_limits').insert({
      admin_user_id: adminUserId,
      operation,
      request_count: 1,
      window_start: new Date().toISOString()
    });
    return { allowed: true };
  }

  if (data.request_count >= maxRequests) {
    return { 
      allowed: false, 
      message: `Rate limit exceeded: Maximum ${maxRequests} ${operation}s per hour` 
    };
  }

  await supabase
    .from('admin_rate_limits')
    .update({
      request_count: data.request_count + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', data.id);

  return { allowed: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is admin
    const { data: hasAdminRole } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!hasAdminRole) {
      console.error('User is not admin:', user.id);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit
    const rateLimitCheck = await checkAdminRateLimit(supabaseAdmin, user.id, 'client_create', 5);
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimitCheck.message }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { name, industry, primaryContactEmail, primaryContactName }: CreateClientRequest = await req.json();

    // Validate input
    if (!name || name.trim().length < 2 || name.trim().length > 200) {
      return new Response(
        JSON.stringify({ error: 'Client name must be between 2 and 200 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for duplicate client name
    const { data: existingClient } = await supabaseAdmin
      .from('clients')
      .select('id')
      .ilike('name', name.trim())
      .maybeSingle();

    if (existingClient) {
      return new Response(
        JSON.stringify({ error: 'A client with this name already exists' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with proper defaults
    const trialStartDate = new Date();
    const trialEndDate = new Date(trialStartDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const { data: newClient, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert([{
        name: name.trim(),
        industry: industry?.trim(),
        primary_contact_email: primaryContactEmail?.trim(),
        primary_contact_name: primaryContactName?.trim(),
        status: 'active',
        account_type: 'managed',
        trial_start_date: trialStartDate.toISOString(),
        trial_end_date: trialEndDate.toISOString(),
        subscription_status: 'trialing'
      }])
      .select()
      .single();

    if (clientError || !newClient) {
      console.error('Client creation error:', clientError);
      return new Response(
        JSON.stringify({ error: 'Failed to create client' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize launchpad_submissions
    const { error: launchpadError } = await supabaseAdmin
      .from('launchpad_submissions')
      .insert([{
        client_id: newClient.id,
        stage: 'discovery',
        responses_json: {},
        completed_at: {}
      }]);

    if (launchpadError) {
      console.error('LaunchPad init error:', launchpadError);
      // Non-critical - continue
    }

    // Initialize marketing_flows
    const { error: flowError } = await supabaseAdmin.rpc('initialize_marketing_flow', {
      p_client_id: newClient.id,
      p_user_id: user.id
    });

    if (flowError) {
      console.error('Marketing flow init error:', flowError);
      // Non-critical - continue
    }

    // Log to audit table
    await supabaseAdmin.from('admin_audit_logs').insert({
      admin_user_id: user.id,
      action: 'create_client',
      target_client_id: newClient.id,
      new_value: { 
        name: newClient.name, 
        status: newClient.status,
        account_type: newClient.account_type
      }
    });

    console.log(`Client created: ${newClient.id} (${newClient.name})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Client created successfully',
        client: {
          id: newClient.id,
          name: newClient.name,
          front_tag: newClient.front_tag,
          status: newClient.status,
          account_type: newClient.account_type,
          trial_end_date: newClient.trial_end_date
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in admin-create-client:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});