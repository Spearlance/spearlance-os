import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateSelfServiceClientRequest {
  userId: string;
  companyName: string;
  userEmail: string;
  userName: string;
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

    const { userId, companyName, userEmail, userName }: CreateSelfServiceClientRequest = await req.json();

    // Calculate 90-day trial period
    const trialStart = new Date();
    const trialEnd = new Date(trialStart.getTime() + (90 * 24 * 60 * 60 * 1000));

    console.log('Creating self-service client for:', { userId, companyName });

    // Get Self-Service billing plan ID
    const { data: billingPlan } = await supabaseAdmin
      .from('billing_plans')
      .select('id')
      .eq('name', 'Self-Service Starter')
      .single();

    // Create client company
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert({
        name: companyName,
        company_name: companyName,
        account_type: 'self_service',
        trial_start_date: trialStart.toISOString(),
        trial_end_date: trialEnd.toISOString(),
        subscription_status: 'trialing',
        status: 'active',
        primary_contact_user_id: userId,
        billing_plan_id: billingPlan?.id,
      })
      .select()
      .single();

    if (clientError) {
      console.error('Error creating client:', clientError);
      throw clientError;
    }

    console.log('Client created:', client.id);

    // Associate user with client
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        associated_client_ids: [client.id]
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      throw profileError;
    }

    // Initialize LaunchPad submission
    const { error: launchpadError } = await supabaseAdmin
      .from('launchpad_submissions')
      .insert({
        client_id: client.id,
        stage: 'discovery'
      });

    if (launchpadError) {
      console.error('Error creating launchpad submission:', launchpadError);
      // Don't throw - this is not critical
    }

    // Send welcome email
    try {
      const trialEndDate = trialEnd.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });

      await resend.emails.send({
        from: 'Spearlance Marketing OS <welcome@em.os.spearlance.com>',
        to: [userEmail],
        subject: '🚀 Welcome to Your 90-Day Free Trial!',
        html: `
          <h1>Welcome to Spearlance Marketing OS, ${userName}!</h1>
          
          <p>Your company <strong>${companyName}</strong> now has full access to our marketing platform.</p>
          
          <h2>Your 90-Day Free Trial</h2>
          <p><strong>Trial Started:</strong> ${trialStart.toLocaleDateString('en-US')}<br>
          <strong>Trial Ends:</strong> ${trialEndDate}</p>
          
          <p>During your trial, you have full access to:</p>
          <ul>
            <li>✅ LaunchPad - Build your marketing foundation</li>
            <li>✅ Task Management - Stay organized</li>
            <li>✅ Asset Library - Store all your marketing materials</li>
            <li>✅ Avatar Builder - Define your ideal customer</li>
            <li>✅ Marketing Flowchart & Ideas - Plan campaigns</li>
            <li>✅ Team Collaboration - Invite your team</li>
            <li>✅ Reports & Analytics - Track your progress</li>
          </ul>
          
          <h3>Next Steps:</h3>
          <ol>
            <li><a href="https://os.spearlance.com">Log in to your account</a></li>
            <li>Complete the LaunchPad to build your marketing strategy</li>
            <li>Invite your team members</li>
            <li>Start creating marketing campaigns</li>
          </ol>
          
          <p><strong>After 90 days:</strong> Continue with just $99/month or save 58% with our annual plan at $499/year.</p>
          
          <p>Questions? Just reply to this email!</p>
          
          <p>Best regards,<br>The Spearlance Team</p>
        `,
      });

      console.log('Welcome email sent to:', userEmail);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't throw - user and client were created successfully
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        client_id: client.id,
        trial_end_date: trialEnd.toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in create-self-service-client:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
