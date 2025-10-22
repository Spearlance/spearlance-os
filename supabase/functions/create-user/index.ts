import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  name: string;
  role: 'admin' | 'fmm' | 'client';
  client_ids?: string[];
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callingUser } } = await supabaseAdmin.auth.getUser(token);
    
    if (!callingUser) {
      throw new Error('Unauthorized');
    }

    // Verify caller is admin
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', callingUser.id)
      .single();

    if (callerProfile?.role !== 'admin') {
      throw new Error('Only admins can create users');
    }

    const { email, name, role, client_ids = [] }: CreateUserRequest = await req.json();

    if (!email || !name || !role) {
      throw new Error('Email, name, and role are required');
    }

    if (!['admin', 'fmm', 'client'].includes(role)) {
      throw new Error('Invalid role');
    }

    // Verify all client_ids exist if provided
    if (client_ids.length > 0) {
      const { data: clients } = await supabaseAdmin
        .from('clients')
        .select('id')
        .in('id', client_ids);
      
      if (!clients || clients.length !== client_ids.length) {
        throw new Error('One or more invalid client IDs');
      }
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users.some(u => u.email === email);
    
    if (userExists) {
      throw new Error('User with this email already exists');
    }

    console.log('Creating new user:', { email, name, role });

    // Create user without password - they'll set it via reset link
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: false, // User will confirm via password reset link
      user_metadata: {
        name,
        role,
      },
    });

    if (createError) {
      throw createError;
    }

    if (!newUser.user) {
      throw new Error('Failed to create user');
    }

    console.log('User created, updating profile with client assignments');

    await supabaseAdmin
      .from('profiles')
      .update({ 
        associated_client_ids: client_ids,
      })
      .eq('id', newUser.user.id);

    console.log('User created successfully');

    // Generate password reset link
    const appUrl = 'https://os.spearlance.com';
    const { data: signupData, error: signupError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${appUrl}/set-password`
      }
    });

    if (signupError) {
      console.error('Error generating signup link:', signupError);
      throw new Error('Failed to generate signup link');
    }

    // Prepare email content
    let clientNamesText = '';
    if (client_ids.length > 0) {
      const { data: clientsData } = await supabaseAdmin
        .from('clients')
        .select('name')
        .in('id', client_ids);
      
      if (clientsData && clientsData.length > 0) {
        const clientNames = clientsData.map(c => c.name).join(', ');
        clientNamesText = `<p><strong>Assigned Clients:</strong> ${clientNames}</p>`;
      }
    }

    const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);

    // Send invitation email with signup link
    try {
      await resend.emails.send({
        from: 'Spearlance Platform <noreply@em.os.spearlance.com>',
        to: [email],
        subject: `Welcome to Spearlance - Set Your Password`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a1a; margin-bottom: 24px;">Welcome to Spearlance!</h1>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">Hi ${name},</p>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">
              You've been invited to join Spearlance as an <strong>${roleDisplay}</strong>.
            </p>
            
            ${clientNamesText}
            
            <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
              <h2 style="color: #2d3748; font-size: 18px; margin-top: 0;">Get Started</h2>
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
            
            <p style="color: #718096; font-size: 14px;">
              Your email: <strong>${email}</strong>
            </p>
            
            <p style="color: #4a5568; margin-top: 32px;">
              Best regards,<br>
              <strong>The Spearlance Team</strong>
            </p>
          </div>
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
        message: 'User created and invitation sent successfully',
        user_id: newUser.user.id,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in create-user function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message?.includes('Unauthorized') || error.message?.includes('Only admins') ? 403 : 400,
      }
    );
  }
});
