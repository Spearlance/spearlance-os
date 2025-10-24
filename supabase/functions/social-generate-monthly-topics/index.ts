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

    const { client_id, month, year, generation_type = 'all' } = await req.json();

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

    // Prevent generating posts for past months
    const selectedDate = new Date(year, month - 1, 1);
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    if (selectedDate < currentMonthStart) {
      throw new Error('Cannot generate posts for months in the past');
    }

    // Check for existing posts
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 1).toISOString();
    
    const { data: existingPosts } = await supabase
      .from('social_media_posts')
      .select('id, scheduled_date')
      .eq('client_id', client_id)
      .gte('scheduled_date', startDate)
      .lt('scheduled_date', endDate);

    let daysToGenerate: number[] = [];
    let postsToGenerate = 30;

    if (generation_type === 'all') {
      // Delete all existing posts for this month
      if (existingPosts && existingPosts.length > 0) {
        console.log('Deleting', existingPosts.length, 'existing posts for regeneration...');
        const { error: deleteError } = await supabase
          .from('social_media_posts')
          .delete()
          .in('id', existingPosts.map(p => p.id));
          
        if (deleteError) {
          console.error('Error deleting existing posts:', deleteError);
          throw deleteError;
        }
      }
      
      // Delete existing batch record
      await supabase
        .from('social_media_generation_batches')
        .delete()
        .eq('client_id', client_id)
        .eq('month', month)
        .eq('year', year);
      
      // Generate all 30 days
      daysToGenerate = Array.from({ length: 30 }, (_, i) => i + 1);
    } else if (generation_type === 'missing') {
      // Find which days already have posts
      const existingDays = new Set(
        existingPosts?.map(p => new Date(p.scheduled_date).getDate()) || []
      );
      
      // Generate only for missing days
      daysToGenerate = Array.from({ length: 30 }, (_, i) => i + 1)
        .filter(day => !existingDays.has(day));
      
      postsToGenerate = daysToGenerate.length;
      
      if (postsToGenerate === 0) {
        throw new Error('All days already have posts scheduled. Use "Generate All" to replace them.');
      }
      
      console.log(`Generating posts for ${postsToGenerate} missing days:`, daysToGenerate);
    }

    console.log('Generating monthly topics for client:', client_id, 'month:', month, 'year:', year);

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

    // Calculate topic distribution based on posts to generate
    const ratio = postsToGenerate / 30;
    const topicDistribution = {
      educational: Math.round(8 * ratio),
      behind_the_scenes: Math.round(8 * ratio),
      customer_stories: Math.round(6 * ratio),
      promotional: Math.round(4 * ratio),
      quick_tips: Math.round(4 * ratio),
    };

    const systemPrompt = `You are a social media strategist creating a monthly content calendar. Generate exactly ${postsToGenerate} post ideas for ${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}.
${generation_type === 'missing' ? `\nNote: Generate posts for these specific days only: ${daysToGenerate.join(', ')}` : ''}

Client Context:
- Business: ${client?.name || 'Unknown'}
- Industry: ${client?.industry || 'General'}
- Brand Name: ${client?.brand_name || client?.name}
${brandVoice?.tone ? `- Brand Tone: ${brandVoice.tone}` : ''}
${avatar?.avatar_name ? `- Target Audience: ${avatar.avatar_name}` : ''}

Topic Distribution:
- ${topicDistribution.educational} Educational posts (teach something valuable)
- ${topicDistribution.behind_the_scenes} Behind-the-scenes posts (show your process, team, culture)
- ${topicDistribution.customer_stories} Customer stories (testimonials, case studies, wins)
- ${topicDistribution.promotional} Promotional posts (offers, services, products)
- ${topicDistribution.quick_tips} Quick tips (actionable bite-sized advice)

Return a JSON array of exactly ${postsToGenerate} objects with this structure:
{
  "day": ${generation_type === 'missing' ? `one of [${daysToGenerate.join(', ')}]` : '1-30'},
  "category": "educational|behind_the_scenes|customer_stories|promotional|quick_tips",
  "topic_title": "Short catchy title",
  "topic_description": "Brief description of what this post should cover",
  "suggested_approach": "How to execute this post (format, style, key points)",
  "ideal_for": "Why this topic works well for this day/timing"
}

${generation_type === 'missing' ? 'Assign each post to one of the available days. ' : 'Spread the topics naturally across the month. '}Mix up the categories so there's variety week-to-week. Make topics specific and actionable.`;

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
          { role: 'user', content: `Generate ${postsToGenerate} diverse social media post topics for ${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}. Return ONLY valid JSON array, no markdown formatting.` }
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

    if (!Array.isArray(topics) || topics.length !== postsToGenerate) {
      console.error('Invalid topics response:', topics);
      throw new Error(`AI did not generate exactly ${postsToGenerate} topics`);
    }

    console.log(`Generated ${postsToGenerate} topics successfully`);

    // Insert all posts as drafts FIRST (before creating batch record)
    const postsToInsert = topics.map((topic: any) => {
      const scheduledDate = new Date(year, month - 1, topic.day);
      
      return {
        client_id,
        topic_category: topic.category,
        post_idea_json: topic,
        scheduled_date: scheduledDate.toISOString(),
        status: 'idea',
        created_by: user.id,
      };
    });

    const { data: createdPosts, error: postsError } = await supabase
      .from('social_media_posts')
      .insert(postsToInsert)
      .select();

    if (postsError) {
      console.error('Error inserting posts:', postsError);
      throw postsError;
    }

    console.log('Created', createdPosts.length, 'draft posts');

    // NOW create batch record (only if posts succeeded)
    const { data: batch, error: batchError } = await supabase
      .from('social_media_generation_batches')
      .insert({
        client_id,
        month,
        year,
        total_posts: createdPosts.length,
      })
      .select()
      .single();

    if (batchError) {
      console.error('Error creating batch record:', batchError);
      throw batchError;
    }

    // Link posts to batch
    const { error: updateError } = await supabase
      .from('social_media_posts')
      .update({ generation_batch_id: batch.id })
      .in('id', createdPosts.map(p => p.id));
      
    if (updateError) {
      console.error('Error linking posts to batch:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        batch_id: batch.id,
        posts_created: createdPosts.length,
        posts: createdPosts,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating monthly topics:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});