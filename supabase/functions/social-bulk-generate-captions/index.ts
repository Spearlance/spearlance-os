import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelay = 2000
): Promise<T> => {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === maxRetries) throw error;
      const delay = baseDelay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Retry failed');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { post_ids, client_id } = await req.json();

    if (!post_ids || !Array.isArray(post_ids) || post_ids.length === 0) {
      throw new Error('post_ids array is required');
    }

    console.log('Generating captions for', post_ids.length, 'posts');

    // Fetch brand context once
    const [clientResult, brandVoiceResult, avatarResult, brandGuideResult] = await Promise.allSettled([
      supabase.from('clients').select('*').eq('id', client_id).single(),
      supabase.from('client_brand_voice').select('*').eq('client_id', client_id).maybeSingle(),
      supabase.from('avatars').select('*').eq('client_id', client_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('brand_guides').select('*').eq('client_id', client_id).maybeSingle(),
    ]);

    const client = clientResult.status === 'fulfilled' ? clientResult.value.data : null;
    const brandVoice = brandVoiceResult.status === 'fulfilled' ? brandVoiceResult.value.data : null;
    const avatar = avatarResult.status === 'fulfilled' ? avatarResult.value.data : null;
    const brandGuide = brandGuideResult.status === 'fulfilled' ? brandGuideResult.value.data : null;

    const systemPrompt = `You are a social media copywriter crafting engaging captions.

Brand Context:
${client ? `- Business: ${client.name}
- Industry: ${client.industry || 'N/A'}
- Brand: ${client.brand_name || client.name}` : ''}
${brandVoice?.tone ? `- Brand Tone: ${brandVoice.tone}` : ''}
${brandVoice?.words_to_avoid ? `- Avoid These Words: ${brandVoice.words_to_avoid}` : ''}
${avatar ? `- Target Audience: ${avatar.avatar_name}
- Demographics: ${avatar.demographics || 'N/A'}
- Pain Points: ${avatar.pains || 'N/A'}` : ''}
${brandGuide?.dos_and_donts ? `- Brand Guidelines: ${JSON.stringify(brandGuide.dos_and_donts)}` : ''}

Write captions that:
1. Match the brand tone and voice
2. Speak directly to the target audience
3. Include a clear call-to-action
4. Are 150-250 characters (Instagram/Facebook optimal length)
5. Include 3-5 relevant hashtags

Return JSON: { "caption": "caption text", "hashtags": ["tag1", "tag2", ...] }`;

    const results = [];
    const batchSize = 3;
    const delay = 2000;

    // Process in batches to avoid rate limits
    for (let i = 0; i < post_ids.length; i += batchSize) {
      const batch = post_ids.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async (postId: string) => {
          try {
            // Fetch post
            const { data: post } = await supabase
              .from('social_media_posts')
              .select('*')
              .eq('id', postId)
              .single();

            if (!post || !post.post_idea_json) {
              throw new Error('Post not found or missing idea');
            }

            const idea = post.post_idea_json;
            const userPrompt = `Generate a caption for this post:

Title: ${idea.topic_title}
Description: ${idea.topic_description}
Approach: ${idea.suggested_approach}
Category: ${idea.category}

Return ONLY valid JSON with caption and hashtags, no markdown.`;

            const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
            
            const aiResponse = await retryWithBackoff(async () => {
              const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${lovableApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'google/gemini-2.5-flash',
                  messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                  ],
                }),
              });

              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`AI error: ${response.status} - ${errorText}`);
              }

              return response.json();
            });

            let captionData = aiResponse.choices[0].message.content;
            captionData = captionData.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(captionData);

            // Update post with caption
            await supabase
              .from('social_media_posts')
              .update({
                caption_text: parsed.caption,
                hashtags: parsed.hashtags,
                status: 'scheduled',
              })
              .eq('id', postId);

            return { 
              post_id: postId, 
              success: true, 
              caption: parsed.caption,
              hashtags: parsed.hashtags,
            };
          } catch (error: any) {
            console.error('Error generating caption for post', postId, ':', error);
            return { post_id: postId, success: false, error: error.message };
          }
        })
      );

      results.push(...batchResults);

      // Delay between batches
      if (i + batchSize < post_ids.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Generated ${successCount}/${post_ids.length} captions successfully`);

    return new Response(
      JSON.stringify({ 
        success: true,
        total: post_ids.length,
        successful: successCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in bulk caption generation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});