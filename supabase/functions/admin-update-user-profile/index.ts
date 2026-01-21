import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateProfileRequest {
  userId: string;
  updates: {
    job_title?: string | null;
    department?: string | null;
    bio?: string | null;
    expertise_level?: string | null;
    preferred_communication_style?: string | null;
    focus_areas?: string[] | null;
  };
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
    const rateLimitCheck = await checkAdminRateLimit(supabaseAdmin, user.id, 'profile_update', 30);
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimitCheck.message }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, updates }: UpdateProfileRequest = await req.json();

    // Validate input
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid updates object' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get old profile data for audit log
    const { data: oldProfile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('job_title, department, bio, expertise_level, preferred_communication_style, focus_areas')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching profile:', fetchError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter to only allowed update fields
    const allowedFields = [
      'job_title',
      'department', 
      'bio',
      'expertise_level',
      'preferred_communication_style',
      'focus_areas'
    ];

    const sanitizedUpdates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (field in updates) {
        sanitizedUpdates[field] = updates[field as keyof typeof updates];
      }
    }

    // Update profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(sanitizedUpdates)
      .eq('id', userId);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log to audit table
    await supabaseAdmin.from('admin_audit_logs').insert({
      admin_user_id: user.id,
      action: 'update_user_profile',
      target_user_id: userId,
      old_value: oldProfile,
      new_value: sanitizedUpdates
    });

    console.log(`Profile updated for user ${userId} by admin ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Profile updated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in admin-update-user-profile:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
