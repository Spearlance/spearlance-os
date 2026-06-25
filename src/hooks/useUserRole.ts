import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useUserRole() {
  const { data: role = null, isLoading } = useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      return profile?.role ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    role,
    isLoading,
    isAdmin: role === 'admin',
    isFMM: role === 'fmm',
    isAdminOrFMM: role === 'admin' || role === 'fmm',
    isWebDesigner: role === 'web_designer',
  };
}
