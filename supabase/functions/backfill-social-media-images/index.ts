import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting backfill of social media images...');

    // Find all social media posts with base64 images
    const { data: posts, error: postsError } = await supabase
      .from('social_media_posts')
      .select('id, client_id, image_url, caption')
      .like('image_url', 'data:image%');

    if (postsError) {
      throw postsError;
    }

    console.log(`Found ${posts?.length || 0} posts with base64 images to backfill`);

    const results = [];

    for (const post of posts || []) {
      try {
        console.log(`Processing post ${post.id}...`);

        // Get or create the Social Media folder
        let { data: folder, error: folderError } = await supabase
          .from('asset_folders')
          .select('id')
          .eq('client_id', post.client_id)
          .eq('name', 'Social Media')
          .maybeSingle();

        if (folderError) {
          throw folderError;
        }

        if (!folder) {
          // Create the folder if it doesn't exist
          const { data: newFolder, error: createFolderError } = await supabase
            .from('asset_folders')
            .insert({
              client_id: post.client_id,
              name: 'Social Media',
              color: '#8B5CF6',
            })
            .select('id')
            .single();

          if (createFolderError) {
            throw createFolderError;
          }
          folder = newFolder;
        }

        // Extract base64 data and content type
        const matches = post.image_url.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
          console.log(`Skipping post ${post.id} - invalid base64 format`);
          continue;
        }

        const contentType = matches[1];
        const base64Data = matches[2];
        
        // Decode base64
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Generate unique filename
        const extension = contentType.split('/')[1] || 'png';
        const timestamp = new Date().getTime();
        const fileName = `social-media/${post.client_id}/${timestamp}-${post.id}.${extension}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('client-assets')
          .upload(fileName, bytes, {
            contentType,
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('client-assets')
          .getPublicUrl(fileName);

        const storageUrl = urlData.publicUrl;

        // Create asset record
        const { data: asset, error: assetError } = await supabase
          .from('assets')
          .insert({
            client_id: post.client_id,
            folder_id: folder.id,
            title: `Social Media Post - ${new Date().toLocaleDateString()}`,
            type: 'image',
            storage_type: 'storage',
            file_url: storageUrl,
            tags: ['social-media', 'backfilled'],
          })
          .select('id')
          .single();

        if (assetError) {
          throw assetError;
        }

        // Update post to use storage URL
        const { error: updateError } = await supabase
          .from('social_media_posts')
          .update({ image_url: storageUrl })
          .eq('id', post.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`Successfully processed post ${post.id}, created asset ${asset.id}`);
        results.push({
          post_id: post.id,
          asset_id: asset.id,
          status: 'success',
        });
      } catch (error: any) {
        console.error(`Error processing post ${post.id}:`, error);
        results.push({
          post_id: post.id,
          status: 'error',
          error: error.message,
        });
      }
    }

    console.log('Backfill complete!');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Backfilled ${results.filter(r => r.status === 'success').length} of ${posts?.length || 0} posts`,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Backfill error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
