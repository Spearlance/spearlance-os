import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting backfill of Stripe plan names...');

    // Find all clients with Stripe subscriptions but no plan name
    const { data: clients, error: queryError } = await supabaseAdmin
      .from('clients')
      .select('id, name, stripe_subscription_id')
      .eq('billing_method', 'stripe')
      .not('stripe_subscription_id', 'is', null)
      .is('stripe_plan_name', null);

    if (queryError) {
      throw queryError;
    }

    console.log(`Found ${clients?.length || 0} clients needing backfill`);

    const results = [];

    for (const client of clients || []) {
      try {
        console.log(`Processing client: ${client.name} (${client.id})`);

        // Fetch subscription from Stripe with expanded product info
        const subscription = await stripe.subscriptions.retrieve(
          client.stripe_subscription_id,
          {
            expand: ['items.data.price.product']
          }
        );

        // Get the product name from the first subscription item
        const firstItem = subscription.items.data[0];
        const product = firstItem?.price?.product;
        const planName = typeof product === 'string' 
          ? 'Subscription Plan' 
          : (product?.name || 'Subscription Plan');

        console.log(`Found plan name: ${planName}`);

        // Update the client record
        const { error: updateError } = await supabaseAdmin
          .from('clients')
          .update({ stripe_plan_name: planName })
          .eq('id', client.id);

        if (updateError) {
          console.error(`Error updating client ${client.name}:`, updateError);
          results.push({
            client: client.name,
            success: false,
            error: updateError.message
          });
        } else {
          console.log(`Successfully updated client ${client.name}`);
          results.push({
            client: client.name,
            success: true,
            planName
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing client ${client.name}:`, error);
        results.push({
          client: client.name,
          success: false,
          error: errorMessage
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Backfill complete. Processed ${results.length} clients.`,
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in backfill function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
