import { useQuery } from "@tanstack/react-query";
import {
  fetchConnectorAccounts,
  fetchGoogleAdsCampaigns,
  fetchGoogleAdsDaily,
} from "@/lib/windsorApi";
import {
  buildDailySeries,
  previousPeriod,
  sumAdsRows,
  type AdsTotals,
} from "@/lib/windsorAggregate";

export const useGoogleAdsAccounts = (clientId: string) =>
  useQuery({
    queryKey: ["windsor", "google_ads", "accounts", clientId],
    queryFn: () => fetchConnectorAccounts(clientId, "google_ads"),
    enabled: !!clientId,
  });

export const useGoogleAdsOverview = (clientId: string, from: string, to: string) =>
  useQuery({
    queryKey: ["windsor", "google_ads", "overview", clientId, from, to],
    queryFn: async () => {
      const prev = previousPeriod(from, to);
      const [currentRows, previousRows] = await Promise.all([
        fetchGoogleAdsDaily(clientId, from, to),
        fetchGoogleAdsDaily(clientId, prev.from, prev.to),
      ]);
      return {
        current: sumAdsRows(currentRows),
        previous: sumAdsRows(previousRows),
        hasData: currentRows.length > 0,
      };
    },
    enabled: !!clientId,
    staleTime: 60_000,
  });

export const useGoogleAdsTrend = (clientId: string, from: string, to: string) =>
  useQuery({
    queryKey: ["windsor", "google_ads", "trend", clientId, from, to],
    queryFn: async () => {
      const rows = await fetchGoogleAdsDaily(clientId, from, to);
      if (rows.length === 0) return [];
      return buildDailySeries(rows, rows[0].metric_date, rows[rows.length - 1].metric_date, [
        "spend",
        "clicks",
        "conversions",
      ]);
    },
    enabled: !!clientId,
    staleTime: 60_000,
  });

export interface CampaignSummary extends AdsTotals {
  campaign: string;
  searchImpressionShare: number | null;
}

export const useGoogleAdsCampaigns = (clientId: string, from: string, to: string) =>
  useQuery({
    queryKey: ["windsor", "google_ads", "campaigns", clientId, from, to],
    queryFn: async (): Promise<CampaignSummary[]> => {
      const rows = await fetchGoogleAdsCampaigns(clientId, from, to);
      const grouped = new Map<string, typeof rows>();
      for (const row of rows) {
        const list = grouped.get(row.campaign) ?? [];
        list.push(row);
        grouped.set(row.campaign, list);
      }
      return [...grouped.entries()]
        .map(([campaign, campaignRows]) => {
          const shares = campaignRows
            .map((r) => r.search_impression_share)
            .filter((s): s is number => s != null);
          return {
            campaign,
            ...sumAdsRows(campaignRows),
            searchImpressionShare: shares.length
              ? shares.reduce((a, b) => a + b, 0) / shares.length
              : null,
          };
        })
        .sort((a, b) => b.spend - a.spend);
    },
    enabled: !!clientId,
    staleTime: 60_000,
  });
