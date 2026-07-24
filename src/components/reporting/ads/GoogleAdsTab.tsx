import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatTile } from "@/components/reporting/StatTile";
import { RefreshNowButton } from "@/components/reporting/RefreshNowButton";
import { ConnectorAccountsCard } from "@/components/reporting/ConnectorAccountsCard";
import { AdsTrendChart } from "@/components/reporting/ads/AdsTrendChart";
import { AdsCampaignsTable } from "@/components/reporting/ads/AdsCampaignsTable";
import { fmtCurrency, fmtInt, fmtPct } from "@/components/reporting/formatters";
import { computeDelta } from "@/lib/windsorAggregate";
import {
  useGoogleAdsAccounts,
  useGoogleAdsCampaigns,
  useGoogleAdsOverview,
  useGoogleAdsTrend,
} from "@/hooks/useGoogleAdsReporting";

interface GoogleAdsTabProps {
  clientId: string;
  from: string;
  to: string;
  canEdit: boolean;
}

export function GoogleAdsTab({ clientId, from, to, canEdit }: GoogleAdsTabProps) {
  const accounts = useGoogleAdsAccounts(clientId);
  const overview = useGoogleAdsOverview(clientId, from, to);
  const trend = useGoogleAdsTrend(clientId, from, to);
  const campaigns = useGoogleAdsCampaigns(clientId, from, to);

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
            <p className="font-medium">Google Ads not connected for this client</p>
            <p className="text-sm text-muted-foreground">
              {canEdit
                ? "Map this client's Google Ads customer ID below, then refresh to pull data."
                : "Ask an admin to connect this client's Google Ads account."}
            </p>
          </CardContent>
        </Card>
        {canEdit && (
          <ConnectorAccountsCard
            clientId={clientId}
            connector="google_ads"
            accounts={accounts.data ?? []}
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
        <p className="text-xs text-muted-foreground">Google Ads performance (via Windsor)</p>
        {canEdit && <RefreshNowButton clientId={clientId} connector="google_ads" />}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatTile
          label="Spend"
          value={current ? fmtCurrency(current.spend) : "—"}
          delta={current && previous ? computeDelta(current.spend, previous.spend) : null}
          note="vs previous period"
        />
        <StatTile
          label="Clicks"
          value={current ? fmtInt(current.clicks) : "—"}
          delta={current && previous ? computeDelta(current.clicks, previous.clicks) : null}
          note="vs previous period"
        />
        <StatTile
          label="Conversions"
          value={current ? String(Math.round(current.conversions * 10) / 10) : "—"}
          delta={current && previous ? computeDelta(current.conversions, previous.conversions) : null}
          note="vs previous period"
        />
        <StatTile
          label="Cost / conversion"
          value={current ? fmtCurrency(current.costPerConversion) : "—"}
          delta={
            current?.costPerConversion != null && previous?.costPerConversion != null
              ? computeDelta(current.costPerConversion, previous.costPerConversion)
              : null
          }
          invertDelta
          note="lower is better"
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
      </div>

      {overview.data && !overview.data.hasData && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No Google Ads data in this range yet — try Refresh now, or widen the date range.
        </p>
      )}

      {(trend.data?.length ?? 0) > 0 && <AdsTrendChart data={trend.data!} />}

      <AdsCampaignsTable rows={campaigns.data ?? []} />

      {canEdit && (
        <ConnectorAccountsCard
          clientId={clientId}
          connector="google_ads"
          accounts={accounts.data ?? []}
        />
      )}
    </div>
  );
}
