import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

function calculateReadabilityScore(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.trim().length > 0);
  const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
  
  // Simple readability: prefer 15-20 words per sentence
  if (avgWordsPerSentence >= 15 && avgWordsPerSentence <= 20) return 85;
  if (avgWordsPerSentence < 10) return 70;
  if (avgWordsPerSentence > 30) return 60;
  return 75;
}

function calculateSEOScore(content: string, keywords: string[]): number {
  let score = 50;
  const lowerContent = content.toLowerCase();
  
  // Check keyword presence
  keywords.forEach(keyword => {
    if (lowerContent.includes(keyword.toLowerCase())) {
      score += 10;
    }
  });
  
  // Check for headings
  if (content.includes('<h2>')) score += 10;
  if (content.includes('<h3>')) score += 5;
  
  return Math.min(score, 100);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      client_id,
      topic_id,
      title,
      meta_description,
      keywords = [],
      avatar_id,
      outline,
      word_count = 1500,
      tone = 'professional',
      include_cta = true,
      cta_type = 'contact',
      created_by
    } = await req.json();

    if (!client_id || !title) {
      throw new Error('client_id and title are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch comprehensive brand context
    const [
      { data: client },
      { data: brandVoice },
      { data: brandGuide },
      { data: avatar },
      { data: aiPreferences }
    ] = await Promise.all([
      supabase.from('clients').select('*').eq('id', client_id).single(),
      supabase.from('brand_voice').select('*').eq('client_id', client_id).maybeSingle(),
      supabase.from('brand_guide').select('*').eq('client_id', client_id).maybeSingle(),
      avatar_id ? supabase.from('avatars').select('*').eq('id', avatar_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from('blog_ai_preferences').select('*').eq('client_id', client_id).maybeSingle()
    ]);

    if (!client) {
      throw new Error('Client not found');
    }

    let ctaText = '';
    switch (cta_type) {
      case 'contact':
        ctaText = 'Ready to take the next step? Contact us today to learn how we can help.';
        break;
      case 'consultation':
        ctaText = 'Schedule a free consultation to discuss your specific needs.';
        break;
      case 'download':
        ctaText = 'Download our free guide to get started.';
        break;
      case 'learn_more':
        ctaText = 'Want to learn more? Explore our services and solutions.';
        break;
    }

    // Extract keywords from services (handle if business info is in client table directly)
    const serviceKeywords: string[] = [];

    const systemPrompt = `You are an expert blog writer creating content for ${client.name}.

BRAND CONTEXT:
- Brand Story: ${client.brand_story || 'Not specified'}
- Brand Voice: ${brandVoice?.tone_adjectives?.join(', ') || 'Professional and approachable'}
- Brand Personality: ${brandVoice?.personality_traits?.join(', ') || 'Knowledgeable and helpful'}
- Aesthetic: ${brandGuide?.brand_aesthetic || 'Modern and clean'}
- Industry: ${client.industry || 'General'}
- Services: Not specified
- Key Service Keywords: ${serviceKeywords.join(', ')}
${avatar ? `\nTarget Avatar: ${avatar.name}
- ${avatar.summary}
- Pain Points: ${avatar.pain_points || 'General business challenges'}
- Goals: ${avatar.goals || 'Business growth'}` : ''}

${aiPreferences?.topics_to_avoid ? `TOPICS TO AVOID:\n${aiPreferences.topics_to_avoid}\n` : ''}
${aiPreferences?.custom_instructions ? `ADDITIONAL INSTRUCTIONS:\n${aiPreferences.custom_instructions}\n` : ''}

ARTICLE REQUIREMENTS:
- Title: ${title}
- Target Word Count: ${word_count} words
- Focus Keywords: ${keywords.join(', ')}
- Meta Description: ${meta_description || 'Generate an engaging 150-160 character description'}
- Tone: ${tone}

${outline ? `OUTLINE TO FOLLOW:\n${JSON.stringify(outline, null, 2)}` : ''}

WRITING GUIDELINES:
1. Write naturally and conversationally (think Claude, not robotic ChatGPT)
2. Use short paragraphs (2-3 sentences maximum)
3. Include specific examples and actionable advice
4. Address the target audience's pain points directly
5. Use transition phrases for smooth flow between sections
6. Include subheadings (H2, H3) for scannability
7. Incorporate focus keywords naturally (don't force them)
8. Write in an engaging, helpful tone that builds trust
9. Use bullet points and lists where appropriate
10. Include a clear introduction and conclusion

FORMAT REQUIREMENTS:
- Return as clean HTML with semantic markup
- Use <h2> for main sections, <h3> for subsections
- Use <p> for paragraphs
- Use <ul> and <li> for unordered lists
- Use <ol> and <li> for ordered lists
- Use <strong> for emphasis
- Mark image positions with: <!--IMAGE_PLACEHOLDER_1--> (number them sequentially)
- Do NOT include the meta description in the HTML content

${include_cta ? `\nCALL-TO-ACTION:\nEnd with this CTA (make it natural): ${ctaText}` : ''}

Write the complete article now. Be natural, helpful, and engaging.`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    console.log('Generating article:', title);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Write the complete blog article now.' }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;

    // Extract meta description from content if present
    const metaMatch = content.match(/meta[_\s]description:?\s*["']?([^"'\n]+)["']?/i);
    const extractedMeta = metaMatch ? metaMatch[1].trim() : null;

    // Clean content (remove meta description if it was included)
    const cleanedContent = content
      .replace(/meta[_\s]description:?\s*["']?[^"'\n]+["']?\n*/gi, '')
      .trim();

    // Calculate scores
    const plainText = cleanedContent.replace(/<[^>]*>/g, '');
    const wordCount = plainText.split(/\s+/).length;
    const readabilityScore = calculateReadabilityScore(plainText);
    const seoScore = calculateSEOScore(cleanedContent, keywords);

    // Generate excerpt (first 150 characters)
    const excerpt = plainText.substring(0, 150).trim() + '...';

    // Find image placeholders
    const imageMatches = cleanedContent.match(/<!--IMAGE_PLACEHOLDER_(\d+)-->/g) || [];
    const imagePositions = imageMatches.map((match: string) => {
      const num = match.match(/\d+/);
      return num ? parseInt(num[0]) : 0;
    });

    // Generate slug
    const slug = slugify(title);

    // Insert blog post into database
    const { data: blogPost, error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        client_id,
        title,
        slug,
        meta_description: extractedMeta || meta_description || excerpt,
        content: cleanedContent,
        excerpt,
        focus_keyword: keywords[0] || null,
        seo_score: seoScore,
        readability_score: readabilityScore,
        avatar_id: avatar_id || null,
        target_keywords: keywords,
        status: 'draft',
        ai_model: 'claude-sonnet-4-5',
        generation_prompt: systemPrompt,
        generation_metadata: {
          word_count: wordCount,
          tone,
          image_positions: imagePositions,
          cta_type: include_cta ? cta_type : null
        },
        created_by: created_by || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting blog post:', insertError);
      throw insertError;
    }

    // Update topic if provided
    if (topic_id) {
      await supabase
        .from('blog_topics')
        .update({ 
          status: 'in_progress',
          blog_post_id: blogPost.id 
        })
        .eq('id', topic_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        blog_post_id: blogPost.id,
        article: {
          title,
          slug,
          meta_description: extractedMeta || meta_description || excerpt,
          content: cleanedContent,
          excerpt,
          image_positions: imagePositions,
          seo_score: seoScore,
          readability_score: readabilityScore,
          word_count: wordCount
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in blog-generate-article:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
