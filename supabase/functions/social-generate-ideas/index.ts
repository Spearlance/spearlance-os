import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { AI_CHAT_URL, AI_MODELS, aiHeaders } from '../_shared/aiClient.ts';

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

    // Fetch marketing offers and services specifically for Promotion topic
    let marketingOffers = null;
    let clientServices = null;

    if (topic_category === 'Promotion') {
      const [offersResult, servicesResult] = await Promise.all([
        supabaseClient
          .from('marketing_ideas')
          .select('title, offer_type, content, status')
          .eq('client_id', client_id)
          .eq('idea_type', 'offer')
          .limit(10),
        supabaseClient
          .from('services')
          .select('name, description, differentiators, key_benefits')
          .eq('client_id', client_id)
          .limit(10)
      ]);
      
      marketingOffers = offersResult.data || [];
      clientServices = servicesResult.data || [];
      
      console.log('Fetched offers:', marketingOffers.length);
      console.log('Fetched services:', clientServices.length);
    }

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

${topic_category === 'Promotion' && marketingOffers && marketingOffers.length > 0 ? `
AVAILABLE OFFERS TO PROMOTE:
${marketingOffers.map((offer: any, idx: number) => `
${idx + 1}. ${offer.title}
   Type: ${offer.offer_type || 'Standard offer'}
   Status: ${offer.status}
`).join('\n')}
` : ''}

${topic_category === 'Promotion' && clientServices && clientServices.length > 0 ? `
SERVICES TO PROMOTE:
${clientServices.map((svc: any, idx: number) => `
${idx + 1}. ${svc.name}
   ${svc.description || ''}
   Key Benefits: ${svc.key_benefits?.join(', ') || 'Not specified'}
`).join('\n')}
` : ''}

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

    // Call AI
    const aiResponse = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify({
        model: AI_MODELS.TEXT,
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: topic_category === 'Promotion' 
              ? `Generate exactly 3 promotional post ideas based on the AVAILABLE OFFERS and SERVICES listed above. Each idea should promote a specific offer or service from the list. Focus on ideas where the user takes a simple photo and our AI handles caption writing, hashtags, and image enhancement.`
              : `Generate exactly 3 practical post ideas for "${topic_category}" that our AI can directly help create. Focus on ideas where the user takes a simple photo and our AI handles caption writing, hashtags, and image enhancement.`
          }
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