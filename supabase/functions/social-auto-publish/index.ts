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
    const lateApiKey = Deno.env.get('LATE_API_KEY');
    if (!lateApiKey) {
      throw new Error('LATE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get today's date in UTC YYYY-MM-DD format
    const today = new Date().toISOString().slice(0, 10);
    console.log(`social-auto-publish: running for date=${today}`);

    // Query posts scheduled for today that haven't been sent to Late yet
    const { data: posts, error: postsError } = await supabase
      .from('social_media_posts')
      .select('*')
      .eq('scheduled_date', today)
      .eq('status', 'scheduled')
      .is('late_post_id', null);

    if (postsError) {
      throw new Error(`Failed to query scheduled posts: ${postsError.message}`);
    }

    const total = posts?.length ?? 0;
    console.log(`social-auto-publish: found ${total} posts to publish`);

    if (total === 0) {
      return new Response(
        JSON.stringify({ success: true, published: 0, failed: 0, total: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group posts by client_id
    const postsByClient: Record<string, typeof posts> = {};
    for (const post of posts!) {
      const clientId = post.client_id;
      if (!postsByClient[clientId]) postsByClient[clientId] = [];
      postsByClient[clientId].push(post);
    }

    let published = 0;
    let failed = 0;

    for (const [clientId, clientPosts] of Object.entries(postsByClient)) {
      // Look up Late profile for this client
      const { data: lateProfile, error: profileError } = await supabase
        .from('late_profiles')
        .select('id, late_profile_id')
        .eq('client_id', clientId)
        .single();

      if (profileError || !lateProfile) {
        console.error(`social-auto-publish: no Late profile for client=${clientId}`);
        // Mark all posts for this client as failed
        for (const post of clientPosts) {
          await supabase
            .from('social_media_posts')
            .update({
              status: 'failed',
              late_error_message: 'No Late profile found for client',
            })
            .eq('id', post.id);
          failed++;
        }
        continue;
      }

      // Look up active social accounts for this profile
      const { data: accounts, error: accountsError } = await supabase
        .from('late_social_accounts')
        .select('late_account_id, platform')
        .eq('late_profile_id', lateProfile.id)
        .eq('is_active', true);

      if (accountsError || !accounts || accounts.length === 0) {
        console.error(`social-auto-publish: no active accounts for client=${clientId} profile=${lateProfile.id}`);
        for (const post of clientPosts) {
          await supabase
            .from('social_media_posts')
            .update({
              status: 'failed',
              late_error_message: 'No active social accounts found for Late profile',
            })
            .eq('id', post.id);
          failed++;
        }
        continue;
      }

      const accountIds = accounts.map((a: { late_account_id: string }) => a.late_account_id);

      // Publish each post
      for (const post of clientPosts) {
        try {
          // Build caption with hashtags
          const hashtags = Array.isArray(post.hashtags) && post.hashtags.length > 0
            ? post.hashtags.map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`).join(' ')
            : '';
          const caption = hashtags
            ? `${post.caption_text}\n\n${hashtags}`
            : post.caption_text ?? '';

          const latePostData: Record<string, unknown> = {
            profile_id: lateProfile.late_profile_id,
            accounts: accountIds,
            content: {
              text: caption,
            },
          };

          if (post.image_url) {
            latePostData.content = {
              ...(latePostData.content as object),
              media: [{ url: post.image_url, type: 'image' }],
            };
          }

          const lateResponse = await fetch('https://getlate.dev/api/v1/posts', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lateApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(latePostData),
          });

          if (!lateResponse.ok) {
            const errorText = await lateResponse.text();
            console.error(`social-auto-publish: Late API error for post=${post.id}:`, errorText);
            await supabase
              .from('social_media_posts')
              .update({
                status: 'failed',
                late_error_message: errorText,
              })
              .eq('id', post.id);
            failed++;
            continue;
          }

          const latePost = await lateResponse.json();
          const now = new Date().toISOString();

          await supabase
            .from('social_media_posts')
            .update({
              late_post_id: latePost.id,
              late_status: latePost.status,
              status: 'posted',
              posted_at: now,
              synced_to_late_at: now,
            })
            .eq('id', post.id);

          console.log(`social-auto-publish: published post=${post.id} late_post_id=${latePost.id}`);
          published++;

        } catch (postError) {
          const errMsg = postError instanceof Error ? postError.message : 'Unknown error';
          console.error(`social-auto-publish: error publishing post=${post.id}:`, errMsg);
          await supabase
            .from('social_media_posts')
            .update({
              status: 'failed',
              late_error_message: errMsg,
            })
            .eq('id', post.id);
          failed++;
        }
      }
    }

    console.log(`social-auto-publish: done — published=${published} failed=${failed} total=${total}`);

    return new Response(
      JSON.stringify({ success: true, published, failed, total }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in social-auto-publish:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
