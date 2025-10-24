import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadMediaRequest {
  media_url: string;
  profile_id: string;
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

    const { media_url, profile_id }: UploadMediaRequest = await req.json();

    if (!media_url || !profile_id) {
      throw new Error('media_url and profile_id are required');
    }

    // Download media from URL
    console.log('Downloading media from:', media_url);
    const mediaResponse = await fetch(media_url);
    if (!mediaResponse.ok) {
      throw new Error('Failed to download media');
    }

    const mediaBlob = await mediaResponse.blob();
    const contentType = mediaResponse.headers.get('content-type') || 'image/jpeg';

    // Upload to Late API
    const formData = new FormData();
    formData.append('file', mediaBlob, 'media');
    formData.append('profile_id', profile_id);

    const lateResponse = await fetch('https://getlate.dev/api/v1/media', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lateApiKey}`,
      },
      body: formData,
    });

    if (!lateResponse.ok) {
      const errorText = await lateResponse.text();
      console.error('Late API error:', errorText);
      throw new Error(`Failed to upload media: ${errorText}`);
    }

    const lateMedia = await lateResponse.json();
    console.log('Media uploaded to Late:', lateMedia);

    return new Response(
      JSON.stringify({ 
        success: true, 
        media: lateMedia,
        media_url: lateMedia.url 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error uploading media:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});