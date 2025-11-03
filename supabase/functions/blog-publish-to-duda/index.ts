import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      publish_now = true,
      schedule_date
    } = await req.json();

    if (!blog_post_id) {
      throw new Error('blog_post_id is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch blog post with client info
    const { data: blogPost, error: postError } = await supabase
      .from('blog_posts')
      .select('*, clients(*)')
      .eq('id', blog_post_id)
      .single();

    if (postError) throw postError;

    const siteId = blogPost.clients?.site_id;
    if (!siteId) {
      throw new Error('No Duda site_id found for this client');
    }

    // Get Duda API credentials
    const dudaApiKey = Deno.env.get('DUDA_API_KEY');
    const dudaApiUser = Deno.env.get('DUDA_API_USER');

    if (!dudaApiKey || !dudaApiUser) {
      throw new Error('Duda API credentials not configured');
    }

    const dudaApiUrl = 'https://api.duda.co/api';
    const authHeader = `Basic ${btoa(`${dudaApiUser}:${dudaApiKey}`)}`;

    // Format content for Duda
    const dudaPayload = {
      title: blogPost.title,
      content: blogPost.content,
      excerpt: blogPost.excerpt,
      featured_image: blogPost.featured_image_url,
      meta_description: blogPost.meta_description,
      slug: blogPost.slug,
      status: publish_now ? 'published' : 'draft',
      publish_date: schedule_date || new Date().toISOString(),
      tags: blogPost.target_keywords || [],
      author: blogPost.clients?.name || 'Admin'
    };

    console.log('Publishing to Duda site:', siteId);

    // Call Duda API to create/update blog post
    const dudaResponse = await fetch(`${dudaApiUrl}/sites/${siteId}/blog/posts`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dudaPayload)
    });

    if (!dudaResponse.ok) {
      const errorText = await dudaResponse.text();
      console.error('Duda API error:', dudaResponse.status, errorText);
      throw new Error(`Duda API error: ${dudaResponse.status} - ${errorText}`);
    }

    const dudaData = await dudaResponse.json();
    const dudaPageId = dudaData.id || dudaData.page_id;
    const publishUrl = `https://${siteId}.multiscreensite.com/blog/${blogPost.slug}`;

    // Update blog post in database
    const updateData: any = {
      duda_page_id: dudaPageId,
      duda_publish_url: publishUrl,
      status: publish_now ? 'published' : (schedule_date ? 'scheduled' : 'draft'),
    };

    if (publish_now) {
      updateData.published_at = new Date().toISOString();
    } else if (schedule_date) {
      updateData.scheduled_for = schedule_date;
    }

    const { error: updateError } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', blog_post_id);

    if (updateError) {
      console.error('Error updating blog post:', updateError);
    }

    // Update topic status if linked
    if (blogPost.blog_post_id) {
      await supabase
        .from('blog_topics')
        .update({ status: 'published' })
        .eq('blog_post_id', blog_post_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        duda_page_id: dudaPageId,
        publish_url: publishUrl,
        status: updateData.status,
        published_at: updateData.published_at
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in blog-publish-to-duda:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
