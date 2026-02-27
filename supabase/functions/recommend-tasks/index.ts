import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { AI_CHAT_URL, AI_MODELS, aiHeaders } from '../_shared/aiClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaskRecommendation {
  title: string;
  description: string;
  source: string;
  priority: 'high' | 'normal' | 'low' | 'urgent';
  suggested_due_date: string;
  linked_entity_type: 'submission' | 'meeting' | 'communication' | 'social_post' | null;
  linked_entity_id: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_id } = await req.json();
    
    if (!client_id) {
      throw new Error('client_id is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Fetching data for client:', client_id);

    // Fetch all data sources in parallel
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      submissionsResult,
      upcomingMeetingsResult,
      recentMeetingsResult,
      communicationsResult,
      socialPostsResult,
      existingTasksResult
    ] = await Promise.all([
      // Unresponded form submissions (last 14 days)
      supabaseClient
        .from('website_form_submissions')
        .select('id, form_name, form_data, submitted_at, status')
        .eq('client_id', client_id)
        .neq('status', 'responded')
        .gte('submitted_at', fourteenDaysAgo.toISOString())
        .order('submitted_at', { ascending: false })
        .limit(10),

      // Upcoming meetings (next 7 days)
      supabaseClient
        .from('meetings')
        .select('id, attendees, date_time, summary, next_steps')
        .eq('client_id', client_id)
        .gte('date_time', now.toISOString())
        .lte('date_time', sevenDaysAhead.toISOString())
        .order('date_time', { ascending: true })
        .limit(10),

      // Recent meetings (past 7 days) - analyze ALL for action items
      supabaseClient
        .from('meetings')
        .select('id, attendees, date_time, summary, next_steps')
        .eq('client_id', client_id)
        .gte('date_time', sevenDaysAgo.toISOString())
        .lt('date_time', now.toISOString())
        .order('date_time', { ascending: false })
        .limit(10),

      // Communications needing follow-up (past 30 days)
      supabaseClient
        .from('communication_logs')
        .select('id, type, subject_line, participants, internal_notes, tags, created_at')
        .eq('client_id', client_id)
        .contains('tags', ['follow-up-required'])
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10),

      // Social media drafts and scheduled posts without media
      supabaseClient
        .from('social_media_posts')
        .select('id, status, scheduled_date, caption_text, image_url')
        .eq('client_id', client_id)
        .in('status', ['draft', 'scheduled'])
        .order('scheduled_date', { ascending: true })
        .limit(20),

      // Existing tasks (to avoid duplicates)
      supabaseClient
        .from('tasks')
        .select('id, title, status')
        .eq('client_id', client_id)
        .in('status', ['to_do', 'in_progress'])
        .limit(50)
    ]);

    if (submissionsResult.error) throw submissionsResult.error;
    if (upcomingMeetingsResult.error) throw upcomingMeetingsResult.error;
    if (recentMeetingsResult.error) throw recentMeetingsResult.error;
    if (communicationsResult.error) throw communicationsResult.error;
    if (socialPostsResult.error) throw socialPostsResult.error;
    if (existingTasksResult.error) throw existingTasksResult.error;

    const submissions = submissionsResult.data || [];
    const upcomingMeetings = upcomingMeetingsResult.data || [];
    const recentMeetings = recentMeetingsResult.data || [];
    const communications = communicationsResult.data || [];
    const socialPosts = socialPostsResult.data || [];
    const existingTasks = existingTasksResult.data || [];

    // Filter social posts
    const draftPosts = socialPosts.filter(p => p.status === 'draft');
    const scheduledPostsWithoutMedia = socialPosts.filter(p => p.status === 'scheduled' && !p.image_url);

    // Check recent meetings for follow-up communications
    const recentMeetingsWithoutFollowup: any[] = [];
    for (const meeting of recentMeetings) {
      const { data: followupComms, error: followupError } = await supabaseClient
        .from('communication_logs')
        .select('id')
        .eq('client_id', client_id)
        // Any communication created after the meeting counts as a follow-up
        .gte('created_at', meeting.date_time)
        .limit(1);

      if (followupError) {
        console.error('Error checking follow-up communications for meeting', meeting.id, followupError);
        // Fail open: don't block the whole function because of this one meeting
        continue;
      }
      
      if (!followupComms || followupComms.length === 0) {
        recentMeetingsWithoutFollowup.push(meeting);
      }
    }

    console.log('Data fetched:', {
      submissions: submissions.length,
      upcomingMeetings: upcomingMeetings.length,
      recentMeetingsWithoutFollowup: recentMeetingsWithoutFollowup.length,
      communications: communications.length,
      draftPosts: draftPosts.length,
      scheduledPostsWithoutMedia: scheduledPostsWithoutMedia.length,
      existingTasks: existingTasks.length
    });

    // Calculate days ago helper
    const daysAgo = (dateStr: string) => {
      const date = new Date(dateStr);
      const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      return days;
    };

    const daysUntil = (dateStr: string) => {
      const date = new Date(dateStr);
      const days = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return days;
    };

    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Build AI prompt
    const systemPrompt = `You are a task recommendation AI for a marketing agency. 
Your job is to analyze recent client activity and suggest specific, actionable tasks.

RULES:
- Generate 3-5 task suggestions maximum
- Each task must be specific and actionable (not vague)
- Prioritize high-impact, time-sensitive items
- Do NOT suggest tasks that already exist in the task list
- Focus on follow-ups, deadlines, and opportunities being missed
- Tasks should be completable within 1-2 hours each
- Return ONLY valid JSON, no additional text

AGGREGATION RULES:
- When there are 3+ similar items (form submissions, draft posts, scheduled posts, communications), create ONE aggregated task
- Example: "Follow up with 4 recent form submissions from this week" instead of 4 separate tasks
- EXCEPTION: Meeting next_steps are NOT aggregated - each distinct action item becomes its own task
- Only create individual tasks for particularly urgent items (>7 days old, VIP contact, etc.)
- Ensure variety across data sources: don't create tasks only from one category
- Maximum 1-2 aggregated tasks per data source category (forms, posts, communications)

PROJECT MANAGEMENT MINDSET:
- Think like a Project Manager and Client Success Manager
- Extract explicit action items from meeting next_steps
- Identify implicit commitments from meeting summaries
- Anticipate gaps: what follow-through is missing?
- Proactively suggest tasks to keep projects moving forward
- Consider dependencies: what needs to happen before other things can proceed?
- Flag risks: deadlines approaching, deliverables not started, etc.

MEETING ANALYSIS RULES:
- If a meeting has next_steps listed, create a SEPARATE specific task for EACH distinct actionable item
- Do NOT aggregate meeting action items together - each should be its own task
- If next_steps are vague ("follow up"), make them specific with context from the summary
- If a meeting summary mentions deliverables or decisions, ensure tasks exist to execute them
- For recent meetings (<3 days old), prioritize creating tasks from next_steps immediately
- Look for patterns: repeated topics without progress = create escalation/review task
- It's okay to generate 3-5 tasks from a single meeting if there are that many action items

GOOD EXAMPLES:
✅ "Follow up with 4 recent form submissions (submitted 2-5 days ago)"
✅ "Prepare agenda for client meeting with Sarah Johnson on Nov 5"
✅ "Review and approve 3 pending social media posts for this week"
✅ "Send follow-up emails for 2 meetings from last week"
✅ "Create project timeline for website redesign discussed in meeting with [Client]"
✅ "Send follow-up email with pricing options mentioned in discovery call"
✅ "Schedule content review session (next step from Monday's meeting)"
✅ "Draft proposal for social media strategy outlined in meeting notes"
✅ "Update job schema markup on service pages (from Weekly Marketing Meeting)"
✅ "Implement internal linking strategy between blog posts (from Weekly Marketing Meeting)"
✅ "Create location-specific landing pages for new markets (from Weekly Marketing Meeting)"

BAD EXAMPLES:
❌ "Work on marketing" (too vague)
❌ "Update website" (too broad)
❌ "Check emails" (not specific)
❌ Creating 4 separate "Follow up with..." tasks for form submissions

Return JSON in this exact format:
{
  "recommendations": [
    {
      "title": "Task title (max 80 chars)",
      "description": "Why this task is needed and what it involves (max 200 chars)",
      "source": "Where this task came from (e.g., 'Form submission: Robert Patrick', 'Upcoming meeting')",
      "priority": "urgent" | "high" | "normal" | "low",
      "suggested_due_date": "YYYY-MM-DD",
      "linked_entity_type": "submission" | "meeting" | "communication" | "social_post" | null,
      "linked_entity_id": "uuid or null"
    }
  ]
}`;

    let userPrompt = 'CURRENT DATE: ' + now.toISOString().split('T')[0] + '\\n\\n';

    if (submissions.length > 0) {
      userPrompt += `RECENT FORM SUBMISSIONS (${submissions.length} unresponded in past 14 days):\n`;
      userPrompt += submissions.map(s => {
        const firstName = s.form_data?.['First Name'] || s.form_data?.['first_name'] || '';
        const lastName = s.form_data?.['Last Name'] || s.form_data?.['last_name'] || '';
        const contactName = `${firstName} ${lastName}`.trim() || 'Unknown';
        return `- ${contactName} (${s.form_name}) - submitted ${daysAgo(s.submitted_at)} days ago [ID: ${s.id}]`;
      }).join('\n') + '\n\n';
    }

    if (upcomingMeetings.length > 0) {
      userPrompt += `UPCOMING MEETINGS (${upcomingMeetings.length} in next 7 days):\n`;
      upcomingMeetings.forEach(m => {
        userPrompt += `\n- ${m.attendees || 'TBD'} on ${formatDate(m.date_time)} (in ${daysUntil(m.date_time)} days) [ID: ${m.id}]\n`;
        if (typeof m.summary === 'string' && m.summary.trim()) {
          userPrompt += `  Summary: ${m.summary.substring(0, 200)}${m.summary.length > 200 ? '...' : ''}\n`;
        } else {
          userPrompt += `  ⚠️ No agenda/prep notes yet\n`;
        }
        if (typeof m.next_steps === 'string' && m.next_steps.trim()) {
          userPrompt += `  Next Steps: ${m.next_steps.substring(0, 200)}${m.next_steps.length > 200 ? '...' : ''}\n`;
        }
      });
      userPrompt += '\n';
    }

    if (recentMeetings.length > 0) {
      userPrompt += `RECENT MEETINGS (${recentMeetings.length} in past 7 days - analyze for action items):\n`;
      for (const m of recentMeetings) {
        const hasFollowup = !recentMeetingsWithoutFollowup.some(mwf => mwf.id === m.id);
        userPrompt += `\n- ${m.attendees || 'unknown'} on ${formatDate(m.date_time)} (${daysAgo(m.date_time)} days ago) ${!hasFollowup ? '⚠️ No follow-up logged' : ''} [ID: ${m.id}]\n`;
        
        if (typeof m.summary === 'string' && m.summary.trim()) {
          userPrompt += `  Summary: ${m.summary.substring(0, 300)}${m.summary.length > 300 ? '...' : ''}\n`;
        }
        
        if (typeof m.next_steps === 'string' && m.next_steps.trim()) {
          userPrompt += `  Next Steps: ${m.next_steps.substring(0, 300)}${m.next_steps.length > 300 ? '...' : ''}\n`;
        }
      }
      userPrompt += '\n';
    }

    if (communications.length > 0) {
      userPrompt += `COMMUNICATIONS NEEDING FOLLOW-UP (${communications.length} pending):\n`;
      userPrompt += communications.map(c => {
        const getContactName = (participants: any) => {
          if (!participants || participants.length === 0) return 'Unknown';
          const contact = participants.find((p: any) => p.role === 'from' || p.role === 'recipient');
          return contact?.name || 'Unknown';
        };
        return `- ${getContactName(c.participants)} (${c.type}) on ${formatDate(c.created_at)} - "${c.internal_notes?.substring(0, 50) || c.subject_line?.substring(0, 50) || 'No notes'}" [ID: ${c.id}]`;
      }).join('\n') + '\n\n';
    }

    if (draftPosts.length > 0 || scheduledPostsWithoutMedia.length > 0) {
      userPrompt += 'SOCIAL MEDIA POSTS:\\n';

      if (draftPosts.length > 0) {
        userPrompt += `- ${draftPosts.length} draft posts awaiting review\\n`;
      }
      if (scheduledPostsWithoutMedia.length > 0) {
        userPrompt += `- ${scheduledPostsWithoutMedia.length} scheduled posts missing images\\n`;
      }
      userPrompt += '\\n';
    }

    if (existingTasks.length > 0) {
      userPrompt += 'EXISTING TASKS (Do NOT duplicate):\\n';
      userPrompt += existingTasks.slice(0, 20).map(t => `- ${t.title}`).join('\\n') + '\\n\\n';
    }

    // Check if there's any data to analyze
    const hasData = submissions.length > 0 || upcomingMeetings.length > 0 || 
                    recentMeetingsWithoutFollowup.length > 0 || communications.length > 0 || 
                    draftPosts.length > 0 || scheduledPostsWithoutMedia.length > 0;

    if (!hasData) {
      console.log('No data found to generate recommendations');
      return new Response(
        JSON.stringify({ 
          success: true,
          recommendations: [],
          message: 'No recent activity found to generate task recommendations. Great job staying on top of everything!'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    userPrompt += 'IMPORTANT: Group similar items (form submissions, social posts, communications) into single aggregated tasks. Create diverse recommendations across different categories.\n\n';
    userPrompt += 'CRITICAL: For meetings - create a SEPARATE task for EACH distinct action item from next_steps. Do NOT combine multiple meeting action items into one task. Analyze meeting summaries deeply to extract specific tasks. Identify implicit commitments. Think proactively about what needs to happen next to keep projects moving forward.\n\n';
    userPrompt += 'Generate task recommendations based on the above data. Focus on the most urgent and impactful tasks.';

    console.log('Calling AI...');

    // Call AI
    const aiResponse = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify({
        model: AI_MODELS.TEXT,
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
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices[0].message.content;
    
    console.log('AI response received');

    let recommendations: TaskRecommendation[];
    try {
      const parsed = JSON.parse(content);
      recommendations = parsed.recommendations || [];
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response');
    }

    console.log(`Generated ${recommendations.length} recommendations`);

    return new Response(
      JSON.stringify({ 
        success: true,
        recommendations: recommendations,
        count: recommendations.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in recommend-tasks:', error);

    let message = 'Unknown error';
    if (error instanceof Error) {
      message = error.message;
    } else if (error && typeof error === 'object') {
      // Supabase/Postgrest errors are plain objects with .message
      const maybeMessage = (error as any).message;
      if (typeof maybeMessage === 'string') {
        message = maybeMessage;
      } else {
        try {
          message = JSON.stringify(error);
        } catch {
          // keep 'Unknown error'
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        error: message,
        success: false,
        recommendations: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
