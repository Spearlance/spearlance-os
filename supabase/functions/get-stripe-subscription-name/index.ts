import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { subscription_id, client_id } = await req.json();

    if (!subscription_id) {
      return new Response(
        JSON.stringify({ error: 'subscription_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching subscription name for:', subscription_id);

    // Verify user has access to this client
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role, associated_client_ids')
      .eq('id', user.id)
      .single();

    const hasAccess = profile?.role === 'admin' || 
                     profile?.associated_client_ids?.includes(client_id);

    if (!hasAccess) {
      console.error('User does not have access to this client');
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch subscription from Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const subscription = await stripe.subscriptions.retrieve(subscription_id, {
      expand: ['items.data.price.product'],
    });

    console.log('Retrieved subscription:', subscription.id);

    // Get the product name from the first subscription item
    const product = subscription.items.data[0]?.price?.product;
    let planName = 'Unknown Plan';

    if (typeof product === 'object' && product !== null) {
      planName = product.name || 'Unknown Plan';
    }

    console.log('Plan name:', planName);

    // Update the client record with the plan name
    const { error: updateError } = await supabaseClient
      .from('clients')
      .update({ stripe_plan_name: planName })
      .eq('id', client_id);

    if (updateError) {
      console.error('Error updating client:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ plan_name: planName, success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in get-stripe-subscription-name:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to fetch subscription name',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
