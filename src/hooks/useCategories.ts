import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  registerCategories,
  resolveCategory,
  type CategoryMeta,
} from "@/components/support-docs/categories";

export interface SupportCategoryRow {
  id: string;
  slug: string;
  audience: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

const QUERY_KEY = "support-categories";

/**
 * Loads categories from the support_categories table and hydrates the module
 * registry in categories.ts so the synchronous helpers (resolveCategory,
 * getCategoryName, deriveCategories) reflect DB edits. Components that render
 * category metadata should call this so they re-render when categories change.
 *
 * Only active categories ever hydrate the registry; pass includeInactive to
 * also receive retired rows (for the management UI).
 */
export function useCategories(options?: { includeInactive?: boolean }) {
  const includeInactive = options?.includeInactive ?? false;

  const query = useQuery({
    queryKey: [QUERY_KEY, includeInactive],
    queryFn: async (): Promise<SupportCategoryRow[]> => {
      let q = supabase
        .from("support_categories")
        .select("*")
        .order("audience", { ascending: true })
        .order("sort_order", { ascending: true });
      if (!includeInactive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SupportCategoryRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Hydrate the sync registry with the active subset whenever data changes.
  useEffect(() => {
    if (query.data) {
      registerCategories(query.data.filter((r) => r.is_active));
    }
  }, [query.data]);

  const rows = query.data ?? [];
  const activeRows = rows.filter((r) => r.is_active);
  const categories: CategoryMeta[] = activeRows.map((r) => resolveCategory(r.slug));

  const byAudience = (audience: string): SupportCategoryRow[] =>
    activeRows.filter((r) => r.audience === audience);

  return {
    rows,
    activeRows,
    categories,
    byAudience,
    isLoading: query.isLoading,
    error: query.error,
  };
}

type CategoryInsert = {
  slug: string;
  audience: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active?: boolean;
};

type CategoryUpdate = Partial<Omit<CategoryInsert, "slug">> & { is_active?: boolean };

/** Admin mutations for managing categories; all invalidate the cached lists. */
export function useCategoryMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [QUERY_KEY] });

  const create = useMutation({
    mutationFn: async (input: CategoryInsert) => {
      const { error } = await supabase.from("support_categories").insert(input);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: CategoryUpdate }) => {
      const { error } = await supabase
        .from("support_categories")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("support_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
