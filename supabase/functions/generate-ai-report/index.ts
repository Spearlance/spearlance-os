import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { AI_CHAT_URL, AI_MODELS, aiHeaders } from '../_shared/aiClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportConfig {
  client_id: string;
  report_type: 'performance_summary' | 'channel_deep_dive' | 'website_analytics' | 'seo_report';
  date_range_start: string;
  date_range_end: string;
  selected_channels?: string[];
  report_name?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const config: ReportConfig = await req.json();
    const { client_id, report_type, date_range_start, date_range_end, selected_channels, report_name } = config;

    if (!client_id || !report_type || !date_range_start || !date_range_end) {
      return new Response(
        JSON.stringify({ error: 'client_id, report_type, date_range_start, and date_range_end are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Generating ${report_type} report for client ${client_id}`);
    console.log(`📅 Date range: ${date_range_start} to ${date_range_end}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user from request
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      }).auth.getUser();
      userId = user?.id || null;
    }

    // Fetch client info
    const { data: client } = await supabaseClient
      .from('clients')
      .select('name, brand_name, industry, website_url')
      .eq('id', client_id)
      .single();

    // Gather data based on report type
    const dataSnapshot: Record<string, any> = {};
    let dataContext = '';

    // Fetch Channel KPIs
    if (report_type === 'performance_summary' || report_type === 'channel_deep_dive') {
      console.log('📈 Fetching channel KPIs...');
      
      let channelQuery = supabaseClient
        .from('channel_weekly_kpis')
        .select(`
          id,
          week_start_date,
          kpi_data,
          channel:marketing_flow_channels!inner(
            id,
            name,
            stage:marketing_flow_stages!inner(
              flow:marketing_flows!inner(client_id)
            )
          )
        `)
        .eq('channel.stage.flow.client_id', client_id)
        .gte('week_start_date', date_range_start)
        .lte('week_start_date', date_range_end)
        .order('week_start_date', { ascending: false });

      if (report_type === 'channel_deep_dive' && selected_channels?.length) {
        channelQuery = channelQuery.in('channel_id', selected_channels);
      }

      const { data: kpiData } = await channelQuery;
      
      if (kpiData && kpiData.length > 0) {
        dataSnapshot.channel_kpis = kpiData;
        
        // Group by channel for analysis
        const channelGroups: Record<string, any[]> = {};
        for (const kpi of kpiData) {
          const channelName = (kpi.channel as any)?.name || 'Unknown';
          if (!channelGroups[channelName]) channelGroups[channelName] = [];
          channelGroups[channelName].push(kpi);
        }

        dataContext += '\n\n## CHANNEL PERFORMANCE DATA:\n';
        for (const [channelName, kpis] of Object.entries(channelGroups)) {
          dataContext += `\n### ${channelName}:\n`;
          for (const kpi of kpis.slice(0, 4)) {
            const data = kpi.kpi_data || {};
            dataContext += `Week of ${kpi.week_start_date}:\n`;
            for (const [key, value] of Object.entries(data)) {
              if (value !== null && value !== undefined && value !== '') {
                dataContext += `  - ${key}: ${value}\n`;
              }
            }
          }
        }
      } else {
        dataContext += '\n\n## CHANNEL PERFORMANCE DATA:\nNo channel KPI data available for this period.\n';
      }
    }

    // Fetch Clarity/Website Analytics
    if (report_type === 'performance_summary' || report_type === 'website_analytics') {
      console.log('🌐 Fetching website analytics...');
      
      const { data: clarityData } = await supabaseClient
        .from('clarity_weekly_reports')
        .select('*')
        .eq('client_id', client_id)
        .gte('week_start_date', date_range_start)
        .lte('week_end_date', date_range_end)
        .order('week_start_date', { ascending: false });

      if (clarityData && clarityData.length > 0) {
        dataSnapshot.clarity_reports = clarityData;
        
        dataContext += '\n\n## WEBSITE ANALYTICS (Microsoft Clarity):\n';
        for (const report of clarityData.slice(0, 4)) {
          dataContext += `\nWeek: ${report.week_start_date} to ${report.week_end_date}:\n`;
          dataContext += `  - Total Sessions: ${report.total_sessions || 0}\n`;
          dataContext += `  - Distinct Users: ${report.total_distinct_users || 0}\n`;
          dataContext += `  - Avg Engagement Time: ${Math.round((report.avg_engagement_time_seconds || 0) / 60)} min\n`;
          dataContext += `  - Avg Pages/Session: ${(report.avg_pages_per_session || 0).toFixed(1)}\n`;
          dataContext += `  - Avg Scroll Depth: ${report.avg_scroll_depth || 0}%\n`;
          dataContext += `  - Rage Clicks: ${report.total_rage_clicks || 0}\n`;
          dataContext += `  - Dead Clicks: ${report.total_dead_clicks || 0}\n`;
          dataContext += `  - Quick Backs: ${report.total_quick_backs || 0}\n`;
          if (report.sessions_change_percent !== null) {
            dataContext += `  - Sessions WoW Change: ${report.sessions_change_percent > 0 ? '+' : ''}${report.sessions_change_percent}%\n`;
          }
        }
      } else {
        // Try daily metrics as fallback
        const { data: dailyMetrics } = await supabaseClient
          .from('clarity_daily_metrics')
          .select('*')
          .eq('client_id', client_id)
          .gte('metric_date', date_range_start)
          .lte('metric_date', date_range_end)
          .order('metric_date', { ascending: false });

        if (dailyMetrics && dailyMetrics.length > 0) {
          dataSnapshot.clarity_daily = dailyMetrics;
          
          const totalSessions = dailyMetrics.reduce((sum, d) => sum + (d.total_sessions || 0), 0);
          const totalUsers = dailyMetrics.reduce((sum, d) => sum + (d.distinct_users || 0), 0);
          const avgEngagement = dailyMetrics.reduce((sum, d) => sum + (d.engagement_time_seconds || 0), 0) / dailyMetrics.length;
          const totalRageClicks = dailyMetrics.reduce((sum, d) => sum + (d.rage_click_count || 0), 0);
          
          dataContext += '\n\n## WEBSITE ANALYTICS (Daily Aggregates):\n';
          dataContext += `  - Total Sessions: ${totalSessions}\n`;
          dataContext += `  - Total Distinct Users: ${totalUsers}\n`;
          dataContext += `  - Avg Daily Engagement: ${Math.round(avgEngagement / 60)} min\n`;
          dataContext += `  - Total Rage Clicks: ${totalRageClicks}\n`;
        } else {
          dataContext += '\n\n## WEBSITE ANALYTICS:\nNo website analytics data available for this period.\n';
        }
      }
    }

    // Fetch SEO Data
    if (report_type === 'performance_summary' || report_type === 'seo_report') {
      console.log('🔍 Fetching SEO data...');
      
      const { data: seoReports } = await supabaseClient
        .from('seo_reports')
        .select('*')
        .eq('client_id', client_id)
        .gte('report_date', date_range_start)
        .lte('report_date', date_range_end)
        .order('report_date', { ascending: false });

      const { data: seoKeywords } = await supabaseClient
        .from('seo_keywords')
        .select('*')
        .eq('client_id', client_id)
        .order('position', { ascending: true })
        .limit(20);

      if (seoReports && seoReports.length > 0) {
        dataSnapshot.seo_reports = seoReports;
        
        dataContext += '\n\n## SEO PERFORMANCE:\n';
        for (const report of seoReports.slice(0, 3)) {
          dataContext += `\nReport Date: ${report.report_date}:\n`;
          dataContext += `  - Visibility Score: ${report.visibility_score || 'N/A'}\n`;
          dataContext += `  - Avg Position: ${report.average_position || 'N/A'}\n`;
          dataContext += `  - Total Keywords: ${report.total_keywords || 'N/A'}\n`;
          dataContext += `  - Keywords in Top 10: ${report.keywords_in_top_10 || 'N/A'}\n`;
          dataContext += `  - Keywords in Top 3: ${report.keywords_in_top_3 || 'N/A'}\n`;
        }
      }

      if (seoKeywords && seoKeywords.length > 0) {
        dataSnapshot.seo_keywords = seoKeywords;
        
        dataContext += '\n\n### Top Keywords:\n';
        for (const kw of seoKeywords.slice(0, 10)) {
          const trend = kw.position_change 
            ? (kw.position_change > 0 ? `↓${kw.position_change}` : kw.position_change < 0 ? `↑${Math.abs(kw.position_change)}` : '→')
            : '→';
          dataContext += `  - "${kw.keyword}": Position ${kw.position || 'N/A'} ${trend}\n`;
        }
      }

      if (!seoReports?.length && !seoKeywords?.length) {
        dataContext += '\n\n## SEO PERFORMANCE:\nNo SEO data available for this period.\n';
      }
    }

    // Generate report with AI
    console.log('🤖 Generating AI report...');
    

    const reportTypeLabels: Record<string, string> = {
      'performance_summary': 'Marketing Performance Summary',
      'channel_deep_dive': 'Channel Deep Dive Analysis',
      'website_analytics': 'Website Analytics Report',
      'seo_report': 'SEO Performance Report'
    };

    const systemPrompt = `You are a senior marketing analyst creating a professional performance report for ${client?.brand_name || client?.name || 'the client'}.

Your job is to analyze the provided marketing data and create a comprehensive, actionable report.

REPORT STRUCTURE (use markdown formatting):
1. **Executive Summary** - 2-3 sentences highlighting the most important findings
2. **Key Wins & Highlights** - What's working well (use ✅ emoji)
3. **Areas of Concern** - Metrics trending down or issues identified (use ⚠️ emoji)
4. **Detailed Analysis** - Break down by channel/category with specific metrics
5. **Recommendations** - Specific, actionable next steps (use 💡 emoji)

FORMATTING RULES:
- Use clear headings with ## and ###
- Include specific numbers and percentages
- Calculate trends (WoW = Week over Week, MoM = Month over Month) when data allows
- Flag any concerning trends (>20% decline)
- Use bullet points for readability
- Be specific and actionable, not generic
- If data is missing for a category, note it briefly and move on

TONE:
- Professional but accessible
- Focus on insights, not just data regurgitation
- Prioritize actionable recommendations
- Be honest about concerning trends`;

    const userPrompt = `Create a ${reportTypeLabels[report_type]} for the period ${date_range_start} to ${date_range_end}.

CLIENT: ${client?.brand_name || client?.name || 'Client'}
INDUSTRY: ${client?.industry || 'Not specified'}

${dataContext}

Generate a comprehensive markdown report following the structure in your instructions. Focus on insights and actionable recommendations.`;

    const aiResponse = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify({
        model: AI_MODELS.TEXT,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', errorText);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const reportContent = aiData.choices[0].message.content;

    // Extract executive summary (first paragraph after # heading)
    const summaryMatch = reportContent.match(/##\s*Executive Summary\s*\n+([\s\S]*?)(?=\n##|\n\*\*|$)/i);
    const executiveSummary = summaryMatch ? summaryMatch[1].trim().slice(0, 500) : null;

    // Generate report name if not provided
    const generatedName = report_name || `${reportTypeLabels[report_type]} - ${new Date(date_range_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${new Date(date_range_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    // Save report to database
    console.log('💾 Saving report...');
    const { data: savedReport, error: saveError } = await supabaseClient
      .from('ai_generated_reports')
      .insert({
        client_id,
        report_type,
        report_name: generatedName,
        date_range_start,
        date_range_end,
        selected_channels: selected_channels || [],
        report_content: reportContent,
        executive_summary: executiveSummary,
        data_snapshot: dataSnapshot,
        created_by: userId
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving report:', saveError);
      throw saveError;
    }

    console.log('✅ Report generated and saved successfully');

    return new Response(
      JSON.stringify(savedReport),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate report';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
