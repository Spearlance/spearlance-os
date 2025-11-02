import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useLastRefreshTime(clientId: string | undefined) {
  return useQuery({
    queryKey: ['last-refresh-time', clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const { data, error } = await supabase
        .from('materialized_view_refreshes')
        .select('last_refreshed_at')
        .eq('view_name', 'analytics_views')
        .eq('client_id', clientId)
        .single();

      if (error) {
        console.error('Error fetching last refresh time:', error);
        return null;
      }

      return data?.last_refreshed_at;
    },
    enabled: !!clientId,
  });
}
