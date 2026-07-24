import { supabase } from "@/integrations/supabase/client";
import type { ReportPayload } from "@/components/reporting/ReportingDashboard";

// The generated Database types only cover the public schema; the reporting
// schema is exposed to PostgREST but untyped, hence the cast.
const reporting = () => (supabase as any).schema("reporting");

/** Mirrors the edge functions' buildReport, but runs under the signed-in
 *  user's RLS (internal staff: all clients; client users: their own). */
export async function fetchReport(clientId: string, from: string, to: string): Promise<ReportPayload> {
  const monthFrom = `${from.slice(0, 7)}-01`;

  const [funnelRes, mqlSqlRes, metricsRes] = await Promise.all([
    reporting().from("v_lead_funnel").select("*")
      .eq("client_id", clientId).gte("lead_date", from).lte("lead_date", to),
    reporting().from("v_mql_to_sql").select("*")
      .eq("client_id", clientId).gte("mql_month", monthFrom).lte("mql_month", to),
    reporting().from("v_metrics_daily").select("*")
      .eq("client_id", clientId).gte("metric_date", from).lte("metric_date", to)
      .order("metric_date"),
  ]);

  const firstError = funnelRes.error ?? mqlSqlRes.error ?? metricsRes.error;
  if (firstError) throw firstError;

  const funnel = { total: 0, new: 0, mql: 0, sql: 0, disqualified: 0, reached_mql: 0, reached_sql: 0 };
  const sourceTotals = new Map<string, number>();
  const channelTotals = new Map<string, number>();
  const dailyTotals = new Map<string, number>();

  for (const row of funnelRes.data ?? []) {
    funnel.total += row.total_count;
    funnel.new += row.new_count;
    funnel.mql += row.mql_count;
    funnel.sql += row.sql_count;
    funnel.disqualified += row.disqualified_count;
    funnel.reached_mql += row.reached_mql_count;
    funnel.reached_sql += row.reached_sql_count;
    sourceTotals.set(row.source, (sourceTotals.get(row.source) ?? 0) + row.total_count);
    const channel = row.channel ?? "unattributed";
    channelTotals.set(channel, (channelTotals.get(channel) ?? 0) + row.total_count);
    const key = `${row.lead_date}|${row.source}`;
    dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + row.total_count);
  }

  return {
    client_id: clientId,
    from,
    to,
    funnel,
    daily: [...dailyTotals.entries()]
      .map(([key, leads]) => {
        const [date, source] = key.split("|");
        return { date, source, leads };
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.source.localeCompare(b.source)),
    sources: [...sourceTotals.entries()]
      .map(([source, leads]) => ({ source, leads }))
      .sort((a, b) => b.leads - a.leads),
    channels: [...channelTotals.entries()]
      .map(([channel, leads]) => ({ channel, leads }))
      .sort((a, b) => b.leads - a.leads),
    mql_to_sql: (mqlSqlRes.data ?? []).map((r: any) => ({
      month: r.mql_month,
      mql_count: r.mql_count,
      sql_count: r.sql_count,
      conversion_rate: r.conversion_rate,
      median_days: r.median_days_mql_to_sql,
    })),
    metrics: (metricsRes.data ?? []).map((r: any) => ({
      date: r.metric_date,
      metric: r.metric,
      value: r.value,
      meta: r.meta,
    })),
  };
}

export interface ShareLink {
  id: string;
  client_id: string;
  token: string;
  enabled: boolean;
  expires_at: string | null;
}

export async function fetchShareLink(clientId: string): Promise<ShareLink | null> {
  const { data, error } = await reporting()
    .from("share_links")
    .select("id, client_id, token, enabled, expires_at")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

const randomToken = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
};

export async function upsertShareLink(clientId: string, patch: Partial<Pick<ShareLink, "enabled">> & { rotate?: boolean }): Promise<ShareLink> {
  const existing = await fetchShareLink(clientId);
  if (!existing) {
    const { data, error } = await reporting()
      .from("share_links")
      .insert({ client_id: clientId, token: randomToken(), enabled: true })
      .select("id, client_id, token, enabled, expires_at")
      .single();
    if (error) throw error;
    return data;
  }
  const update: Record<string, unknown> = {};
  if (patch.enabled !== undefined) update.enabled = patch.enabled;
  if (patch.rotate) update.token = randomToken();
  const { data, error } = await reporting()
    .from("share_links")
    .update(update)
    .eq("id", existing.id)
    .select("id, client_id, token, enabled, expires_at")
    .single();
  if (error) throw error;
  return data;
}

export const shareUrl = (token: string) => `${window.location.origin}/reporting/share/${token}`;

// ---- Manual data management (admin/FMM via RLS write policies) ----

export interface LeadRow {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: string;
  channel: string | null;
  status: string;
  status_reason: string | null;
  mql_at: string | null;
  sql_at: string | null;
}

export async function fetchLeads(clientId: string, from: string, to: string): Promise<LeadRow[]> {
  const { data, error } = await reporting()
    .from("leads")
    .select("id, created_at, name, email, phone, message, source, channel, status, status_reason, mql_at, sql_at")
    .eq("client_id", clientId)
    .gte("created_at", `${from}T00:00:00Z`)
    .lte("created_at", `${to}T23:59:59Z`)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function updateLead(id: string, patch: Partial<LeadRow>): Promise<void> {
  const { error } = await reporting().from("leads").update(patch).eq("id", id);
  if (error) throw error;
}

export async function insertLead(clientId: string, lead: {
  name?: string; email?: string; phone?: string; message?: string;
  channel?: string | null; status: string; occurred_at: string;
}): Promise<void> {
  const ts = `${lead.occurred_at}T12:00:00Z`;
  const { error } = await reporting().from("leads").insert({
    client_id: clientId,
    source: "manual",
    name: lead.name || null,
    email: lead.email || null,
    phone: lead.phone || null,
    message: lead.message || null,
    channel: lead.channel || null,
    status: lead.status,
    mql_at: ["mql", "sql"].includes(lead.status) ? ts : null,
    sql_at: lead.status === "sql" ? ts : null,
    created_at: ts,
  });
  if (error) throw error;
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await reporting().from("leads").delete().eq("id", id);
  if (error) throw error;
}

export interface MetricRow {
  id: string;
  metric_date: string;
  metric: string;
  value: number | string;
}

export async function fetchMetrics(clientId: string, from: string, to: string): Promise<MetricRow[]> {
  const { data, error } = await reporting()
    .from("metrics_daily")
    .select("id, metric_date, metric, value")
    .eq("client_id", clientId)
    .gte("metric_date", from)
    .lte("metric_date", to)
    .order("metric_date", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function upsertMetric(clientId: string, metricDate: string, metric: string, value: number): Promise<void> {
  const { error } = await reporting()
    .from("metrics_daily")
    .upsert(
      { client_id: clientId, metric_date: metricDate, metric, value },
      { onConflict: "client_id,metric_date,metric" },
    );
  if (error) throw error;
}

export async function deleteMetric(id: string): Promise<void> {
  const { error } = await reporting().from("metrics_daily").delete().eq("id", id);
  if (error) throw error;
}
