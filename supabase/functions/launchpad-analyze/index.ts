import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_id } = await req.json();
    console.log('Analyzing launchpad data for client:', client_id);

    if (!client_id) {
      throw new Error('client_id is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .single();

    if (clientError) {
      console.error('Error fetching client:', clientError);
      throw new Error('Client not found');
    }

    // Fetch launchpad submission
    const { data: submission, error: submissionError } = await supabase
      .from('launchpad_submissions')
      .select('*')
      .eq('client_id', client_id)
      .single();

    if (submissionError) {
      console.error('Error fetching submission:', submissionError);
      throw new Error('Launchpad submission not found');
    }

    // Simple website content extraction (simplified for MVP - in production, use actual web scraping)
    let websiteContent = '';
    if (client.website_url) {
      try {
        // Ensure URL has protocol
        let url = client.website_url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        
        console.log('Fetching website content from:', url);
        const websiteResponse = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        if (websiteResponse.ok) {
          const html = await websiteResponse.text();
          // Extract text content (very basic - just get text between body tags)
          const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          if (bodyMatch) {
            websiteContent = bodyMatch[1]
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 3000); // Limit to 3000 chars
          }
        }
      } catch (error) {
        console.error('Error fetching website:', error);
        websiteContent = 'Unable to fetch website content';
      }
    }

    // Extract story data if available
    const storyData = submission.responses_json?.discovery?.story;
    let storyContext = '';
    
    if (storyData?.summary) {
      const summary = storyData.summary;
      const voiceSamples = summary.client_voice_samples || [];
      const voiceSamplesText = voiceSamples.map((q: any) => `- "${q}"`).join('\n');
      
      storyContext = `

CLIENT'S STORY (In Their Own Words):
Executive Summary: ${summary.executive_summary || 'N/A'}

Key Themes: ${summary.key_themes?.join(', ') || 'N/A'}

Pain Points They Solve: ${summary.pain_points?.join(', ') || 'N/A'}

Value Propositions: ${summary.value_propositions?.join(', ') || 'N/A'}

Authentic Voice Samples:
${voiceSamplesText}

Target Audience Insights: ${summary.target_audience_insights || 'N/A'}

Marketing Angles: ${summary.marketing_angles?.join(', ') || 'N/A'}

Tone Indicators: ${summary.tone_indicators || 'N/A'}

Full Transcript (for reference): ${storyData.transcript?.substring(0, 2000) || 'N/A'}...
`;
    }

    // Build analysis prompt
    const prompt = `You are a marketing strategist analyzing a new client's business. Based on the following information, generate comprehensive insights:

Company: ${client.name}
Website: ${client.website_url || 'N/A'}
Domain: ${client.domain || 'N/A'}

Discovery Responses: ${JSON.stringify(submission.responses_json || {})}

Website Content Preview:
${websiteContent}
${storyContext}

Please analyze and provide:
1. A detailed insights summary (3-4 paragraphs) covering the business model, target market, unique value proposition, and marketing opportunities
2. An ideal client story (2-3 paragraphs) describing their perfect customer's journey and pain points
3. 5-7 relevant keywords for marketing campaigns
4. 3-5 recommended marketing channels
5. Three compelling ad hooks tailored to this business
6. Customer avatar traits including demographics, firmographics, goals, pains, objections, and motivators

Format your response as JSON:
{
  "insights_summary": "detailed analysis here",
  "ideal_client_story": "client story here",
  "keywords": ["keyword1", "keyword2", ...],
  "channels": ["channel1", "channel2", ...],
  "ad_hooks": ["hook1", "hook2", "hook3"],
  "avatar": {
    "name": "Target Customer Name",
    "demographics": "age, location, etc.",
    "firmographics": "company size, industry, etc.",
    "goals": "what they want to achieve",
    "pains": "their main challenges",
    "objections": "why they might hesitate",
    "motivators": "what drives their decisions",
    "tone_voice": "recommended tone for communications"
  }
}`;

    console.log('Calling Lovable AI for analysis...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a marketing strategist. Always respond with valid JSON only. Do not wrap the response in markdown code blocks or any other formatting. Return raw JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON response, handling markdown code blocks
    let analysis;
    try {
      let jsonString = content.trim();
      
      // Strip markdown code blocks if present
      if (jsonString.startsWith('```')) {
        // Remove opening ```json or ```
        jsonString = jsonString.replace(/^```(?:json)?\s*\n/, '');
        // Remove closing ```
        jsonString = jsonString.replace(/\n```\s*$/, '');
      }
      
      analysis = JSON.parse(jsonString);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', content);
      throw new Error('AI returned invalid JSON');
    }

    // Create or update avatar
    const { data: existingAvatar } = await supabase
      .from('avatars')
      .select('id')
      .eq('client_id', client_id)
      .single();

    if (existingAvatar) {
      // Update existing avatar
      await supabase
        .from('avatars')
        .update({
          avatar_name: analysis.avatar.name,
          demographics: analysis.avatar.demographics,
          firmographics: analysis.avatar.firmographics,
          goals: analysis.avatar.goals,
          pains: analysis.avatar.pains,
          objections: analysis.avatar.objections,
          motivators: analysis.avatar.motivators,
          tone_voice: analysis.avatar.tone_voice,
          ad_hooks: analysis.ad_hooks,
          keywords: analysis.keywords,
          channels: analysis.channels,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAvatar.id);
    } else {
      // Create new avatar
      await supabase
        .from('avatars')
        .insert({
          client_id: client_id,
          avatar_name: analysis.avatar.name,
          demographics: analysis.avatar.demographics,
          firmographics: analysis.avatar.firmographics,
          goals: analysis.avatar.goals,
          pains: analysis.avatar.pains,
          objections: analysis.avatar.objections,
          motivators: analysis.avatar.motivators,
          tone_voice: analysis.avatar.tone_voice,
          ad_hooks: analysis.ad_hooks,
          keywords: analysis.keywords,
          channels: analysis.channels,
        });
    }

    // Update launchpad submission
    await supabase
      .from('launchpad_submissions')
      .update({
        insights_summary: analysis.insights_summary,
        ideal_client_story: analysis.ideal_client_story,
        stage: 'complete',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', submission.id);

    console.log('Successfully completed launchpad analysis');
    return new Response(
      JSON.stringify({ 
        success: true,
        insights: analysis,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in launchpad-analyze:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
