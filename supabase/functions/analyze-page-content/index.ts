import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const constructPrompt = (page: any, avatar: any) => {
  return `You are a content marketing expert analyzing website page content.

**PAGE INFORMATION:**
- Title: ${page.page_title || 'No title'}
- URL: ${page.page_path}
- Word Count: ${page.word_count || 0}
- Content: ${page.full_content?.substring(0, 4000) || 'No content'}

**TARGET AVATAR:**
- Name: ${avatar.avatar_name}
- Demographics: ${avatar.demographics || 'Not specified'}
- Pain Points: ${avatar.pain_points?.join(', ') || 'Not specified'}
- Goals: ${avatar.goals?.join(', ') || 'Not specified'}
- Preferred Tone: ${avatar.tone_preferences || 'Professional, helpful'}

**GRADING CRITERIA:**

1. **Clarity Score (0-100):**
   - Is the message immediately understandable?
   - Are complex ideas explained simply?
   - Is there a clear call-to-action?

2. **Brevity Score (0-100):**
   - Is the content concise without sacrificing meaning?
   - Are sentences and paragraphs digestible?
   - Is there unnecessary fluff or repetition?

3. **Tone Score (0-100):**
   - Does it match the avatar's preferred communication style?
   - Is it appropriate for the industry and audience?
   - Is it engaging and personable?

4. **Avatar Alignment Score (0-100):**
   - Does it address the avatar's pain points?
   - Does it speak to their goals and aspirations?
   - Does it use language they would use?

Provide detailed, specific, and actionable feedback. Be constructive and helpful.`;
};

const tools = [{
  type: "function",
  function: {
    name: "provide_content_analysis",
    description: "Provide detailed content analysis with scores and recommendations",
    parameters: {
      type: "object",
      properties: {
        overall_score: { type: "number", minimum: 0, maximum: 100 },
        clarity_score: { type: "number", minimum: 0, maximum: 100 },
        brevity_score: { type: "number", minimum: 0, maximum: 100 },
        tone_score: { type: "number", minimum: 0, maximum: 100 },
        avatar_alignment_score: { type: "number", minimum: 0, maximum: 100 },
        strengths: {
          type: "array",
          items: { type: "string" },
          description: "3-5 specific strengths of the content"
        },
        weaknesses: {
          type: "array",
          items: { type: "string" },
          description: "3-5 specific weaknesses or areas for improvement"
        },
        recommendations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              priority: { type: "string", enum: ["high", "medium", "low"] },
              category: { type: "string", enum: ["clarity", "brevity", "tone", "avatar_alignment"] },
              issue: { type: "string" },
              suggestion: { type: "string" },
              example: { type: "string" }
            },
            required: ["priority", "category", "issue", "suggestion"]
          }
        }
      },
      required: ["overall_score", "clarity_score", "brevity_score", "tone_score", "avatar_alignment_score", "strengths", "weaknesses", "recommendations"]
    }
  }
}];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) throw new Error('Unauthorized');

    const { page_id, avatar_id } = await req.json();

    if (!page_id) {
      throw new Error('page_id is required');
    }

    console.log('Analyzing page:', { page_id, avatar_id });

    // Fetch page content
    const { data: page, error: pageError } = await supabase
      .from('website_pages')
      .select('*')
      .eq('id', page_id)
      .single();

    if (pageError || !page) {
      console.error('Page fetch error:', pageError);
      throw new Error('Page not found');
    }

    // Fetch avatar (use provided or get primary)
    let avatarQuery = supabase
      .from('avatars')
      .select('*')
      .eq('client_id', page.client_id);

    if (avatar_id) {
      avatarQuery = avatarQuery.eq('id', avatar_id);
    } else {
      avatarQuery = avatarQuery.eq('is_primary', true);
    }

    const { data: avatar, error: avatarError } = await avatarQuery.maybeSingle();

    if (avatarError || !avatar) {
      console.error('Avatar fetch error:', avatarError);
      throw new Error('Avatar not found. Please create a customer avatar first.');
    }

    console.log('Using avatar:', avatar.avatar_name);

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const prompt = constructPrompt(page, avatar);

    console.log('Calling Lovable AI...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        tools: tools,
        tool_choice: { type: 'function', function: { name: 'provide_content_analysis' } },
      }),
    });

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      console.error('AI API error:', error);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');

    const analysis = JSON.parse(
      aiData.choices[0].message.tool_calls[0].function.arguments
    );

    console.log('Analysis scores:', {
      overall: analysis.overall_score,
      clarity: analysis.clarity_score,
      brevity: analysis.brevity_score,
      tone: analysis.tone_score,
      avatar_alignment: analysis.avatar_alignment_score
    });

    // Store analysis
    const { data: analysisData, error: insertError } = await supabase
      .from('page_content_analysis')
      .upsert({
        page_id,
        client_id: page.client_id,
        avatar_id: avatar.id,
        overall_score: Math.round(analysis.overall_score),
        clarity_score: Math.round(analysis.clarity_score),
        brevity_score: Math.round(analysis.brevity_score),
        tone_score: Math.round(analysis.tone_score),
        avatar_alignment_score: Math.round(analysis.avatar_alignment_score),
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        recommendations: analysis.recommendations,
        analyzed_by: user.id,
        analyzed_at: new Date().toISOString(),
      }, { onConflict: 'page_id,avatar_id' })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log('Analysis stored successfully');

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Analysis error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to analyze page',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
