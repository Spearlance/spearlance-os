import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  email: string;
  name: string;
  role: 'client' | 'fmm';
  client_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for user creation
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Extract user ID from JWT token (already validated by Edge Runtime)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized');
    }

    // Parse JWT to get user ID (token is already validated by verify_jwt = true)
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;

    if (!userId) {
      throw new Error('Unauthorized');
    }

    // Check if caller has permission (admin or FMM)
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, associated_client_ids')
      .eq('id', userId)
      .single();

    if (profileError || !callerProfile) {
      throw new Error('Failed to fetch caller profile');
    }

    // Parse request body
    const { email, name, role, client_id }: InviteRequest = await req.json();

    // Validate inputs
    if (!email || !name || !role || !client_id) {
      throw new Error('Missing required fields');
    }

    if (!['client', 'fmm'].includes(role)) {
      throw new Error('Invalid role');
    }

    // Verify caller has access to this client
    const hasAccess = callerProfile.role === 'admin' || 
                     (callerProfile.associated_client_ids && 
                      callerProfile.associated_client_ids.includes(client_id));

    if (!hasAccess) {
      throw new Error('You do not have permission to invite users to this client');
    }

    // Only admin/FMM can invite
    if (callerProfile.role !== 'admin' && callerProfile.role !== 'fmm') {
      throw new Error('Only admins and FMMs can invite team members');
    }

    console.log('Inviting team member:', { email, name, role, client_id });

    // Generate a temporary password
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;

    // Create the user with admin client
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name,
        role,
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    console.log('User created successfully:', newUser.user.id);

    // Create profile entry
    const { error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        name,
        email,
        role,
        associated_client_ids: [client_id],
      });

    if (profileInsertError) {
      console.error('Error creating profile:', profileInsertError);
      // Try to clean up the created user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Failed to create profile: ${profileInsertError.message}`);
    }

    // Create user_roles entry
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role,
      });

    if (roleInsertError) {
      console.error('Error creating user role:', roleInsertError);
      // Continue anyway as this is not critical
    }

    console.log('Team member invited successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Team member invited successfully',
        user_id: newUser.user.id,
        temp_password: tempPassword, // In production, send via email instead
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in invite-team-member function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
