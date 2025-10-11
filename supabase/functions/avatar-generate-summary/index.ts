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
    const { client_id } = await req.json();
    console.log('Generating avatar summary for client:', client_id);

    if (!client_id) {
      throw new Error('client_id is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch avatar data
    const { data: avatar, error: avatarError } = await supabase
      .from('avatars')
      .select('*')
      .eq('client_id', client_id)
      .single();

    if (avatarError) {
      console.error('Error fetching avatar:', avatarError);
      throw new Error('Avatar not found');
    }

    // Fetch evidence
    const { data: evidence } = await supabase
      .from('avatar_evidence')
      .select('*')
      .eq('avatar_id', avatar.id);

    // Build prompt
    const prompt = `You are a marketing expert analyzing a customer avatar. Generate a comprehensive summary and ad hooks based on the following information:

Avatar Name: ${avatar.avatar_name || 'N/A'}
Demographics: ${avatar.demographics || 'N/A'}
Firmographics: ${avatar.firmographics || 'N/A'}
Goals: ${avatar.goals || 'N/A'}
Pains: ${avatar.pains || 'N/A'}
Objections: ${avatar.objections || 'N/A'}
Motivators: ${avatar.motivators || 'N/A'}
Tone & Voice: ${avatar.tone_voice || 'N/A'}

${evidence && evidence.length > 0 ? `Evidence:\n${evidence.map(e => `- ${e.evidence_type}: ${e.excerpt_text || e.source_url || ''}`).join('\n')}` : ''}

Please provide:
1. A comprehensive 3-paragraph AI summary that synthesizes all this information
2. Three compelling ad hooks that would resonate with this avatar (provide exactly 3 hooks, separated by newlines)

Format your response as JSON:
{
  "summary": "your comprehensive summary here",
  "hooks": ["hook 1", "hook 2", "hook 3"]
}`;

    console.log('Calling Lovable AI...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a marketing expert. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON response
    let aiResponse;
    try {
      aiResponse = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', content);
      throw new Error('AI returned invalid JSON');
    }

    // Update avatar with AI summary and hooks
    const { error: updateError } = await supabase
      .from('avatars')
      .update({
        ai_summary: aiResponse.summary,
        ad_hooks: aiResponse.hooks,
        updated_at: new Date().toISOString(),
      })
      .eq('id', avatar.id);

    if (updateError) {
      console.error('Error updating avatar:', updateError);
      throw new Error('Failed to update avatar');
    }

    console.log('Successfully generated avatar summary');
    return new Response(
      JSON.stringify({ 
        success: true, 
        summary: aiResponse.summary,
        ad_hooks: aiResponse.hooks,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in avatar-generate-summary:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
