import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Rss } from "lucide-react";
import { toast } from "sonner";

interface InitializeLateButtonProps {
  clientId?: string;
}

export const InitializeLateButton = ({ clientId }: InitializeLateButtonProps) => {
  const queryClient = useQueryClient();
  const [isInitializing, setIsInitializing] = useState(false);

  const initializeProfile = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error('No client selected');
      
      const { data, error } = await supabase.functions.invoke(
        'late-ensure-profile',
        { body: { client_id: clientId } }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['late-profile'] });
      toast.success('Social media setup initialized! You can now connect your accounts.');
      setIsInitializing(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to initialize social media setup');
      setIsInitializing(false);
    },
  });

  const handleInitialize = () => {
    setIsInitializing(true);
    initializeProfile.mutate();
  };

  return (
    <Button
      onClick={handleInitialize}
      disabled={isInitializing || !clientId}
      size="default"
    >
      {isInitializing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Setting up...
        </>
      ) : (
        <>
          <Rss className="mr-2 h-4 w-4" />
          Connect Your Social Media
        </>
      )}
    </Button>
  );
};
