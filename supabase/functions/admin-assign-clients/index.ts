import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AssignClientsRequest {
  userId: string;
  clientIds: string[];
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
    const rateLimitCheck = await checkAdminRateLimit(supabaseAdmin, user.id, 'client_assign', 20);
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimitCheck.message }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, clientIds }: AssignClientsRequest = await req.json();

    // Validate input
    if (!userId || !Array.isArray(clientIds)) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid userId or clientIds' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate all client IDs exist and are active
    if (clientIds.length > 0) {
      const { data: clients, error: clientError } = await supabaseAdmin
        .from('clients')
        .select('id, name, status')
        .in('id', clientIds);

      if (clientError) {
        console.error('Client lookup error:', clientError);
        return new Response(
          JSON.stringify({ error: 'Failed to validate client IDs' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!clients || clients.length !== clientIds.length) {
        return new Response(
          JSON.stringify({ error: 'One or more client IDs do not exist' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const inactiveClients = clients.filter(c => c.status !== 'active');
      if (inactiveClients.length > 0) {
        return new Response(
          JSON.stringify({ 
            error: `Cannot assign inactive clients: ${inactiveClients.map(c => c.name).join(', ')}` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get old client IDs for audit log
    const { data: oldProfile } = await supabaseAdmin
      .from('profiles')
      .select('associated_client_ids')
      .eq('id', userId)
      .single();

    // Update profile with new client IDs
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ associated_client_ids: clientIds })
      .eq('id', userId);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update client assignments' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log to audit table
    await supabaseAdmin.from('admin_audit_logs').insert({
      admin_user_id: user.id,
      action: 'assign_clients',
      target_user_id: userId,
      old_value: { client_ids: oldProfile?.associated_client_ids || [] },
      new_value: { client_ids: clientIds }
    });

    // Get client names for response
    const { data: assignedClients } = await supabaseAdmin
      .from('clients')
      .select('name')
      .in('id', clientIds);

    console.log(`Clients assigned to ${userId}:`, clientIds);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Clients assigned successfully',
        assignedClients: assignedClients?.map(c => c.name) || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in admin-assign-clients:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});