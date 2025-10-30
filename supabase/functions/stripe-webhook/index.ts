import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.21.0";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  
  console.log('Webhook received, signature present:', !!signature);
  console.log('Webhook secret configured:', !!webhookSecret);
  
  if (!signature) {
    console.error('No Stripe signature in request');
    return new Response('No signature', { status: 400 });
  }

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Stripe webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Check if this is a website add-on purchase
        if (session.metadata?.product_type === 'website' && session.metadata?.client_id) {
          const websiteProductId = 'prod_TKM8ZkU6KtXYPM';
          
          // Validate product ID for additional security
          if (session.metadata?.product_id === websiteProductId) {
            const { error } = await supabaseAdmin
              .from('clients')
              .update({
                website_unlocked: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', session.metadata.client_id)
              .eq('billing_method', 'stripe');

            if (error) {
              console.error('Failed to unlock website:', error);
              throw new Error(`Database update failed: ${error.message}`);
            }

            console.log('Website unlocked for client:', session.metadata.client_id);
          } else {
            console.log('Product ID mismatch - website not unlocked');
          }
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Retrieve subscription details with expanded product data
        const subscription_details = await stripe.subscriptions.retrieve(subscription.id, {
          expand: ['items.data.price.product']
        });

        const price = subscription_details.items.data[0]?.price;
        const product = price?.product;
        const productId = typeof product === 'string' ? product : product?.id;
        
        // Extract product name from subscription
        const productName = typeof product === 'string' ? null : product?.name || 'Subscription Plan';
        
        // Calculate grace period for past_due status
        const isPaymentFailing = subscription.status === 'past_due';
        const gracePeriodEnd = isPaymentFailing 
          ? new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)).toISOString() // 3 days from now
          : null;
        
        const { error } = await supabaseAdmin
          .from('clients')
          .update({
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status,
            stripe_plan_name: productName,
            grace_period_end: gracePeriodEnd,
            access_locked: false, // Reset lock when subscription updates
            status: subscription.status === 'active' ? 'active' : 
                    subscription.status === 'trialing' ? 'active' : 'inactive'
          })
          .eq('stripe_customer_id', subscription.customer as string)
          .eq('billing_method', 'stripe');

        if (error) {
          console.error('Failed to update subscription:', error);
          throw new Error(`Database update failed: ${error.message}`);
        }

        console.log('Updated subscription:', subscription.id, subscription.status, 'plan:', productName);

        // TODO: Replace this with your actual Unlimited plan product ID from Stripe Dashboard
        const unlimitedProductId = 'prod_UNLIMITED_PLAN_ID';

        if (productId === unlimitedProductId) {
          console.log('Unlimited plan detected - ending trial and unlocking website');
          
          const { data: clientData } = await supabaseAdmin
            .from('clients')
            .select('id')
            .eq('stripe_customer_id', subscription.customer as string)
            .eq('billing_method', 'stripe')
            .single();

          if (clientData) {
            // End trial immediately and unlock website
            await supabaseAdmin
              .from('clients')
              .update({
                trial_end_date: new Date().toISOString(), // End trial now
                subscription_status: 'active',
                status: 'active',
                website_unlocked: true, // Unlock website immediately
                updated_at: new Date().toISOString()
              })
              .eq('id', clientData.id);
            
            console.log('Trial ended and website unlocked for client:', clientData.id);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        const { error } = await supabaseAdmin
          .from('clients')
          .update({
            subscription_status: 'canceled',
            status: 'inactive'
          })
          .eq('stripe_subscription_id', subscription.id)
          .eq('billing_method', 'stripe');

        if (error) {
          console.error('Failed to cancel subscription:', error);
          throw new Error(`Database update failed: ${error.message}`);
        }

        console.log('Subscription canceled:', subscription.id);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.subscription) {
          const { error } = await supabaseAdmin
            .from('clients')
            .update({
              subscription_status: 'active',
              status: 'active',
              grace_period_end: null,
              access_locked: false
            })
            .eq('stripe_subscription_id', invoice.subscription as string)
            .eq('billing_method', 'stripe');

          if (error) {
            console.error('Failed to update payment status:', error);
            throw new Error(`Database update failed: ${error.message}`);
          }

          console.log('Payment succeeded and cleared grace period for subscription:', invoice.subscription);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.subscription) {
          // Set grace period when payment fails
          const gracePeriodEnd = new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)).toISOString();
          
          const { error } = await supabaseAdmin
            .from('clients')
            .update({
              subscription_status: 'past_due',
              grace_period_end: gracePeriodEnd,
              access_locked: false // Not locked yet, grace period active
            })
            .eq('stripe_subscription_id', invoice.subscription as string)
            .eq('billing_method', 'stripe');

          if (error) {
            console.error('Failed to mark payment as past due:', error);
            throw new Error(`Database update failed: ${error.message}`);
          }

          console.log('Payment failed for subscription - grace period set:', invoice.subscription);
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Webhook error:', error.message);
    console.error('Error stack:', error.stack);
    
    // Return appropriate status code
    if (error.message?.includes('signature') || error.message?.includes('Signature')) {
      return new Response(
        JSON.stringify({ error: 'Signature verification failed' }),
        { 
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
