import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, startOfDay } from 'date-fns';

interface DateRange {
  from: Date;
  to: Date;
}

export const useClarityStatus = (clientId: string) => {
  return useQuery({
    queryKey: ['clarity', 'status', clientId],
    queryFn: async () => {
      // Check if Clarity is configured
      const { data: config, error: configError } = await supabase
        .from('clarity_configs')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .maybeSingle();

      if (configError) throw configError;
      if (!config) return { isConfigured: false, hasData: false, lastSyncedAt: null };

      // Check if we have any data
      const { data: latestMetric, error: metricsError } = await supabase
        .from('clarity_daily_metrics')
        .select('metric_date, synced_at')
        .eq('client_id', clientId)
        .order('metric_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (metricsError) throw metricsError;

      return {
        isConfigured: true,
        hasData: !!latestMetric,
        lastSyncedAt: config.last_synced_at,
        projectId: config.project_id,
      };
    },
    enabled: !!clientId,
  });
};

export const useClarityOverview = (clientId: string, dateRange: DateRange) => {
  return useQuery({
    queryKey: ['clarity', 'overview', clientId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clarity_daily_metrics')
        .select('*')
        .eq('client_id', clientId)
        .gte('metric_date', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('metric_date', format(dateRange.to, 'yyyy-MM-dd'));

      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Aggregate metrics across the date range
      const totals = data.reduce(
        (acc, row) => ({
          totalSessions: acc.totalSessions + (row.total_sessions || 0),
          totalUsers: acc.totalUsers + (row.distinct_users || 0),
          totalEngagementTime: acc.totalEngagementTime + (row.engagement_time_seconds || 0),
          totalPagesPerSession: acc.totalPagesPerSession + (row.pages_per_session || 0),
          totalScrollDepth: acc.totalScrollDepth + (row.scroll_depth || 0),
          totalRageClicks: acc.totalRageClicks + (row.rage_click_count || 0),
          totalDeadClicks: acc.totalDeadClicks + (row.dead_click_count || 0),
          totalQuickBacks: acc.totalQuickBacks + (row.quick_back_count || 0),
          totalJsErrors: acc.totalJsErrors + (row.javascript_error_count || 0),
          count: acc.count + 1,
        }),
        {
          totalSessions: 0,
          totalUsers: 0,
          totalEngagementTime: 0,
          totalPagesPerSession: 0,
          totalScrollDepth: 0,
          totalRageClicks: 0,
          totalDeadClicks: 0,
          totalQuickBacks: 0,
          totalJsErrors: 0,
          count: 0,
        }
      );

      return {
        sessions: totals.totalSessions,
        users: totals.totalUsers,
        avgEngagementTime: totals.count > 0 ? Math.round(totals.totalEngagementTime / totals.count) : 0,
        avgPagesPerSession: totals.count > 0 ? Math.round((totals.totalPagesPerSession / totals.count) * 10) / 10 : 0,
        avgScrollDepth: totals.count > 0 ? Math.round(totals.totalScrollDepth / totals.count) : 0,
        rageClicks: totals.totalRageClicks,
        deadClicks: totals.totalDeadClicks,
        quickBacks: totals.totalQuickBacks,
        jsErrors: totals.totalJsErrors,
      };
    },
    enabled: !!clientId,
    refetchInterval: 60000,
    staleTime: 30000,
  });
};

export const useClarityTimeline = (clientId: string, dateRange: DateRange) => {
  return useQuery({
    queryKey: ['clarity', 'timeline', clientId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clarity_daily_metrics')
        .select('metric_date, total_sessions, distinct_users')
        .eq('client_id', clientId)
        .gte('metric_date', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('metric_date', format(dateRange.to, 'yyyy-MM-dd'))
        .order('metric_date', { ascending: true });

      if (error) throw error;

      // Create a map of existing data
      const dataMap = new Map(
        data?.map((row) => [row.metric_date, row]) || []
      );

      // Fill in missing days
      const result = [];
      let currentDay = startOfDay(dateRange.from);
      const endDay = startOfDay(dateRange.to);

      while (currentDay <= endDay) {
        const dayStr = format(currentDay, 'yyyy-MM-dd');
        const existing = dataMap.get(dayStr);
        result.push({
          day: dayStr,
          sessions: existing?.total_sessions || 0,
          users: existing?.distinct_users || 0,
        });
        currentDay = addDays(currentDay, 1);
      }

      return result;
    },
    enabled: !!clientId,
    refetchInterval: 60000,
    staleTime: 30000,
  });
};

export const useClaritySources = (clientId: string, dateRange: DateRange) => {
  return useQuery({
    queryKey: ['clarity', 'sources', clientId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clarity_daily_sources')
        .select('*')
        .eq('client_id', clientId)
        .gte('metric_date', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('metric_date', format(dateRange.to, 'yyyy-MM-dd'));

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Aggregate by source/medium
      const sourceMap = new Map<string, { sessions: number; users: number }>();
      data.forEach((row) => {
        const key = row.medium ? `${row.source} / ${row.medium}` : row.source;
        const existing = sourceMap.get(key) || { sessions: 0, users: 0 };
        sourceMap.set(key, {
          sessions: existing.sessions + (row.sessions || 0),
          users: existing.users + (row.users || 0),
        });
      });

      // Convert to array and sort by sessions
      return Array.from(sourceMap.entries())
        .map(([name, data]) => ({ name, sessions: data.sessions, users: data.users }))
        .sort((a, b) => b.sessions - a.sessions);
    },
    enabled: !!clientId,
    refetchInterval: 60000,
    staleTime: 30000,
  });
};

export const useClarityPages = (clientId: string, dateRange: DateRange) => {
  return useQuery({
    queryKey: ['clarity', 'pages', clientId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clarity_daily_pages')
        .select('*')
        .eq('client_id', clientId)
        .gte('metric_date', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('metric_date', format(dateRange.to, 'yyyy-MM-dd'));

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Aggregate by page URL
      const pageMap = new Map<string, { 
        sessions: number; 
        users: number; 
        scrollDepth: number; 
        engagementTime: number;
        count: number;
      }>();
      
      data.forEach((row) => {
        const key = row.page_url;
        const existing = pageMap.get(key) || { 
          sessions: 0, 
          users: 0, 
          scrollDepth: 0, 
          engagementTime: 0,
          count: 0,
        };
        pageMap.set(key, {
          sessions: existing.sessions + (row.sessions || 0),
          users: existing.users + (row.users || 0),
          scrollDepth: existing.scrollDepth + (row.scroll_depth || 0),
          engagementTime: existing.engagementTime + (row.engagement_time_seconds || 0),
          count: existing.count + 1,
        });
      });

      // Convert to array and calculate averages
      return Array.from(pageMap.entries())
        .map(([url, data]) => ({
          url,
          sessions: data.sessions,
          users: data.users,
          avgScrollDepth: data.count > 0 ? Math.round(data.scrollDepth / data.count) : 0,
          avgEngagementTime: data.count > 0 ? Math.round(data.engagementTime / data.count) : 0,
        }))
        .filter((page) => {
          // Filter out editor/platform URLs
          const blockedPatterns = [
            'my.duda.co',
            'edit.duda.co',
            'mywebsitemanager.co',
            '/editor/',
            '/preview/',
            '/edit-site/',
          ];
          return !blockedPatterns.some((pattern) => page.url.includes(pattern));
        })
        .sort((a, b) => b.sessions - a.sessions);
    },
    enabled: !!clientId,
    refetchInterval: 60000,
    staleTime: 30000,
  });
};

export const useClarityBehavioral = (clientId: string, dateRange: DateRange) => {
  return useQuery({
    queryKey: ['clarity', 'behavioral', clientId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clarity_daily_metrics')
        .select('rage_click_count, dead_click_count, quick_back_count, javascript_error_count, total_sessions')
        .eq('client_id', clientId)
        .gte('metric_date', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('metric_date', format(dateRange.to, 'yyyy-MM-dd'));

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const totals = data.reduce(
        (acc, row) => ({
          rageClicks: acc.rageClicks + (row.rage_click_count || 0),
          deadClicks: acc.deadClicks + (row.dead_click_count || 0),
          quickBacks: acc.quickBacks + (row.quick_back_count || 0),
          jsErrors: acc.jsErrors + (row.javascript_error_count || 0),
          totalSessions: acc.totalSessions + (row.total_sessions || 0),
        }),
        { rageClicks: 0, deadClicks: 0, quickBacks: 0, jsErrors: 0, totalSessions: 0 }
      );

      return {
        ...totals,
        rageClickRate: totals.totalSessions > 0 
          ? Math.round((totals.rageClicks / totals.totalSessions) * 100 * 10) / 10 
          : 0,
        deadClickRate: totals.totalSessions > 0 
          ? Math.round((totals.deadClicks / totals.totalSessions) * 100 * 10) / 10 
          : 0,
        quickBackRate: totals.totalSessions > 0 
          ? Math.round((totals.quickBacks / totals.totalSessions) * 100 * 10) / 10 
          : 0,
      };
    },
    enabled: !!clientId,
    refetchInterval: 60000,
    staleTime: 30000,
  });
};
