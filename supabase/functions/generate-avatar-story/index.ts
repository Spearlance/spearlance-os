import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
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
    const { client_id } = await req.json();

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: 'client_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if today's plan already has a story
    const today = new Date().toISOString().split('T')[0];
    const { data: existingPlan } = await supabaseClient
      .from('daily_action_plans')
      .select('id, avatar_story')
      .eq('client_id', client_id)
      .eq('plan_date', today)
      .maybeSingle();

    if (!existingPlan) {
      return new Response(
        JSON.stringify({ error: 'No action plan found for today. Generate the daily plan first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If story already exists, return it
    if (existingPlan.avatar_story) {
      console.log('✅ Returning existing avatar story');
      return new Response(
        JSON.stringify({ avatar_story: existingPlan.avatar_story }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🎭 Generating avatar story...');

    // Fetch avatar data and client context
    const [clientData, avatarData] = await Promise.all([
      supabaseClient
        .from('clients')
        .select('name, brand_name, industry')
        .eq('id', client_id)
        .single(),
      supabaseClient
        .from('avatars')
        .select('avatar_name, demographics, goals, pains, motivators, objections')
        .eq('client_id', client_id)
        .maybeSingle()
    ]);

    const client = clientData.data;
    const avatar = avatarData.data;


    const systemPrompt = `You are a creative storyteller helping business owners understand their ideal customers.

Your job is to create an engaging, relatable "day in the life" narrative that brings the customer avatar to life.

RULES:
1. Write 2-3 vivid paragraphs (150-250 words total)
2. Use specific details that make the character feel real
3. Incorporate their pains, goals, and motivations naturally
4. Make it emotional and relatable
5. End with how they discover/need the business's services
6. Use second person ("You") occasionally to increase empathy
7. Make it feel like a story, not a marketing description`;

    const userPrompt = `Create a "day in the life" story for this customer avatar:

BUSINESS CONTEXT:
- Company: ${client?.brand_name || client?.name}
- Industry: ${client?.industry || 'Not specified'}

CUSTOMER AVATAR:
${avatar ? `
- Name: ${avatar.avatar_name}
- Demographics: ${avatar.demographics || 'Not specified'}
- Goals: ${avatar.goals || 'Not specified'}
- Pains: ${avatar.pains || 'Not specified'}
- Motivators: ${avatar.motivators || 'Not specified'}
- Objections: ${avatar.objections || 'Not specified'}
` : '- No detailed avatar defined - create a generic story based on the industry'}

Generate a JSON response with this structure:
{
  "story": "Your engaging 2-3 paragraph narrative here"
}

Important: Return ONLY valid JSON, no other text.`;

    const aiResponse = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify({
        model: AI_MODELS.TEXT,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedContent = JSON.parse(aiData.choices[0].message.content);
    const avatarStory = generatedContent.story;

    console.log('✅ Avatar story generated');

    // Update the action plan with the story
    const { data: updatedPlan, error: updateError } = await supabaseClient
      .from('daily_action_plans')
      .update({ avatar_story: avatarStory })
      .eq('id', existingPlan.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating plan:', updateError);
      throw updateError;
    }

    console.log('💾 Story saved to action plan');

    return new Response(
      JSON.stringify({ avatar_story: avatarStory }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating avatar story:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
