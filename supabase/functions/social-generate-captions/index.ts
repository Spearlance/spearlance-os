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

    const { client_id, post_idea, topic_category } = await req.json();

    if (!client_id || !post_idea) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch brand context
    const [brandVoice, avatar, brand] = await Promise.all([
      supabaseClient.from('client_brand_voice').select('*').eq('client_id', client_id).maybeSingle(),
      supabaseClient.from('avatars').select('*').eq('client_id', client_id).maybeSingle(),
      supabaseClient.from('brand_guides').select('*').eq('client_id', client_id).maybeSingle(),
    ]);

    const voice = brandVoice.data;
    const targetAudience = avatar.data;
    const brandGuide = brand.data;

    // Build AI prompt
    const systemPrompt = `You are the Simplified Social Media Assistant for SpearlanceOS.

Guidelines:
- Speak at a 5th-grade reading level
- Use friendly, encouraging language
- Sound natural, not salesy
- Each caption should be 40-100 words
- Match the brand's personality

Brand Context:
- Voice Tone: ${voice?.tone || 'friendly'}
- Brand Personality: ${brandGuide?.brand_personality ? JSON.stringify(brandGuide.brand_personality) : 'professional'}
- Target Audience: ${targetAudience?.demographics || 'general audience'}
- Words to Avoid: ${voice?.words_to_avoid || 'none'}

Post Idea: ${post_idea.title}
Description: ${post_idea.description}

Generate 3 caption variations in different tones:
1. Friendly - Conversational, warm, personal
2. Professional - Clear, informative, polished  
3. Fun - Playful, energetic, engaging

For each caption, also suggest 3-5 relevant hashtags.

Return JSON in this format:
{
  "captions": [
    {
      "tone": "Friendly",
      "text": "Caption text here...",
      "suggested_hashtags": ["#HashtagOne", "#HashtagTwo"]
    },
    {
      "tone": "Professional", 
      "text": "Caption text here...",
      "suggested_hashtags": ["#HashtagOne", "#HashtagTwo"]
    },
    {
      "tone": "Fun",
      "text": "Caption text here...",
      "suggested_hashtags": ["#HashtagOne", "#HashtagTwo"]
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
          { role: 'user', content: `Generate 3 caption variations for this post idea` }
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
    const captions = JSON.parse(content);

    return new Response(
      JSON.stringify(captions),
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