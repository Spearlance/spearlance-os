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

    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);

    console.log('Creating new user:', { email, name, role });

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

    // Prepare email content
    const appUrl = 'https://os.spearlance.com';
    
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

    // Send invitation email
    try {
      await resend.emails.send({
        from: 'Platform Invitation <noreply@em.os.spearlance.com>',
        to: [email],
        subject: `You've been invited to the platform`,
        html: `
          <h1>Welcome to the platform!</h1>
          <p>Hi ${name},</p>
          <p>You've been invited as a <strong>${roleDisplay}</strong>.</p>
          
          ${clientNamesText}
          
          <h2>Your login credentials:</h2>
          <p><strong>Email:</strong> ${email}<br>
          <strong>Temporary Password:</strong> ${tempPassword}</p>
          
          <p><a href="${appUrl}/auth" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px; margin: 16px 0;">Log in here</a></p>
          
          <p><strong>Important:</strong> Please change your password after your first login.</p>
          
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
