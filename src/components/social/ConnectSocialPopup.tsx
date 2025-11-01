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
      
      // Get OAuth URL for direct platform connection
      const { data: oauthData, error: oauthError } = await supabase.functions.invoke(
        'late-initiate-oauth',
        { body: { client_id: clientId, platform: platform } }
      );

      if (oauthError) throw oauthError;
      return oauthData;
    },
    onSuccess: async (data) => {
      // Open OAuth connection in popup
      const width = 800;
      const height = 700;
      const left = (screen.width - width) / 2;
      const top = (screen.height - height) / 2;
      
      const popup = window.open(
        data.oauth_url,
        `Connect ${platform.charAt(0).toUpperCase() + platform.slice(1)}`,
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
          
          toast.loading('Syncing your accounts...', { id: 'sync' });
          
          // Wait for Late to process the connection
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Sync accounts
          try {
            const { data: syncData, error: syncError } = await supabase.functions.invoke(
              'late-sync-accounts',
              { body: { client_id: clientId } }
            );

            if (syncError) throw syncError;

            await queryClient.invalidateQueries({ queryKey: ['late-accounts'] });
            await queryClient.invalidateQueries({ queryKey: ['late-profile'] });
            
            toast.success(
              syncData.added_count > 0 
                ? `Connected ${syncData.added_count} account(s)!` 
                : 'Setup complete! You can now connect accounts in your Late dashboard.',
              { id: 'sync' }
            );
            
            onSuccess?.();
          } catch (error: any) {
            toast.error(error.message || 'Failed to sync accounts', { id: 'sync' });
          }
          
          setIsConnecting(false);
        }
      }, 1000);
    },
    onError: (error: any) => {
      const errorMsg = error.message?.toLowerCase() || '';
      
      // Detect specific error scenarios and provide targeted guidance
      if (errorMsg.includes('2fa') || errorMsg.includes('two-factor') || errorMsg.includes('two factor')) {
        toast.error(
          "Waiting for 2FA approval. Check your phone for Facebook notification - this may take 1-2 minutes.",
          { duration: 8000 }
        );
      } else if (errorMsg.includes('blocked') && platform === 'instagram') {
        toast.error(
          "Instagram blocked this connection. Check your Instagram app to approve 'It was me'.",
          { duration: 7000 }
        );
      } else if (errorMsg.includes('page') || errorMsg.includes('permission')) {
        toast.error(
          "Unable to connect page. Ensure you have admin access - see troubleshooting guide below.",
          { duration: 6000 }
        );
      } else if (errorMsg.includes('popup')) {
        toast.error(
          "Popup was blocked. Please allow popups in your browser and try again.",
          { duration: 5000 }
        );
      } else {
        toast.error(
          error.message || `Failed to connect ${platform}. See troubleshooting guide below for help.`,
          { duration: 5000 }
        );
      }
      
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
