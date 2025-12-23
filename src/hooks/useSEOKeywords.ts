import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SEOKeyword {
  id: string;
  client_id: string;
  seo_report_id: string;
  keyword: string;
  search_engine: string;
  region: string | null;
  position: number | null;
  position_start: number | null;
  position_change: number | null;
  best_position: number | null;
  ranking_url: string | null;
  created_at: string;
}

export function useSEOKeywords(clientId: string | undefined, reportId?: string) {
  return useQuery({
    queryKey: ['seo-keywords', clientId, reportId],
    queryFn: async () => {
      if (!clientId) return [];
      
      let query = supabase
        .from('seo_keywords')
        .select('*')
        .eq('client_id', clientId);
        
      if (reportId) {
        query = query.eq('seo_report_id', reportId);
      }
      
      const { data, error } = await query.order('keyword', { ascending: true });
        
      if (error) throw error;
      return data as SEOKeyword[];
    },
    enabled: !!clientId,
  });
}

export function useLatestSEOKeywords(clientId: string | undefined) {
  return useQuery({
    queryKey: ['seo-keywords', 'latest', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      // First get the latest report
      const { data: latestReport, error: reportError } = await supabase
        .from('seo_reports')
        .select('id')
        .eq('client_id', clientId)
        .order('report_date', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (reportError) throw reportError;
      if (!latestReport) return [];
      
      const { data, error } = await supabase
        .from('seo_keywords')
        .select('*')
        .eq('seo_report_id', latestReport.id)
        .order('keyword', { ascending: true });
        
      if (error) throw error;
      return data as SEOKeyword[];
    },
    enabled: !!clientId,
  });
}

export function useUniqueRegions(clientId: string | undefined) {
  return useQuery({
    queryKey: ['seo-keywords', 'regions', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('seo_keywords')
        .select('region')
        .eq('client_id', clientId);
        
      if (error) throw error;
      
      const regions = [...new Set(data.map(d => d.region).filter(Boolean))];
      return regions as string[];
    },
    enabled: !!clientId,
  });
}
