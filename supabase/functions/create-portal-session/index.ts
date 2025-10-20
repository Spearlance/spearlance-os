import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { client_id } = await req.json();

    if (!client_id) {
      return new Response(JSON.stringify({ error: 'client_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Checking billing permissions for user:', user.id, 'client:', client_id);

    // Check if user is admin or primary contact
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isAdmin = userRole?.role === 'admin';

    // Check if user is a primary contact for this client
    const { data: primaryContact } = await supabaseClient
      .from('client_primary_contacts')
      .select('id')
      .eq('client_id', client_id)
      .eq('user_id', user.id)
      .single();

    const isPrimaryContact = !!primaryContact;

    if (!isAdmin && !isPrimaryContact) {
      console.error('User does not have billing permissions');
      return new Response(JSON.stringify({ error: 'You do not have permission to access billing' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get client's Stripe customer ID
    const { data: client, error: clientError } = await supabaseClient
      .from('clients')
      .select('stripe_customer_id')
      .eq('id', client_id)
      .single();

    if (clientError || !client?.stripe_customer_id) {
      console.error('Client not found or no Stripe customer:', clientError);
      return new Response(JSON.stringify({ error: 'No billing information found for this client' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Creating portal session for customer:', client.stripe_customer_id);

    // Create Stripe billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: client.stripe_customer_id,
      return_url: `${req.headers.get('origin')}/settings?tab=billing`,
    });

    console.log('Portal session created:', session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating portal session:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
