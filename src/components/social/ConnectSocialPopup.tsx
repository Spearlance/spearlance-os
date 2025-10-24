import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Facebook, Instagram } from "lucide-react";
import { toast } from "sonner";

interface ConnectSocialPopupProps {
  platform: "facebook" | "instagram";
  clientId?: string;
  lateProfileId?: string;
  onSuccess?: () => void;
}

export const ConnectSocialPopup = ({ 
  platform, 
  clientId, 
  lateProfileId,
  onSuccess 
}: ConnectSocialPopupProps) => {
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  const createProfileAndConnect = useMutation({
    mutationFn: async () => {
      setIsConnecting(true);
      
      // Step 1: Create profile if it doesn't exist
      let profileId = lateProfileId;
      if (!profileId) {
        const { data: profileData, error: profileError } = await supabase.functions.invoke(
          'late-create-profile',
          { body: { client_id: clientId } }
        );

        if (profileError) throw profileError;
        profileId = profileData.id;
        
        // Refresh profile query
        await queryClient.invalidateQueries({ queryKey: ['late-profile'] });
      }

      // Step 2: Create connection invite
      const { data: inviteData, error: inviteError } = await supabase.functions.invoke(
        'late-create-connection-invite',
        { body: { client_id: clientId, platform } }
      );

      if (inviteError) throw inviteError;
      return inviteData;
    },
    onSuccess: async (data) => {
      // Open OAuth in popup
      const width = 600;
      const height = 700;
      const left = (screen.width - width) / 2;
      const top = (screen.height - height) / 2;
      
      const popup = window.open(
        data.invite_url,
        'Connect Social Media',
        `width=${width},height=${height},left=${left},top=${top},popup=1`
      );

      if (!popup) {
        toast.error('Please allow popups to connect your account');
        setIsConnecting(false);
        return;
      }

      // Monitor popup closure
      const checkClosed = setInterval(async () => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          
          toast.loading('Syncing your account...', { id: 'sync' });
          
          // Wait a moment for Late to process the connection
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Sync accounts
          try {
            const { data: syncData, error: syncError } = await supabase.functions.invoke(
              'late-sync-accounts',
              { body: { client_id: clientId } }
            );

            if (syncError) throw syncError;

            await queryClient.invalidateQueries({ queryKey: ['late-accounts'] });
            
            toast.success(
              syncData.added_count > 0 
                ? `Connected ${syncData.added_count} account(s)!` 
                : 'Account synced',
              { id: 'sync' }
            );
            
            onSuccess?.();
          } catch (error: any) {
            toast.error(error.message || 'Failed to sync account', { id: 'sync' });
          }
          
          setIsConnecting(false);
        }
      }, 500);
    },
    onError: (error: any) => {
      toast.error(error.message || `Failed to connect ${platform}`);
      setIsConnecting(false);
    },
  });

  const Icon = platform === 'facebook' ? Facebook : Instagram;
  const label = platform === 'facebook' ? 'Connect Facebook' : 'Connect Instagram';

  return (
    <Button
      onClick={() => createProfileAndConnect.mutate()}
      disabled={isConnecting}
      size="lg"
      className="w-full"
    >
      {isConnecting ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Icon className="mr-2 h-5 w-5" />
          {label}
        </>
      )}
    </Button>
  );
};
