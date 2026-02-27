import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
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
    const { client_id, avatar_name, user_prompt, generate_summary, generate_images } = await req.json();
    console.log('Generating avatar with AI:', { client_id, avatar_name, user_prompt });

    if (!client_id) {
      throw new Error('client_id is required');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('name, website_url, domain')
      .eq('id', client_id)
      .single();

    if (clientError) {
      console.error('Error fetching client:', clientError);
      throw new Error('Client not found');
    }

    // Fetch existing avatars for context
    const { data: existingAvatars } = await supabase
      .from('avatars')
      .select('avatar_name')
      .eq('client_id', client_id);

    const existingNames = existingAvatars?.map(a => a.avatar_name).join(', ') || 'None';

    // Build AI prompt
    const prompt = `You are a marketing strategist creating a customer avatar for a business.

BUSINESS CONTEXT:
- Company: ${client.name || 'Unknown'}
- Website: ${client.website_url || 'Not provided'}
- Domain: ${client.domain || 'Not specified'}

USER GUIDANCE:
${user_prompt || 'Create a comprehensive ideal customer persona'}

EXISTING AVATARS:
${existingNames}
(Create a NEW avatar that is distinct from these existing ones)

TASK:
Generate a complete customer avatar with all the following fields. Return ONLY valid JSON with this exact structure:

{
  "avatar_name": "descriptive persona name (${avatar_name ? `use: "${avatar_name}"` : 'suggest a clear name'})",
  "demographics": "detailed demographics: age range, gender, location, income level, education, family status, lifestyle",
  "firmographics": "if B2B: company size, industry, revenue, role, decision-making authority, team size",
  "goals": "primary goals and aspirations, what they want to achieve professionally and personally",
  "pains": "current challenges, frustrations, obstacles, problems they face daily",
  "objections": "common reasons they might hesitate to buy, concerns, skepticism",
  "motivators": "what drives their purchasing decisions, values, triggers",
  "tone_voice": "preferred communication style, tone, formality level, language preferences",
  "service_areas": ["service area 1", "service area 2", "service area 3"],
  "pricing_model": "their preferred pricing approach (subscription, one-time, tiered, custom)",
  "price_range": "typical budget range they work within",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "channels": ["channel1", "channel2", "channel3"]
}

IMPORTANT:
- Make this avatar distinct from existing ones
- Be specific and detailed (not generic)
- Focus on actionable insights for marketing
- Ensure all fields are filled with realistic, useful data`;

    console.log('Calling AI to generate avatar...');
    const response = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify({
        model: AI_MODELS.TEXT,
        messages: [
          { role: 'system', content: 'You are a marketing expert. Always respond with valid JSON only.' },
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

    // Parse JSON response
    let aiResponse;
    try {
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\n/, '').replace(/\n```$/, '');
      }
      
      aiResponse = JSON.parse(cleanedContent);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', content);
      throw new Error('AI returned invalid JSON');
    }

    // Insert new avatar into database
    const { data: newAvatar, error: insertError } = await supabase
      .from('avatars')
      .insert({
        client_id: client_id,
        avatar_name: aiResponse.avatar_name,
        demographics: aiResponse.demographics,
        firmographics: aiResponse.firmographics,
        goals: aiResponse.goals,
        pains: aiResponse.pains,
        objections: aiResponse.objections,
        motivators: aiResponse.motivators,
        tone_voice: aiResponse.tone_voice,
        service_areas: aiResponse.service_areas,
        pricing_model: aiResponse.pricing_model,
        price_range: aiResponse.price_range,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting avatar:', insertError);
      throw new Error('Failed to create avatar');
    }

    console.log('Avatar created successfully:', newAvatar.id);

    // Optionally generate AI summary
    if (generate_summary) {
      console.log('Generating AI summary...');
      const { error: summaryError } = await supabase.functions.invoke('avatar-generate-summary', {
        body: { avatar_id: newAvatar.id }
      });
      
      if (summaryError) {
        console.error('Error generating summary:', summaryError);
      }
    }

    // Optionally generate images (only if summary was generated)
    if (generate_images && generate_summary) {
      console.log('Generating avatar images...');
      const { error: imageError } = await supabase.functions.invoke('avatar-generate-image', {
        body: { avatar_id: newAvatar.id }
      });
      
      if (imageError) {
        console.error('Error generating images:', imageError);
      }
    }

    console.log('Avatar generation complete');
    return new Response(
      JSON.stringify({ 
        success: true, 
        avatar_id: newAvatar.id,
        avatar_name: newAvatar.avatar_name,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in avatar-generate-with-ai:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
