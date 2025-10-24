import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncStatusRequest {
  post_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lateApiKey = Deno.env.get('LATE_API_KEY');
    if (!lateApiKey) {
      throw new Error('LATE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { post_id }: SyncStatusRequest = await req.json();

    if (!post_id) {
      throw new Error('post_id is required');
    }

    // Get post with late_post_id
    const { data: post, error: postError } = await supabase
      .from('social_media_posts')
      .select('late_post_id')
      .eq('id', post_id)
      .single();

    if (postError || !post) {
      throw new Error('Post not found');
    }

    if (!post.late_post_id) {
      throw new Error('Post has not been synced to Late yet');
    }

    // Fetch post status from Late API
    const lateResponse = await fetch(`https://getlate.dev/api/v1/posts/${post.late_post_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${lateApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!lateResponse.ok) {
      const errorText = await lateResponse.text();
      console.error('Late API error:', errorText);
      throw new Error(`Failed to fetch post status: ${errorText}`);
    }

    const latePost = await lateResponse.json();
    console.log('Fetched post status from Late:', latePost);

    // Update post in database
    const updateData: any = {
      late_status: latePost.status,
    };

    if (latePost.error_message) {
      updateData.late_error_message = latePost.error_message;
    }

    if (latePost.published_urls) {
      updateData.late_published_urls = latePost.published_urls;
    }

    const { data: updatedPost, error: updateError } = await supabase
      .from('social_media_posts')
      .update(updateData)
      .eq('id', post_id)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error(`Failed to update post: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        post: updatedPost,
        late_post: latePost 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error syncing post status:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});