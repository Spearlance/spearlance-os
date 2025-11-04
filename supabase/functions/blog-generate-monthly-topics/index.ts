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

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { client_id, month, year } = await req.json();

    if (!client_id || !month || !year) {
      throw new Error('Missing required parameters');
    }

    // Validate month (1-12)
    if (month < 1 || month > 12) {
      throw new Error('Invalid month. Must be between 1 and 12');
    }

    // Validate year (current year or next year only)
    const currentYear = new Date().getFullYear();
    if (year < currentYear || year > currentYear + 1) {
      throw new Error('Invalid year. Can only plan for current year or next year');
    }

    console.log('Generating monthly blog topics for client:', client_id, 'month:', month, 'year:', year);

    // Fetch strategy (month-specific first, fallback to global)
    const { data: strategy } = await supabase
      .from('blog_content_strategy')
      .select('*')
      .eq('client_id', client_id)
      .or(`and(is_global.eq.false,month.eq.${month},year.eq.${year}),is_global.eq.true`)
      .order('is_global', { ascending: true })
      .limit(1)
      .maybeSingle();

    const postingFrequency = strategy?.posting_frequency || 'weekly';
    const contentMix = strategy?.content_mix || {
      how_to: 30, case_studies: 20, industry_news: 15, best_practices: 20, company_updates: 15
    };

    // Calculate number of posts based on frequency
    let numTopics = 4; // weekly = 4 posts/month
    if (postingFrequency === 'bi-weekly') numTopics = 2;
    if (postingFrequency === 'monthly') numTopics = 1;

    // Fetch client data for context
    const { data: client } = await supabase
      .from('clients')
      .select('name, industry, brand_name')
      .eq('id', client_id)
      .single();

    // Fetch brand voice
    const { data: brandVoice } = await supabase
      .from('client_brand_voice')
      .select('*')
      .eq('client_id', client_id)
      .maybeSingle();

    // Fetch primary avatar
    const { data: avatar } = await supabase
      .from('avatars')
      .select('*')
      .eq('client_id', client_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Calculate topic counts from percentages
    const topicCounts: any = {};
    let remaining = numTopics;
    const sorted = Object.entries(contentMix).sort((a: any, b: any) => b[1] - a[1]);
    sorted.forEach(([cat, pct]: any, idx) => {
      topicCounts[cat] = idx === sorted.length - 1 ? remaining : Math.round((pct / 100) * numTopics);
      remaining -= topicCounts[cat];
    });

    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

    const systemPrompt = `Generate ${numTopics} blog post topic ideas for ${monthName} ${year}.

Client Context:
- Business: ${client?.name || 'Unknown'}
- Industry: ${client?.industry || 'General'}
- Brand Name: ${client?.brand_name || client?.name}
${brandVoice?.tone ? `- Brand Tone: ${brandVoice.tone}` : ''}
${avatar?.avatar_name ? `- Target Audience: ${avatar.avatar_name}` : ''}

Content Distribution:
${Object.entries(topicCounts).map(([cat, count]) => `- ${count} ${cat.replace(/_/g, ' ')} post(s)`).join('\n')}

Content Type Guidelines:
- how_to: Step-by-step guides teaching valuable skills
- case_studies: Real client success stories and results
- industry_news: Latest trends and news analysis
- best_practices: Expert tips and proven strategies
- company_updates: Announcements, team highlights, new services

Return a JSON array of exactly ${numTopics} objects with this structure:
{
  "title": "Compelling SEO-optimized headline",
  "summary": "2-3 sentence description of what the article will cover",
  "category": "how_to|case_studies|industry_news|best_practices|company_updates",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "target_avatar": "${avatar?.avatar_name || 'general audience'}",
  "suggested_publish_date": "YYYY-MM-DD (spread throughout the month)"
}

Make topics specific, actionable, and valuable. Ensure proper distribution across categories.`;

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate ${numTopics} diverse blog post topics for ${monthName} ${year}. Return ONLY valid JSON array, no markdown formatting.` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const aiData = await response.json();
    let topicsText = aiData.choices[0].message.content;
    
    // Clean up markdown code blocks if present
    topicsText = topicsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const topics = JSON.parse(topicsText);

    if (!Array.isArray(topics) || topics.length !== numTopics) {
      console.error('Invalid topics response:', topics);
      throw new Error(`AI did not generate exactly ${numTopics} topics`);
    }

    console.log(`Generated ${numTopics} topics successfully`);

    // Create batch record FIRST
    const { data: batch, error: batchError } = await supabase
      .from('blog_strategy_batches')
      .insert({
        client_id,
        month,
        year,
        total_topics: topics.length,
      })
      .select()
      .single();

    if (batchError) {
      console.error('Error creating batch record:', batchError);
      throw batchError;
    }

    // Insert all topics
    const topicsToInsert = topics.map((topic: any) => ({
      client_id,
      strategy_batch_id: batch.id,
      topic_title: topic.title,
      summary: topic.summary,
      category: topic.category,
      keywords: topic.keywords,
      suggested_publish_date: topic.suggested_publish_date,
      status: 'idea',
      priority: 'medium',
      ai_generated: true,
    }));

    const { data: createdTopics, error: topicsError } = await supabase
      .from('blog_topics')
      .insert(topicsToInsert)
      .select();

    if (topicsError) {
      console.error('Error inserting topics:', topicsError);
      throw topicsError;
    }

    console.log('Created', createdTopics.length, 'blog topics');

    return new Response(
      JSON.stringify({ 
        success: true, 
        batch_id: batch.id,
        topics_created: createdTopics.length,
        topics: createdTopics,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating monthly blog topics:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});