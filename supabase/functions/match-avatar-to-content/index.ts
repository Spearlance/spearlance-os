import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
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
    const { page_id, client_id, return_top_n = 1 } = await req.json();

    if (!page_id || !client_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'page_id and client_id are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch page content
    const { data: page, error: pageError } = await supabase
      .from('website_pages')
      .select('page_path, page_title, meta_description, main_content_text')
      .eq('id', page_id)
      .single();

    if (pageError || !page) {
      console.error('Error fetching page:', pageError);
      return new Response(
        JSON.stringify({ success: false, error: 'Page not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Fetch all avatars with ai_summary for this client
    const { data: avatars, error: avatarsError } = await supabase
      .from('avatars')
      .select('id, avatar_name, ai_summary, demographics, pains, goals, tone_voice')
      .eq('client_id', client_id)
      .not('ai_summary', 'is', null);

    if (avatarsError) {
      console.error('Error fetching avatars:', avatarsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch avatars' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!avatars || avatars.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No avatars with AI summaries found. Please create and generate avatars first.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // If only one avatar, return it immediately
    if (avatars.length === 1) {
      return new Response(
        JSON.stringify({
          success: true,
          primary_avatar_id: avatars[0].id,
          all_matches: [{
            avatar_id: avatars[0].id,
            avatar_name: avatars[0].avatar_name,
            confidence_score: 1.0,
            reasoning: 'Only avatar available for this client'
          }]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build AI prompt for matching
    const contentPreview = page.main_content_text?.slice(0, 1000) || '';
    const avatarsList = avatars.map(a => `
- Avatar ID: ${a.id}
- Name: ${a.avatar_name}
- Profile Summary: ${a.ai_summary}
- Demographics: ${a.demographics || 'Not specified'}
- Goals: ${a.goals || 'Not specified'}
- Pain Points: ${a.pains || 'Not specified'}
    `).join('\n');

    const prompt = `You are analyzing website content to determine which customer avatar would find it most relevant and compelling.

PAGE CONTENT:
- Title: ${page.page_title || 'Untitled'}
- Meta Description: ${page.meta_description || 'None'}
- URL: ${page.page_path}
- Content Preview: ${contentPreview}

AVAILABLE CUSTOMER AVATARS:
${avatarsList}

TASK:
Analyze the page content and determine which avatar(s) would find this content most valuable and relevant.
Consider:
1. Does the content address their pain points?
2. Does it align with their goals?
3. Is the tone appropriate for their demographics?
4. Would the information help them make decisions?

Return your analysis as a JSON object with this structure:
{
  "matches": [
    {
      "avatar_id": "uuid",
      "avatar_name": "name",
      "confidence_score": 0.85,
      "reasoning": "brief explanation of why this avatar matches"
    }
  ],
  "primary_match": "uuid of best match"
}

Sort matches by confidence_score (highest first). Only include matches with confidence >= 0.5.`;

    console.log('Calling AI for avatar matching...');

    // Call AI
    const aiResponse = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify({
        model: AI_MODELS.TEXT,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing website content and matching it to target customer personas. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI matching failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;

    // Parse AI response
    let matchResult;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/) || aiContent.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiContent;
      matchResult = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse AI matching result' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!matchResult.matches || matchResult.matches.length === 0) {
      // Fallback: use first avatar
      return new Response(
        JSON.stringify({
          success: true,
          primary_avatar_id: avatars[0].id,
          all_matches: [{
            avatar_id: avatars[0].id,
            avatar_name: avatars[0].avatar_name,
            confidence_score: 0.5,
            reasoning: 'Fallback match - no strong match found'
          }]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return top N matches
    const topMatches = matchResult.matches.slice(0, return_top_n);

    return new Response(
      JSON.stringify({
        success: true,
        primary_avatar_id: matchResult.primary_match || topMatches[0].avatar_id,
        all_matches: matchResult.matches
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in match-avatar-to-content:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
