import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { findAuthUserByEmail } from "../_shared/authUsers.ts";

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

    console.log(`New invitation link requested for: ${email}`);

    // Verify user exists
    const user = await findAuthUserByEmail(supabaseAdmin, email);
    
    if (!user) {
      // Return success message even if user not found (security best practice)
      console.log(`Invitation requested for non-existent email: ${email}`);
      return new Response(
        JSON.stringify({ success: true, message: 'If an unactivated account exists, a new invitation link will be sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check if user has already confirmed their email (activated account)
    if (user.email_confirmed_at) {
      console.log(`User ${email} has already activated their account`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'This account is already activated. Please use the "Forgot Password" option to reset your password.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get user profile for name
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single();

    console.log(`User has unactivated account, generating new invitation link`);

    // Generate recovery link (which will act as invitation link)
    const appUrl = Deno.env.get('APP_URL') || 'https://os.spearlance.com';
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${appUrl}/set-password`
      }
    });

    if (resetError) throw resetError;

    console.log('New invitation link generated successfully');

    // Send email via Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    
    const emailResponse = await resend.emails.send({
      from: 'Spearlance Platform <noreply@em.os.spearlance.com>',
      to: [email],
      subject: 'New Invitation Link - Spearlance',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a; margin-bottom: 24px;">Welcome to Spearlance!</h1>
          
          <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">Hi ${profile?.name || 'there'},</p>
          
          <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">
            We received a request for a new invitation link to complete your account setup. Click the button below to set your password and get started:
          </p>
          
          <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <h2 style="color: #2d3748; font-size: 18px; margin-top: 0;">Complete Your Account Setup</h2>
            <p style="color: #4a5568; margin-bottom: 16px;">Click below to set your password and access your account:</p>
            
            <a href="${resetData.properties.action_link}" 
               style="display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Set Your Password
            </a>
          </div>
          
          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 24px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Important:</strong> This link will expire in 24 hours. Please complete your setup as soon as possible.
            </p>
          </div>
          
          <p style="color: #718096; font-size: 14px; line-height: 1.5;">
            If you didn't request this link, you can safely ignore this email.
          </p>
          
          <p style="color: #718096; font-size: 14px; line-height: 1.5; margin-top: 24px;">
            Need help? Contact your Spearlance administrator.
          </p>
          
          <p style="color: #4a5568; margin-top: 32px;">
            Best regards,<br>
            <strong>The Spearlance Team</strong>
          </p>
        </div>
      `,
    });

    console.log(`New invitation email sent successfully to: ${email}`, emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'A new invitation link has been sent to your email'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error in request-new-invitation function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
