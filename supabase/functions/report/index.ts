/**
 * report — one-call read endpoint for external dashboards (Lovable, etc.).
 *
 * GET ?client=invictus-northwest-group&from=2026-07-01&to=2026-07-31
 * Headers: x-spearlance-key: <WEBHOOK_SECRET>
 *
 * `client` accepts a slug, clients.id uuid, or Duda site_id. `from`/`to`
 * default to the last 30 days. Returns:
 * {
 *   client_id, from, to,
 *   funnel:    { total, new, mql, sql, disqualified, reached_mql, reached_sql },
 *   daily:     [{ date, source, leads }],
 *   sources:   [{ source, leads }],          // ingestion pipe breakdown (debugging)
 *   channels:  [{ channel, leads }],         // marketing channel breakdown ('unattributed' when unknown)
 *   mql_to_sql: [{ month, mql_count, sql_count, conversion_rate, median_days }],
 *   metrics:   [{ date, metric, value, meta }]
 * }
 */
import { corsHeaders, json, reportingClient, requireSecret, resolveClient } from '../_shared/reporting.ts';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'GET') {
    return json({ error: 'method not allowed' }, 405);
  }

  const unauthorized = requireSecret(req);
  if (unauthorized) return unauthorized;

  const url = new URL(req.url);
  const clientParam = url.searchParams.get('client') ?? '';
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const from = url.searchParams.get('from') ?? thirtyDaysAgo;
  const to = url.searchParams.get('to') ?? today;

  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return json({ error: 'from/to must be YYYY-MM-DD' }, 422);
  }

  const supabase = reportingClient();

  const clientId = await resolveClient(supabase, clientParam);
  if (!clientId) {
    return json({ error: 'unknown client', client: clientParam || null }, 404);
  }

  const monthFrom = `${from.slice(0, 7)}-01`;

  const [funnelRes, mqlSqlRes, metricsRes] = await Promise.all([
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
  ]);

  const firstError = funnelRes.error ?? mqlSqlRes.error ?? metricsRes.error;
  if (firstError) {
    console.error('report query error:', firstError);
    return json({ error: 'failed to build report' }, 500);
  }

  const funnelRows = funnelRes.data ?? [];

  const funnel = {
    total: 0, new: 0, mql: 0, sql: 0, disqualified: 0, reached_mql: 0, reached_sql: 0,
  };
  const sourceTotals = new Map<string, number>();
  const channelTotals = new Map<string, number>();
  const dailyTotals = new Map<string, number>();

  for (const row of funnelRows) {
    funnel.total += row.total_count;
    funnel.new += row.new_count;
    funnel.mql += row.mql_count;
    funnel.sql += row.sql_count;
    funnel.disqualified += row.disqualified_count;
    funnel.reached_mql += row.reached_mql_count;
    funnel.reached_sql += row.reached_sql_count;
    sourceTotals.set(row.source, (sourceTotals.get(row.source) ?? 0) + row.total_count);
    const channel = row.channel ?? 'unattributed';
    channelTotals.set(channel, (channelTotals.get(channel) ?? 0) + row.total_count);
    const dailyKey = `${row.lead_date}|${row.source}`;
    dailyTotals.set(dailyKey, (dailyTotals.get(dailyKey) ?? 0) + row.total_count);
  }
  const daily = [...dailyTotals.entries()]
    .map(([key, leads]) => {
      const [date, source] = key.split('|');
      return { date, source, leads };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.source.localeCompare(b.source));

  return json({
    client_id: clientId,
    from,
    to,
    funnel,
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
  });
});
