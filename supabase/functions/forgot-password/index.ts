import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { findAuthUserByEmail } from "../_shared/authUsers.ts";
import { sendTemplatedEmail } from "../_shared/sendTemplatedEmail.ts";

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
    const user = await findAuthUserByEmail(supabaseAdmin, email);
    
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
    const appUrl = Deno.env.get('APP_URL') || 'https://os.spearlance.com';
    const redirectPath = isUnactivated ? "set-password" : "reset-password";
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${appUrl}/${redirectPath}`
      }
    });

    if (resetError) throw resetError;

    console.log('Recovery link generated successfully');

    // Send email using templated email system
    const templateKey = isUnactivated ? 'account_setup' : 'password_reset';
    
    const emailResponse = await sendTemplatedEmail(supabaseAdmin, {
      to: email,
      templateKey,
      variables: {
        name: profile?.name || 'there',
        email,
        action_link: resetData.properties.action_link,
      },
    });

    console.log(`Password reset email sent successfully to: ${email}`, emailResponse.data);

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
