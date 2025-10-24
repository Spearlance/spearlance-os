import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface LateSyncButtonProps {
  clientId?: string;
}

export const LateSyncButton = ({ clientId }: LateSyncButtonProps) => {
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('late-sync-accounts', {
        body: { client_id: clientId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['late-accounts'] });
      toast.success(`Synced ${data.synced_count} account(s)`);
      if (data.added_count > 0) {
        toast.success(`Added ${data.added_count} new account(s)`);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to sync accounts');
    },
  });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => syncMutation.mutate()}
      disabled={syncMutation.isPending}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
      Sync Accounts
    </Button>
  );
};