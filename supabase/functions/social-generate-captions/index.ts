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

    // Fetch comprehensive brand context
    const [brandVoice, avatar, brand, client, businessModel] = await Promise.all([
      supabaseClient.from('client_brand_voice').select('*').eq('client_id', client_id).maybeSingle(),
      supabaseClient.from('avatars').select('*').eq('client_id', client_id).maybeSingle(),
      supabaseClient.from('brand_guides').select('*').eq('client_id', client_id).maybeSingle(),
      supabaseClient.from('clients').select('*').eq('id', client_id).maybeSingle(),
      supabaseClient.from('client_business_model').select('*').eq('client_id', client_id).maybeSingle(),
    ]);

    const voice = brandVoice.data;
    const targetAudience = avatar.data;
    const brandGuide = brand.data;
    const clientInfo = client.data;
    const businessModelData = businessModel.data;

    // Build deep context prompt
    const systemPrompt = `You are an expert social media strategist creating content for ${clientInfo?.company_name || clientInfo?.name || 'this business'}, a ${clientInfo?.industry || 'professional services'} business.

CONTEXT YOU MUST USE:

1. CLIENT'S STORY & VOICE
${voice?.story_summary ? `
Executive Summary: ${voice.story_summary.executive_summary || 'Not available'}

${voice.story_summary.value_propositions?.length ? `Key Value Propositions:
${voice.story_summary.value_propositions.slice(0, 4).map((vp: string) => `- ${vp}`).join('\n')}` : ''}

${voice.story_summary.pain_points?.length ? `Pain Points They Address:
${voice.story_summary.pain_points.slice(0, 5).map((pp: string) => `- ${pp}`).join('\n')}` : ''}

${voice.story_summary.client_voice_samples?.length ? `Their Actual Words (use these phrases when natural):
${voice.story_summary.client_voice_samples.slice(0, 3).map((quote: string) => `"${quote}"`).join('\n')}` : ''}
` : 'Story context not yet available - focus on industry best practices.'}

2. TARGET AUDIENCE
${targetAudience ? `- Demographics: ${targetAudience.demographics || 'General audience'}
- Their Pains: ${targetAudience.pains || 'Common industry pain points'}
- Their Goals: ${targetAudience.goals || 'Standard business goals'}
- Their Motivators: ${targetAudience.motivators || 'Quality and results'}` : '- General professional audience'}

3. BUSINESS STRATEGY
${businessModelData ? `- What's Working: ${businessModelData.current_state_working || 'Building on strengths'}
- What's NOT Working: ${businessModelData.current_state_not_working || 'Addressing challenges'}
- Sales Process: ${businessModelData.sales_process || 'Standard sales approach'}` : '- Focus on value delivery and client relationships'}

4. BRAND VOICE
- Established Tone: ${voice?.tone || 'Professional and approachable'}
- Words to AVOID: ${voice?.words_to_avoid || 'Overly technical jargon, hype'}
${brandGuide?.brand_personality ? `- Brand Personality: ${JSON.stringify(brandGuide.brand_personality)}` : ''}

POST TOPIC CATEGORY: ${topic_category || 'General'}
POST IDEA: ${post_idea.title}
Description: ${post_idea.description}

YOUR TASK:
Write ONE highly targeted social media caption (50-120 words) that:
1. Uses actual phrases from the client's voice samples when it feels natural
2. Directly addresses a specific pain point from their audience
3. Connects to one of their key value propositions
4. Matches their established brand tone (${voice?.tone || 'professional'})
5. Feels authentic and conversational, not salesy
6. Includes a subtle call-to-action that aligns with their business
7. Reads at a 5th-grade level - simple, clear, engaging

Also provide:
- 3-5 relevant hashtags (industry-specific + local if service areas known)
- Brief 1-2 sentence explanation of why this caption works for their specific business

Return JSON in this exact format:
{
  "caption": {
    "text": "The actual caption text here...",
    "reasoning": "This works because it addresses [specific pain point] and connects to [value prop]...",
    "suggested_hashtags": ["#Industry", "#Location", "#Topic", "#Value"]
  }
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
          { role: 'user', content: `Generate one highly targeted caption for this post idea that leverages the context provided.` }
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