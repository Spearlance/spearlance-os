import { supabase } from "@/integrations/supabase/client";
import { reportingSchema } from "@/lib/reportingApi";

export type WindsorConnector = "searchconsole" | "google_ads";

export interface ConnectorAccount {
  id: string;
  client_id: string;
  connector: WindsorConnector;
  account_id: string;
  label: string | null;
  is_active: boolean;
  last_synced_at: string | null;
}

export interface GscDailyRow {
  metric_date: string;
  clicks: number;
  impressions: number;
  ctr: number | null;
  position: number | null;
}

export interface GscQueryRow extends GscDailyRow {
  query: string;
}

export interface GscPageRow extends GscDailyRow {
  page: string;
}

export interface GoogleAdsDailyRow {
  metric_date: string;
  clicks: number;
  impressions: number;
  spend: number;
  conversions: number;
  cost_per_conversion: number | null;
  ctr: number | null;
  cpc: number | null;
  search_impression_share: number | null;
}

export interface GoogleAdsCampaignRow extends GoogleAdsDailyRow {
  campaign: string;
}

const ACCOUNT_COLUMNS = "id, client_id, connector, account_id, label, is_active, last_synced_at";

export async function fetchConnectorAccounts(
  clientId: string,
  connector: WindsorConnector,
): Promise<ConnectorAccount[]> {
  const { data, error } = await reportingSchema()
    .from("connector_accounts")
    .select(ACCOUNT_COLUMNS)
    .eq("client_id", clientId)
    .eq("connector", connector)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function insertConnectorAccount(
  clientId: string,
  connector: WindsorConnector,
  accountId: string,
  label?: string,
): Promise<ConnectorAccount> {
  const { data, error } = await reportingSchema()
    .from("connector_accounts")
    .insert({ client_id: clientId, connector, account_id: accountId.trim(), label: label?.trim() || null })
    .select(ACCOUNT_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function setConnectorAccountActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await reportingSchema()
    .from("connector_accounts")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteConnectorAccount(id: string): Promise<void> {
  const { error } = await reportingSchema().from("connector_accounts").delete().eq("id", id);
  if (error) throw error;
}

async function fetchRange<T>(view: string, columns: string, clientId: string, from: string, to: string): Promise<T[]> {
  const { data, error } = await reportingSchema()
    .from(view)
    .select(columns)
    .eq("client_id", clientId)
    .gte("metric_date", from)
    .lte("metric_date", to)
    .order("metric_date");
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    clicks: Number(row.clicks) || 0,
    impressions: Number(row.impressions) || 0,
    ...(row.spend !== undefined ? { spend: Number(row.spend) || 0 } : {}),
    ...(row.conversions !== undefined ? { conversions: Number(row.conversions) || 0 } : {}),
    ctr: row.ctr == null ? null : Number(row.ctr),
    ...(row.position !== undefined ? { position: row.position == null ? null : Number(row.position) } : {}),
  }));
}

export const fetchGscDaily = (clientId: string, from: string, to: string) =>
  fetchRange<GscDailyRow>("v_gsc_daily", "metric_date, clicks, impressions, ctr, position", clientId, from, to);

export const fetchGscQueries = (clientId: string, from: string, to: string) =>
  fetchRange<GscQueryRow>("v_gsc_queries_daily", "metric_date, query, clicks, impressions, ctr, position", clientId, from, to);

export const fetchGscPages = (clientId: string, from: string, to: string) =>
  fetchRange<GscPageRow>("v_gsc_pages_daily", "metric_date, page, clicks, impressions, ctr, position", clientId, from, to);

export const fetchGoogleAdsDaily = (clientId: string, from: string, to: string) =>
  fetchRange<GoogleAdsDailyRow>(
    "v_google_ads_daily",
    "metric_date, clicks, impressions, spend, conversions, cost_per_conversion, ctr, cpc, search_impression_share",
    clientId, from, to,
  );

export const fetchGoogleAdsCampaigns = (clientId: string, from: string, to: string) =>
  fetchRange<GoogleAdsCampaignRow>(
    "v_google_ads_campaigns_daily",
    "metric_date, campaign, clicks, impressions, spend, conversions, cost_per_conversion, ctr, cpc, search_impression_share",
    clientId, from, to,
  );

export async function triggerWindsorSync(
  clientId: string,
  connector?: WindsorConnector,
  days?: number,
): Promise<{ success: boolean; results: Record<string, { accounts: number; errors: string[] }> }> {
  const { data, error } = await supabase.functions.invoke("windsor-sync", {
    body: { client_id: clientId, ...(connector ? { connector } : {}), ...(days ? { days } : {}) },
  });
  if (error) throw error;
  return data;
}
