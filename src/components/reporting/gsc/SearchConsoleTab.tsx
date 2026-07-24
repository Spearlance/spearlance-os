import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatTile } from "@/components/reporting/StatTile";
import { RefreshNowButton } from "@/components/reporting/RefreshNowButton";
import { ConnectorAccountsCard } from "@/components/reporting/ConnectorAccountsCard";
import { GscTrendChart } from "@/components/reporting/gsc/GscTrendChart";
import { GscDimensionTable } from "@/components/reporting/gsc/GscDimensionTable";
import { fmtInt, fmtPct, fmtPosition } from "@/components/reporting/formatters";
import { computeDelta } from "@/lib/windsorAggregate";
import {
  useGscAccounts,
  useGscOverview,
  useGscTopPages,
  useGscTopQueries,
  useGscTrend,
} from "@/hooks/useSearchConsole";

interface SearchConsoleTabProps {
  clientId: string;
  websiteUrl?: string | null;
  from: string;
  to: string;
  canEdit: boolean;
}

export function SearchConsoleTab({ clientId, websiteUrl, from, to, canEdit }: SearchConsoleTabProps) {
  const accounts = useGscAccounts(clientId);
  const overview = useGscOverview(clientId, from, to);
  const trend = useGscTrend(clientId, from, to);
  const topQueries = useGscTopQueries(clientId, from, to);
  const topPages = useGscTopPages(clientId, from, to);

  if (accounts.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeAccounts = (accounts.data ?? []).filter((a) => a.is_active);

  if (activeAccounts.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-10 text-center space-y-1">
            <p className="font-medium">Search Console not connected for this client</p>
            <p className="text-sm text-muted-foreground">
              {canEdit
                ? "Map this client's Search Console property below, then refresh to pull data."
                : "Ask an admin to connect this client's Search Console property."}
            </p>
          </CardContent>
        </Card>
        {canEdit && (
          <ConnectorAccountsCard
            clientId={clientId}
            connector="searchconsole"
            accounts={accounts.data ?? []}
            suggestedAccountId={websiteUrl}
          />
        )}
      </div>
    );
  }

  const current = overview.data?.current;
  const previous = overview.data?.previous;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Organic search (Google Search Console) · data lags ~2 days
        </p>
        {canEdit && <RefreshNowButton clientId={clientId} connector="searchconsole" />}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Clicks"
          value={current ? fmtInt(current.clicks) : "—"}
          delta={current && previous ? computeDelta(current.clicks, previous.clicks) : null}
          note="vs previous period"
        />
        <StatTile
          label="Impressions"
          value={current ? fmtInt(current.impressions) : "—"}
          delta={current && previous ? computeDelta(current.impressions, previous.impressions) : null}
          note="vs previous period"
        />
        <StatTile
          label="CTR"
          value={current ? fmtPct(current.ctr) : "—"}
          delta={
            current?.ctr != null && previous?.ctr != null
              ? computeDelta(current.ctr, previous.ctr)
              : null
          }
          note="clicks / impressions"
        />
        <StatTile
          label="Avg position"
          value={current ? fmtPosition(current.position) : "—"}
          delta={
            current?.position != null && previous?.position != null
              ? computeDelta(current.position, previous.position)
              : null
          }
          invertDelta
          note="lower is better"
        />
      </div>

      {overview.data && !overview.data.hasData && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No Search Console data in this range yet — try Refresh now, or widen the date range.
        </p>
      )}

      {(trend.data?.length ?? 0) > 0 && <GscTrendChart data={trend.data!} />}

      <div className="grid lg:grid-cols-2 gap-4">
        <GscDimensionTable
          title="Top queries"
          subtitle="By clicks over the selected range"
          keyHeader="Query"
          rows={topQueries.data ?? []}
        />
        <GscDimensionTable
          title="Top pages"
          subtitle="By clicks over the selected range"
          keyHeader="Page"
          rows={topPages.data ?? []}
          stripOrigin
        />
      </div>

      {canEdit && (
        <ConnectorAccountsCard
          clientId={clientId}
          connector="searchconsole"
          accounts={accounts.data ?? []}
          suggestedAccountId={websiteUrl}
        />
      )}
    </div>
  );
}
