import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCWVMetrics(clientId: string | undefined) {
  return useQuery({
    queryKey: ['cwv-metrics', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('cwv_metrics')
        .select('lcp_ms, cls, inp_ms, fcp_ms, ttfb_ms, device, created_at')
        .eq('client_id', clientId)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return null;

      const sorted = (arr: number[]) => arr.filter(v => v > 0).sort((a, b) => a - b);
      const p75 = (arr: number[]) => {
        const s = sorted(arr);
        return s.length > 0 ? s[Math.floor(s.length * 0.75)] : 0;
      };

      return {
        lcp: p75(data.map(d => d.lcp_ms || 0)),
        cls: Math.round(p75(data.map(d => (d.cls || 0) * 1000)) / 1000),
        inp: p75(data.map(d => d.inp_ms || 0)),
        fcp: p75(data.map(d => d.fcp_ms || 0)),
        ttfb: p75(data.map(d => d.ttfb_ms || 0)),
        sampleCount: data.length,
      };
    },
    enabled: !!clientId,
  });
}

export function useLighthouseAudits(clientId: string | undefined) {
  return useQuery({
    queryKey: ['lighthouse-audits', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('lighthouse_audits')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });
}
