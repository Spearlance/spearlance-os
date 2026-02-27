import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { transcript } = await req.json();
    console.log('Summarizing story transcript, length:', transcript?.length);

    if (!transcript) {
      throw new Error('transcript is required');
    }

    const prompt = `You are a marketing strategist analyzing a client's story recording. Extract key insights that will be used to create authentic marketing campaigns.

TRANSCRIPT:
${transcript}

Analyze this transcript and provide a structured summary in JSON format:

{
  "executive_summary": "2-3 sentence overview of their story",
  "key_themes": ["theme1", "theme2", "theme3"],
  "pain_points": ["specific pain point they mention solving", "another pain point"],
  "value_propositions": ["unique value they provide", "what makes them different"],
  "client_voice_samples": ["memorable quote 1", "memorable quote 2", "memorable quote 3"],
  "target_audience_insights": "detailed description of who they serve and their needs",
  "marketing_angles": ["angle 1 based on their story", "angle 2", "angle 3"],
  "tone_indicators": "description of their communication style (formal/casual, technical/simple, etc.)"
}

Focus on:
- Extract direct quotes that showcase their authentic voice
- Identify emotional hooks and passion points
- Note specific problems they solve and how they solve them
- Capture what makes them unique vs competitors
- Understand their ideal customer from their perspective

Return ONLY the JSON object, no other text.`;

    console.log('Calling AI for story analysis...');
    const response = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify({
        model: AI_MODELS.TEXT,
        messages: [
          { 
            role: 'system', 
            content: 'You are a marketing strategist. Always respond with valid JSON only.' 
          },
          { role: 'user', content: prompt }
        ],
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

    // Helper to strip markdown code fences
    const cleanJsonString = (str: string): string => {
      return str
        .replace(/^```json\s*/i, '')  // Remove opening ```json
        .replace(/^```\s*/i, '')       // Remove opening ```
        .replace(/\s*```$/i, '')       // Remove closing ```
        .trim();
    };

    // Parse JSON response
    let summary;
    try {
      summary = JSON.parse(cleanJsonString(content));
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', content);
      throw new Error('AI returned invalid JSON');
    }

    console.log('Story analysis successful');
    return new Response(
      JSON.stringify({ 
        success: true,
        summary,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in summarize-story:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
