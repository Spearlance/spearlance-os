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

    // Enforce role-based invitation rules:
    // - Only admins can invite FMM users
    // - Everyone else (including clients) can invite client users
    if (role === 'fmm' && callerProfile.role !== 'admin') {
      throw new Error('Only admins can invite FMM users');
    }

    // Check team member limits based on billing plan (only for 'client' role invitations)
    if (role === 'client') {
      const { data: clientData, error: clientError } = await supabaseAdmin
        .from('clients')
        .select(`
          id,
          billing_plan_id,
          billing_plans(max_team_members)
        `)
        .eq('id', client_id)
        .single();

      if (clientError) {
        console.error('Error fetching client billing plan:', clientError);
        throw new Error('Failed to verify client information');
      }

      // If client has a billing plan, check team member limits
      if (clientData?.billing_plan_id) {
        // Type assertion for the joined data structure
        const billingPlans = clientData?.billing_plans as { max_team_members: number | null } | { max_team_members: number | null }[];
        const maxTeamMembers = Array.isArray(billingPlans) ? billingPlans[0]?.max_team_members : billingPlans?.max_team_members;

        // Only enforce limits if plan has a max_team_members restriction (not NULL)
        if (maxTeamMembers !== null && maxTeamMembers !== undefined) {
          const maxAllowed = maxTeamMembers;
          
          // Count current team members (only role='client')
          const { count, error: countError } = await supabaseAdmin
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .contains('associated_client_ids', [client_id])
            .eq('role', 'client');

          if (countError) {
            console.error('Error counting team members:', countError);
            throw new Error('Failed to verify team member limits');
          }

          const currentCount = count || 0;

          if (currentCount >= maxAllowed) {
            throw new Error(
              `Team member limit reached. Your plan allows ${maxAllowed} team member${maxAllowed === 1 ? '' : 's'}. Please upgrade to add more team members.`
            );
          }
        }
      }
      // If no billing_plan_id, allow unlimited team members (demo/testing clients)
    }

    console.log('Inviting team member:', { email, name, role, client_id });

    // Check if user already exists
    const { data: existingUsers, error: lookupError } = await supabaseAdmin.auth.admin.listUsers();

    if (lookupError) {
      console.error('Error looking up existing users:', lookupError);
      throw new Error('Failed to verify user existence');
    }

    const existingUser = existingUsers.users.find(u => u.email === email);

    let invitedUserId: string;
    let isNewUser: boolean;

    if (existingUser) {
      // User already exists - add them to the client
      console.log('User already exists:', existingUser.id);
      invitedUserId = existingUser.id;
      isNewUser = false;
      
      // Get current profile data
      const { data: profile, error: profileFetchError } = await supabaseAdmin
        .from('profiles')
        .select('associated_client_ids, role')
        .eq('id', invitedUserId)
        .single();
      
      if (profileFetchError) {
        throw new Error('Failed to fetch existing user profile');
      }
      
      // Check if already associated with this client
      if (profile.associated_client_ids?.includes(client_id)) {
        throw new Error('User is already a member of this client');
      }
      
      // Add client to their associated_client_ids array
      const updatedClientIds = [...(profile.associated_client_ids || []), client_id];
      
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ associated_client_ids: updatedClientIds })
        .eq('id', invitedUserId);
      
      if (updateError) {
        console.error('Error adding client to existing user:', updateError);
        throw new Error('Failed to add user to client');
      }
      
      console.log('Added existing user to client');
      
    } else {
      // User doesn't exist - create new user
      isNewUser = true;
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: {
          name,
          role,
        },
      });

      if (createError) {
        console.error('Error creating user:', createError);
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      invitedUserId = newUser.user.id;
      console.log('User created successfully:', invitedUserId);

      // Update the auto-created profile to add client association
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({
          associated_client_ids: [client_id],
        })
        .eq('id', invitedUserId);

      if (profileUpdateError) {
        console.error('Error updating profile:', profileUpdateError);
        await supabaseAdmin.auth.admin.deleteUser(invitedUserId);
        throw new Error(`Failed to update profile: ${profileUpdateError.message}`);
      }

      // Create user_roles entry
      const { error: roleInsertError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: invitedUserId,
          role,
        });

      if (roleInsertError) {
        console.error('Error creating user role:', roleInsertError);
      }

      console.log('New user created and invited successfully');
    }

    // Get client name for the email
    const { data: clientData } = await supabaseAdmin
      .from('clients')
      .select('name')
      .eq('id', client_id)
      .single();

    const clientName = clientData?.name || 'the team';
    const appUrl = 'https://os.spearlance.com';

    let emailSubject: string;
    let emailHtml: string;

    if (isNewUser) {
      // Generate password reset link for new users
      const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: `${appUrl}/reset-password`
        }
      });

      if (resetError) {
        console.error('Error generating reset link:', resetError);
        throw new Error('Failed to generate password reset link');
      }

      emailSubject = `${inviterName} invited you to join ${clientName}`;
      emailHtml = `
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
      `;
    } else {
      // Send "You've been added" email for existing users
      emailSubject = `${inviterName} added you to ${clientName}`;
      emailHtml = `
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
              <h1 style="color: #000000; margin: 0 0 24px 0; font-size: 28px; font-weight: 600;">You've been added to ${clientName}!</h1>
              
              <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0 0 16px 0;">Hi ${name},</p>
              
              <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0 0 16px 0;">
                <strong>${inviterName}</strong> has added you to <strong>${clientName}</strong>'s workspace in Spearlance.
              </p>
              
              <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0 0 24px 0;">
                You can now access their workspace using your existing Spearlance account.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}" style="display: inline-block; padding: 16px 40px; background-color: #13cf48; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 8px rgba(19, 207, 72, 0.3);">
                      Go to Spearlance
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
                You now have access to ${clientName}'s workspace. Log in to start collaborating!
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
      `;
    }

    // Send the appropriate email
    try {
      await resend.emails.send({
        from: 'Garrett Handley from Spearlance <garrett@em.os.spearlance.com>',
        to: [email],
        subject: emailSubject,
        html: emailHtml,
      });

      console.log('Email sent to:', email);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: isNewUser ? 'Invitation email sent successfully' : 'User added to client successfully',
        user_id: invitedUserId,
        is_new_user: isNewUser,
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
