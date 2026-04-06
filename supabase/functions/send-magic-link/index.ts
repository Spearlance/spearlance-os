import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { findAuthUserByEmail } from "../_shared/authUsers.ts";
import { sendTemplatedEmail } from "../_shared/sendTemplatedEmail.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MagicLinkRequest {
  email: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { email }: MagicLinkRequest = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    // Get IP address for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';

    // Check rate limiting: max 3 requests per 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: recentRequests, error: rateLimitError } = await supabaseAdmin
      .from('magic_link_requests')
      .select('id')
      .eq('email', email.toLowerCase())
      .gte('requested_at', fiveMinutesAgo);

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    }

    if (recentRequests && recentRequests.length >= 3) {
      throw new Error('Too many requests. Please wait a few minutes before trying again.');
    }

    // Check if user exists
    const user = await findAuthUserByEmail(supabaseAdmin, email);
    
    if (!user) {
      // Don't reveal if user exists or not for security
      console.log('Magic link requested for non-existent user:', email);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'If an account exists with this email, you will receive a magic link shortly.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (!user.email_confirmed_at) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "This account still needs to be set up. Request a new invitation link instead.",
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Get user's name from profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single();

    const userName = profile?.name || 'there';

    // Generate magic link
    const appUrl = Deno.env.get('APP_URL') || 'https://os.spearlance.com';
    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: appUrl
      }
    });

    if (magicLinkError) {
      console.error('Error generating magic link:', magicLinkError);
      throw new Error('Failed to generate magic link');
    }

    // Log the request for rate limiting
    await supabaseAdmin
      .from('magic_link_requests')
      .insert({
        email: email.toLowerCase(),
        ip_address: ipAddress,
      });

    // Send email using templated email function
    await sendTemplatedEmail(supabaseAdmin, {
      to: email,
      templateKey: 'magic_link',
      variables: {
        name: userName,
        email,
        action_link: magicLinkData.properties.action_link,
      },
    });

    console.log('Magic link sent successfully to:', email);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Magic link sent! Check your email.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in send-magic-link function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
