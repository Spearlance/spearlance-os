import { useCallback, useEffect, useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Copy, ExternalLink, Link2, Loader2, RefreshCw } from "lucide-react";
import { ReportingDashboard, type ReportPayload } from "@/components/reporting/ReportingDashboard";
import { ManageData } from "@/components/reporting/ManageData";
import { fetchReport, fetchShareLink, shareUrl, upsertShareLink, type ShareLink } from "@/lib/reportingApi";

const RANGES: Record<string, () => { from: string; to: string }> = {
  "30d": () => ({
    from: new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  }),
  "90d": () => ({
    from: new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  }),
  ytd: () => ({
    from: `${new Date().getFullYear()}-01-01`,
    to: new Date().toISOString().slice(0, 10),
  }),
  all: () => ({ from: "2000-01-01", to: new Date().toISOString().slice(0, 10) }),
};

export default function Reporting() {
  const { selectedClient } = useClient();
  const [range, setRange] = useState<string>("90d");
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [share, setShare] = useState<ShareLink | null>(null);
  const [shareBusy, setShareBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).maybeSingle();
      setIsAdmin(profile?.role === "admin");
      setCanEdit(profile?.role === "admin" || profile?.role === "fmm");
    });
  }, []);

  const load = useCallback(async () => {
    if (!selectedClient) return;
    setLoading(true);
    try {
      const { from, to } = RANGES[range]();
      setReport(await fetchReport(selectedClient.id, from, to));
    } catch (error: any) {
      console.error("Failed to load report:", error);
      toast.error("Failed to load report", { description: error?.message });
    } finally {
      setLoading(false);
    }
  }, [selectedClient, range]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setShare(null);
    if (selectedClient && isAdmin) {
      fetchShareLink(selectedClient.id).then(setShare).catch(() => setShare(null));
    }
  }, [selectedClient, isAdmin]);

  const mutateShare = async (patch: { enabled?: boolean; rotate?: boolean }, message: string) => {
    if (!selectedClient) return;
    setShareBusy(true);
    try {
      const link = await upsertShareLink(selectedClient.id, patch);
      setShare(link);
      toast.success(message);
    } catch (error: any) {
      toast.error("Share link update failed", { description: error?.message });
    } finally {
      setShareBusy(false);
    }
  };

  const copyShareUrl = async () => {
    if (!share) return;
    await navigator.clipboard.writeText(shareUrl(share.token));
    toast.success("Share link copied");
  };

  return (
    <div className="container mx-auto p-6 space-y-5 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reporting</h1>
          <p className="text-sm text-muted-foreground">
            Lead funnel and channel performance{selectedClient ? ` — ${selectedClient.name}` : ""}
          </p>
        </div>
        <Tabs value={range} onValueChange={setRange}>
          <TabsList>
            <TabsTrigger value="30d">30 days</TabsTrigger>
            <TabsTrigger value="90d">90 days</TabsTrigger>
            <TabsTrigger value="ytd">YTD</TabsTrigger>
            <TabsTrigger value="all">All time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {!selectedClient && (
        <p className="text-sm text-muted-foreground py-10 text-center">
          Select a client in the sidebar to view their report.
        </p>
      )}

      {selectedClient && loading && !report && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {selectedClient && report && <ReportingDashboard report={report} />}

      {selectedClient && canEdit && (
        <ManageData
          clientId={selectedClient.id}
          from={RANGES[range]().from}
          to={RANGES[range]().to}
          onChanged={load}
        />
      )}

      {selectedClient && isAdmin && (
        <Card>
          <CardContent className="pt-5 pb-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Public share link</span>
                {share ? (
                  <Badge variant={share.enabled ? "default" : "secondary"}>
                    {share.enabled ? "active" : "disabled"}
                  </Badge>
                ) : (
                  <Badge variant="outline">not created</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!share && (
                  <Button size="sm" disabled={shareBusy}
                    onClick={() => mutateShare({}, "Share link created")}>
                    {shareBusy && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                    Create link
                  </Button>
                )}
                {share && (
                  <>
                    <div className="flex items-center gap-1.5 mr-2">
                      <Switch
                        checked={share.enabled}
                        disabled={shareBusy}
                        onCheckedChange={(enabled) =>
                          mutateShare({ enabled }, enabled ? "Share link enabled" : "Share link disabled")}
                      />
                      <span className="text-xs text-muted-foreground">{share.enabled ? "on" : "off"}</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={copyShareUrl} disabled={!share.enabled}>
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                    </Button>
                    <Button size="sm" variant="outline" disabled={!share.enabled}
                      onClick={() => window.open(shareUrl(share.token), "_blank")}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
                    </Button>
                    <Button size="sm" variant="ghost" disabled={shareBusy}
                      onClick={() => mutateShare({ rotate: true }, "Link rotated — old URL is now invalid")}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1" /> Rotate
                    </Button>
                  </>
                )}
              </div>
            </div>
            {share?.enabled && (
              <p className="text-xs text-muted-foreground break-all">
                {shareUrl(share.token)} — anyone with this link can view this client's dashboard
                (no login). Rotate to invalidate the old URL.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
