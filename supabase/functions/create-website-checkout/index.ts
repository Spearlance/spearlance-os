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
      .select('id, name, stripe_customer_id, website_unlocked, billing_method, subscription_status, trial_end_date, primary_contact_user_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    // Verify eligibility
    if (client.billing_method !== 'stripe') {
      throw new Error('Client is not on Stripe billing');
    }

    if (client.website_unlocked) {
      throw new Error('Website features are already unlocked for this client');
    }

    // Determine if client has existing Stripe subscription
    const hasExistingSubscription = !!client.stripe_customer_id;

    console.log('Has existing subscription:', hasExistingSubscription);

    // Website add-on price ID (one-time payment of $750)
    const websitePriceId = Deno.env.get('STRIPE_WEBSITE_PRICE_ID');
    const websiteProductId = Deno.env.get('STRIPE_WEBSITE_PRODUCT_ID') || 'prod_TKM8ZkU6KtXYPM';
    
    if (!websitePriceId) {
      throw new Error('Website price ID not configured. Please contact support.');
    }

    const starterMonthlyPriceId = Deno.env.get('STRIPE_STARTER_PRICE_ID') || '';

    let session;

    if (hasExistingSubscription) {
      // Scenario A: Existing customer - just charge $750 one-time
      console.log('Existing customer - creating one-time payment session');
      
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: client.stripe_customer_id,
        line_items: [
          {
            price: websitePriceId,
            quantity: 1,
          },
        ],
        success_url: `${req.headers.get('origin') || 'https://os.spearlance.com'}/dashboard?website_added=true`,
        cancel_url: `${req.headers.get('origin') || 'https://os.spearlance.com'}`,
        metadata: {
          client_id: clientId,
          product_type: 'website',
          product_id: websiteProductId,
          user_id: user.id,
        },
      });
    } else {
      // Scenario B: New customer - charge $750 AND subscribe to $99/mo Starter
      console.log('New customer - creating combined payment + subscription session');
      
      // Get or create customer
      let customerId = client.stripe_customer_id;
      
      if (!customerId) {
        // Get primary contact email
        let primaryEmail = user.email;
        if (client.primary_contact_user_id) {
          const { data: primaryContact } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', client.primary_contact_user_id)
            .maybeSingle();
          
          if (primaryContact?.email) {
            primaryEmail = primaryContact.email;
          }
        }
        
        const customer = await stripe.customers.create({
          email: primaryEmail,
          name: client.name,
          metadata: { 
            client_id: clientId,
            user_id: user.id
          }
        });
        
        customerId = customer.id;
        
        // Save customer ID to database
        await supabase
          .from('clients')
          .update({ stripe_customer_id: customerId })
          .eq('id', clientId);
        
        console.log('Created Stripe customer:', customerId);
      }
      
      // Calculate trial end time
      const trialEnd = client.trial_end_date ? new Date(client.trial_end_date) : null;
      const trialEndTimestamp = trialEnd ? Math.floor(trialEnd.getTime() / 1000) : undefined;
      
      // Create subscription data with trial
      const subscriptionData: any = {
        metadata: { 
          client_id: clientId,
          plan: 'starter'
        }
      };
      
      // Extend trial if they still have days remaining
      if (trialEndTimestamp) {
        subscriptionData.trial_end = trialEndTimestamp;
        console.log('Trial will continue until:', new Date(trialEndTimestamp * 1000).toISOString());
      }
      
      // Create combined checkout: subscription with one-time website charge
      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [
          {
            price: starterMonthlyPriceId, // Starter plan subscription
            quantity: 1,
          },
          {
            price: websitePriceId, // One-time website charge
            quantity: 1,
          },
        ],
        subscription_data: subscriptionData,
        success_url: `${req.headers.get('origin') || 'https://os.spearlance.com'}/dashboard?website_added=true&subscription=started`,
        cancel_url: `${req.headers.get('origin') || 'https://os.spearlance.com'}`,
        metadata: {
          client_id: clientId,
          product_type: 'website_plus_subscription',
          product_id: websiteProductId,
          user_id: user.id,
        },
      });
    }

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
