import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      client_id, 
      title, 
      keywords = [], 
      avatar_id, 
      word_count = 1500,
      tone = 'professional'
    } = await req.json();

    if (!client_id || !title) {
      throw new Error('client_id and title are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch brand context
    const { data: client } = await supabase
      .from('clients')
      .select('*, business_model(*)')
      .eq('id', client_id)
      .single();

    const { data: brandVoice } = await supabase
      .from('brand_voice')
      .select('*')
      .eq('client_id', client_id)
      .maybeSingle();

    let avatarInfo = '';
    if (avatar_id) {
      const { data: avatar } = await supabase
        .from('avatars')
        .select('name, summary, pain_points')
        .eq('id', avatar_id)
        .single();
      
      if (avatar) {
        avatarInfo = `Target Avatar: ${avatar.name}
Summary: ${avatar.summary}
Pain Points: ${avatar.pain_points || 'Not specified'}`;
      }
    }

    const systemPrompt = `You are an expert content strategist creating a blog post outline for ${client.name}.

BRAND CONTEXT:
- Brand Voice: ${brandVoice?.tone_adjectives?.join(', ') || 'Professional'}
- Industry: ${client.business_model?.industry || 'General'}
${avatarInfo}

ARTICLE REQUIREMENTS:
- Title: ${title}
- Target Word Count: ${word_count}
- Focus Keywords: ${keywords.join(', ')}
- Tone: ${tone}

TASK:
Create a detailed blog post outline that includes:
1. An optimized meta description (150-160 characters)
2. A logical section structure with H2 and H3 headings
3. Key points to cover in each section
4. Target word count for each section
5. Suggestions for where images should be placed
6. SEO recommendations (keyword placement, internal linking opportunities)

The outline should:
- Be scannable and easy to follow
- Address the target audience's pain points
- Include actionable advice
- Have natural keyword integration opportunities
- Follow best practices for SEO and readability

Return as a JSON object with:
{
  "title": "Optimized title",
  "meta_description": "150-160 char description",
  "sections": [
    {
      "heading": "Section title",
      "subheadings": ["Optional subsections"],
      "key_points": ["Point 1", "Point 2"],
      "word_count_target": 300,
      "suggested_image": "Description of helpful image"
    }
  ],
  "seo_recommendations": ["Tip 1", "Tip 2"],
  "internal_link_opportunities": ["Related topic 1", "Related topic 2"]
}`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    console.log('Generating outline for:', title);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Create the outline now.' }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    const outline = JSON.parse(content);

    return new Response(
      JSON.stringify({
        success: true,
        outline
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in blog-generate-outline:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
