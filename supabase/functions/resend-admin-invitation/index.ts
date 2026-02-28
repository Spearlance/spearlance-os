import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) throw new Error('Unauthorized');

    // Verify caller is admin
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerProfile?.role !== 'admin') {
      throw new Error('Only admins can resend invitations');
    }

    const { userId } = await req.json();
    if (!userId) throw new Error('userId is required');

    // Get user details
    const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!targetUser.user) throw new Error('User not found');

    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!targetProfile) throw new Error('Profile not found');

    // Generate password reset link
    const appUrl = Deno.env.get('APP_URL') || 'https://os.spearlance.com';
    const { data: signupData, error: signupError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: targetUser.user.email!,
      options: {
        redirectTo: `${appUrl}/set-password`
      }
    });

    if (signupError) throw signupError;

    // Send email
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const roleDisplay = targetProfile.role.charAt(0).toUpperCase() + targetProfile.role.slice(1);

    await resend.emails.send({
      from: 'Spearlance Platform <noreply@em.os.spearlance.com>',
      to: [targetUser.user.email!],
      subject: `Invitation Reminder - Set Your Spearlance Password`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a; margin-bottom: 24px;">Reminder: Set Your Password</h1>
          
          <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">Hi ${targetProfile.name},</p>
          
          <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">
            This is a reminder to set your password for your Spearlance account (${roleDisplay} role).
          </p>
          
          <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <h2 style="color: #2d3748; font-size: 18px; margin-top: 0;">Set Your Password</h2>
            <p style="color: #4a5568; margin-bottom: 16px;">Click the button below to set your password and access your account:</p>
            
            <a href="${signupData.properties.action_link}" 
               style="display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Create Your Password
            </a>
          </div>
          
          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 24px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Important:</strong> This link will expire in 24 hours for security reasons.
            </p>
          </div>
          
          <p style="color: #4a5568; margin-top: 32px;">
            Best regards,<br>
            <strong>The Spearlance Team</strong>
          </p>
        </div>
      `,
    });

    console.log(`Invitation resent to ${targetUser.user.email}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Invitation resent to ${targetUser.user.email}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error resending invitation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
