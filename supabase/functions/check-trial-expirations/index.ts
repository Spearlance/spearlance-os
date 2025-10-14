import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    
    // Find trials expiring in 7 days (only for Stripe billing)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const { data: expiringSoon } = await supabaseAdmin
      .from('clients')
      .select(`
        *,
        primary_contact:profiles!clients_primary_contact_user_id_fkey(email, name)
      `)
      .eq('account_type', 'self_service')
      .eq('billing_method', 'stripe')
      .eq('subscription_status', 'trialing')
      .gte('trial_end_date', now.toISOString())
      .lte('trial_end_date', sevenDaysFromNow.toISOString());

    console.log(`Found ${expiringSoon?.length || 0} trials expiring in 7 days`);

    // Send 7-day reminder emails
    for (const client of expiringSoon || []) {
      try {
        await resend.emails.send({
          from: 'Spearlance Marketing OS <reminders@em.os.spearlance.com>',
          to: [client.primary_contact?.email],
          subject: '⏰ Your trial ends in 7 days',
          html: `
            <h1>Hi ${client.primary_contact?.name},</h1>
            
            <p>Your 90-day free trial with Spearlance Marketing OS is ending in <strong>7 days</strong>.</p>
            
            <p>To continue accessing:</p>
            <ul>
              <li>Your LaunchPad data</li>
              <li>Marketing flowcharts and ideas</li>
              <li>Tasks and assets</li>
              <li>Team collaboration</li>
            </ul>
            
            <p><a href="https://os.spearlance.com/settings" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px; margin: 16px 0;">Choose Your Plan</a></p>
            
            <h3>Pricing:</h3>
            <p><strong>Monthly:</strong> $99/month<br>
            <strong>Yearly:</strong> $499/year (save $689!)</p>
            
            <p>Questions? Just reply to this email.</p>
            
            <p>Best regards,<br>The Spearlance Team</p>
          `,
        });
        console.log('7-day reminder sent to:', client.primary_contact?.email);
      } catch (emailError) {
        console.error('Error sending 7-day email:', emailError);
      }
    }

    // Find expired trials without active subscription (only for Stripe billing)
    const { data: expired } = await supabaseAdmin
      .from('clients')
      .select(`
        *,
        primary_contact:profiles!clients_primary_contact_user_id_fkey(email, name)
      `)
      .eq('account_type', 'self_service')
      .eq('billing_method', 'stripe')
      .eq('subscription_status', 'trialing')
      .lt('trial_end_date', now.toISOString());

    console.log(`Found ${expired?.length || 0} expired trials`);

    // Pause expired accounts and send final notice
    for (const client of expired || []) {
      // Update client status
      await supabaseAdmin
        .from('clients')
        .update({ 
          subscription_status: 'paused',
          status: 'inactive'
        })
        .eq('id', client.id);

      // Send expiration email
      try {
        await resend.emails.send({
          from: 'Spearlance Marketing OS <support@em.os.spearlance.com>',
          to: [client.primary_contact?.email],
          subject: '🔴 Your trial has ended - Reactivate your account',
          html: `
            <h1>Hi ${client.primary_contact?.name},</h1>
            
            <p>Your 90-day free trial with Spearlance Marketing OS has ended.</p>
            
            <p><strong>Your account is now paused.</strong> Don't worry - all your data is safe!</p>
            
            <p>To reactivate your account and regain access:</p>
            
            <p><a href="https://os.spearlance.com/settings" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 16px 0;">Reactivate Account</a></p>
            
            <h3>Choose Your Plan:</h3>
            <p><strong>Monthly:</strong> $99/month<br>
            <strong>Yearly:</strong> $499/year (save 58%!)</p>
            
            <p>Your data will be retained for 30 days. After that, it may be permanently deleted.</p>
            
            <p>Questions or need help? Just reply to this email or contact support.</p>
            
            <p>Best regards,<br>The Spearlance Team</p>
          `,
        });
        console.log('Expiration notice sent to:', client.primary_contact?.email);
      } catch (emailError) {
        console.error('Error sending expiration email:', emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        expiring_soon_count: expiringSoon?.length || 0,
        expired_count: expired?.length || 0
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in check-trial-expirations:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
