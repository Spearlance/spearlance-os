import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_id, force } = await req.json();

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: 'client_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if plan already exists for today (unless force refresh)
    if (!force) {
      const today = new Date().toISOString().split('T')[0];
      const { data: existingPlan } = await supabaseClient
        .from('daily_action_plans')
        .select('*')
        .eq('client_id', client_id)
        .eq('plan_date', today)
        .maybeSingle();

      if (existingPlan) {
        console.log('✅ Returning existing plan for today');
        return new Response(
          JSON.stringify(existingPlan),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('📊 Gathering client data...');

    // Fetch all relevant data in parallel
    const [
      clientData,
      tasksData,
      goalsData,
      marketingIdeasData,
      servicesData,
      meetingsData,
      avatarData,
      assetsData,
      flowData
    ] = await Promise.all([
      supabaseClient.from('clients').select('name, industry, brand_name').eq('id', client_id).single(),
      supabaseClient.from('tasks').select('title, status, priority, due_date, created_at').eq('client_id', client_id),
      supabaseClient.from('quarterly_goals').select('title, progress, start_date, end_date').eq('client_id', client_id),
      supabaseClient.from('marketing_ideas').select('title, idea_type, status').eq('client_id', client_id).eq('status', 'approved'),
      supabaseClient.from('services').select('name, description, key_benefits').eq('client_id', client_id),
      supabaseClient.from('meetings').select('title, date_time, summary').eq('client_id', client_id).gte('date_time', new Date().toISOString()).limit(5),
      supabaseClient.from('avatars').select('avatar_name, demographics, goals, pains').eq('client_id', client_id).limit(5),
      supabaseClient.from('assets').select('id, type').eq('client_id', client_id),
      supabaseClient
        .from('marketing_flow_channels')
        .select(`
          name,
          status,
          progress,
          stage:marketing_flow_stages!inner(
            name,
            flow:marketing_flows!inner(client_id)
          )
        `)
        .eq('stage.flow.client_id', client_id)
    ]);

    const client = clientData.data;
    const tasks = tasksData.data || [];
    const goals = goalsData.data || [];
    const marketingIdeas = marketingIdeasData.data || [];
    const services = servicesData.data || [];
    const meetings = meetingsData.data || [];
    const avatars = avatarData.data || [];
    const assets = assetsData.data || [];
    const channels = flowData.data || [];

    // Analyze tasks
    const now = new Date();
    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done');
    const highPriorityTasks = tasks.filter(t => t.priority === 'high' && t.status === 'to_do');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').map(t => ({
      ...t,
      days_in_progress: Math.floor((now.getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24))
    }));

    console.log('🤖 Generating action plan with AI...');

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a strategic marketing advisor for SpearlanceOS, an all-in-one marketing operations platform.

Your job is to analyze a client's complete marketing operation and generate a focused daily action plan.

RULES:
1. Prioritize actions that:
   - Unblock stuck work
   - Prevent future problems (e.g., meeting prep)
   - Build momentum (quick wins)
   - Align with quarterly goals

2. DO NOT suggest avatar creation if avatar data already exists (check CUSTOMER AVATARS section)
   - Only suggest avatar work if there are specific, actionable gaps (e.g., "Add pricing strategy to avatar")
   - Generic "create avatar" or "define customer avatar" suggestions are NOT helpful when avatars exist

3. Generate 3-5 priority actions max (focus > volume)

4. Each action must include:
   - Clear title (action-oriented: "Prep for Thursday meeting with X")
   - Why it matters (context: "You have 2 days to prepare...")
   - Direct link to take action (e.g., /tasks, /meetings, /marketing/ideas)
   - Priority level: "urgent" (time-sensitive/blocking), "important" (strategic/goal-aligned), or "momentum" (quick wins)

5. Write in friendly, encouraging tone
6. Acknowledge recent wins to build motivation`;

    const userPrompt = `Analyze this client's marketing operation and create today's action plan:

CLIENT CONTEXT:
- Name: ${client?.name || 'Client'}
- Brand: ${client?.brand_name || client?.name}
- Industry: ${client?.industry || 'Not specified'}

CURRENT TASKS:
- Overdue: ${overdueTasks.length} tasks ${overdueTasks.length > 0 ? `(${overdueTasks.slice(0, 3).map(t => t.title).join(', ')})` : ''}
- High Priority To-Do: ${highPriorityTasks.length} tasks
- In Progress: ${inProgressTasks.length} tasks ${inProgressTasks.length > 0 ? `(${inProgressTasks.slice(0, 2).map(t => `"${t.title}" for ${t.days_in_progress} days`).join(', ')})` : ''}
- Total tasks: ${tasks.filter(t => t.status !== 'done').length}

QUARTERLY GOALS:
${goals.length > 0 ? goals.map(g => `- ${g.title} (${g.progress || 0}% complete)`).join('\n') : '- No active goals set'}

MARKETING IDEAS (Approved but not executed):
${marketingIdeas.length > 0 ? marketingIdeas.slice(0, 5).map(i => `- ${i.title} (${i.idea_type})`).join('\n') : '- No approved ideas pending execution'}

SERVICES:
${services.length > 0 ? services.slice(0, 5).map(s => `- ${s.name}`).join('\n') : '- No services defined'}

UPCOMING MEETINGS:
${meetings.length > 0 ? meetings.map(m => {
  const meetingDate = new Date(m.date_time);
  const daysUntil = Math.ceil((meetingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return `- ${m.title} in ${daysUntil} days (${meetingDate.toLocaleDateString()})`;
}).join('\n') : '- No upcoming meetings scheduled'}

MARKETING FLOWCHART STATUS:
${channels.length > 0 ? channels.slice(0, 5).map(c => `- ${c.name}: ${c.status} (${c.progress || 0}% complete)`).join('\n') : '- No marketing channels defined'}

CUSTOMER AVATARS:
${avatars.length > 0 ? `
✅ ${avatars.length} AVATAR(S) EXIST - DO NOT SUGGEST AVATAR CREATION
${avatars.map(a => `- ${a.avatar_name}
  Demographics: ${a.demographics || 'Not specified'}
  Goals: ${a.goals || 'Not specified'}
  Pains: ${a.pains || 'Not specified'}`).join('\n')}
(Note: Customer avatars are already defined. Only suggest avatar work if there are specific gaps that need filling in existing avatars)
` : '❌ NO AVATARS DEFINED - This is a critical foundational gap that should be addressed'}

ASSETS:
- Total assets: ${assets.length}

Generate a JSON response with this EXACT structure:
{
  "context_summary": "Brief 1-2 sentence overview of current state",
  "priority_actions": [
    {
      "title": "Action-oriented title",
      "description": "Why this matters now (1-2 sentences)",
      "reason": "Strategic rationale",
      "link": "/path/to/action",
      "priority": "urgent" | "important" | "momentum"
    }
  ]
}

Important: 
- Return ONLY valid JSON, no other text
- Generate 3-5 actions maximum
- Use ONLY these exact routes:
  * /tasks - For task-related actions
  * /meetings - For meeting prep or scheduling
  * /marketing/profile - For quarterly goals, brand positioning, or strategy
  * /marketing/ideas - For marketing campaigns and ideas
  * /marketing/flowchart - For channel setup and marketing flow
  * /marketing/services - For service offerings
  * /marketing/tools - For marketing tools
  * /brand/guide - For brand guide, colors, fonts
  * /avatar - ONLY for creating a NEW avatar OR updating specific missing fields in existing avatar (do not suggest if avatars already exist)
  * /social-media - For social media calendar and posts
  * /brand/assets - For brand assets and files
- NEVER use routes like /goals, /quarterly-goals, or any route not listed above`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedPlan = JSON.parse(aiData.choices[0].message.content);

    console.log('✅ Action plan generated');

    // Store in database
    const today = new Date().toISOString().split('T')[0];
    const { data: savedPlan, error: saveError } = await supabaseClient
      .from('daily_action_plans')
      .insert({
        client_id,
        plan_date: today,
        priority_actions: generatedPlan.priority_actions,
        context_summary: generatedPlan.context_summary,
        data_snapshot: {
          tasks_count: tasks.length,
          overdue_count: overdueTasks.length,
          goals_count: goals.length,
          ideas_count: marketingIdeas.length,
          meetings_count: meetings.length
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving plan:', saveError);
      throw saveError;
    }

    console.log('💾 Plan saved to database');

    return new Response(
      JSON.stringify(savedPlan),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating action plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
