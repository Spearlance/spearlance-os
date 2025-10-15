import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { client_id, topic_category, additional_context } = await req.json();

    if (!client_id || !topic_category) {
      return new Response(
        JSON.stringify({ error: 'Missing client_id or topic_category' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch brand context
    const [brandGuide, businessModel, avatar, brandVoice] = await Promise.all([
      supabaseClient.from('brand_guides').select('*').eq('client_id', client_id).maybeSingle(),
      supabaseClient.from('client_business_model').select('*').eq('client_id', client_id).maybeSingle(),
      supabaseClient.from('avatars').select('*').eq('client_id', client_id).maybeSingle(),
      supabaseClient.from('client_brand_voice').select('*').eq('client_id', client_id).maybeSingle(),
    ]);

    const brand = brandGuide.data;
    const business = businessModel.data;
    const targetAudience = avatar.data;
    const voice = brandVoice.data;

    // Build AI prompt
    const systemPrompt = `You are the Simplified Social Media Assistant for SpearlanceOS.

Your goal: Help complete beginners create social media posts that perfectly fit their brand.

Guidelines:
- Speak at a 5th-grade reading level
- Use friendly, encouraging language
- Avoid marketing jargon
- Give specific, actionable suggestions
- Each idea should be doable with a smartphone

Available Brand Context:
- Aesthetic: ${brand?.aesthetic || 'modern'}
- Brand Personality: ${brand?.brand_personality ? JSON.stringify(brand.brand_personality) : 'professional'}
- Tone: ${voice?.tone || 'friendly'}
- Target Audience: ${targetAudience?.demographics || 'general audience'}

Generate 3-5 specific post ideas for the topic: "${topic_category}".

${additional_context ? `Additional context: ${additional_context}` : ''}

Return a JSON array with this structure:
{
  "ideas": [
    {
      "title": "Short catchy title",
      "description": "Brief description of the post idea",
      "suggested_approach": "Simple step explaining how to create this post"
    }
  ]
}`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate post ideas for topic: ${topic_category}` }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    const ideas = JSON.parse(content);

    return new Response(
      JSON.stringify(ideas),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});