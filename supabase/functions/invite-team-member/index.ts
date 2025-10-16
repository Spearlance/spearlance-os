import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

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

    // Create the user without password - they'll set it via reset link
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: false, // User will confirm via password reset link
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

    // Update the auto-created profile to add client association
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        associated_client_ids: [client_id],
      })
      .eq('id', newUser.user.id);

    if (profileUpdateError) {
      console.error('Error updating profile:', profileUpdateError);
      // Try to clean up the created user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Failed to update profile: ${profileUpdateError.message}`);
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

    // Get client name for the email
    const { data: clientData } = await supabaseAdmin
      .from('clients')
      .select('name')
      .eq('id', client_id)
      .single();

    const clientName = clientData?.name || 'the team';
    const appUrl = 'https://os.spearlance.com';

    // Generate password reset link
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${appUrl}/auth/reset-password`
      }
    });

    if (resetError) {
      console.error('Error generating reset link:', resetError);
      throw new Error('Failed to generate password reset link');
    }

    // Send invitation email with password reset link
    try {
      await resend.emails.send({
        from: 'Team Invitation <noreply@em.os.spearlance.com>',
        to: [email],
        subject: `You've been invited to ${clientName}`,
        html: `
          <h1>Welcome to ${clientName}!</h1>
          <p>Hi ${name},</p>
          <p>You've been invited to join <strong>${clientName}</strong>'s account.</p>
          
          <h2>Set up your account:</h2>
          <p>Click the link below to set your password and activate your account:</p>
          
          <p><a href="${resetData.properties.action_link}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px; margin: 16px 0;">Set Password & Log In</a></p>
          
          <p><strong>Important:</strong> This link will expire in 24 hours for security reasons.</p>
          <p>Your email: <strong>${email}</strong></p>
          
          <p>Best regards,<br>The Team</p>
        `,
      });

      console.log('Invitation email sent to:', email);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Continue anyway - user was created successfully
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation email sent successfully',
        user_id: newUser.user.id,
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
