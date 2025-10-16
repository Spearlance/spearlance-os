import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Retry logic wrapper
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelay = 2000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      console.log(`Attempt ${i + 1} failed:`, error.message);
      
      if (i < maxRetries) {
        const delay = baseDelay * Math.pow(2, i);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

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

    // Fetch brand context with Promise.allSettled for better error handling
    console.log('📚 Fetching brand context...');
    const [brandGuide, moodBoards, client] = await Promise.allSettled([
      supabaseClient.from('brand_guides').select('*').eq('client_id', client_id).maybeSingle(),
      supabaseClient.from('mood_boards').select('*').eq('client_id', client_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabaseClient.from('clients').select('industry, logo_url').eq('id', client_id).single(),
    ]);

    const brand = brandGuide.status === 'fulfilled' ? brandGuide.value.data : null;
    const moodBoard = moodBoards.status === 'fulfilled' ? moodBoards.value.data : null;
    const clientData = client.status === 'fulfilled' ? client.value.data : null;
    
    console.log('✅ Brand context loaded');

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

    // Call Lovable AI image generation with retry logic
    console.log('🎨 Generating images with AI...');
    const aiData = await retryWithBackoff(async () => {
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
        console.error('❌ AI API error:', errorText);
        
        // Handle specific error types
        if (aiResponse.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (aiResponse.status === 402) {
          throw new Error('AI usage limit reached. Please add credits to your workspace.');
        } else if (aiResponse.status >= 500) {
          throw new Error('AI service temporarily unavailable. Please try again.');
        }
        
        throw new Error(`AI generation failed: ${errorText}`);
      }

      return await aiResponse.json();
    });
    
    console.log('✅ Images generated successfully');
    
    // Extract images from chat completion response
    const generatedImages = aiData.choices?.[0]?.message?.images || [];
    
    if (generatedImages.length === 0) {
      throw new Error('No images were generated. Please try again.');
    }
    
    console.log('💾 Processing and saving images...');
    
    // Check if "Social Media" folder exists
    const { data: existingFolder } = await supabaseClient
      .from('asset_folders')
      .select('id')
      .eq('client_id', client_id)
      .eq('name', 'Social Media')
      .maybeSingle();

    let folderId = existingFolder?.id;

    // Create folder if it doesn't exist
    if (!folderId) {
      const { data: newFolder } = await supabaseClient
        .from('asset_folders')
        .insert({
          client_id: client_id,
          name: 'Social Media',
          color: '#8B5CF6',
          created_by: (await supabaseClient.auth.getUser()).data.user?.id
        })
        .select('id')
        .single();
      
      if (newFolder) {
        folderId = newFolder.id;
      }
    }

    // Helper function to generate descriptive title
    const generateAssetTitle = (captionText: string, variationNumber: number): string => {
      let titleBase = captionText
        .split(/[.!?]/)[0]
        .substring(0, 60)
        .trim()
        .replace(/[^\w\s-]/g, '')
        .trim();
      
      return variationNumber > 1 
        ? `${titleBase}... (${variationNumber})`
        : `${titleBase}${titleBase.length === 60 ? '...' : ''}`;
    };

    // Process images - return base64 for immediate display, save URLs for later
    const processedImages = [];

    for (let i = 0; i < generatedImages.length; i++) {
      const img = generatedImages[i];
      const base64Data = img.image_url?.url;
      
      if (base64Data && base64Data.startsWith('data:image')) {
        try {
          const base64Content = base64Data.split(',')[1];
          const buffer = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
          
          const timestamp = Date.now();
          const fileName = `${client_id}/social-media/generated-${timestamp}-${i}.png`;
          
          const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('client-assets')
            .upload(fileName, buffer, {
              contentType: 'image/png',
              upsert: false
            });
          
          if (!uploadError && uploadData) {
            const { data: urlData } = supabaseClient.storage
              .from('client-assets')
              .getPublicUrl(fileName);
            
            await supabaseClient
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
              });
            
            console.log(`✅ Saved image ${i + 1} to Assets`);
            
            processedImages.push({
              image_url: urlData.publicUrl,
              prompt_used: basePrompt,
              variation_number: i + 1
            });
          } else {
            // Fallback to base64 if upload fails
            processedImages.push({
              image_url: base64Data,
              prompt_used: basePrompt,
              variation_number: i + 1
            });
          }
        } catch (err) {
          console.error(`❌ Error processing image ${i}:`, err);
          // Fallback to base64 on error
          processedImages.push({
            image_url: base64Data,
            prompt_used: basePrompt,
            variation_number: i + 1
          });
        }
      }
    }
    
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
    console.error('❌ Error:', error);
    
    // Provide user-friendly error messages
    let errorMessage = error.message || 'Image generation failed';
    let status = 500;
    
    if (error.message?.includes('Rate limit')) {
      status = 429;
      errorMessage = 'You\'ve hit the AI usage limit. Please wait a moment and try again.';
    } else if (error.message?.includes('usage limit')) {
      status = 402;
      errorMessage = 'AI usage limit reached. Please add credits to your workspace.';
    } else if (error.message?.includes('timeout') || error.message?.includes('took too long')) {
      errorMessage = 'Image generation took too long. Try using a simpler prompt or try again.';
    } else if (error.message?.includes('Connection')) {
      errorMessage = 'Connection timed out. Please check your internet and try again.';
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});