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

    const { email } = await req.json();
    if (!email) throw new Error('Email is required');

    console.log(`Password reset requested for: ${email}`);

    // Verify user exists
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.find(u => u.email === email);
    
    if (!user) {
      // Return success even if user not found (security best practice)
      console.log(`Password reset requested for non-existent email: ${email}`);
      return new Response(
        JSON.stringify({ success: true, message: 'If an account exists, a reset link will be sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check if user has never confirmed email (unactivated invite)
    const isUnactivated = !user.email_confirmed_at;
    console.log(`User activation status - Activated: ${!isUnactivated}`);

    // Get user profile for name
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single();

    console.log(`Found user profile:`, profile);

    // Generate recovery link
    const appUrl = 'https://os.spearlance.com';
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${appUrl}/reset-password`
      }
    });

    if (resetError) throw resetError;

    console.log('Recovery link generated successfully');

    // Send email via Resend with appropriate messaging based on account status
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    
    const emailResponse = await resend.emails.send({
      from: 'Spearlance Platform <noreply@em.os.spearlance.com>',
      to: [email],
      subject: isUnactivated ? 'Complete Your Spearlance Account Setup' : 'Reset Your Spearlance Password',
      html: isUnactivated ? `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a; margin-bottom: 24px;">Complete Your Account Setup</h1>
          
          <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">Hi ${profile?.name || 'there'},</p>
          
          <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">
            We noticed you haven't completed your account setup yet. Click the button below to set your password and get started with Spearlance:
          </p>
          
          <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <h2 style="color: #2d3748; font-size: 18px; margin-top: 0;">Set Your Password</h2>
            <p style="color: #4a5568; margin-bottom: 16px;">Click below to complete your account setup:</p>
            
            <a href="${resetData.properties.action_link}" 
               style="display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Complete Setup
            </a>
          </div>
          
          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 24px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Important:</strong> This link will expire in 24 hours. Please complete your setup as soon as possible.
            </p>
          </div>
          
          <p style="color: #718096; font-size: 14px; line-height: 1.5;">
            If you didn't request this, you can safely ignore this email.
          </p>
          
          <p style="color: #4a5568; margin-top: 32px;">
            Best regards,<br>
            <strong>The Spearlance Team</strong>
          </p>
        </div>
      ` : `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a; margin-bottom: 24px;">Reset Your Password</h1>
          
          <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">Hi ${profile?.name || 'there'},</p>
          
          <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">
            We received a request to reset your password for your Spearlance account. Click the button below to create a new password:
          </p>
          
          <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <h2 style="color: #2d3748; font-size: 18px; margin-top: 0;">Reset Your Password</h2>
            <p style="color: #4a5568; margin-bottom: 16px;">Click the button below to securely reset your password:</p>
            
            <a href="${resetData.properties.action_link}" 
               style="display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Reset Password
            </a>
          </div>
          
          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 24px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Important:</strong> This link will expire in 24 hours for security reasons.
            </p>
          </div>
          
          <p style="color: #718096; font-size: 14px; line-height: 1.5;">
            If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
          
          <p style="color: #4a5568; margin-top: 32px;">
            Best regards,<br>
            <strong>The Spearlance Team</strong>
          </p>
        </div>
      `,
    });

    console.log(`Password reset email sent successfully to: ${email}`, emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'If an account exists, a reset link will be sent'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error in forgot-password function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
