import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClient } from '@/contexts/ClientContext';

interface ValidationResult {
  canAnalyze: boolean;
  reasons: string[];
  hasAvatar: boolean;
  hasWebsiteUrl: boolean;
  avatarComplete: boolean;
}

export const useCanAnalyzePages = () => {
  const { selectedClient } = useClient();

  return useQuery({
    queryKey: ['can-analyze-pages', selectedClient?.id],
    queryFn: async (): Promise<ValidationResult> => {
      if (!selectedClient) {
        return {
          canAnalyze: false,
          reasons: ['No client selected'],
          hasAvatar: false,
          hasWebsiteUrl: false,
          avatarComplete: false,
        };
      }

      const reasons: string[] = [];

      // Check 1: Website URL exists and is valid
      const hasWebsiteUrl = !!(
        selectedClient.website_url &&
        selectedClient.website_url.trim().length > 0
      );

      if (!hasWebsiteUrl) {
        reasons.push('Add your website URL in LaunchPad > Discovery');
      }

      // Check 2: At least one avatar exists
      const { data: avatars } = await supabase
        .from('avatars')
        .select('id, avatar_name, demographics, goals')
        .eq('client_id', selectedClient.id);

      const hasAvatar = avatars && avatars.length > 0;

      if (!hasAvatar) {
        reasons.push('Create a customer avatar in the Avatar section');
      }

      // Check 3: Avatar has minimum required data
      const avatarComplete = hasAvatar && avatars?.[0] && 
        !!avatars[0].avatar_name?.trim() &&
        (!!avatars[0].demographics?.trim() || (Array.isArray(avatars[0].goals) && avatars[0].goals.length > 0));

      if (hasAvatar && !avatarComplete) {
        reasons.push('Complete your avatar details (demographics or goals)');
      }

      return {
        canAnalyze: hasWebsiteUrl && hasAvatar && avatarComplete,
        reasons,
        hasAvatar,
        hasWebsiteUrl,
        avatarComplete,
      };
    },
    enabled: !!selectedClient,
  });
};
