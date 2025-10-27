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

    // Look up the client_id based on site_id
    console.log(`Looking up client with site_id: ${payload.site_id}`);
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('site_id', payload.site_id)
      .single();

    if (clientError || !client) {
      console.error('Client not found for site_id:', payload.site_id, clientError);
      return new Response(
        JSON.stringify({ 
          error: 'Client not found for the provided site_id',
          site_id: payload.site_id 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found client_id: ${client.id}`);

    // Insert the form submission
    const { data: submission, error: insertError } = await supabase
      .from('website_form_submissions')
      .insert({
        site_id: payload.site_id,
        client_id: client.id,
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
