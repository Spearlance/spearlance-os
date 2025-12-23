import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SEOReport {
  id: string;
  client_id: string;
  report_date: string;
  date_range_start: string | null;
  date_range_end: string | null;
  visibility_score: number | null;
  average_position: number | null;
  keywords_top_3: number;
  keywords_top_10: number;
  keywords_top_30: number;
  keywords_total: number;
  pdf_url: string | null;
  created_at: string;
}

export function useSEOReports(clientId: string | undefined) {
  return useQuery({
    queryKey: ['seo-reports', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('seo_reports')
        .select('*')
        .eq('client_id', clientId)
        .order('report_date', { ascending: false });
        
      if (error) throw error;
      return data as SEOReport[];
    },
    enabled: !!clientId,
  });
}

export function useLatestSEOReport(clientId: string | undefined) {
  return useQuery({
    queryKey: ['seo-reports', 'latest', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      
      const { data, error } = await supabase
        .from('seo_reports')
        .select('*')
        .eq('client_id', clientId)
        .order('report_date', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (error) throw error;
      return data as SEOReport | null;
    },
    enabled: !!clientId,
  });
}
