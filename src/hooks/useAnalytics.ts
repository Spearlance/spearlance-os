import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addDays, format, startOfDay } from 'date-fns';

interface DateRange {
  from: Date;
  to: Date;
}

export const useAnalyticsOverview = (clientId: string, dateRange: DateRange) => {
  return useQuery({
    queryKey: ['analytics', 'overview', clientId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data: events, error } = await supabase
        .from('web_events')
        .select('*')
        .eq('client_id', clientId)
        .gte('received_at', dateRange.from.toISOString())
        .lte('received_at', dateRange.to.toISOString());
      
      if (error) throw error;
      
      const uniqueVisitors = new Set(events?.map(e => e.sid) || []).size;
      const pageviews = events?.filter(e => e.type === 'page_view').length || 0;
      const leadSubmissions = events?.filter(e => e.type === 'lead_submitted').length || 0;
      
      // Calculate average engaged time
      const engagedTimeEvents = events?.filter(e => e.type === 'engaged_time' && e.value) || [];
      const avgEngagedTime = engagedTimeEvents.length > 0
        ? engagedTimeEvents.reduce((sum, e) => sum + (Number(e.value) || 0), 0) / engagedTimeEvents.length
        : 0;
      
      return {
        uniqueVisitors,
        pageviews,
        leadSubmissions,
        avgEngagedTime: Math.round(avgEngagedTime),
        avgPagesPerSession: uniqueVisitors > 0 ? Math.round(pageviews / uniqueVisitors * 10) / 10 : 0,
      };
    },
    refetchInterval: 30000,
    staleTime: 20000,
  });
};

export const useTrafficSources = (clientId: string, dateRange: DateRange) => {
  return useQuery({
    queryKey: ['analytics', 'traffic-sources', clientId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sources_daily')
        .select('*')
        .eq('client_id', clientId)
        .gte('day', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('day', format(dateRange.to, 'yyyy-MM-dd'));
      
      if (error) throw error;
      
      // Aggregate by source + medium
      const sourceMap = new Map<string, number>();
      data?.forEach(row => {
        const key = `${row.source || 'direct'} / ${row.medium || 'none'}`;
        sourceMap.set(key, (sourceMap.get(key) || 0) + (row.sessions || 0));
      });
      
      // Convert to array and sort
      const sources = Array.from(sourceMap.entries())
        .map(([name, sessions]) => ({ name, sessions }))
        .sort((a, b) => b.sessions - a.sessions);
      
      return sources;
    },
    refetchInterval: 30000,
    staleTime: 20000,
  });
};

export const usePagePerformance = (clientId: string, dateRange: DateRange) => {
  return useQuery({
    queryKey: ['analytics', 'page-performance', clientId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_daily')
        .select('*')
        .eq('client_id', clientId)
        .gte('day', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('day', format(dateRange.to, 'yyyy-MM-dd'));
      
      if (error) throw error;
      
      // Aggregate by page path
      const pageMap = new Map<string, any>();
      data?.forEach(row => {
        const existing = pageMap.get(row.path) || {
          page_path: row.path,
          pageviews: 0,
          unique_visitors: 0,
          entry_sessions: 0,
          total_engaged_time: 0,
          event_count: 0,
        };
        
        pageMap.set(row.path, {
          ...existing,
          pageviews: existing.pageviews + (row.total_pageviews || 0),
          unique_visitors: existing.unique_visitors + (row.unique_sessions || 0),
          entry_sessions: existing.entry_sessions + (row.entry_sessions || 0),
          total_engaged_time: existing.total_engaged_time + ((row.avg_engaged_seconds || 0) * (row.total_pageviews || 0)),
          event_count: existing.event_count + (row.total_pageviews || 0),
        });
      });
      
      const pages = Array.from(pageMap.values())
        .filter(page => {
          // Filter out known editor/platform domains
      const blockedDomains = [
        'my.duda.co',
        'edit.duda.co',
        'mywebsitemanager.co',
        '/editor/',
        '/preview/',
        '/edit-site/',
        '/site/' // Duda internal site editor paths
      ];
          
          return !blockedDomains.some(domain => page.page_path.includes(domain));
        })
        .map(page => ({
          ...page,
          avg_engaged_time: page.event_count > 0 ? Math.round(page.total_engaged_time / page.event_count) : 0,
        }))
        .sort((a, b) => b.pageviews - a.pageviews);
      
      return pages;
    },
    refetchInterval: 30000,
    staleTime: 20000,
  });
};

export const useContentPerformance = (clientId: string, dateRange: DateRange) => {
  return useQuery({
    queryKey: ['analytics', 'content-performance', clientId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_daily')
        .select('*')
        .eq('client_id', clientId)
        .gte('day', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('day', format(dateRange.to, 'yyyy-MM-dd'));
      
      if (error) throw error;
      
      // Aggregate by content slug
      const contentMap = new Map<string, any>();
      data?.forEach(row => {
        const key = `${row.content_type}_${row.slug}`;
        const existing = contentMap.get(key) || {
          content_type: row.content_type,
          content_slug: row.slug,
          content_title: row.slug,
          total_views: 0,
          unique_visitors: 0,
          total_leads: 0,
        };
        
        contentMap.set(key, {
          ...existing,
          total_views: existing.total_views + (row.total_views || 0),
          unique_visitors: existing.unique_visitors + (row.unique_visitors || 0),
          total_leads: existing.total_leads + (row.leads_same_session || 0),
        });
      });
      
      const content = Array.from(contentMap.values())
        .map(item => ({
          ...item,
          conversion_rate: item.unique_visitors > 0 
            ? Math.round((item.total_leads / item.unique_visitors) * 100 * 10) / 10
            : 0,
        }))
        .sort((a, b) => b.total_views - a.total_views);
      
      return content;
    },
    refetchInterval: 30000,
    staleTime: 20000,
  });
};

export const useVisitorTimeline = (clientId: string, dateRange: DateRange) => {
  return useQuery({
    queryKey: ['analytics', 'visitor-timeline', clientId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_daily')
        .select('day, unique_sessions, total_pageviews')
        .eq('client_id', clientId)
        .gte('day', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('day', format(dateRange.to, 'yyyy-MM-dd'));
      
      if (error) throw error;
      
      // Aggregate by day - normalize day format to yyyy-MM-dd
      const dayMap = new Map<string, any>();
      data?.forEach(row => {
        // Extract just the date part (yyyy-MM-dd) from the timestamp
        const dayStr = format(new Date(row.day), 'yyyy-MM-dd');
        const existing = dayMap.get(dayStr) || {
          day: dayStr,
          visitors: 0,
          pageviews: 0,
        };
        
        dayMap.set(dayStr, {
          day: dayStr,
          visitors: existing.visitors + (row.unique_sessions || 0),
          pageviews: existing.pageviews + (row.total_pageviews || 0),
        });
      });
      
      // Fill in missing days
      const days = [];
      let currentDay = startOfDay(dateRange.from);
      const endDay = startOfDay(dateRange.to);
      
      while (currentDay <= endDay) {
        const dayStr = format(currentDay, 'yyyy-MM-dd');
        days.push(dayMap.get(dayStr) || {
          day: dayStr,
          visitors: 0,
          pageviews: 0,
        });
        currentDay = addDays(currentDay, 1);
      }
      
      return days;
    },
    refetchInterval: 30000,
    staleTime: 20000,
  });
};

export const useWorkspaceKey = (clientId: string) => {
  return useQuery({
    queryKey: ['analytics', 'workspace-key', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_workspace_keys')
        .select('*')
        .eq('client_id', clientId)
        .eq('active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });
};

export const useAnalyticsStatus = (clientId: string) => {
  return useQuery({
    queryKey: ['analytics', 'status', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('web_events')
        .select('received_at')
        .eq('client_id', clientId)
        .order('received_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data) return { hasData: false, lastEventAt: null, isLive: false };
      
      const lastEventAt = new Date(data.received_at);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      return {
        hasData: true,
        lastEventAt,
        isLive: lastEventAt > fiveMinutesAgo,
      };
    },
    refetchInterval: 30000,
  });
};
