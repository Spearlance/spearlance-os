/**
 * hubspot-status — webhook receiver for HubSpot lifecycle stage changes.
 *
 * Wire a HubSpot workflow (or a Zapier zap: HubSpot trigger -> Webhooks POST)
 * to this endpoint when a contact's lifecycle stage changes.
 *
 * POST with headers:
 *   x-spearlance-key: <WEBHOOK_SECRET>
 *   Content-Type: application/json
 *
 * Payload:
 * {
 *   "email":              "jane@example.com",          // required, HubSpot join key
 *   "lifecycle_stage":    "salesqualifiedlead",        // required
 *   "hubspot_contact_id": "12345",                     // optional but recommended
 *   "client":             "invictus-northwest-group"   // optional; required if no lead matches the email
 * }
 *
 * Stages mapping to SQL: salesqualifiedlead, opportunity, customer, evangelist.
 * Other stages are acknowledged and ignored (action: 'ignored').
 *
 * Matching: newest reporting.leads row for (client +) email. Found -> status
 * 'sql', sql_at, hubspot_contact_id, status_reason 'hubspot lifecycle sync'.
 * Not found -> a new lead is inserted with source 'hubspot' so nothing is lost
 * (client required for that). Ambiguous email across clients without a client
 * param -> 409.
 */
import { corsHeaders, json, reportingClient, requireSecret, resolveClient } from '../_shared/reporting.ts';

const SQL_STAGES = new Set(['salesqualifiedlead', 'opportunity', 'customer', 'evangelist']);

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

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const stage = typeof payload.lifecycle_stage === 'string'
    ? payload.lifecycle_stage.trim().toLowerCase().replace(/[\s_-]/g, '')
    : '';
  const hubspotContactId = typeof payload.hubspot_contact_id === 'string'
    ? payload.hubspot_contact_id.trim()
    : null;

  if (!email) return json({ error: 'email is required' }, 422);
  if (!stage) return json({ error: 'lifecycle_stage is required' }, 422);

  if (!SQL_STAGES.has(stage)) {
    return json({ ok: true, action: 'ignored', reason: `stage '${stage}' does not map to sql` });
  }

  const supabase = reportingClient();

  let clientId: string | null = null;
  if (payload.client) {
    clientId = await resolveClient(supabase, payload.client);
    if (!clientId) {
      return json({ error: 'unknown client', client: payload.client }, 404);
    }
  }

  let query = supabase
    .from('leads')
    .select('id, client_id, status, mql_at, sql_at')
    .eq('email', email)
    .order('created_at', { ascending: false });
  if (clientId) query = query.eq('client_id', clientId);

  const { data: leads, error: findError } = await query;
  if (findError) {
    console.error('lead lookup error:', findError);
    return json({ error: 'failed to look up lead' }, 500);
  }

  if (leads && leads.length > 0) {
    const distinctClients = new Set(leads.map((l) => l.client_id));
    if (!clientId && distinctClients.size > 1) {
      return json({
        error: 'email matches leads for multiple clients; pass client to disambiguate',
        clients: [...distinctClients],
      }, 409);
    }

    const lead = leads.find((l) => l.status !== 'sql') ?? leads[0];
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        status: 'sql',
        sql_at: lead.sql_at ?? now,
        mql_at: lead.mql_at ?? now,
        hubspot_contact_id: hubspotContactId ?? undefined,
        status_reason: 'hubspot lifecycle sync',
      })
      .eq('id', lead.id);

    if (updateError) {
      console.error('lead update error:', updateError);
      return json({ error: 'failed to update lead' }, 500);
    }
    return json({ ok: true, action: 'updated', lead_id: lead.id });
  }

  // No matching lead — insert one with source 'hubspot' so nothing is lost.
  if (!clientId) {
    return json({
      error: 'no lead matches this email; pass client so the lead can be created',
    }, 422);
  }

  const { data, error: ingestError } = await supabase.rpc('ingest_lead', {
    p: {
      client_id: clientId,
      source: 'hubspot',
      source_ref: hubspotContactId,
      email,
      status: 'sql',
      status_reason: 'hubspot lifecycle sync',
      hubspot_contact_id: hubspotContactId,
    },
  });

  if (ingestError) {
    console.error('ingest_lead error:', ingestError);
    return json({ error: 'failed to create lead' }, 500);
  }

  const result = data as { id: string; action: string };
  return json({ ok: true, action: 'created', lead_id: result.id });
});
