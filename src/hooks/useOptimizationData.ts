import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OptimizationFilters {
  status?: string[];
  category?: string[];
  priority?: string[];
}

export interface OptimizationStats {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
}

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const useOptimizationRecommendations = (
  clientId: string,
  filters?: OptimizationFilters
) => {
  return useQuery({
    queryKey: ['optimization-recommendations', clientId, filters],
    queryFn: async () => {
      let query = supabase
        .from('optimization_recommendations')
        .select('*')
        .eq('client_id', clientId);

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.category && filters.category.length > 0) {
        query = query.in('category', filters.category);
      }

      if (filters?.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('useOptimizationRecommendations error:', error);
        throw error;
      }

      // Sort by priority (critical first), then preserve created_at DESC order
      return (data || []).sort((a, b) => {
        const aPriority = PRIORITY_ORDER[a.priority] ?? 99;
        const bPriority = PRIORITY_ORDER[b.priority] ?? 99;
        return aPriority - bPriority;
      });
    },
    enabled: !!clientId,
  });
};

export const useOptimizationCycles = (clientId: string) => {
  return useQuery({
    queryKey: ['optimization-cycles', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('optimization_cycles')
        .select('*')
        .eq('client_id', clientId)
        .order('cycle_date', { ascending: false })
        .limit(10);

      if (error) {
        console.error('useOptimizationCycles error:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!clientId,
  });
};

export const useUpdateRecommendationStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      applied_by,
    }: {
      id: string;
      status: string;
      applied_by?: string;
    }) => {
      const updates: Record<string, unknown> = { status };

      if (applied_by !== undefined) {
        updates.applied_by = applied_by;
      }

      if (status === 'applied') {
        updates.applied_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('optimization_recommendations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('useUpdateRecommendationStatus error:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optimization-recommendations'] });
      toast.success('Recommendation updated');
    },
    onError: (error: Error) => {
      toast.error('Update failed', { description: error.message || 'Failed to update recommendation.' });
    },
  });
};

export const useOptimizationStats = (clientId: string) => {
  return useQuery({
    queryKey: ['optimization-stats', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('optimization_recommendations')
        .select('id, status, category, priority')
        .eq('client_id', clientId);

      if (error) {
        console.error('useOptimizationStats error:', error);
        throw error;
      }

      const rows = data || [];

      const stats: OptimizationStats = {
        total: rows.length,
        byStatus: {},
        byCategory: {},
        byPriority: {},
      };

      for (const row of rows) {
        if (row.status) {
          stats.byStatus[row.status] = (stats.byStatus[row.status] || 0) + 1;
        }
        if (row.category) {
          stats.byCategory[row.category] = (stats.byCategory[row.category] || 0) + 1;
        }
        if (row.priority) {
          stats.byPriority[row.priority] = (stats.byPriority[row.priority] || 0) + 1;
        }
      }

      return stats;
    },
    enabled: !!clientId,
  });
};
