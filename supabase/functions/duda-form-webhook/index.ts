import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FormSubmissionPayload {
  site_id: string;
  form_name?: string;
  submitted_at: string;
  form_data: Record<string, any>;
  page_url?: string;
  ip_address?: string;
  user_agent?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received form submission webhook from Zapier');

    // Parse the request body
    const payload: FormSubmissionPayload = await req.json();
    console.log('Payload received:', JSON.stringify(payload, null, 2));

    // Validate required fields
    if (!payload.site_id) {
      console.error('Missing site_id in payload');
      return new Response(
        JSON.stringify({ error: 'site_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.form_data) {
      console.error('Missing form_data in payload');
      return new Response(
        JSON.stringify({ error: 'form_data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up the client_id based on site_id (but don't fail if not found)
    console.log(`Looking up client with site_id: ${payload.site_id}`);
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('site_id', payload.site_id)
      .maybeSingle();

    if (!client) {
      console.warn(`⚠️ No client found for site_id: ${payload.site_id} - Saving submission without client_id`);
    }

    const clientId = client?.id || null;
    console.log(clientId ? `Found client_id: ${clientId}` : 'No client_id - submission will be orphaned');

    // Insert the form submission
    const { data: submission, error: insertError } = await supabase
      .from('website_form_submissions')
      .insert({
        site_id: payload.site_id,
        client_id: clientId,
        form_name: payload.form_name || 'Contact Form',
        submitted_at: payload.submitted_at || new Date().toISOString(),
        form_data: payload.form_data,
        page_url: payload.page_url,
        ip_address: payload.ip_address,
        user_agent: payload.user_agent || req.headers.get('user-agent'),
        submission_source: 'duda',
        status: 'unread',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting form submission:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save form submission', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Form submission saved successfully:', submission.id);

    // Create notifications for relevant users (only if we have a client_id)
    if (clientId) {
      console.log('Creating notifications for form submission...');
      
      // Fetch client details for notification
      const { data: clientDetails } = await supabase
        .from('clients')
        .select('name, company_name, brand_name')
        .eq('id', clientId)
        .single();
      
      const clientName = clientDetails?.brand_name || clientDetails?.company_name || clientDetails?.name || 'Unknown Client';
      
      // Query for admin and FMM users
      const { data: adminFmmUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'fmm']);

      // Query for client primary contacts
      const { data: clientUsers } = await supabase
        .from('client_primary_contacts')
        .select('user_id')
        .eq('client_id', clientId);

      // Combine and deduplicate user IDs
      const userIds = new Set([
        ...(adminFmmUsers?.map(u => u.user_id) || []),
        ...(clientUsers?.map(u => u.user_id) || [])
      ]);

      // Extract submitter info for notification description
      const formData = submission.form_data;
      
      // Try to find name - check various field naming patterns
      const firstName = formData['First Name'] || formData['first_name'] || formData['firstName'] || 
                       formData['Parent Name'] || formData["Parent's Name"] || formData['Contact Name'] ||
                       formData["Child's First Name"] || formData['Child First Name'] || formData['NAME'];
                       
      const lastName = formData['Last Name'] || formData['last_name'] || formData['lastName'] ||
                      formData["Child's Last Name"] || formData['Child Last Name'];

      const fullName = firstName && lastName ? `${firstName} ${lastName}` : (firstName || lastName);

      // Try to find email
      const submitterEmail = formData['Email'] || formData['EMAIL'] || formData['email'] || 
                            formData['Parent Email'] || formData['Contact Email'];

      const submitterInfo = fullName || submitterEmail || 'Unknown';

      // Create notifications for each user
      if (userIds.size > 0) {
        const notifications = Array.from(userIds).map(userId => ({
          user_id: userId,
          type: 'form_submission',
          title: 'New Form Submission',
          description: `Contact form submission for ${clientName}`,
          client_id: clientId,
          action_url: `/website/form-submissions?client=${clientId}`,
          priority: 'normal',
          read_flag: false,
          payload_json: {
            submission_id: submission.id,
            form_name: submission.form_name,
            submitter_name: fullName,
            submitter_email: submitterEmail,
            submitted_at: submission.submitted_at
          }
        }));

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notifications);
        
        if (notifError) {
          console.error('Error creating notifications:', notifError);
          // Don't fail the webhook if notifications fail
        } else {
          console.log(`Created ${notifications.length} notifications`);
        }
      }

      // Trigger AI lead analysis asynchronously (don't block webhook response)
      supabase.functions.invoke('analyze-lead', {
        body: { submission_id: submission.id }
      }).then(({ data, error }) => {
        if (error) {
          console.error('AI analysis error:', error);
        } else {
          console.log('AI analysis completed:', data);
        }
      }).catch(err => {
        console.error('Failed to trigger AI analysis:', err);
      });
    } else {
      console.log('⚠️ Skipping notifications and AI lead analysis - no client_id available');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        submission_id: submission.id,
        message: 'Form submission received and stored successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
