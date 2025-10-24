import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-late-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const webhook = await req.json();
    console.log('Received Late webhook:', webhook);

    // Handle different webhook events
    switch (webhook.event) {
      case 'post.published':
      case 'post.failed':
      case 'post.status_changed': {
        const postId = webhook.data.id;
        
        // Find post in database
        const { data: posts, error: findError } = await supabase
          .from('social_media_posts')
          .select('id')
          .eq('late_post_id', postId);

        if (findError || !posts || posts.length === 0) {
          console.log('Post not found in database:', postId);
          break;
        }

        // Update post status
        const updateData: any = {
          late_status: webhook.data.status,
        };

        if (webhook.data.error_message) {
          updateData.late_error_message = webhook.data.error_message;
        }

        if (webhook.data.published_urls) {
          updateData.late_published_urls = webhook.data.published_urls;
        }

        const { error: updateError } = await supabase
          .from('social_media_posts')
          .update(updateData)
          .eq('late_post_id', postId);

        if (updateError) {
          console.error('Error updating post:', updateError);
        } else {
          console.log('Post status updated:', postId);
        }
        break;
      }

      case 'account.connected':
      case 'account.disconnected': {
        const accountId = webhook.data.id;
        const profileId = webhook.data.profile_id;

        // Find profile in database
        const { data: lateProfile, error: profileError } = await supabase
          .from('late_profiles')
          .select('id, client_id')
          .eq('late_profile_id', profileId)
          .single();

        if (profileError || !lateProfile) {
          console.log('Profile not found in database:', profileId);
          break;
        }

        if (webhook.event === 'account.connected') {
          // Add or update account
          const { error: upsertError } = await supabase
            .from('late_social_accounts')
            .upsert({
              late_profile_id: lateProfile.id,
              late_account_id: accountId,
              platform: webhook.data.platform,
              username: webhook.data.username || webhook.data.name,
              display_name: webhook.data.name,
              profile_picture_url: webhook.data.profile_picture_url,
              is_active: true,
              platform_specific_data: webhook.data,
            }, {
              onConflict: 'late_account_id'
            });

          if (upsertError) {
            console.error('Error adding account:', upsertError);
          } else {
            console.log('Account connected:', accountId);
          }
        } else {
          // Mark account as inactive
          const { error: updateError } = await supabase
            .from('late_social_accounts')
            .update({ is_active: false })
            .eq('late_account_id', accountId);

          if (updateError) {
            console.error('Error deactivating account:', updateError);
          } else {
            console.log('Account disconnected:', accountId);
          }
        }
        break;
      }

      default:
        console.log('Unhandled webhook event:', webhook.event);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});