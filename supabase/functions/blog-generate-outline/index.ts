import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AI_CHAT_URL, AI_MODELS, aiHeaders } from '../_shared/aiClient.ts';

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

    console.log('Request params:', { client_id, title, keywords, avatar_id, word_count });

    if (!client_id || !title) {
      throw new Error('client_id and title are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch client data including site_id and website_url
    console.log('Fetching client with id:', client_id);
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .maybeSingle();

    if (clientError) {
      console.error('Error fetching client:', clientError);
      throw new Error(`Database error: ${clientError.message}`);
    }

    if (!client) {
      console.error('No client found with id:', client_id);
      throw new Error(`No client found with id: ${client_id}`);
    }
    
    console.log('Client found:', client.name);

    // Fetch brand voice and story summary
    const { data: brandVoice } = await supabase
      .from('brand_voice')
      .select('*')
      .eq('client_id', client_id)
      .maybeSingle();

    // Fetch client brand voice (story summary)
    const { data: clientBrandVoice } = await supabase
      .from('client_brand_voice')
      .select('*')
      .eq('client_id', client_id)
      .maybeSingle();

    // Fetch blog AI preferences
    const { data: blogPrefs } = await supabase
      .from('blog_ai_preferences')
      .select('*')
      .eq('client_id', client_id)
      .maybeSingle();

    // Fetch avatar info
    let avatarInfo = '';
    let avatarDetails: any = null;
    if (avatar_id) {
      const { data: avatar } = await supabase
        .from('avatars')
        .select('*')
        .eq('id', avatar_id)
        .single();
      
      if (avatar) {
        avatarDetails = avatar;
        avatarInfo = `
Target Avatar: ${avatar.avatar_name}
Summary: ${avatar.ai_summary || 'Not specified'}
Demographics: ${avatar.demographics || 'Not specified'}
Goals: ${avatar.goals || 'Not specified'}
Pain Points: ${avatar.pains || 'Not specified'}
Objections: ${avatar.objections || 'Not specified'}
Motivators: ${avatar.motivators || 'Not specified'}
Keywords: ${avatar.keywords?.join(', ') || 'Not specified'}`;
      }
    }

    // Fetch services/offerings
    const { data: services } = await supabase
      .from('client_services')
      .select('*')
      .eq('client_id', client_id);

    // Fetch competitors
    const { data: competitors } = await supabase
      .from('client_competitors')
      .select('name, differentiators')
      .eq('client_id', client_id)
      .limit(3);

    // Build context for the AI
    const storySummary = clientBrandVoice?.story_summary as any;
    const valueProps = storySummary?.value_propositions || [];
    const painPoints = storySummary?.pain_points || [];
    const marketingAngles = storySummary?.marketing_angles || [];

    const servicesContext = services?.length 
      ? services.map(s => `- ${s.name}: ${s.description || ''}`).join('\n')
      : 'No services defined';

    const competitorsContext = competitors?.length
      ? competitors.map(c => `- ${c.name}: ${c.differentiators || 'No differentiators listed'}`).join('\n')
      : 'No competitors defined';

    const systemPrompt = `You are an expert content strategist creating a comprehensive blog article brief for ${client.name}.

SITE INFORMATION:
- Site ID: ${client.site_id || 'Not configured'}
- Website URL: ${client.website_url || 'Not configured'}
- Industry: ${client.industry || 'Not specified'}

BRAND CONTEXT:
- Company Name: ${client.name}
- Brand Voice Tone: ${brandVoice?.tone_adjectives?.join(', ') || 'Professional'}
- Brand Personality: ${brandVoice?.personality_description || 'Not specified'}

BRAND STORY & VALUE PROPOSITIONS:
${storySummary?.executive_summary || 'No brand story available'}

Value Propositions:
${valueProps.length ? valueProps.map((v: string) => `- ${v}`).join('\n') : '- Not specified'}

Key Pain Points Addressed:
${painPoints.length ? painPoints.map((p: string) => `- ${p}`).join('\n') : '- Not specified'}

Marketing Angles:
${marketingAngles.length ? marketingAngles.map((m: string) => `- ${m}`).join('\n') : '- Not specified'}

SERVICES/OFFERINGS:
${servicesContext}

COMPETITORS:
${competitorsContext}

${avatarInfo}

BLOG AI PREFERENCES:
${blogPrefs?.custom_instructions || 'No custom instructions'}
Topics to avoid: ${blogPrefs?.topics_to_avoid || 'None specified'}

ARTICLE REQUIREMENTS:
- Title: ${title}
- Target Word Count: ${word_count}
- Focus Keywords: ${keywords.join(', ') || 'None specified'}
- Tone: ${tone}

TASK:
Create a comprehensive blog article brief that includes:

1. ARTICLE SUMMARY: A clear explanation of what this article is about and why it matters to the target audience

2. BRAND CONNECTION: How this topic specifically connects to ${client.name}'s:
   - Services and offerings
   - Value propositions
   - Target audience pain points
   - Competitive advantages

3. RELEVANT CONTEXT: Key information from the brand profile that should inform the article

4. DETAILED OUTLINE: A structured outline with:
   - Optimized meta description (150-160 characters)
   - H2/H3 section headings
   - Key points for each section
   - Word count targets per section

5. SEO RECOMMENDATIONS: Keyword placement and internal linking opportunities

Return as a JSON object with this exact structure:
{
  "site_info": {
    "site_id": "the site ID",
    "website_url": "the website URL"
  },
  "article_brief": {
    "title": "Optimized article title",
    "topic_summary": "2-3 sentences explaining what this article covers and why it matters",
    "connection_to_brand": "2-3 paragraphs explaining how this topic connects to the brand's services, audience, and value propositions",
    "relevant_context": {
      "target_audience": "Description of who this article is for",
      "pain_points_addressed": ["Pain point 1", "Pain point 2"],
      "value_props_to_highlight": ["Value prop 1", "Value prop 2"],
      "services_to_mention": ["Service 1", "Service 2"],
      "competitive_advantages": ["Advantage 1"]
    }
  },
  "outline": {
    "meta_description": "150-160 character SEO description",
    "sections": [
      {
        "heading": "Section H2 title",
        "subheadings": ["Optional H3 subsection"],
        "key_points": ["Key point 1", "Key point 2", "Key point 3"],
        "word_count_target": 300
      }
    ],
    "seo_recommendations": ["SEO tip 1", "SEO tip 2"],
    "internal_link_opportunities": ["Related topic 1", "Related topic 2"]
  }
}`;


    console.log('Generating brief for:', title);

    const aiResponse = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify({
        model: AI_MODELS.TEXT,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Create the comprehensive article brief now.' }
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
    const brief = JSON.parse(content);

    // Ensure site_info is populated even if AI didn't include it
    if (!brief.site_info) {
      brief.site_info = {
        site_id: client.site_id || 'Not configured',
        website_url: client.website_url || 'Not configured'
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        brief
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
