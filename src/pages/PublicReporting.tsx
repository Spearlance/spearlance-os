import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportingDashboard, type ReportPayload } from "@/components/reporting/ReportingDashboard";

const RANGES: Record<string, () => { from: string; to: string }> = {
  "30d": () => ({
    from: new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  }),
  "90d": () => ({
    from: new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  }),
  all: () => ({ from: "2000-01-01", to: new Date().toISOString().slice(0, 10) }),
};

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; clientName: string; report: ReportPayload };

export default function PublicReporting() {
  const { token } = useParams<{ token: string }>();
  const [range, setRange] = useState("90d");
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    if (!token) {
      setState({ status: "error", message: "This link is not valid." });
      return;
    }
    try {
      const { from, to } = RANGES[range]();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-report?token=${encodeURIComponent(token)}&from=${from}&to=${to}`;
      const res = await fetch(url);
      const body = await res.json();
      if (!res.ok) {
        setState({
          status: "error",
          message:
            res.status === 410
              ? "This report link has expired."
              : "This report link is not valid or has been disabled.",
        });
        return;
      }
      setState({ status: "ready", clientName: body.client_name, report: body });
    } catch {
      setState({ status: "error", message: "Failed to load the report. Try again shortly." });
    }
  }, [token, range]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-5 max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Spearlance Media · Performance Report
            </p>
            <h1 className="text-2xl font-bold mt-0.5">
              {state.status === "ready" ? state.clientName : "Report"}
            </h1>
          </div>
          {state.status === "ready" && (
            <Tabs value={range} onValueChange={setRange}>
              <TabsList>
                <TabsTrigger value="30d">30 days</TabsTrigger>
                <TabsTrigger value="90d">90 days</TabsTrigger>
                <TabsTrigger value="all">All time</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>

        {state.status === "loading" && (
          <div className="flex justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {state.status === "error" && (
          <p className="text-sm text-muted-foreground text-center py-24">{state.message}</p>
        )}

        {state.status === "ready" && <ReportingDashboard report={state.report} />}

        <p className="text-xs text-muted-foreground text-center pt-6 pb-2">
          Prepared by Spearlance Media
        </p>
      </div>
    </div>
  );
}
