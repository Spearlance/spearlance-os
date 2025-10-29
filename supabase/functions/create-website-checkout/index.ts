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

interface WebsiteCheckoutRequest {
  clientId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the user from the token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { clientId }: WebsiteCheckoutRequest = await req.json();

    if (!clientId) {
      throw new Error('Missing clientId');
    }

    // Verify user has access to this client
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, associated_client_ids')
      .eq('id', user.id)
      .single();

    if (!profile) {
      throw new Error('Profile not found');
    }

    const hasAccess = profile.role === 'admin' || 
                      (profile.associated_client_ids || []).includes(clientId);

    if (!hasAccess) {
      throw new Error('User does not have access to this client');
    }

    // Get client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, stripe_customer_id, website_unlocked, billing_method, subscription_status')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    // Verify eligibility
    if (client.billing_method !== 'stripe') {
      throw new Error('Client is not on Stripe billing');
    }

    if (!client.stripe_customer_id) {
      throw new Error('Client does not have a Stripe customer ID. Please sign up for a subscription first.');
    }

    if (client.website_unlocked) {
      throw new Error('Website features are already unlocked for this client');
    }

    // Check if on Unlimited plan (they should already have website)
    if (client.subscription_status === 'active') {
      const { data: subscription } = await stripe.subscriptions.retrieve(
        client.stripe_customer_id
      ).catch(() => ({ data: null }));
      
      // If they have an unlimited plan, they shouldn't need this
      // We'll allow it for now but log it
      console.log('Client has active subscription, allowing website purchase');
    }

    // Website add-on price ID (one-time payment of $750)
    const websitePriceId = Deno.env.get('STRIPE_WEBSITE_PRICE_ID');
    const websiteProductId = 'prod_TKM8ZkU6KtXYPM';
    
    if (!websitePriceId) {
      throw new Error('Website price ID not configured. Please contact support.');
    }

    // Create Stripe checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: client.stripe_customer_id,
      line_items: [
        {
          price: websitePriceId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get('origin') || 'https://app.spearlance.com'}/dashboard?website_added=true`,
      cancel_url: `${req.headers.get('origin') || 'https://app.spearlance.com'}/dashboard`,
      metadata: {
        client_id: clientId,
        product_type: 'website',
        product_id: websiteProductId,
        user_id: user.id,
      },
    });

    console.log('Website checkout session created:', session.id);

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
    console.error('Website checkout error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to create checkout session'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
