/**
 * ingest-metric — upsert daily aggregate metrics (not lead-level).
 *
 * This is where the scheduled Duda call-count task POSTs (metric 'duda_calls'),
 * and later ad spend / LP sessions.
 *
 * POST with headers:
 *   x-spearlance-key: <WEBHOOK_SECRET>
 *   Content-Type: application/json
 *
 * Payload:
 * {
 *   "client":      "invictus-northwest-group",  // slug, clients.id uuid, or Duda site_id
 *   "metric_date": "2026-07-24",
 *   "metric":      "duda_calls",                // free-form, e.g. duda_calls | ad_spend | lp_sessions
 *   "value":       7,
 *   "meta":        { "source": "duda_mcp" }     // optional jsonb
 * }
 *
 * Upserts on (client_id, metric_date, metric) — re-posting the same day
 * overwrites the value. Response: { ok, metric_id }.
 */
import { corsHeaders, json, reportingClient, requireSecret, resolveClient } from '../_shared/reporting.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405);
  }

  const unauthorized = requireSecret(req);
  if (unauthorized) return unauthorized;

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }

  const metricDate = typeof payload.metric_date === 'string' ? payload.metric_date : '';
  const metric = typeof payload.metric === 'string' ? payload.metric.trim() : '';
  const value = Number(payload.value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(metricDate)) {
    return json({ error: 'metric_date must be YYYY-MM-DD' }, 422);
  }
  if (!metric) {
    return json({ error: 'metric is required' }, 422);
  }
  if (!Number.isFinite(value)) {
    return json({ error: 'value must be a number' }, 422);
  }

  const supabase = reportingClient();

  const clientId = await resolveClient(supabase, payload.client);
  if (!clientId) {
    return json({ error: 'unknown client', client: payload.client ?? null }, 404);
  }

  const { data, error } = await supabase
    .from('metrics_daily')
    .upsert(
      {
        client_id: clientId,
        metric_date: metricDate,
        metric,
        value,
        meta: payload.meta ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'client_id,metric_date,metric' },
    )
    .select('id')
    .single();

  if (error) {
    console.error('metric upsert error:', error);
    return json({ error: 'failed to upsert metric' }, 500);
  }

  return json({ ok: true, metric_id: data.id });
});
