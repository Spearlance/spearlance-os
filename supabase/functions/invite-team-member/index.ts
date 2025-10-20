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
      .select('role, associated_client_ids, name')
      .eq('id', userId)
      .single();

    if (profileError || !callerProfile) {
      throw new Error('Failed to fetch caller profile');
    }

    const inviterName = callerProfile.name || 'Your team member';

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
        from: 'Garrett Handley from Spearlance <garrett@em.os.spearlance.com>',
        to: [email],
        subject: `${inviterName} invited you to join ${clientName}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; max-width: 600px;">
          
          <!-- Logo Header -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; text-align: center; border-bottom: 3px solid #13cf48;">
              <img src="https://os.spearlance.com/spearlance-logo.png" alt="Spearlance" style="height: 60px; max-width: 100%;">
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="color: #000000; margin: 0 0 24px 0; font-size: 28px; font-weight: 600;">You're invited to join ${clientName}!</h1>
              
              <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0 0 16px 0;">Hi ${name},</p>
              
              <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0 0 16px 0;">
                <strong>${inviterName}</strong> has invited you to collaborate on <strong>${clientName}</strong>'s workspace in Spearlance.
              </p>
              
              <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0 0 24px 0;">
                To get started, click the button below to create your password and access your account:
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetData.properties.action_link}" style="display: inline-block; padding: 16px 40px; background-color: #13cf48; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 8px rgba(19, 207, 72, 0.3);">
                      Create Your Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #13cf48; margin: 0 0 24px 0;">
                <p style="margin: 0; font-size: 14px; color: #666666; line-height: 1.6;">
                  <strong>Your Login Email:</strong> ${email}
                </p>
              </div>
              
              <p style="font-size: 14px; color: #999999; line-height: 1.6; margin: 0; padding-top: 24px; border-top: 1px solid #eeeeee;">
                <strong>Important:</strong> This invitation link will expire in 24 hours for security reasons. If you have any questions, feel free to reach out directly!
              </p>
            </td>
          </tr>
          
          <!-- Footer / Signature -->
          <tr>
            <td style="background-color: #000000; padding: 40px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 16px; color: #ffffff; font-weight: 600;">
                Garrett Handley
              </p>
              <p style="margin: 0 0 4px 0; font-size: 14px; color: #13cf48;">
                Founder, CEO
              </p>
              <p style="margin: 0; font-size: 14px; color: #cccccc;">
                Spearlance LLC
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
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
