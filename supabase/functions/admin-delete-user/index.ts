import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteUserRequest {
  userId: string;
}

async function checkAdminRateLimit(
  supabase: any,
  adminUserId: string,
  operation: string,
  maxRequests: number
): Promise<{ allowed: boolean; message?: string }> {
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - 1);

  const { data: existingLimit } = await supabase
    .from('admin_rate_limits')
    .select('request_count, window_start')
    .eq('admin_user_id', adminUserId)
    .eq('operation', operation)
    .gte('window_start', windowStart.toISOString())
    .single();

  if (existingLimit) {
    if (existingLimit.request_count >= maxRequests) {
      return {
        allowed: false,
        message: `Rate limit exceeded. Maximum ${maxRequests} ${operation} operations per hour.`,
      };
    }

    await supabase
      .from('admin_rate_limits')
      .update({
        request_count: existingLimit.request_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('admin_user_id', adminUserId)
      .eq('operation', operation)
      .gte('window_start', windowStart.toISOString());
  } else {
    await supabase.from('admin_rate_limits').insert({
      admin_user_id: adminUserId,
      operation,
      request_count: 1,
      window_start: new Date().toISOString(),
    });
  }

  return { allowed: true };
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

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: isAdmin } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });

    if (!isAdmin) {
      console.error('User is not an admin:', user.id);
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rateLimitCheck = await checkAdminRateLimit(
      supabaseServiceRole,
      user.id,
      'user_deletion',
      5
    );

    if (!rateLimitCheck.allowed) {
      return new Response(JSON.stringify({ error: rateLimitCheck.message }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { userId } = (await req.json()) as DeleteUserRequest;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete your own account' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: targetUserRole } = await supabaseServiceRole.rpc('has_role', {
      _user_id: userId,
      _role: 'admin',
    });

    if (targetUserRole) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete another admin account' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: targetProfile, error: profileError } = await supabaseServiceRole
      .from('profiles')
      .select('id, name, email, role, associated_client_ids')
      .eq('id', userId)
      .single();

    if (profileError || !targetProfile) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Deleting user:', targetProfile);

    await supabaseServiceRole.from('admin_audit_logs').insert({
      admin_user_id: user.id,
      target_user_id: userId,
      action: 'user_deleted',
      old_value: targetProfile,
      new_value: null,
    });

    const { error: deleteError } = await supabaseServiceRole.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete user', details: deleteError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('User deleted successfully:', userId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User deleted successfully',
        deletedUser: targetProfile,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
