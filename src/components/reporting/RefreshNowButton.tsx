import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { triggerWindsorSync, type WindsorConnector } from "@/lib/windsorApi";

interface RefreshNowButtonProps {
  clientId: string;
  connector: WindsorConnector;
}

export function RefreshNowButton({ clientId, connector }: RefreshNowButtonProps) {
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();

  const refresh = async () => {
    setBusy(true);
    try {
      const result = await triggerWindsorSync(clientId, connector);
      const errors = result?.results?.[connector]?.errors ?? [];
      if (errors.length > 0) {
        toast.error("Sync finished with errors", { description: errors[0] });
      } else {
        toast.success("Data refreshed from Windsor");
      }
      queryClient.invalidateQueries({ queryKey: ["windsor", connector] });
    } catch (error: any) {
      toast.error("Refresh failed", { description: error?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={refresh} disabled={busy}>
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
      ) : (
        <RefreshCw className="h-3.5 w-3.5 mr-1" />
      )}
      Refresh now
    </Button>
  );
}
