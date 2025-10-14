import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.21.0";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckoutRequest {
  priceId: string;
  clientId: string;
}

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
    if (!authHeader) {
      throw new Error('Missing authorization');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { priceId, clientId }: CheckoutRequest = await req.json();

    // Verify user has access to this client
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('associated_client_ids')
      .eq('id', user.id)
      .single();

    if (!profile?.associated_client_ids?.includes(clientId)) {
      throw new Error('Access denied to this client');
    }

    // Get client data first
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error('Client fetch error:', clientError);
      throw new Error('Client not found');
    }

    // Validate that client is on Stripe billing
    if (client.billing_method !== 'stripe') {
      throw new Error('This client is not on a Stripe billing plan');
    }

    // Get primary contact info if it exists
    let primaryContactEmail = user.email; // fallback to current user
    if (client.primary_contact_user_id) {
      const { data: primaryContact } = await supabaseAdmin
        .from('profiles')
        .select('email, name')
        .eq('id', client.primary_contact_user_id)
        .maybeSingle();
      
      if (primaryContact?.email) {
        primaryContactEmail = primaryContact.email;
      }
    }

    console.log('Creating checkout session for client:', client.id);

    // Create or retrieve Stripe customer
    let customerId = client.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: primaryContactEmail,
        name: client.company_name || client.name,
        metadata: { 
          client_id: clientId,
          user_id: user.id
        }
      });
      
      customerId = customer.id;
      
      // Save customer ID
      await supabaseAdmin
        .from('clients')
        .update({ stripe_customer_id: customerId })
        .eq('id', clientId);

      console.log('Created Stripe customer:', customerId);
    }

    // Calculate trial end if applicable
    const now = new Date();
    const trialEnd = client.trial_end_date ? new Date(client.trial_end_date) : null;
    const daysRemaining = trialEnd ? Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    // Build subscription data
    const subscriptionData: any = {
      metadata: { client_id: clientId }
    };

    // If still in trial period, extend it in Stripe
    if (trialEnd && daysRemaining > 0) {
      subscriptionData.trial_end = Math.floor(trialEnd.getTime() / 1000);
      console.log(`Trial extended in Stripe: ${daysRemaining} days remaining`);
    }

    const baseUrl = Deno.env.get('VITE_SUPABASE_URL') || 'https://os.spearlance.com';

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: subscriptionData,
      success_url: `${baseUrl}/?payment=success`,
      cancel_url: `${baseUrl}/settings?payment=canceled`,
      metadata: { 
        client_id: clientId,
        user_id: user.id
      },
    });

    console.log('Checkout session created:', session.id);

    return new Response(
      JSON.stringify({ 
        sessionId: session.id,
        url: session.url 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
