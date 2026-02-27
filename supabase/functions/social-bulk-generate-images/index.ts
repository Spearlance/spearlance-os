import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AI_CHAT_URL, AI_MODELS, aiHeaders } from '../_shared/aiClient.ts';

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

    console.log('Generating images for', post_ids.length, 'posts');

    // Fetch brand context
    const [brandGuideResult, moodBoardResult, clientResult] = await Promise.allSettled([
      supabase.from('brand_guides').select('*').eq('client_id', client_id).maybeSingle(),
      supabase.from('mood_boards').select('*').eq('client_id', client_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('clients').select('name, brand_name').eq('id', client_id).single(),
    ]);

    const brandGuide = brandGuideResult.status === 'fulfilled' ? brandGuideResult.value.data : null;
    const moodBoard = moodBoardResult.status === 'fulfilled' ? moodBoardResult.value.data : null;
    const client = clientResult.status === 'fulfilled' ? clientResult.value.data : null;

    const results = [];
    const batchSize = 2;
    const delay = 3000;

    for (let i = 0; i < post_ids.length; i += batchSize) {
      const batch = post_ids.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async (postId: string) => {
          try {
            const { data: post } = await supabase
              .from('social_media_posts')
              .select('*')
              .eq('id', postId)
              .single();

            if (!post) {
              throw new Error('Post not found');
            }

            const idea = post.post_idea_json || {};
            const caption = post.caption_text || '';

            // Build image prompt
            let imagePrompt = `Create a professional social media graphic for ${client?.brand_name || 'a business'}.

Content: ${idea.topic_title || 'Social media post'}
${idea.topic_description ? `Context: ${idea.topic_description}` : ''}
${caption ? `Caption: ${caption.substring(0, 200)}` : ''}

Style Requirements:
${brandGuide?.aesthetic ? `- Aesthetic: ${brandGuide.aesthetic}` : ''}
${brandGuide?.primary_color ? `- Primary Color: ${brandGuide.primary_color}` : ''}
${brandGuide?.imagery_style ? `- Imagery Style: ${brandGuide.imagery_style}` : ''}
${moodBoard?.theme ? `- Theme: ${moodBoard.theme}` : ''}

Create a clean, modern, visually appealing social media post image. Include minimal text overlays if relevant. Professional photography or illustration style. High quality, suitable for Instagram/Facebook.`;

            const aiResponse = await retryWithBackoff(async () => {
              const response = await fetch(AI_CHAT_URL, {
                method: 'POST',
                headers: aiHeaders(),
                body: JSON.stringify({
                  model: AI_MODELS.IMAGE,
                  messages: [
                    { role: 'user', content: imagePrompt }
                  ],
                  modalities: ['image', 'text'],
                }),
              });

              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`AI error: ${response.status} - ${errorText}`);
              }

              return response.json();
            });

            const imageData = aiResponse.choices?.[0]?.message?.images?.[0]?.image_url?.url;

            if (!imageData) {
              throw new Error('No image generated');
            }

            // Find or create Social Media folder
            let { data: folder } = await supabase
              .from('asset_folders')
              .select('id')
              .eq('client_id', client_id)
              .eq('name', 'Social Media')
              .maybeSingle();

            if (!folder) {
              const { data: newFolder, error: folderError } = await supabase
                .from('asset_folders')
                .insert({
                  client_id,
                  name: 'Social Media',
                  created_by: user.id,
                })
                .select()
                .single();
              
              if (folderError || !newFolder) {
                throw new Error(`Failed to create folder: ${folderError?.message || 'Unknown error'}`);
              }
              
              folder = newFolder;
            }

            // Upload to storage
            const fileName = `social-media/${client_id}/${Date.now()}-${postId}.png`;
            const base64Data = imageData.split(',')[1];
            const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('client-assets')
              .upload(fileName, imageBuffer, {
                contentType: 'image/png',
                upsert: false,
              });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
              .from('client-assets')
              .getPublicUrl(fileName);

            // Create asset record
            const { data: asset } = await supabase
              .from('assets')
              .insert({
                client_id,
                folder_id: folder!.id,
                title: `Social Post - ${idea.topic_title || 'Generated'}`,
                type: 'image',
                storage_type: 'supabase',
                file_url: publicUrl,
                created_by: user.id,
              })
              .select()
              .single();

            // Update post with image
            await supabase
              .from('social_media_posts')
              .update({
                image_url: publicUrl,
              })
              .eq('id', postId);

            return { 
              post_id: postId, 
              success: true, 
              image_url: publicUrl,
              asset_id: asset.id,
            };
          } catch (error: any) {
            console.error('Error generating image for post', postId, ':', error);
            return { post_id: postId, success: false, error: error.message };
          }
        })
      );

      results.push(...batchResults);

      if (i + batchSize < post_ids.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Generated ${successCount}/${post_ids.length} images successfully`);

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
    console.error('Error in bulk image generation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});