/**
 * ingest-lead — the universal front door for lead-shaped records.
 *
 * Serves the Lovable landing page form, Zapier zaps (Webhooks by Zapier POST),
 * CallRail webhooks, and anything else that can send JSON.
 *
 * POST with headers:
 *   x-spearlance-key: <WEBHOOK_SECRET>
 *   Content-Type: application/json
 *
 * Payload (client + source required, everything else optional):
 * {
 *   "client":     "invictus-northwest-group",   // slug, clients.id uuid, or Duda site_id
 *   "source":     "lovable_lp",                 // ingestion pipe: duda_form | lovable_lp | call | zapier | hubspot | manual
 *   "channel":    "Google Ads",                 // marketing channel for reporting; free-form, normalized
 *                                               // ('Google Ads' -> 'google_ads'). When omitted it is derived
 *                                               // from gclid/UTMs, else source (duda_form->website, call->phone).
 *   "source_ref": "callrail-CAL123",            // external id; makes ingest idempotent per source
 *   "name":       "Jane Doe",
 *   "email":      "jane@example.com",           // lowercased on insert
 *   "phone":      "(555) 123-4567",             // normalized to digits on insert
 *   "message":    "Looking for a quote",
 *   "utm_source": "google", "utm_medium": "cpc", "utm_campaign": "...",
 *   "utm_term": "...", "utm_content": "...",
 *   "gclid":      "...",
 *   "landing_url": "https://example.com/lp?utm_source=google",
 *   "status":     "mql",                        // defaults to mql; new | mql | sql | disqualified
 *   "status_reason": null,
 *   "occurred_at": "2026-07-24T12:00:00Z"       // defaults to now
 * }
 *
 * Dedupe: with source_ref -> upsert on (source, source_ref). Without it,
 * submissions within 24h matching (client, email) or (client, phone) are
 * absorbed. Response: { ok, lead_id, action: inserted|updated|deduplicated }.
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

  const supabase = reportingClient();

  const clientId = await resolveClient(supabase, payload.client);
  if (!clientId) {
    return json({ error: 'unknown client', client: payload.client ?? null }, 404);
  }

  if (!payload.email && !payload.phone && !payload.name && !payload.source_ref) {
    return json({ error: 'at least one of email, phone, name, source_ref is required' }, 422);
  }

  const { data, error } = await supabase.rpc('ingest_lead', {
    p: { ...payload, client_id: clientId },
  });

  if (error) {
    console.error('ingest_lead error:', error);
    const invalid = error.code === '22023' || /invalid (source|status)/.test(error.message ?? '');
    return json({ error: invalid ? error.message : 'failed to ingest lead' }, invalid ? 422 : 500);
  }

  const result = data as { id: string; action: string };
  return json({ ok: true, lead_id: result.id, action: result.action });
});
