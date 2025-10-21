import { useEffect, useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { LaunchPadStage } from "@/lib/launchpadTypes";

interface LaunchPadStatus {
  stage: LaunchPadStage | null;
  isComplete: boolean;
  loading: boolean;
}

export function useLaunchPadStatus() {
  const { selectedClient } = useClient();
  const [status, setStatus] = useState<LaunchPadStatus>({
    stage: null,
    isComplete: false,
    loading: true,
  });

  useEffect(() => {
    if (!selectedClient) {
      setStatus({ stage: null, isComplete: false, loading: false });
      return;
    }

    const fetchStatus = async () => {
      setStatus(prev => ({ ...prev, loading: true }));
      
      const { data, error } = await supabase
        .from("launchpad_submissions")
        .select("stage")
        .eq("client_id", selectedClient.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching Launchpad status:", error);
        setStatus({ stage: null, isComplete: false, loading: false });
        return;
      }

      const stage = data?.stage as LaunchPadStage | null;
      setStatus({
        stage,
        isComplete: stage === "complete",
        loading: false,
      });
    };

    fetchStatus();

    // Subscribe to changes
    const channel = supabase
      .channel(`launchpad-status-${selectedClient.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'launchpad_submissions',
          filter: `client_id=eq.${selectedClient.id}`,
        },
        () => {
          fetchStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedClient]);

  return status;
}
