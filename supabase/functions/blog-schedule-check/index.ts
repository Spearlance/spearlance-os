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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Checking for scheduled blog posts...');

    // Find posts that are scheduled and due for publishing
    const { data: scheduledPosts, error: queryError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', new Date().toISOString());

    if (queryError) {
      console.error('Error querying scheduled posts:', queryError);
      throw queryError;
    }

    console.log(`Found ${scheduledPosts?.length || 0} posts ready to publish`);

    const results = [];

    for (const post of scheduledPosts || []) {
      console.log(`Publishing post: ${post.title} (${post.id})`);

      try {
        // Call blog-publish-to-duda function
        const publishResponse = await fetch(
          `${supabaseUrl}/functions/v1/blog-publish-to-duda`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              blog_post_id: post.id,
              publish_now: true
            })
          }
        );

        if (publishResponse.ok) {
          const publishData = await publishResponse.json();
          results.push({
            post_id: post.id,
            title: post.title,
            success: true,
            url: publishData.publish_url
          });
          console.log(`✓ Successfully published: ${post.title}`);
        } else {
          const errorText = await publishResponse.text();
          results.push({
            post_id: post.id,
            title: post.title,
            success: false,
            error: errorText
          });
          console.error(`✗ Failed to publish: ${post.title}`, errorText);

          // Update post status to failed
          await supabase
            .from('blog_posts')
            .update({ status: 'failed' })
            .eq('id', post.id);
        }
      } catch (error) {
        results.push({
          post_id: post.id,
          title: post.title,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`✗ Error publishing: ${post.title}`, error);

        // Update post status to failed
        await supabase
          .from('blog_posts')
          .update({ status: 'failed' })
          .eq('id', post.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked_at: new Date().toISOString(),
        posts_processed: results.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in blog-schedule-check:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
