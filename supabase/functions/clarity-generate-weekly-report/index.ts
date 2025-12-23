import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeeklyMetrics {
  totalSessions: number;
  distinctUsers: number;
  avgPagesPerSession: number;
  avgScrollDepth: number;
  avgEngagementTime: number;
  totalRageClicks: number;
  totalDeadClicks: number;
  totalQuickBacks: number;
  totalJsErrors: number;
  daysWithData: number;
}

function aggregateMetrics(metrics: any[]): WeeklyMetrics {
  if (!metrics || metrics.length === 0) {
    return {
      totalSessions: 0,
      distinctUsers: 0,
      avgPagesPerSession: 0,
      avgScrollDepth: 0,
      avgEngagementTime: 0,
      totalRageClicks: 0,
      totalDeadClicks: 0,
      totalQuickBacks: 0,
      totalJsErrors: 0,
      daysWithData: 0,
    };
  }

  const daysWithData = metrics.length;
  
  return {
    totalSessions: metrics.reduce((sum, m) => sum + (m.total_sessions || 0), 0),
    distinctUsers: metrics.reduce((sum, m) => sum + (m.distinct_users || 0), 0),
    avgPagesPerSession: metrics.reduce((sum, m) => sum + (m.pages_per_session || 0), 0) / daysWithData,
    avgScrollDepth: metrics.reduce((sum, m) => sum + (m.scroll_depth || 0), 0) / daysWithData,
    avgEngagementTime: metrics.reduce((sum, m) => sum + (m.engagement_time_seconds || 0), 0) / daysWithData,
    totalRageClicks: metrics.reduce((sum, m) => sum + (m.rage_click_count || 0), 0),
    totalDeadClicks: metrics.reduce((sum, m) => sum + (m.dead_click_count || 0), 0),
    totalQuickBacks: metrics.reduce((sum, m) => sum + (m.quick_back_count || 0), 0),
    totalJsErrors: metrics.reduce((sum, m) => sum + (m.javascript_error_count || 0), 0),
    daysWithData,
  };
}

function calculatePercentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

async function generateAIInsights(
  current: WeeklyMetrics,
  previous: WeeklyMetrics | null,
  clientName: string
): Promise<string> {
  const openAIKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIKey) {
    console.log('No OpenAI key, generating basic insights');
    return generateBasicInsights(current, previous);
  }

  try {
    const sessionsChange = previous ? calculatePercentChange(current.totalSessions, previous.totalSessions) : null;
    const usersChange = previous ? calculatePercentChange(current.distinctUsers, previous.distinctUsers) : null;
    
    const prompt = `Analyze this website behavior data for ${clientName} and provide 3-4 concise, actionable insights:

This Week's Metrics (${current.daysWithData} days of data):
- Total Sessions: ${current.totalSessions}${sessionsChange !== null ? ` (${sessionsChange > 0 ? '+' : ''}${sessionsChange}% vs last week)` : ''}
- Unique Visitors: ${current.distinctUsers}${usersChange !== null ? ` (${usersChange > 0 ? '+' : ''}${usersChange}% vs last week)` : ''}
- Avg Pages/Session: ${current.avgPagesPerSession.toFixed(1)}
- Avg Scroll Depth: ${current.avgScrollDepth.toFixed(0)}%
- Avg Engagement Time: ${Math.round(current.avgEngagementTime)} seconds

Behavioral Signals (potential UX issues):
- Rage Clicks: ${current.totalRageClicks} (users clicking repeatedly in frustration)
- Dead Clicks: ${current.totalDeadClicks} (clicks on non-interactive elements)
- Quick Backs: ${current.totalQuickBacks} (users leaving pages quickly)
- JavaScript Errors: ${current.totalJsErrors}

${previous ? `Last Week: ${previous.totalSessions} sessions, ${previous.distinctUsers} visitors, ${previous.totalRageClicks} rage clicks, ${previous.totalDeadClicks} dead clicks` : 'No previous week data available.'}

Provide brief, actionable insights focusing on:
1. Traffic trends and what they might indicate
2. User engagement quality
3. UX issues that need attention (based on rage clicks, dead clicks, etc.)
4. One specific recommendation

Keep the response under 200 words and use bullet points.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a web analytics expert providing concise, actionable insights for small business owners. Focus on practical recommendations.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text());
      return generateBasicInsights(current, previous);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || generateBasicInsights(current, previous);
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return generateBasicInsights(current, previous);
  }
}

function generateBasicInsights(current: WeeklyMetrics, previous: WeeklyMetrics | null): string {
  const insights: string[] = [];
  
  // Traffic summary
  insights.push(`• **Traffic:** ${current.totalSessions.toLocaleString()} sessions from ${current.distinctUsers.toLocaleString()} unique visitors over ${current.daysWithData} days.`);
  
  // Week-over-week comparison
  if (previous && previous.totalSessions > 0) {
    const sessionsChange = calculatePercentChange(current.totalSessions, previous.totalSessions);
    if (sessionsChange !== null) {
      const trend = sessionsChange > 0 ? '↑' : sessionsChange < 0 ? '↓' : '→';
      insights.push(`• **Trend:** Sessions ${trend} ${Math.abs(sessionsChange)}% compared to last week.`);
    }
  }
  
  // Engagement
  insights.push(`• **Engagement:** Users view ${current.avgPagesPerSession.toFixed(1)} pages per session, scroll ${current.avgScrollDepth.toFixed(0)}% of pages, and spend ${Math.round(current.avgEngagementTime)} seconds on average.`);
  
  // UX signals
  const totalIssues = current.totalRageClicks + current.totalDeadClicks + current.totalQuickBacks;
  if (totalIssues > 0) {
    insights.push(`• **UX Signals:** ${current.totalRageClicks} rage clicks, ${current.totalDeadClicks} dead clicks, ${current.totalQuickBacks} quick-backs detected. ${totalIssues > 50 ? 'Consider reviewing user recordings for friction points.' : ''}`);
  }
  
  if (current.totalJsErrors > 0) {
    insights.push(`• **Errors:** ${current.totalJsErrors} JavaScript errors recorded. Check browser console for details.`);
  }
  
  return insights.join('\n\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('Starting weekly Clarity report generation...');

    // Check if a specific client_id was passed (for manual generation)
    let targetClientId: string | null = null;
    try {
      const body = await req.json();
      targetClientId = body?.client_id || null;
    } catch {
      // No body or invalid JSON, continue with all clients
    }

    // Calculate date ranges
    const today = new Date();
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() - 1); // Yesterday
    
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6); // 7 days including yesterday
    
    const prevWeekEnd = new Date(weekStart);
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
    
    const prevWeekStart = new Date(prevWeekEnd);
    prevWeekStart.setDate(prevWeekStart.getDate() - 6);

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    const prevWeekStartStr = prevWeekStart.toISOString().split('T')[0];
    const prevWeekEndStr = prevWeekEnd.toISOString().split('T')[0];

    console.log(`Current week: ${weekStartStr} to ${weekEndStr}`);
    console.log(`Previous week: ${prevWeekStartStr} to ${prevWeekEndStr}`);

    // Get active Clarity configs with client info
    let query = supabase
      .from('clarity_configs')
      .select('*, clients(id, name, website_url)')
      .eq('is_active', true);
    
    if (targetClientId) {
      query = query.eq('client_id', targetClientId);
      console.log(`Manual report requested for client: ${targetClientId}`);
    }

    const { data: configs, error: configError } = await query;

    if (configError) {
      throw new Error(`Error fetching configs: ${configError.message}`);
    }

    if (!configs || configs.length === 0) {
      console.log('No active Clarity configurations found');
      return new Response(
        JSON.stringify({ success: true, message: 'No active configurations', generated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${configs.length} client(s)`);

    const results = {
      generated: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const config of configs) {
      try {
        const clientId = config.client_id;
        const clientName = config.clients?.name || 'Unknown Client';
        
        console.log(`Generating report for: ${clientName}`);

        // Fetch current week metrics
        const { data: currentMetrics, error: currentError } = await supabase
          .from('clarity_daily_metrics')
          .select('*')
          .eq('client_id', clientId)
          .gte('metric_date', weekStartStr)
          .lte('metric_date', weekEndStr);

        if (currentError) throw currentError;

        // Fetch previous week metrics
        const { data: prevMetrics, error: prevError } = await supabase
          .from('clarity_daily_metrics')
          .select('*')
          .eq('client_id', clientId)
          .gte('metric_date', prevWeekStartStr)
          .lte('metric_date', prevWeekEndStr);

        if (prevError) throw prevError;

        // Aggregate metrics
        const currentAgg = aggregateMetrics(currentMetrics || []);
        const prevAgg = prevMetrics && prevMetrics.length > 0 ? aggregateMetrics(prevMetrics) : null;

        // Skip if no data for current week
        if (currentAgg.daysWithData === 0) {
          console.log(`No data for current week, skipping ${clientName}`);
          continue;
        }

        // Generate AI insights
        const aiInsights = await generateAIInsights(currentAgg, prevAgg, clientName);

        // Calculate week-over-week changes
        const sessionsChange = prevAgg ? calculatePercentChange(currentAgg.totalSessions, prevAgg.totalSessions) : null;
        const usersChange = prevAgg ? calculatePercentChange(currentAgg.distinctUsers, prevAgg.distinctUsers) : null;
        const engagementChange = prevAgg ? calculatePercentChange(currentAgg.avgEngagementTime, prevAgg.avgEngagementTime) : null;

        // Insert into clarity_weekly_reports
        const { error: reportError } = await supabase
          .from('clarity_weekly_reports')
          .upsert(
            {
              client_id: clientId,
              week_start_date: weekStartStr,
              week_end_date: weekEndStr,
              total_sessions: currentAgg.totalSessions,
              total_distinct_users: currentAgg.distinctUsers,
              avg_pages_per_session: currentAgg.avgPagesPerSession,
              avg_scroll_depth: currentAgg.avgScrollDepth,
              avg_engagement_time_seconds: currentAgg.avgEngagementTime,
              total_rage_clicks: currentAgg.totalRageClicks,
              total_dead_clicks: currentAgg.totalDeadClicks,
              total_quick_backs: currentAgg.totalQuickBacks,
              total_js_errors: currentAgg.totalJsErrors,
              sessions_change_percent: sessionsChange,
              users_change_percent: usersChange,
              engagement_change_percent: engagementChange,
              ai_insights: aiInsights,
            },
            { onConflict: 'client_id,week_start_date' }
          );

        if (reportError) throw reportError;

        // Create entry in reports table
        const reportName = `Clarity Weekly Report - Last 7 Days (${weekStartStr} to ${weekEndStr})`;
        const reportSummary = `${currentAgg.totalSessions.toLocaleString()} sessions | ${currentAgg.distinctUsers.toLocaleString()} visitors | ${currentAgg.totalRageClicks + currentAgg.totalDeadClicks} UX signals`;

        const { error: mainReportError } = await supabase
          .from('reports')
          .insert({
            client_id: clientId,
            name: reportName,
            summary: reportSummary,
            date_range_start: weekStartStr,
            date_range_end: weekEndStr,
            oviond_url: `https://clarity.microsoft.com/projects/${config.project_id}`,
            tags: ['clarity', 'weekly', 'auto-generated'],
            status: 'Active',
          });

        if (mainReportError) {
          console.error('Error creating main report entry:', mainReportError);
          // Don't throw - the weekly report was still created
        } else {
          console.log(`Created report entry for ${clientName}`);
        }

        results.generated++;
        console.log(`Successfully generated weekly report for ${clientName}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error generating report for client ${config.client_id}:`, error);
        results.failed++;
        results.errors.push(`Client ${config.client_id}: ${errorMessage}`);
      }
    }

    console.log('Weekly report generation completed:', results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        weekRange: `${weekStartStr} to ${weekEndStr}`,
        ...results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in weekly report generation:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
