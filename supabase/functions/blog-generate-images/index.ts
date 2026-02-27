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
      blog_post_id,
      num_images = 3,
      image_style = 'photorealistic',
      brand_colors
    } = await req.json();

    if (!blog_post_id) {
      throw new Error('blog_post_id is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch blog post
    const { data: blogPost, error: postError } = await supabase
      .from('blog_posts')
      .select('*, clients(*)')
      .eq('id', blog_post_id)
      .single();

    if (postError) throw postError;

    // Fetch brand guide
    const { data: brandGuide } = await supabase
      .from('brand_guide')
      .select('*')
      .eq('client_id', blogPost.client_id)
      .maybeSingle();

    const colors = brand_colors || brandGuide?.primary_color || '#000000';
    const aesthetic = brandGuide?.brand_aesthetic || 'modern and professional';

    const generatedImages = [];

    // Extract key topics from content for image generation
    const plainText = blogPost.content.replace(/<[^>]*>/g, '');
    const sentences = plainText.split(/[.!?]+/).slice(0, 5).join('. ');

    // Generate featured image
    console.log('Generating featured image...');
    const featuredPrompt = `Create a ${image_style} featured image for a blog post about "${blogPost.title}".

STYLE:
- Aesthetic: ${aesthetic}
- Color palette: ${colors}
- Mood: Professional, modern, clean
- Aspect ratio: 16:9 (wide banner)

SUBJECT:
${sentences.substring(0, 300)}

REQUIREMENTS:
- No text overlay
- High quality, suitable for web
- Professional business context
- Eye-catching and engaging`;

    const featuredResponse = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify({
        model: AI_MODELS.IMAGE,
        messages: [{ role: 'user', content: featuredPrompt }],
        modalities: ['image', 'text'],
      }),
    });

    if (featuredResponse.ok) {
      const featuredData = await featuredResponse.json();
      const imageUrl = featuredData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageUrl) throw new Error('No image in AI response');

      // Upload to Supabase Storage
      const base64Content = imageUrl.split(',')[1];
      const imageBuffer = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
      const fileName = `${blog_post_id}/featured-${Date.now()}.png`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('client-assets')
        .upload(fileName, imageBuffer, {
          contentType: 'image/png',
          upsert: false
        });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('client-assets')
          .getPublicUrl(fileName);

        generatedImages.push({
          type: 'featured',
          url: publicUrl,
          alt_text: `Featured image for ${blogPost.title}`
        });

        // Update blog post with featured image
        await supabase
          .from('blog_posts')
          .update({
            featured_image_url: publicUrl,
            featured_image_alt: `Featured image for ${blogPost.title}`
          })
          .eq('id', blog_post_id);
      }
    }

    // Generate body images
    const numBodyImages = Math.min(num_images - 1, 3);
    const sections = blogPost.content.match(/<h2[^>]*>([^<]+)<\/h2>/g) || [];

    for (let i = 0; i < numBodyImages && i < sections.length; i++) {
      const sectionTitle = sections[i].replace(/<[^>]*>/g, '');

      console.log(`Generating body image ${i + 1}...`);
      const bodyPrompt = `Create a ${image_style} image for a blog section about "${sectionTitle}".

STYLE:
- Aesthetic: ${aesthetic}
- Color palette: ${colors}
- Mood: Professional, informative
- Aspect ratio: 4:3

REQUIREMENTS:
- No text overlay
- High quality, suitable for web
- Relevant to the topic
- Professional business context`;

      const bodyResponse = await fetch(AI_CHAT_URL, {
        method: 'POST',
        headers: aiHeaders(),
        body: JSON.stringify({
          model: AI_MODELS.IMAGE,
          messages: [{ role: 'user', content: bodyPrompt }],
          modalities: ['image', 'text'],
        }),
      });

      if (bodyResponse.ok) {
        const bodyData = await bodyResponse.json();
        const imageUrl = bodyData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (!imageUrl) throw new Error('No image in AI response');

        const base64Content = imageUrl.split(',')[1];
        const imageBuffer = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
        const fileName = `${blog_post_id}/body-${i + 1}-${Date.now()}.png`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('client-assets')
          .upload(fileName, imageBuffer, {
            contentType: 'image/png',
            upsert: false
          });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('client-assets')
            .getPublicUrl(fileName);

          generatedImages.push({
            type: 'body',
            url: publicUrl,
            alt_text: `Illustration for ${sectionTitle}`,
            position: i + 1
          });
        }
      }
    }

    // Update blog post with all images
    const bodyImages = generatedImages.filter(img => img.type === 'body');
    if (bodyImages.length > 0) {
      await supabase
        .from('blog_posts')
        .update({
          body_images: bodyImages
        })
        .eq('id', blog_post_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        images: generatedImages
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in blog-generate-images:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
