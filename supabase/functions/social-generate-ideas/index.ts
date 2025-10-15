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

    // Fetch comprehensive context
    const [clientInfo, brandGuide, businessModel, avatar, brandVoice] = await Promise.all([
      supabaseClient.from('clients').select('*').eq('id', client_id).single(),
      supabaseClient.from('brand_guides').select('*').eq('client_id', client_id).maybeSingle(),
      supabaseClient.from('client_business_model').select('*').eq('client_id', client_id).maybeSingle(),
      supabaseClient.from('avatars').select('*').eq('client_id', client_id).maybeSingle(),
      supabaseClient.from('client_brand_voice').select('*').eq('client_id', client_id).maybeSingle(),
    ]);

    const client = clientInfo.data;
    const brand = brandGuide.data;
    const business = businessModel.data;
    const targetAudience = avatar.data;
    const voice = brandVoice.data;

    // Build AI prompt
    const systemPrompt = `You are the Simplified Social Media Assistant for SpearlanceOS.

CONTEXT:
Client: ${client?.company_name || client?.name}
Industry: ${client?.industry || 'Not specified'}

${voice?.story_summary ? `
Their Story:
- Executive Summary: ${voice.story_summary.executive_summary || 'Not specified'}
- Key Value Props: ${voice.story_summary.value_propositions?.slice(0, 3).join(', ') || 'Not specified'}
- Pain Points They Solve: ${voice.story_summary.pain_points?.slice(0, 3).join(', ') || 'Not specified'}
` : ''}

Business Insights:
- What's Working: ${business?.current_state_working || 'Not specified'}
- What's NOT Working: ${business?.current_state_not_working || 'Not specified'}

Target Audience:
- Demographics: ${targetAudience?.demographics || 'general audience'}
- Their Pains: ${targetAudience?.pains || 'Not specified'}
- Their Goals: ${targetAudience?.goals || 'Not specified'}

POST TOPIC CATEGORY: "${topic_category}"
${additional_context ? `Additional Context: ${additional_context}` : ''}

YOUR TASK:
Generate EXACTLY 3 practical social media post ideas that:

STRICT REQUIREMENTS:
1. Must take under 5 minutes to create
2. Must be doable with a smartphone (take photo → our AI does the rest)
3. Our AI must provide the caption, hashtags, and optionally generate/enhance the image
4. NO videos, NO external apps (Canva, etc.), NO complex editing
5. Must be relevant to their actual business and story
6. Should address their audience's pain points or goals
7. Should connect to what's working in their business

GOOD EXAMPLES:
✅ "Share a Recent Win" → Take photo of the result, AI writes inspiring caption
✅ "Behind-the-Scenes Moment" → Phone photo of workspace, AI tells the story
✅ "Quick Tip" → Simple image, AI writes the tip as caption
✅ "Customer Success Story" → Photo of happy result, AI crafts testimonial-style post

BAD EXAMPLES:
❌ "Create a video tutorial"
❌ "Design 3 tips in Canva"
❌ "Record yourself explaining something"
❌ "Edit photos with filters"

Return JSON with this EXACT structure:
{
  "ideas": [
    {
      "title": "Clear, action-oriented title (4-6 words)",
      "description": "One sentence explaining what this post is about",
      "suggested_approach": "Simple 1-2 sentence instruction. Must mention 'Take a photo with your phone, then our AI will [write the caption/generate the image/add text]'"
    }
  ]
}

Generate exactly 3 ideas. Make them specific to ${client?.industry || 'this'} business.`;

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
          { role: 'user', content: `Generate exactly 3 practical post ideas for "${topic_category}" that our AI can directly help create. Focus on ideas where the user takes a simple photo and our AI handles caption writing, hashtags, and image enhancement.` }
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

    // Validate and ensure exactly 3 ideas
    if (!ideas.ideas || ideas.ideas.length !== 3) {
      console.warn('AI returned wrong number of ideas, adjusting to 3');
      if (ideas.ideas) {
        ideas.ideas = ideas.ideas.slice(0, 3);
      }
    }

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