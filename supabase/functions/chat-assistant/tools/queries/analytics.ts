import { sanitizeDataForPrompt } from '../../validation/sanitize.ts';

// Get website analytics (traffic, sources, conversions)
export async function getWebsiteAnalytics(supabase: any, params: any, clientId: string) {
  const metricType = params.metric_type || 'overview';

  // Default to last 30 days if no date range specified
  const dateFrom = params.date_from || new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];
  const dateTo = params.date_to || new Date().toISOString().split('T')[0];

  try {
    if (metricType === 'overview') {
      // Get aggregated overview metrics
      const { data: pageData } = await supabase
        .from('page_daily')
        .select('unique_sessions, total_pageviews, total_engaged_seconds')
        .eq('client_id', clientId)
        .gte('day', dateFrom)
        .lte('day', dateTo);

      const { data: sourceData } = await supabase
        .from('sources_daily')
        .select('source, sessions')
        .eq('client_id', clientId)
        .gte('day', dateFrom)
        .lte('day', dateTo)
        .order('sessions', { ascending: false })
        .limit(1);

      const { data: contentData } = await supabase
        .from('content_daily')
        .select('content_type, total_views')
        .eq('client_id', clientId)
        .gte('day', dateFrom)
        .lte('day', dateTo)
        .order('total_views', { ascending: false })
        .limit(1);

      // Aggregate metrics
      let totalSessions = 0, totalPageviews = 0, totalEngagedSeconds = 0;

      (pageData || []).forEach((row: any) => {
        totalSessions += row.unique_sessions || 0;
        totalPageviews += row.total_pageviews || 0;
        totalEngagedSeconds += row.total_engaged_seconds || 0;
      });

      const avgEngagementTime = totalSessions > 0 ? Math.round(totalEngagedSeconds / totalSessions) : 0;

      return {
        period: { start: dateFrom, end: dateTo },
        unique_visitors: totalSessions,
        total_pageviews: totalPageviews,
        avg_engagement_seconds: avgEngagementTime,
        top_traffic_source: sourceData?.[0]?.source || 'N/A',
        top_content_type: contentData?.[0]?.content_type || 'N/A'
      };

    } else if (metricType === 'pages') {
      const limit = Math.min(params.limit || 20, 50);
      const offset = params.offset || 0;

      const { data, count } = await supabase
        .from('page_daily')
        .select('page_path, total_pageviews, unique_sessions, total_engaged_seconds, entry_sessions', { count: 'exact' })
        .eq('client_id', clientId)
        .gte('day', dateFrom)
        .lte('day', dateTo)
        .order('total_pageviews', { ascending: false })
        .range(offset, offset + limit - 1);

      // Aggregate by page_path
      const pageMap = new Map();
      (data || []).forEach((row: any) => {
        if (!pageMap.has(row.page_path)) {
          pageMap.set(row.page_path, {
            path: row.page_path,
            pageviews: 0,
            sessions: 0,
            engaged_seconds: 0,
            entries: 0
          });
        }
        const page = pageMap.get(row.page_path);
        page.pageviews += row.total_pageviews || 0;
        page.sessions += row.unique_sessions || 0;
        page.engaged_seconds += row.total_engaged_seconds || 0;
        page.entries += row.entry_sessions || 0;
      });

      const pages = Array.from(pageMap.values())
        .sort((a, b) => b.pageviews - a.pageviews)
        .map(p => ({
          path: p.path,
          total_pageviews: p.pageviews,
          unique_sessions: p.sessions,
          avg_engaged_seconds: p.sessions > 0 ? Math.round(p.engaged_seconds / p.sessions) : 0,
          entry_sessions: p.entries
        }));

      return {
        items: sanitizeDataForPrompt(pages),
        result_count: pages.length,
        total_count: count || 0,
        next_offset: pages.length >= limit ? offset + limit : null
      };

    } else if (metricType === 'sources') {
      const limit = Math.min(params.limit || 20, 50);
      const offset = params.offset || 0;

      const { data, count } = await supabase
        .from('sources_daily')
        .select('source, medium, sessions, pageviews', { count: 'exact' })
        .eq('client_id', clientId)
        .gte('day', dateFrom)
        .lte('day', dateTo)
        .order('sessions', { ascending: false })
        .range(offset, offset + limit - 1);

      // Aggregate by source/medium
      const sourceMap = new Map();
      (data || []).forEach((row: any) => {
        const key = `${row.source}/${row.medium}`;
        if (!sourceMap.has(key)) {
          sourceMap.set(key, {
            source: row.source,
            medium: row.medium,
            sessions: 0,
            pageviews: 0
          });
        }
        const src = sourceMap.get(key);
        src.sessions += row.sessions || 0;
        src.pageviews += row.pageviews || 0;
      });

      const sources = Array.from(sourceMap.values())
        .sort((a, b) => b.sessions - a.sessions);

      return {
        items: sanitizeDataForPrompt(sources),
        result_count: sources.length,
        total_count: count || 0,
        next_offset: sources.length >= limit ? offset + limit : null
      };

    } else if (metricType === 'content') {
      const limit = Math.min(params.limit || 20, 50);
      const offset = params.offset || 0;

      const { data, count } = await supabase
        .from('content_daily')
        .select('content_type, content_slug, total_views, unique_visitors, entry_sessions', { count: 'exact' })
        .eq('client_id', clientId)
        .gte('day', dateFrom)
        .lte('day', dateTo)
        .order('total_views', { ascending: false })
        .range(offset, offset + limit - 1);

      // Aggregate by content
      const contentMap = new Map();
      (data || []).forEach((row: any) => {
        const key = `${row.content_type}:${row.content_slug}`;
        if (!contentMap.has(key)) {
          contentMap.set(key, {
            content_type: row.content_type,
            slug: row.content_slug,
            views: 0,
            visitors: 0,
            entries: 0
          });
        }
        const content = contentMap.get(key);
        content.views += row.total_views || 0;
        content.visitors += row.unique_visitors || 0;
        content.entries += row.entry_sessions || 0;
      });

      const content = Array.from(contentMap.values())
        .sort((a, b) => b.views - a.views);

      return {
        items: sanitizeDataForPrompt(content),
        result_count: content.length,
        total_count: count || 0,
        next_offset: content.length >= limit ? offset + limit : null
      };
    }

    return { error: 'Invalid metric_type' };
  } catch (error: any) {
    console.error('Website analytics error:', error);
    throw error;
  }
}

// Get channel weekly KPI data with trend analysis
export async function getChannelKPIs(supabase: any, params: any, clientId: string) {
  try {
    const {
      channel_id,
      weeks = 4,
      date_from,
      date_to
    } = params;

    // Get the marketing flow for this client
    const { data: flow } = await supabase
      .from('marketing_flows')
      .select('id')
      .eq('client_id', clientId)
      .maybeSingle();

    if (!flow) {
      return { items: [], result_count: 0, message: 'No marketing flow found' };
    }

    // Build query to get channels with their KPIs
    let query = supabase
      .from('channel_weekly_kpis')
      .select(`
        id,
        week_start_date,
        kpi_data,
        channel:marketing_flow_channels!inner(
          id,
          name,
          channel_type,
          stage:marketing_flow_stages!inner(
            id,
            name,
            flow_id
          )
        )
      `)
      .eq('channel.stage.flow_id', flow.id)
      .order('week_start_date', { ascending: false })
      .limit(weeks * 20); // Get enough for all channels

    if (channel_id) {
      query = query.eq('channel_id', channel_id);
    }

    if (date_from) {
      query = query.gte('week_start_date', date_from);
    }

    if (date_to) {
      query = query.lte('week_start_date', date_to);
    }

    const { data: kpis, error } = await query;
    if (error) throw error;

    // Group by channel and calculate trends
    const channelData: Record<string, any> = {};

    for (const kpi of kpis || []) {
      const channelId = kpi.channel?.id;
      if (!channelId) continue;

      if (!channelData[channelId]) {
        channelData[channelId] = {
          channel_id: channelId,
          channel_name: kpi.channel?.name,
          channel_type: kpi.channel?.channel_type,
          stage_name: kpi.channel?.stage?.name,
          weekly_data: [],
          trends: {}
        };
      }

      channelData[channelId].weekly_data.push({
        week_start_date: kpi.week_start_date,
        kpi_data: kpi.kpi_data
      });
    }

    // Calculate WoW trends for each channel
    const results = Object.values(channelData).map((channel: any) => {
      // Sort by date descending
      channel.weekly_data.sort((a: any, b: any) =>
        new Date(b.week_start_date).getTime() - new Date(a.week_start_date).getTime()
      );

      const current = channel.weekly_data[0]?.kpi_data || {};
      const previous = channel.weekly_data[1]?.kpi_data || {};

      // Calculate trends for key metrics
      const trends: Record<string, any> = {};
      const kpiKeys = Object.keys(current);

      for (const key of kpiKeys) {
        const currentVal = parseFloat(current[key]) || 0;
        const previousVal = parseFloat(previous[key]) || 0;

        if (previousVal > 0) {
          const change = ((currentVal - previousVal) / previousVal) * 100;
          trends[key] = {
            current: currentVal,
            previous: previousVal,
            change_percent: Math.round(change * 10) / 10,
            direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
            alert: Math.abs(change) > 20 ? (change < 0 ? 'declining' : 'growing') : null
          };
        } else {
          trends[key] = {
            current: currentVal,
            previous: previousVal,
            change_percent: null,
            direction: 'new',
            alert: null
          };
        }
      }

      channel.trends = trends;
      channel.latest_week = channel.weekly_data[0]?.week_start_date;
      channel.weeks_of_data = channel.weekly_data.length;

      return channel;
    });

    // Identify alerts (metrics declining significantly)
    const alerts = results.flatMap((channel: any) => {
      return Object.entries(channel.trends)
        .filter(([_, trend]: [string, any]) => trend.alert === 'declining')
        .map(([metric, trend]: [string, any]) => ({
          channel_name: channel.channel_name,
          metric,
          change_percent: trend.change_percent,
          severity: Math.abs(trend.change_percent) > 30 ? 'high' : 'medium'
        }));
    });

    return {
      items: sanitizeDataForPrompt(results),
      result_count: results.length,
      alerts: alerts.length > 0 ? alerts : null,
      summary: {
        total_channels_tracked: results.length,
        channels_with_declining_metrics: alerts.length,
        weeks_analyzed: weeks
      }
    };

  } catch (error: any) {
    console.error('Get channel KPIs error:', error);
    throw error;
  }
}

// Get Clarity website analytics with behavioral insights
export async function getClarityMetrics(supabase: any, params: any, clientId: string) {
  try {
    const {
      date_from,
      date_to,
      metric_type = 'overview' // overview, behavioral, timeline
    } = params;

    // Default to last 30 days
    const endDate = date_to || new Date().toISOString().split('T')[0];
    const startDate = date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Check if Clarity is configured
    const { data: clarityConfig } = await supabase
      .from('clarity_configs')
      .select('id, project_id, last_synced_at')
      .eq('client_id', clientId)
      .maybeSingle();

    if (!clarityConfig) {
      return {
        items: [],
        result_count: 0,
        message: 'Clarity analytics not configured for this client',
        is_configured: false
      };
    }

    if (metric_type === 'overview' || metric_type === 'behavioral') {
      // Get daily metrics
      const { data: dailyMetrics, error } = await supabase
        .from('clarity_daily_metrics')
        .select('*')
        .eq('client_id', clientId)
        .gte('metric_date', startDate)
        .lte('metric_date', endDate)
        .order('metric_date', { ascending: true });

      if (error) throw error;

      if (!dailyMetrics || dailyMetrics.length === 0) {
        return {
          items: [],
          result_count: 0,
          message: 'No Clarity data available for the selected date range',
          is_configured: true,
          last_synced: clarityConfig.last_synced_at
        };
      }

      // Calculate aggregates
      const totals = dailyMetrics.reduce((acc: any, day: any) => ({
        sessions: (acc.sessions || 0) + (day.total_sessions || 0),
        users: (acc.users || 0) + (day.distinct_users || 0),
        engagement_time: (acc.engagement_time || 0) + (day.engagement_time_seconds || 0),
        rage_clicks: (acc.rage_clicks || 0) + (day.rage_click_count || 0),
        dead_clicks: (acc.dead_clicks || 0) + (day.dead_click_count || 0),
        quick_backs: (acc.quick_backs || 0) + (day.quick_back_count || 0),
        js_errors: (acc.js_errors || 0) + (day.javascript_error_count || 0)
      }), {});

      // Calculate averages
      const dayCount = dailyMetrics.length;
      const avgScrollDepth = dailyMetrics.reduce((sum: number, d: any) => sum + (d.scroll_depth || 0), 0) / dayCount;
      const avgPagesPerSession = dailyMetrics.reduce((sum: number, d: any) => sum + (d.pages_per_session || 0), 0) / dayCount;

      // Calculate WoW comparison
      const midpoint = Math.floor(dailyMetrics.length / 2);
      const firstHalf = dailyMetrics.slice(0, midpoint);
      const secondHalf = dailyMetrics.slice(midpoint);

      const firstHalfSessions = firstHalf.reduce((sum: number, d: any) => sum + (d.total_sessions || 0), 0);
      const secondHalfSessions = secondHalf.reduce((sum: number, d: any) => sum + (d.total_sessions || 0), 0);

      const sessionsTrend = firstHalfSessions > 0
        ? Math.round(((secondHalfSessions - firstHalfSessions) / firstHalfSessions) * 100)
        : 0;

      // Behavioral insights
      const behavioralIssues = [];
      if (totals.rage_clicks > totals.sessions * 0.1) {
        behavioralIssues.push({
          type: 'rage_clicks',
          severity: 'high',
          message: `High rage click rate (${Math.round(totals.rage_clicks / totals.sessions * 100)}% of sessions) - users are frustrated with unresponsive elements`
        });
      }
      if (totals.dead_clicks > totals.sessions * 0.15) {
        behavioralIssues.push({
          type: 'dead_clicks',
          severity: 'medium',
          message: `Elevated dead clicks - users are clicking on non-interactive elements`
        });
      }
      if (totals.quick_backs > totals.sessions * 0.2) {
        behavioralIssues.push({
          type: 'quick_backs',
          severity: 'medium',
          message: `High quick-back rate - users are immediately leaving pages`
        });
      }
      if (totals.js_errors > 10) {
        behavioralIssues.push({
          type: 'js_errors',
          severity: 'high',
          message: `${totals.js_errors} JavaScript errors detected - may be affecting user experience`
        });
      }

      return {
        overview: {
          total_sessions: totals.sessions,
          total_users: totals.users,
          avg_engagement_time_seconds: Math.round(totals.engagement_time / dayCount),
          avg_scroll_depth: Math.round(avgScrollDepth),
          avg_pages_per_session: Math.round(avgPagesPerSession * 10) / 10,
          sessions_trend_percent: sessionsTrend,
          sessions_trend_direction: sessionsTrend > 0 ? 'up' : sessionsTrend < 0 ? 'down' : 'flat'
        },
        behavioral: {
          rage_clicks: totals.rage_clicks,
          dead_clicks: totals.dead_clicks,
          quick_backs: totals.quick_backs,
          js_errors: totals.js_errors,
          rage_click_rate: Math.round(totals.rage_clicks / totals.sessions * 100 * 10) / 10,
          issues: behavioralIssues
        },
        date_range: {
          from: startDate,
          to: endDate,
          days: dayCount
        },
        is_configured: true,
        last_synced: clarityConfig.last_synced_at
      };
    }

    // Timeline data
    if (metric_type === 'timeline') {
      const { data: timeline, error } = await supabase
        .from('clarity_daily_metrics')
        .select('metric_date, total_sessions, distinct_users, engagement_time_seconds, scroll_depth')
        .eq('client_id', clientId)
        .gte('metric_date', startDate)
        .lte('metric_date', endDate)
        .order('metric_date', { ascending: true });

      if (error) throw error;

      return {
        items: sanitizeDataForPrompt(timeline || []),
        result_count: timeline?.length || 0,
        date_range: { from: startDate, to: endDate }
      };
    }

    return { items: [], result_count: 0 };

  } catch (error: any) {
    console.error('Get Clarity metrics error:', error);
    throw error;
  }
}

// Get SEO performance data with keyword rankings and trends
export async function getSEOPerformance(supabase: any, params: any, clientId: string) {
  try {
    const {
      include_keywords = true,
      limit = 20,
      sort_by = 'position' // position, position_change, keyword
    } = params;

    // Get latest SEO report
    const { data: latestReport, error: reportError } = await supabase
      .from('seo_reports')
      .select('*')
      .eq('client_id', clientId)
      .order('report_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (reportError) throw reportError;

    if (!latestReport) {
      return {
        report: null,
        keywords: [],
        result_count: 0,
        message: 'No SEO reports found for this client'
      };
    }

    // Get previous report for comparison
    const { data: previousReport } = await supabase
      .from('seo_reports')
      .select('*')
      .eq('client_id', clientId)
      .order('report_date', { ascending: false })
      .range(1, 1)
      .maybeSingle();

    // Calculate report trends
    const reportTrends: Record<string, any> = {};
    if (previousReport) {
      const metrics = ['visibility_score', 'average_position', 'keywords_top_3', 'keywords_top_10', 'keywords_total'];
      for (const metric of metrics) {
        const current = latestReport[metric] || 0;
        const previous = previousReport[metric] || 0;
        if (previous > 0) {
          const change = metric === 'average_position'
            ? previous - current // For position, lower is better
            : current - previous;
          const changePercent = (change / previous) * 100;
          reportTrends[metric] = {
            current,
            previous,
            change,
            change_percent: Math.round(changePercent * 10) / 10,
            direction: change > 0 ? 'improved' : change < 0 ? 'declined' : 'stable'
          };
        }
      }
    }

    let keywords: any[] = [];
    if (include_keywords) {
      // Get keywords for the latest report
      let keywordQuery = supabase
        .from('seo_keywords')
        .select('*')
        .eq('seo_report_id', latestReport.id);

      // Apply sorting
      switch (sort_by) {
        case 'position':
          keywordQuery = keywordQuery.order('position', { ascending: true, nullsFirst: false });
          break;
        case 'position_change':
          keywordQuery = keywordQuery.order('position_change', { ascending: false, nullsFirst: true });
          break;
        case 'keyword':
          keywordQuery = keywordQuery.order('keyword', { ascending: true });
          break;
      }

      keywordQuery = keywordQuery.limit(limit);

      const { data: keywordData, error: keywordError } = await keywordQuery;
      if (keywordError) throw keywordError;

      keywords = (keywordData || []).map((kw: any) => ({
        keyword: kw.keyword,
        position: kw.position,
        position_change: kw.position_change,
        position_start: kw.position_start,
        best_position: kw.best_position,
        ranking_url: kw.ranking_url,
        search_engine: kw.search_engine,
        region: kw.region,
        trend: kw.position_change > 0 ? 'improving' : kw.position_change < 0 ? 'declining' : 'stable',
        alert: kw.position_change < -5 ? 'significant_drop' : kw.position_change > 5 ? 'significant_gain' : null
      }));
    }

    // Identify alerts
    const alerts = [];
    if (reportTrends.visibility_score?.direction === 'declined' && Math.abs(reportTrends.visibility_score.change_percent) > 10) {
      alerts.push({
        type: 'visibility_drop',
        severity: 'high',
        message: `Visibility score dropped ${Math.abs(reportTrends.visibility_score.change_percent)}%`
      });
    }
    if (reportTrends.keywords_top_10?.direction === 'declined') {
      alerts.push({
        type: 'ranking_drop',
        severity: 'medium',
        message: `Lost ${Math.abs(reportTrends.keywords_top_10.change)} keywords from top 10`
      });
    }

    const significantDrops = keywords.filter((kw: any) => kw.alert === 'significant_drop');
    if (significantDrops.length > 0) {
      alerts.push({
        type: 'keyword_drops',
        severity: 'medium',
        message: `${significantDrops.length} keywords dropped significantly in rankings`,
        keywords: significantDrops.slice(0, 5).map((kw: any) => kw.keyword)
      });
    }

    return {
      report: {
        id: latestReport.id,
        report_date: latestReport.report_date,
        date_range: {
          start: latestReport.date_range_start,
          end: latestReport.date_range_end
        },
        visibility_score: latestReport.visibility_score,
        average_position: latestReport.average_position,
        keywords_top_3: latestReport.keywords_top_3,
        keywords_top_10: latestReport.keywords_top_10,
        keywords_top_30: latestReport.keywords_top_30,
        keywords_total: latestReport.keywords_total,
        pdf_url: latestReport.pdf_url
      },
      trends: reportTrends,
      keywords: sanitizeDataForPrompt(keywords),
      keyword_count: keywords.length,
      alerts: alerts.length > 0 ? alerts : null,
      has_previous_report: !!previousReport
    };

  } catch (error: any) {
    console.error('Get SEO performance error:', error);
    throw error;
  }
}
