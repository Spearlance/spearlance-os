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
    const { client_id, avatar_id, num_topics = 5, industry_focus, content_type } = await req.json();

    if (!client_id) {
      throw new Error('client_id is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch client details
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*, business_model(*)')
      .eq('id', client_id)
      .single();

    if (clientError) throw clientError;

    // Fetch avatars
    let avatarQuery = supabase
      .from('avatars')
      .select('id, name, summary')
      .eq('client_id', client_id);

    if (avatar_id) {
      avatarQuery = avatarQuery.eq('id', avatar_id);
    }

    const { data: avatars } = await avatarQuery;

    // Fetch brand voice and AI preferences
    const { data: brandVoice } = await supabase
      .from('brand_voice')
      .select('*')
      .eq('client_id', client_id)
      .maybeSingle();

    const { data: aiPreferences } = await supabase
      .from('blog_ai_preferences')
      .select('*')
      .eq('client_id', client_id)
      .maybeSingle();

    // Fetch recent blog posts to avoid duplicates
    const { data: recentPosts } = await supabase
      .from('blog_posts')
      .select('title')
      .eq('client_id', client_id)
      .order('created_at', { ascending: false })
      .limit(20);

    const recentTitles = recentPosts?.map(p => p.title).join('\n- ') || 'None yet';

    // Extract keywords from services
    const serviceKeywords = client.business_model?.services 
      ? client.business_model.services.split(',').map((s: string) => s.trim()) 
      : [];

    // Build AI prompt
    const systemPrompt = `You are a content strategist for ${client.name}.

BUSINESS CONTEXT:
- Industry: ${client.business_model?.industry || 'Not specified'}
- Services: ${client.business_model?.services || 'Not specified'}
- Brand Story: ${client.brand_story || 'Not specified'}
- Target Audience: ${avatars?.map(a => `${a.name}: ${a.summary}`).join('\n') || 'General audience'}
- Brand Voice: ${brandVoice?.tone_adjectives?.join(', ') || 'Professional'}
- Key Service Keywords: ${serviceKeywords.join(', ')}
${industry_focus ? `\n- Industry Focus: ${industry_focus}` : ''}
${content_type ? `\n- Content Type: ${content_type}` : ''}

${aiPreferences?.topics_to_avoid ? `TOPICS TO AVOID:\n${aiPreferences.topics_to_avoid}\n` : ''}
${aiPreferences?.custom_instructions ? `ADDITIONAL INSTRUCTIONS:\n${aiPreferences.custom_instructions}\n` : ''}

RECENT BLOG TOPICS (to avoid duplicates):
- ${recentTitles}

TASK:
Generate ${num_topics} blog post topic ideas that would:
1. Address the pain points of our target avatars
2. Match our brand voice and tone
3. Drive organic search traffic
4. Position us as thought leaders
5. Be genuinely helpful to our audience

For each topic, provide:
- title: Compelling and SEO-friendly
- description: 2-3 sentences explaining the value
- keywords: 3-5 SEO phrases
- avatar_id: Which customer persona would care most (use the avatar id from the list above, or null if general)
- avatar_name: Name of the avatar
- priority: high/medium/low based on relevance
- content_angle: educational/promotional/thought_leadership
- reasoning: Brief explanation of why this topic matters

Return as a JSON object with a "topics" array.`;


    console.log('Calling AI to generate blog topics...');

    const aiResponse = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify({
        model: AI_MODELS.TEXT,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate blog topic ideas now.' }
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
    const parsedTopics = JSON.parse(content);

    // Insert topics into database
    const topicsToInsert = parsedTopics.topics.map((topic: any) => ({
      client_id,
      topic_title: topic.title,
      description: topic.description,
      keywords: topic.keywords,
      avatar_id: topic.avatar_id,
      priority: topic.priority,
      ai_generated: true,
    }));

    const { data: insertedTopics, error: insertError } = await supabase
      .from('blog_topics')
      .insert(topicsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting topics:', insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        topics: parsedTopics.topics,
        inserted_ids: insertedTopics?.map(t => t.id)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in blog-generate-topics:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
