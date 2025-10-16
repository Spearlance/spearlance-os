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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { client_id, caption_text, image_mode, reference_image } = await req.json();

    if (!client_id || !caption_text) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch brand context
    const [brandGuide, moodBoards, client] = await Promise.all([
      supabaseClient.from('brand_guides').select('*').eq('client_id', client_id).maybeSingle(),
      supabaseClient.from('mood_boards').select('*').eq('client_id', client_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabaseClient.from('clients').select('industry, logo_url').eq('id', client_id).single(),
    ]);

    const brand = brandGuide.data;
    const moodBoard = moodBoards.data;
    const clientData = client.data;

    // Build image generation prompt
    let basePrompt = `Create a professional social media post image.

Caption context: "${caption_text}"

Brand Guidelines:
- Primary Color: ${brand?.primary_color || '#3B82F6'}
- Secondary Color: ${brand?.secondary_color || '#10B981'}
- Accent Color: ${brand?.accent_color || '#F59E0B'}
- Aesthetic: ${brand?.aesthetic || 'modern'}
- Mood: ${moodBoard?.title || 'professional and approachable'}

Design Requirements:
- Include 1-2 short text overlays (max 7 words each)
- Apply brand colors in design elements
- Style should match: ${brand?.aesthetic || 'modern'}
- High contrast for social media visibility
- Clean, scroll-stopping composition
- Professional quality suitable for Instagram/Facebook
- 1080x1080px square format

CRITICAL - DO NOT INCLUDE:
- NO logos, watermarks, or branding symbols
- NO date stamps, seasonal tags, or "Winter 2025" style labels
- NO fake company names or fabricated branding
- NO complex graphics that compete with the message
- Keep text overlays minimal and relevant to caption only

HUMAN SUBJECTS GUIDELINES (when people are included):
- NO hand-holding between adults (unless clearly parent-child)
- NO romantic gestures, hugging, or physical affection between adults
- NO poses that could imply romantic relationships or intimacy
- People should be: walking separately, working independently, smiling at camera, or in clearly professional/family contexts
- Safe interactions: parent with child, professional colleagues with personal space, individuals looking at camera
- Focus on: friendly expressions, professional body language, appropriate personal space
- Diversity is good, but keep all interactions clearly platonic and professional

PRODUCT SAFETY GUIDELINES:
- NO recognizable products, brand names, or trademarked items
- NO specific product packaging or labels visible
- NO technology devices showing brand logos (phones, laptops, etc.)
- NO vehicles with visible makes/models or branding
- NO storefronts, retail displays, or branded merchandise
- Keep focus on people, activities, or generic abstract scenes
- If objects are needed, use generic, unbranded versions only

${brand?.imagery_style ? `Imagery Style: ${brand.imagery_style}` : ''}

Generate a clean, eye-catching image that represents this message visually.`;

    if (image_mode === 'with_upload' || image_mode === 'with_brand_asset') {
      basePrompt += `\n\nUse the provided reference image as the base and enhance it with brand elements.`;
    }

    const messages: any[] = [
      { role: 'user', content: basePrompt }
    ];

    // Add reference image if provided
    if (reference_image && (image_mode === 'with_upload' || image_mode === 'with_brand_asset')) {
      messages[0].content = [
        { type: 'text', text: basePrompt },
        { 
          type: 'image_url', 
          image_url: { url: reference_image }
        }
      ];
    }

    // Call Lovable AI image generation
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: messages,
        modalities: ['image', 'text']
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    
    // Extract images from chat completion response
    const generatedImages = aiData.choices?.[0]?.message?.images || [];
    
    // Check if "Social Media" folder exists for this client
    const { data: existingFolder } = await supabaseClient
      .from('asset_folders')
      .select('id')
      .eq('client_id', client_id)
      .eq('name', 'Social Media')
      .maybeSingle();

    let folderId = existingFolder?.id;

    // Create folder if it doesn't exist
    if (!folderId) {
      const { data: newFolder, error: folderError } = await supabaseClient
        .from('asset_folders')
        .insert({
          client_id: client_id,
          name: 'Social Media',
          color: '#8B5CF6',
          created_by: (await supabaseClient.auth.getUser()).data.user?.id
        })
        .select('id')
        .single();
      
      if (!folderError && newFolder) {
        folderId = newFolder.id;
      }
    }

    // Helper function to generate descriptive title from caption
    const generateAssetTitle = (captionText: string, variationNumber: number): string => {
      // Take first sentence or first 60 chars
      let titleBase = captionText
        .split(/[.!?]/)[0]
        .substring(0, 60)
        .trim();
      
      // Clean up emojis and special characters
      titleBase = titleBase.replace(/[^\w\s-]/g, '').trim();
      
      // Add variation number if multiple images
      return variationNumber > 1 
        ? `${titleBase}... (${variationNumber})`
        : `${titleBase}${titleBase.length === 60 ? '...' : ''}`;
    };

    // Process each generated image
    const processedImages = [];

    for (let i = 0; i < generatedImages.length; i++) {
      const img = generatedImages[i];
      const base64Data = img.image_url?.url;
      
      if (base64Data && base64Data.startsWith('data:image')) {
        try {
          // Extract base64 content and convert to buffer
          const base64Content = base64Data.split(',')[1];
          const buffer = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
          
          // Upload to storage in social-media subfolder
          const timestamp = Date.now();
          const fileName = `${client_id}/social-media/generated-${timestamp}-${i}.png`;
          
          const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('client-assets')
            .upload(fileName, buffer, {
              contentType: 'image/png',
              upsert: false
            });
          
          if (!uploadError && uploadData) {
            // Get public URL
            const { data: urlData } = supabaseClient.storage
              .from('client-assets')
              .getPublicUrl(fileName);
            
            // Create asset record
            const { data: assetData, error: assetError } = await supabaseClient
              .from('assets')
              .insert({
                client_id: client_id,
                folder_id: folderId,
                title: generateAssetTitle(caption_text, i + 1),
                type: 'image',
                storage_type: 'upload',
                file_url: urlData.publicUrl,
                preview_url: urlData.publicUrl,
                tags: ['social-media', 'ai-generated'],
                created_by: (await supabaseClient.auth.getUser()).data.user?.id
              })
              .select()
              .single();
            
            if (!assetError && assetData) {
              console.log(`✅ Saved image ${i + 1} to Assets folder:`, assetData.id);
              
              processedImages.push({
                image_url: urlData.publicUrl,
                asset_id: assetData.id,
                prompt_used: basePrompt,
                variation_number: i + 1
              });
            } else {
              console.error(`❌ Failed to create asset record:`, assetError);
              // Fallback to base64 if asset creation fails
              processedImages.push({
                image_url: base64Data,
                prompt_used: basePrompt,
                variation_number: i + 1
              });
            }
          } else {
            console.error(`❌ Failed to upload to storage:`, uploadError);
            // Fallback to base64 if upload fails
            processedImages.push({
              image_url: base64Data,
              prompt_used: basePrompt,
              variation_number: i + 1
            });
          }
        } catch (err) {
          console.error(`❌ Error processing image ${i}:`, err);
          // Fallback to base64 on any error
          processedImages.push({
            image_url: base64Data,
            prompt_used: basePrompt,
            variation_number: i + 1
          });
        }
      }
    }

    // Use processed images if we have them, otherwise fallback to original base64
    const images = processedImages.length > 0 ? processedImages : 
      generatedImages.map((img: any, index: number) => ({
        image_url: img.image_url?.url,
        prompt_used: basePrompt,
        variation_number: index + 1
      }));

    return new Response(
      JSON.stringify({ images }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});