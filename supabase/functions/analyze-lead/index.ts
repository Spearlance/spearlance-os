import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { submission_id } = await req.json();

    if (!submission_id) {
      return new Response(
        JSON.stringify({ error: 'submission_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the submission
    const { data: submission, error: fetchError } = await supabase
      .from('website_form_submissions')
      .select('*')
      .eq('id', submission_id)
      .single();

    if (fetchError || !submission) {
      console.error('Failed to fetch submission:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Submission not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Lovable AI with function calling for structured extraction
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a lead qualification expert. Analyze form submissions and extract structured lead information. 
            
Score leads 0-100 based on:
- Budget indicators (40 points)
- Timeline urgency (30 points)
- Business fit/clarity (20 points)
- Contact completeness (10 points)

Urgency levels:
- urgent: needs immediate response (within 24h)
- high: ready to move forward soon (within week)
- medium: exploring options (within month)
- low: early research stage`
          },
          {
            role: 'user',
            content: `Analyze this form submission and extract lead information:\n\n${JSON.stringify(submission.form_data, null, 2)}`
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_lead_data',
            description: 'Extract structured lead information from form submission',
            parameters: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Contact name' },
                email: { type: 'string', description: 'Email address' },
                phone: { type: 'string', description: 'Phone number' },
                company: { type: 'string', description: 'Company name' },
                industry: { type: 'string', description: 'Industry or business sector' },
                business_type: { type: 'string', description: 'Type of business' },
                budget: { type: 'string', description: 'Budget range or indicators' },
                timeline: { type: 'string', description: 'Project timeline' },
                pain_points: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'List of pain points or needs mentioned'
                },
                additional_notes: { type: 'string', description: 'Any other relevant details' },
                ai_summary: { 
                  type: 'string', 
                  description: 'Brief 2-3 sentence summary of the lead' 
                },
                ai_score: { 
                  type: 'integer', 
                  minimum: 0, 
                  maximum: 100,
                  description: 'Lead quality score 0-100' 
                },
                urgency: { 
                  type: 'string', 
                  enum: ['low', 'medium', 'high', 'urgent'],
                  description: 'Response urgency level'
                },
                next_action: { 
                  type: 'string', 
                  description: 'Recommended next action to take' 
                }
              },
              required: ['name', 'email', 'ai_summary', 'ai_score', 'urgency', 'next_action']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'extract_lead_data' } }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI analysis failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData, null, 2));

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error('No tool call in AI response');
      return new Response(
        JSON.stringify({ error: 'AI did not return structured data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const leadData = JSON.parse(toolCall.function.arguments);
    console.log('Extracted lead data:', leadData);

    // Create lead record
    const { data: lead, error: insertError } = await supabase
      .from('leads')
      .insert({
        client_id: submission.client_id,
        submission_id: submission.id,
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone || null,
        company: leadData.company || null,
        industry: leadData.industry || null,
        business_type: leadData.business_type || null,
        budget: leadData.budget || null,
        timeline: leadData.timeline || null,
        pain_points: leadData.pain_points || [],
        additional_notes: leadData.additional_notes || null,
        ai_summary: leadData.ai_summary,
        ai_score: leadData.ai_score,
        urgency: leadData.urgency,
        next_action: leadData.next_action,
        status: 'new'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert lead:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create lead', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, lead }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-lead:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
