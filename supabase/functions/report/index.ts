/**
 * report — one-call read endpoint for external dashboards and tools.
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
import { buildReport } from '../_shared/reportData.ts';

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

  try {
    return json(await buildReport(supabase, clientId, from, to));
  } catch (error) {
    console.error('report query error:', error);
    return json({ error: 'failed to build report' }, 500);
  }
});
