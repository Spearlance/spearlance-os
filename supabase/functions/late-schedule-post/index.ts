import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SchedulePostRequest {
  post_id: string;
  scheduled_for?: string;
  timezone?: string;
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

    const { post_id, scheduled_for, timezone }: SchedulePostRequest = await req.json();

    if (!post_id) {
      throw new Error('post_id is required');
    }

    // Get post details
    const { data: post, error: postError } = await supabase
      .from('social_media_posts')
      .select('*, social_media_monthly_posts(client_id)')
      .eq('id', post_id)
      .single();

    if (postError || !post) {
      throw new Error('Post not found');
    }

    const clientId = post.social_media_monthly_posts?.client_id;
    if (!clientId) {
      throw new Error('Client ID not found for post');
    }

    // Get Late profile
    const { data: lateProfile, error: profileError } = await supabase
      .from('late_profiles')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (profileError || !lateProfile) {
      throw new Error('Late profile not found. Please create profile first.');
    }

    // Get connected accounts for this profile
    const { data: accounts, error: accountsError } = await supabase
      .from('late_social_accounts')
      .select('late_account_id, platform')
      .eq('late_profile_id', lateProfile.id)
      .eq('is_active', true);

    if (accountsError || !accounts || accounts.length === 0) {
      throw new Error('No connected social accounts found');
    }

    // Prepare post data for Late API
    const latePostData: any = {
      profile_id: lateProfile.late_profile_id,
      accounts: accounts.map(a => a.late_account_id),
      content: {
        text: post.caption_text || '',
      },
    };

    // Add media if available
    if (post.image_url) {
      latePostData.content.media = [{
        url: post.image_url,
        type: 'image',
      }];
    }

    // Add scheduled time if provided
    if (scheduled_for) {
      latePostData.scheduled_for = scheduled_for;
    }

    if (timezone) {
      latePostData.timezone = timezone;
    }

    // Create post in Late API
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
      console.error('Late API error:', errorText);
      throw new Error(`Failed to schedule post: ${errorText}`);
    }

    const latePost = await lateResponse.json();
    console.log('Post scheduled in Late:', latePost);

    // Update post in database
    const { data: updatedPost, error: updateError } = await supabase
      .from('social_media_posts')
      .update({
        late_post_id: latePost.id,
        late_status: latePost.status,
        synced_to_late_at: new Date().toISOString(),
      })
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
    console.error('Error scheduling post:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});