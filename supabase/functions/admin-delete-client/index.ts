import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function checkAdminRateLimit(
  supabase: any,
  adminId: string,
  operation: string
): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('admin_rate_limits')
    .select('count')
    .eq('admin_id', adminId)
    .eq('operation', operation)
    .gte('created_at', oneHourAgo)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Rate limit check error:', error);
    return false;
  }

  const currentCount = data?.count || 0;
  
  if (currentCount >= 50) {
    return false;
  }

  if (data) {
    await supabase
      .from('admin_rate_limits')
      .update({ count: currentCount + 1, updated_at: new Date().toISOString() })
      .eq('admin_id', adminId)
      .eq('operation', operation)
      .gte('created_at', oneHourAgo);
  } else {
    await supabase
      .from('admin_rate_limits')
      .insert({
        admin_id: adminId,
        operation,
        count: 1,
      });
  }

  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user is admin
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc(
      'has_role',
      {
        _user_id: user.id,
        _role: 'admin',
      }
    );

    if (roleError || !isAdmin) {
      console.error('Admin check failed:', roleError);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Rate limiting
    const rateLimitOk = await checkAdminRateLimit(
      supabaseServiceRole,
      user.id,
      'client_deletion'
    );

    if (!rateLimitOk) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Maximum 50 client deletions per hour.',
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const { clientId } = await req.json();

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'Client ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get client details
    const { data: client, error: clientError } = await supabaseServiceRole
      .from('clients')
      .select('id, name, domain, billing_method, subscription_status, stripe_subscription_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error('Client not found:', clientError);
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check for active Stripe subscription
    if (client.stripe_subscription_id && client.subscription_status === 'active') {
      return new Response(
        JSON.stringify({
          error: 'Cannot delete client with active Stripe subscription. Please cancel the subscription first.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Log the deletion action
    const { error: auditError } = await supabaseServiceRole
      .from('admin_audit_logs')
      .insert({
        admin_id: user.id,
        action: 'delete_client',
        target_id: clientId,
        details: {
          client_name: client.name,
          client_domain: client.domain,
          billing_method: client.billing_method,
        },
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
    }

    // Delete the client (cascade will handle related records)
    const { error: deleteError } = await supabaseServiceRole
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (deleteError) {
      console.error('Delete client error:', deleteError);
      return new Response(
        JSON.stringify({
          error: 'Failed to delete client',
          details: deleteError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Client ${clientId} deleted successfully by admin ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Client deleted successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
