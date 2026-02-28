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
  role: 'admin' | 'fmm' | 'client' | 'web_designer';
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

    if (!['admin', 'fmm', 'client', 'web_designer'].includes(role)) {
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

    // Generate a secure temporary password
    const generatePassword = () => {
      const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const lowercase = 'abcdefghijklmnopqrstuvwxyz';
      const numbers = '0123456789';
      const symbols = '!@#$%^&*';
      const all = uppercase + lowercase + numbers + symbols;
      
      let password = '';
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
      password += lowercase[Math.floor(Math.random() * lowercase.length)];
      password += numbers[Math.floor(Math.random() * numbers.length)];
      password += symbols[Math.floor(Math.random() * symbols.length)];
      
      for (let i = 4; i < 12; i++) {
        password += all[Math.floor(Math.random() * all.length)];
      }
      
      return password.split('').sort(() => Math.random() - 0.5).join('');
    };

    const tempPassword = generatePassword();

    // Create user with auto-generated password
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm so they can login immediately
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

    // Store hashed temporary password for tracking
    const encoder = new TextEncoder();
    const data = encoder.encode(tempPassword);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    await supabaseAdmin
      .from('temp_passwords')
      .insert({
        user_id: newUser.user.id,
        password_hash: passwordHash,
      });

    // Prepare email content
    const appUrl = Deno.env.get('APP_URL') || 'https://os.spearlance.com';
    let clientNames = '';
    if (client_ids.length > 0) {
      const { data: clientsData } = await supabaseAdmin
        .from('clients')
        .select('name')
        .in('id', client_ids);
      
      if (clientsData && clientsData.length > 0) {
        clientNames = clientsData.map(c => c.name).join(', ');
      }
    }

    // Send simplified invitation email - user can login directly with temp password
    try {
      const { error: emailError } = await supabaseAdmin.functions.invoke('send-templated-email', {
        body: {
          to: email,
          template_key: 'user_invitation',
          variables: {
            name: name,
            email: email,
            password: tempPassword,
            client_name: clientNames || 'Spearlance',
            app_url: appUrl
          }
        }
      });

      if (emailError) {
        console.error('Error sending invitation email:', emailError);
      } else {
        console.log('Invitation email sent to:', email);
      }
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
