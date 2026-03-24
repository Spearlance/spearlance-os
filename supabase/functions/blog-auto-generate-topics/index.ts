import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AI_CHAT_URL, AI_MODELS, aiHeaders } from '../_shared/aiClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      research_bundle,
      seo_rules,
      content_strategy,
      competitors_content,
      existing_topics,
      published_posts,
      topics_to_avoid,
      num_topics,
      month,
      year,
    } = await req.json();

    if (!client_id || !research_bundle || !num_topics || !month || !year) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: client_id, research_bundle, num_topics, month, year' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (month < 1 || month > 12) {
      return new Response(
        JSON.stringify({ error: 'Invalid month. Must be between 1 and 12' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentYear = new Date().getFullYear();
    if (year < currentYear || year > currentYear + 1) {
      return new Response(
        JSON.stringify({ error: 'Invalid year. Can only plan for current year or next year' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating ${num_topics} topics for client:`, client_id, `month: ${month}/${year}`);

    const { client, brand_voice, brand_story, avatars, services } = research_bundle;
    const selectedDays: number[] = content_strategy?.selected_days ?? [];
    const contentMix = content_strategy?.content_mix ?? {
      how_to: 40, best_practices: 30, industry_news: 30
    };

    // Calculate which calendar dates fall on the selected ISO weekdays
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysToGenerate: number[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
      if (selectedDays.includes(isoDayOfWeek)) {
        daysToGenerate.push(day);
      }
    }

    // If no days map from selectedDays, generate evenly spaced dates
    const suggestedDates: string[] = daysToGenerate.length >= num_topics
      ? daysToGenerate.slice(0, num_topics).map(day => {
          const d = new Date(year, month - 1, day);
          return d.toISOString().split('T')[0];
        })
      : Array.from({ length: num_topics }, (_, i) => {
          const intervalDays = Math.floor(daysInMonth / (num_topics + 1));
          const day = Math.min((i + 1) * intervalDays, daysInMonth);
          const d = new Date(year, month - 1, day);
          return d.toISOString().split('T')[0];
        });

    // Calculate topic category distribution from content_mix percentages
    const topicCounts: Record<string, number> = {};
    let remaining = num_topics;
    const sorted = Object.entries(contentMix).sort((a: [string, number], b: [string, number]) => b[1] - a[1]);
    sorted.forEach(([cat, pct], idx) => {
      topicCounts[cat] = idx === sorted.length - 1
        ? remaining
        : Math.round((pct / 100) * num_topics);
      remaining -= topicCounts[cat];
    });

    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
    const primaryAvatar = avatars?.[0];
    const serviceList = (services ?? []).map((s: { name: string; description?: string }) =>
      `- ${s.name}${s.description ? ': ' + s.description : ''}`
    ).join('\n');

    const avoidTitles = [
      ...(existing_topics ?? []),
      ...(published_posts ?? []),
    ].filter(Boolean);

    const systemPrompt = `You are a professional SEO content strategist. Generate EXACTLY ${num_topics} blog topic ideas for ${monthName} ${year}.

CLIENT CONTEXT:
- Business: ${client?.name ?? 'Unknown'}
- Brand Name: ${client?.brand_name ?? client?.name ?? 'Unknown'}
- Industry: ${client?.industry ?? 'General'}
- Service Areas: ${Array.isArray(client?.service_areas) ? client.service_areas.join(', ') : (client?.service_areas ?? 'Not specified')}

BRAND VOICE:
- Tone: ${Array.isArray(brand_voice?.tone_adjectives) ? brand_voice.tone_adjectives.join(', ') : 'Professional'}
- Personality: ${brand_voice?.personality_description ?? 'Expert, authoritative, helpful'}

BRAND STORY:
${brand_story?.executive_summary ? `Summary: ${brand_story.executive_summary}` : ''}
${Array.isArray(brand_story?.value_propositions) && brand_story.value_propositions.length ? `Value Propositions: ${brand_story.value_propositions.join('; ')}` : ''}
${Array.isArray(brand_story?.pain_points) && brand_story.pain_points.length ? `Pain Points Solved: ${brand_story.pain_points.join('; ')}` : ''}

SERVICES:
${serviceList || 'Not specified'}

TARGET AUDIENCE:
${primaryAvatar ? `- ${primaryAvatar.name ?? primaryAvatar.avatar_name ?? 'Primary audience'}: ${primaryAvatar.summary ?? primaryAvatar.description ?? ''}` : 'General audience'}
${avatars?.length > 1 ? `- ${avatars[1].name ?? avatars[1].avatar_name ?? 'Secondary audience'}: ${avatars[1].summary ?? avatars[1].description ?? ''}` : ''}

SEO RULES (apply strictly):
${seo_rules ?? 'Target high-intent keywords. Prefer informational and commercial queries. Minimum 1,000 words per article. Strong heading structure.'}

COMPETITOR CONTENT TO DIFFERENTIATE FROM:
${competitors_content ?? 'No competitor data available.'}

TOPICS TO AVOID (already planned or published):
${avoidTitles.length ? avoidTitles.map(t => `- ${t}`).join('\n') : 'None'}

${topics_to_avoid ? `ADDITIONAL TOPICS TO AVOID:\n${topics_to_avoid}` : ''}

REQUIRED CONTENT DISTRIBUTION for ${num_topics} topics:
${sorted.map(([cat]) => `- ${topicCounts[cat]} ${cat.replace(/_/g, ' ')} post(s)`).join('\n')}

Content type guidelines:
- how_to: Step-by-step guides teaching valuable skills relevant to the client's industry
- case_studies: Real success stories and results (frame as hypothetical if needed)
- industry_news: Latest trends, changes, or news analysis relevant to the industry
- best_practices: Expert tips and proven strategies
- company_updates: Announcements, team highlights, new services (use sparingly)

TOPIC QUALITY RULES:
1. Each title must be specific — no vague titles like "Tips for Your Business"
2. Each title must target a keyword that matches real user search intent
3. Prefer topics with clear commercial or informational search intent
4. Never generate seasonal fluff with no ranking intent
5. Topics must be relevant to the client's actual services and industry
6. Each topic needs 3 keywords: 1 primary (highest search volume) + 2 secondary

Return ONLY a valid JSON array of EXACTLY ${num_topics} objects. No markdown, no explanation, no code fences. Just the raw JSON array.

JSON structure for each topic:
{
  "title": "Specific, keyword-rich, SEO-optimized headline",
  "summary": "2-3 sentences describing the article angle and what value it provides",
  "category": "how_to|case_studies|industry_news|best_practices|company_updates",
  "keywords": ["primary keyword", "secondary keyword", "tertiary keyword"],
  "priority": 1
}`;

    const response = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify({
        model: AI_MODELS.TEXT,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Generate exactly ${num_topics} diverse, high-quality blog topics for ${monthName} ${year}. Return ONLY the JSON array.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const aiData = await response.json();
    let topicsText: string = aiData.choices[0].message.content;

    // Strip markdown fences if the model wraps output
    topicsText = topicsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const rawTopics = JSON.parse(topicsText);

    if (!Array.isArray(rawTopics)) {
      throw new Error('AI did not return a valid JSON array of topics');
    }

    if (rawTopics.length !== num_topics) {
      console.warn(`Expected ${num_topics} topics but got ${rawTopics.length} — using what was returned`);
    }

    // Assign calendar dates (calculated server-side, not trusted from AI)
    const topics = rawTopics.map((topic: Record<string, unknown>, index: number) => ({
      title: topic.title,
      summary: topic.summary,
      category: topic.category,
      keywords: topic.keywords,
      suggested_publish_date: suggestedDates[index] ?? suggestedDates[suggestedDates.length - 1],
      priority: topic.priority ?? 1,
    }));

    console.log(`Generated ${topics.length} topics for client ${client_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        topics,
        ...(auto_run_id ? { auto_run_id } : {}),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in blog-auto-generate-topics:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
