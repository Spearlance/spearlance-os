import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateRoleRequest {
  userId: string;
  newRole: 'admin' | 'fmm' | 'client';
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
    return { allowed: true }; // Fail open to avoid blocking admins
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
    const rateLimitCheck = await checkAdminRateLimit(supabaseAdmin, user.id, 'role_change', 10);
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimitCheck.message }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, newRole }: UpdateRoleRequest = await req.json();

    // Validate input
    if (!userId || !newRole) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or newRole' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validRoles = ['admin', 'fmm', 'client', 'web_designer'];
    if (!validRoles.includes(newRole)) {
      return new Response(
        JSON.stringify({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent admins from demoting themselves
    if (userId === user.id && newRole !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Cannot demote your own admin account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get old role for audit log
    const { data: oldProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    // Update profile role
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (profileError) {
      console.error('Profile update error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to update profile role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update user_roles table
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId);

    if (roleError) {
      console.error('User roles update error:', roleError);
      // Rollback profile update
      await supabaseAdmin
        .from('profiles')
        .update({ role: oldProfile?.role })
        .eq('id', userId);

      return new Response(
        JSON.stringify({ error: 'Failed to update user role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log to audit table
    await supabaseAdmin.from('admin_audit_logs').insert({
      admin_user_id: user.id,
      action: 'update_role',
      target_user_id: userId,
      old_value: { role: oldProfile?.role },
      new_value: { role: newRole }
    });

    console.log(`Role updated: ${userId} from ${oldProfile?.role} to ${newRole}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Role updated successfully',
        oldRole: oldProfile?.role,
        newRole 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in admin-update-user-role:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});