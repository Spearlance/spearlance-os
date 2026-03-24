import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AI_CHAT_URL, AI_MODELS, aiHeaders } from '../_shared/aiClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

function countWords(html: string): number {
  const plain = html.replace(/<[^>]*>/g, ' ');
  return plain.split(/\s+/).filter(w => w.trim().length > 0).length;
}

function countHeadings(html: string): { h1: number; h2: number; h3: number } {
  return {
    h1: (html.match(/<h1[\s>]/gi) || []).length,
    h2: (html.match(/<h2[\s>]/gi) || []).length,
    h3: (html.match(/<h3[\s>]/gi) || []).length,
  };
}

function countInternalLinks(html: string): number {
  return (html.match(/<a\s[^>]*href=["']\//gi) || []).length;
}

function calculateKeywordDensity(html: string, keyword: string): number {
  if (!keyword) return 0;
  const plain = html.replace(/<[^>]*>/g, ' ').toLowerCase();
  const words = plain.split(/\s+/).filter(w => w.trim().length > 0);
  const totalWords = words.length;
  if (totalWords === 0) return 0;

  const kw = keyword.toLowerCase();
  let occurrences = 0;
  let idx = plain.indexOf(kw);
  while (idx !== -1) {
    occurrences++;
    idx = plain.indexOf(kw, idx + kw.length);
  }

  return parseFloat(((occurrences / totalWords) * 100).toFixed(2));
}

function buildQualityScores(content: string, keywords: string[]) {
  const headings = countHeadings(content);
  return {
    word_count: countWords(content),
    h1_count: headings.h1,
    h2_count: headings.h2,
    h3_count: headings.h3,
    internal_link_count: countInternalLinks(content),
    primary_keyword_density: calculateKeywordDensity(content, keywords[0] || ''),
    secondary_keyword_density: calculateKeywordDensity(content, keywords[1] || ''),
  };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate auto-blog API key
  const autoBlogKey = Deno.env.get('AUTO_BLOG_API_KEY');
  const providedKey = req.headers.get('x-auto-blog-key');

  if (!autoBlogKey || !providedKey || providedKey !== autoBlogKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized — invalid or missing x-auto-blog-key' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const {
      client_id,
      auto_run_id,
      topic_id,
      title,
      meta_description,
      keywords = [],
      system_prompt,
      user_prompt = 'Write the complete blog article now.',
      revision_instructions,
      existing_post_id,
    } = await req.json();

    if (!client_id || !title) {
      throw new Error('client_id and title are required');
    }
    if (!system_prompt) {
      throw new Error('system_prompt is required — the agent must build this');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const isRevision = !!(revision_instructions && existing_post_id);

    // ── Build messages ──────────────────────────────────────────────────────

    let messages: Array<{ role: string; content: string }>;

    if (isRevision) {
      // Fetch existing post content
      const { data: existingPost, error: fetchError } = await supabase
        .from('blog_posts')
        .select('content, revision_count')
        .eq('id', existing_post_id)
        .single();

      if (fetchError || !existingPost) {
        throw new Error(`Could not fetch existing post ${existing_post_id}: ${fetchError?.message}`);
      }

      messages = [
        { role: 'system', content: system_prompt },
        {
          role: 'user',
          content: `Here is the existing article:\n\n${existingPost.content}\n\n---\n\nRevision instructions:\n${revision_instructions}\n\nReturn the full revised article as clean HTML.`,
        },
      ];

      console.log('Revising article:', title, '| post id:', existing_post_id);

      // ── Call AI ───────────────────────────────────────────────────────────
      const aiResponse = await fetch(AI_CHAT_URL, {
        method: 'POST',
        headers: aiHeaders(),
        body: JSON.stringify({
          model: AI_MODELS.TEXT,
          messages,
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error('AI API error:', aiResponse.status, errText);
        throw new Error(`AI API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices[0].message.content.trim();
      const qualityScores = buildQualityScores(content, keywords);

      const { error: updateError } = await supabase
        .from('blog_posts')
        .update({
          content,
          revision_count: (existingPost.revision_count ?? 0) + 1,
          generation_prompt: system_prompt.substring(0, 10000),
          generation_metadata: {
            quality_scores: qualityScores,
            revised_at: new Date().toISOString(),
          },
          ...(qualityScores.word_count > 0 ? {} : {}), // no-op placeholder
        })
        .eq('id', existing_post_id);

      if (updateError) {
        console.error('Error updating blog post:', updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          blog_post_id: existing_post_id,
          quality_scores: qualityScores,
          is_revision: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Initial generation ────────────────────────────────────────────────────

    messages = [
      { role: 'system', content: system_prompt },
      { role: 'user', content: user_prompt },
    ];

    console.log('Generating article:', title);

    const aiResponse = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify({
        model: AI_MODELS.TEXT,
        messages,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content.trim();
    const qualityScores = buildQualityScores(content, keywords);

    // Generate excerpt from plain text
    const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const excerpt = plainText.substring(0, 150).trim() + '...';

    const slug = slugify(title);

    const { data: blogPost, error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        client_id,
        topic_id: topic_id || null,
        auto_run_id: auto_run_id || null,
        title,
        slug,
        meta_description: meta_description || excerpt,
        content,
        excerpt,
        focus_keyword: keywords[0] || null,
        target_keywords: keywords,
        status: 'auto_draft',
        ai_model: AI_MODELS.TEXT,
        generation_prompt: system_prompt.substring(0, 10000),
        generation_metadata: {
          quality_scores: qualityScores,
          generated_at: new Date().toISOString(),
        },
        revision_count: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting blog post:', insertError);
      throw insertError;
    }

    // Link topic if provided
    if (topic_id) {
      await supabase
        .from('blog_topics')
        .update({
          status: 'in_progress',
          blog_post_id: blogPost.id,
        })
        .eq('id', topic_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        blog_post_id: blogPost.id,
        quality_scores: qualityScores,
        is_revision: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in blog-auto-write:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
