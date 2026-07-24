import { useQuery } from "@tanstack/react-query";
import {
  fetchConnectorAccounts,
  fetchGscDaily,
  fetchGscPages,
  fetchGscQueries,
} from "@/lib/windsorApi";
import {
  aggregateGscDimension,
  buildDailySeries,
  previousPeriod,
  sumGscRows,
} from "@/lib/windsorAggregate";

export const useGscAccounts = (clientId: string) =>
  useQuery({
    queryKey: ["windsor", "searchconsole", "accounts", clientId],
    queryFn: () => fetchConnectorAccounts(clientId, "searchconsole"),
    enabled: !!clientId,
  });

export const useGscOverview = (clientId: string, from: string, to: string) =>
  useQuery({
    queryKey: ["windsor", "searchconsole", "overview", clientId, from, to],
    queryFn: async () => {
      const prev = previousPeriod(from, to);
      const [currentRows, previousRows] = await Promise.all([
        fetchGscDaily(clientId, from, to),
        fetchGscDaily(clientId, prev.from, prev.to),
      ]);
      return {
        current: sumGscRows(currentRows),
        previous: sumGscRows(previousRows),
        hasData: currentRows.length > 0,
      };
    },
    enabled: !!clientId,
    staleTime: 60_000,
  });

export const useGscTrend = (clientId: string, from: string, to: string) =>
  useQuery({
    queryKey: ["windsor", "searchconsole", "trend", clientId, from, to],
    queryFn: async () => {
      const rows = await fetchGscDaily(clientId, from, to);
      if (rows.length === 0) return [];
      return buildDailySeries(rows, rows[0].metric_date, rows[rows.length - 1].metric_date, [
        "clicks",
        "impressions",
      ]);
    },
    enabled: !!clientId,
    staleTime: 60_000,
  });

export const useGscTopQueries = (clientId: string, from: string, to: string, limit = 20) =>
  useQuery({
    queryKey: ["windsor", "searchconsole", "queries", clientId, from, to, limit],
    queryFn: async () => {
      const rows = await fetchGscQueries(clientId, from, to);
      return aggregateGscDimension(rows, "query", limit);
    },
    enabled: !!clientId,
    staleTime: 60_000,
  });

export const useGscTopPages = (clientId: string, from: string, to: string, limit = 20) =>
  useQuery({
    queryKey: ["windsor", "searchconsole", "pages", clientId, from, to, limit],
    queryFn: async () => {
      const rows = await fetchGscPages(clientId, from, to);
      return aggregateGscDimension(rows, "page", limit);
    },
    enabled: !!clientId,
    staleTime: 60_000,
  });
