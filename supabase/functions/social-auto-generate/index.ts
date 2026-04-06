// supabase/functions/social-auto-generate/index.ts
import { aiTextResponse } from '../_shared/aiClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-auto-social-key, x-auto-blog-key',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: accept x-auto-social-key, x-auto-blog-key, or standard Authorization header
  const autoSocialKey = Deno.env.get('AUTO_SOCIAL_API_KEY');
  const autoBlogKey = Deno.env.get('AUTO_BLOG_API_KEY');
  const providedSocialKey = req.headers.get('x-auto-social-key');
  const providedBlogKey = req.headers.get('x-auto-blog-key');
  const authHeader = req.headers.get('Authorization');

  const isAuthorized =
    (autoSocialKey && providedSocialKey && providedSocialKey === autoSocialKey) ||
    (autoBlogKey && providedBlogKey && providedBlogKey === autoBlogKey) ||
    (authHeader && authHeader.startsWith('Bearer '));

  if (!isAuthorized) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized — provide x-auto-social-key, x-auto-blog-key, or Authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const {
      client_name,
      industry,
      brand_voice,
      services,
      topic_category,
      template_id,
      template_text_slots,
      recent_captions,
      custom_instructions,
    } = body;

    if (!client_name || !template_id) {
      return new Response(
        JSON.stringify({ error: 'client_name and template_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build tone description from brand_voice
    const toneDesc = brand_voice?.tone_adjectives?.length
      ? brand_voice.tone_adjectives.join(', ')
      : 'professional and approachable';

    // Build services list
    const servicesList = services?.length
      ? services.map((s: { service_name: string }) => s.service_name).join(', ')
      : 'professional services';

    // Build recent captions context (avoid repetition)
    const recentCaptionsBlock = recent_captions?.length
      ? `\nRECENT CAPTIONS TO AVOID REPEATING:\n${recent_captions.slice(0, 5).map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}`
      : '';

    // Build template text slots block
    const slotsBlock = template_text_slots?.length
      ? `\nTEMPLATE TEXT SLOTS TO FILL (5-15 words max each):\n${template_text_slots.map((s: string) => `- ${s}`).join('\n')}`
      : '';

    // Custom instructions block
    const customBlock = custom_instructions
      ? `\nCUSTOM INSTRUCTIONS:\n${custom_instructions}`
      : '';

    const prompt = `You are a social media content specialist generating captions and template text for a ${industry || 'professional services'} business.

CLIENT: ${client_name}
INDUSTRY: ${industry || 'professional services'}
SERVICES: ${servicesList}
BRAND VOICE (tone): ${toneDesc}
TEMPLATE ID: ${template_id}
TOPIC CATEGORY: ${topic_category || 'general'}${slotsBlock}${recentCaptionsBlock}${customBlock}

RULES:
- Template text slots must be SHORT: 5-15 words maximum per slot
- Caption must be conversational, engaging, and specific to the industry
- Hashtags WITHOUT the # symbol
- Match the brand tone exactly: ${toneDesc}
- Do NOT repeat or closely echo any of the recent captions listed above
- Be specific to ${industry || 'the industry'} — avoid generic filler

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "template_texts": ${template_text_slots?.length ? `{${template_text_slots.map((s: string) => `"${s}": "..."`).join(', ')}}` : '{}'},
  "caption": "Social media caption text here...",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
  "template_id": "${template_id}",
  "topic_category": "${topic_category || 'general'}"
}`;

    console.log('Generating social content for:', client_name, '| template:', template_id);

    const rawText = await aiTextResponse({
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    // Extract JSON from response (handle markdown code fences)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response:', rawText);
      return new Response(
        JSON.stringify({ error: 'AI returned invalid response — no JSON found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('social-auto-generate error:', error);

    if (error.message?.includes('Rate limit') || error.message?.includes('429')) {
      return new Response(
        JSON.stringify({ error: 'AI rate limit exceeded. Please retry shortly.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message || 'Caption generation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
