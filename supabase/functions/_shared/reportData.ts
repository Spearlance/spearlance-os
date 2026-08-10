import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

/**
 * Builds the reporting payload consumed by dashboards (the report and
 * public-report edge functions, and the in-app public share page): funnel
 * totals, daily series, source + channel breakdowns, MQL→SQL cohorts, and
 * metrics_daily series for one client and date range.
 */
export async function buildReport(
  supabase: SupabaseClient,
  clientId: string,
  from: string,
  to: string,
) {
  const monthFrom = `${from.slice(0, 7)}-01`;

  const [funnelRes, mqlSqlRes, metricsRes, defsRes] = await Promise.all([
    supabase
      .from('v_lead_funnel')
      .select('*')
      .eq('client_id', clientId)
      .gte('lead_date', from)
      .lte('lead_date', to),
    supabase
      .from('v_mql_to_sql')
      .select('*')
      .eq('client_id', clientId)
      .gte('mql_month', monthFrom)
      .lte('mql_month', to),
    supabase
      .from('v_metrics_daily')
      .select('*')
      .eq('client_id', clientId)
      .gte('metric_date', from)
      .lte('metric_date', to)
      .order('metric_date'),
    // Registry driving metric presentation (labels, units, families). Not
    // client-scoped; inactive definitions are included so historical data
    // keeps its label after a metric is retired.
    supabase
      .from('metric_definitions')
      .select('*')
      .order('display_order')
      .order('metric'),
  ]);

  const firstError = funnelRes.error ?? mqlSqlRes.error ?? metricsRes.error ?? defsRes.error;
  if (firstError) throw firstError;

  const funnelRows = funnelRes.data ?? [];

  const funnel = {
    total: 0, new: 0, mql: 0, sql: 0, disqualified: 0, reached_mql: 0, reached_sql: 0,
    sale: 0, sale_value: 0,
  };
  const sourceTotals = new Map<string, number>();
  const channelTotals = new Map<string, number>();
  const dailyTotals = new Map<string, number>();
  // Leads that represent phone calls (CallRail pipe or phone-channel manual
  // entries) — compared against website click-to-call metrics for
  // reconciliation. Row-level OR avoids double counting.
  let callLeadCount = 0;

  for (const row of funnelRows) {
    funnel.total += row.total_count;
    funnel.new += row.new_count;
    funnel.mql += row.mql_count;
    funnel.sql += row.sql_count;
    funnel.disqualified += row.disqualified_count;
    funnel.reached_mql += row.reached_mql_count;
    funnel.reached_sql += row.reached_sql_count;
    // ?? 0 so a not-yet-migrated database (view without sale columns) still serves.
    funnel.sale += row.sale_count ?? 0;
    funnel.sale_value += Number(row.sale_value ?? 0);
    sourceTotals.set(row.source, (sourceTotals.get(row.source) ?? 0) + row.total_count);
    const channel = row.channel ?? 'unattributed';
    channelTotals.set(channel, (channelTotals.get(channel) ?? 0) + row.total_count);
    if (row.source === 'call' || channel === 'phone') callLeadCount += row.total_count;
    const dailyKey = `${row.lead_date}|${row.source}`;
    dailyTotals.set(dailyKey, (dailyTotals.get(dailyKey) ?? 0) + row.total_count);
  }

  const daily = [...dailyTotals.entries()]
    .map(([key, leads]) => {
      const [date, source] = key.split('|');
      return { date, source, leads };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.source.localeCompare(b.source));

  return {
    client_id: clientId,
    from,
    to,
    funnel,
    call_lead_count: callLeadCount,
    daily,
    sources: [...sourceTotals.entries()]
      .map(([source, leads]) => ({ source, leads }))
      .sort((a, b) => b.leads - a.leads),
    channels: [...channelTotals.entries()]
      .map(([channel, leads]) => ({ channel, leads }))
      .sort((a, b) => b.leads - a.leads),
    mql_to_sql: (mqlSqlRes.data ?? []).map((r) => ({
      month: r.mql_month,
      mql_count: r.mql_count,
      sql_count: r.sql_count,
      conversion_rate: r.conversion_rate,
      median_days: r.median_days_mql_to_sql,
    })),
    metrics: (metricsRes.data ?? []).map((r) => ({
      date: r.metric_date,
      metric: r.metric,
      value: r.value,
      meta: r.meta,
    })),
    metric_definitions: defsRes.data ?? [],
  };
}
