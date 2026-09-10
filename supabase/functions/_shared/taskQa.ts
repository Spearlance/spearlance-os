/**
 * QA pipeline helpers shared by task-qa-dispatch and task-qa-agent.
 * Vocabulary mirrors src/lib/taskQa.ts and the CHECK constraints in
 * migrations 20260902100002 (task_qa_runs), 20260902120001 (tasks.qa_state),
 * 20260910100000 (qa_credential_ref) and 20260910100001 (acked_at, closed_by,
 * supersedes / superseded_by).
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

export type QaVerdict = 'approved' | 'approved_with_notes' | 'revisions_required' | 'error';
export const QA_VERDICTS: readonly QaVerdict[] = ['approved', 'approved_with_notes', 'revisions_required', 'error'];

export type QaClosedBy = 'agent' | 'dispatch' | 'reaper' | 'manual' | 'task_closed';

/** qa_state a verdict moves the task into. 'error' hands it back to humans. */
export function qaStateForVerdict(verdict: QaVerdict): string {
  switch (verdict) {
    case 'approved':
    case 'approved_with_notes':
      return 'qa_approved';
    case 'revisions_required':
      return 'revisions_required';
    case 'error':
      return 'ready_for_review';
  }
}

/**
 * Task columns the agent may see. `qa_credential_ref` is only the Vault NAME;
 * the value is resolved by `resolveCredential` on the routes that need it.
 */
export const TASK_QA_SELECT =
  'id, client_id, title, description, status, priority, due_date, acceptance_criteria, ' +
  'qa_target_url, qa_target_state, qa_state, qa_state_changed_at, qa_attempts, qa_credential_ref, ' +
  'external_source, external_ref, viktor_thread_path, created_at, updated_at';

export const CLIENT_QA_SELECT = 'id, name, brand_name, website_url, site_id, industry, hq_city, service_areas';

/** client_locations columns the agent may see (no notes, no internal ids beyond the row id). */
export const LOCATION_QA_SELECT =
  'id, client_id, label, is_primary, business_name, phone, phone_digits, email, ' +
  'address_line1, address_line2, city, state, postal_code, country, hours, hours_note, google_place_id';

export interface ClientLocation {
  id: string;
  client_id: string;
  label: string;
  is_primary: boolean;
  business_name: string | null;
  phone: string | null;
  phone_digits: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  hours: Record<string, Array<{ open: string; close: string }>>;
  hours_note: string | null;
  google_place_id: string | null;
}

/**
 * The canonical NAP the agent compares a page against: the primary location
 * (or the only one). `null` when the client has no location on file, in which
 * case contact-info checks must be reported as unverifiable, never as passed.
 */
export interface ClientNap {
  location_id: string;
  label: string;
  business_name: string;
  phone: string | null;
  phone_digits: string | null;
  email: string | null;
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string;
  };
  address_text: string;
  hours: Record<string, Array<{ open: string; close: string }>> | null;
  hours_note: string | null;
  google_place_id: string | null;
}

function addressText(l: ClientLocation): string {
  const street = [l.address_line1, l.address_line2].map((s) => (s ?? '').trim()).filter(Boolean).join(', ');
  const cityState = [l.city?.trim(), [l.state?.trim(), l.postal_code?.trim()].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  const parts = [street, cityState].filter(Boolean);
  const country = (l.country ?? '').trim().toUpperCase();
  if (country && country !== 'US' && country !== 'USA') parts.push(country);
  return parts.join(', ');
}

export function buildNap(
  client: { name: string; brand_name: string | null } | null,
  locations: ClientLocation[],
): ClientNap | null {
  const primary = locations.find((l) => l.is_primary) ?? locations[0];
  if (!primary) return null;
  const hoursKnown = primary.hours && typeof primary.hours === 'object' && Object.keys(primary.hours).length > 0;
  return {
    location_id: primary.id,
    label: primary.label,
    business_name: primary.business_name || client?.brand_name || client?.name || '',
    phone: primary.phone,
    phone_digits: primary.phone_digits,
    email: primary.email,
    address: {
      line1: primary.address_line1,
      line2: primary.address_line2,
      city: primary.city,
      state: primary.state,
      postal_code: primary.postal_code,
      country: primary.country,
    },
    address_text: addressText(primary),
    hours: hoursKnown ? primary.hours : null,
    hours_note: primary.hours_note,
    google_place_id: primary.google_place_id,
  };
}

/** Locations grouped by client id, primary first. */
export async function loadLocationsByClient(
  supabase: SupabaseClient,
  clientIds: string[],
): Promise<Map<string, ClientLocation[]>> {
  const byClient = new Map<string, ClientLocation[]>();
  if (!clientIds.length) return byClient;
  const { data, error } = await supabase
    .from('client_locations')
    .select(LOCATION_QA_SELECT)
    .in('client_id', clientIds)
    .order('is_primary', { ascending: false })
    .order('label');
  if (error) throw new Error(`load client locations: ${error.message}`);
  for (const row of (data ?? []) as ClientLocation[]) {
    const list = byClient.get(row.client_id) ?? [];
    list.push(row);
    byClient.set(row.client_id, list);
  }
  return byClient;
}

/** Attach `locations` and `nap` to a client row for the agent. */
export function withNap<T extends { id: string; name: string; brand_name: string | null }>(
  client: T,
  locations: ClientLocation[],
): T & { locations: ClientLocation[]; nap: ClientNap | null } {
  return { ...client, locations, nap: buildNap(client, locations) };
}

/** What /queue attaches per task, and what /ack and /claim echo back. */
export const RUN_SUMMARY_SELECT = 'id, task_id, started_at, acked_at, finished_at, verdict, closed_by';

export interface RunSummary {
  id: string;
  task_id: string;
  started_at: string;
  acked_at: string | null;
  finished_at: string | null;
  verdict: string | null;
  closed_by: string | null;
}

/** Constant-time-ish shared-secret check. Empty configured secret = deny. */
export function secretMatches(provided: string | null, expected: string | undefined): boolean {
  if (!expected || !provided) return false;
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/**
 * The context bundle the agent gets for a task: the task, its client (with
 * `locations` and the canonical `nap`), and the Duda site handle.
 */
export async function loadTaskContext(supabase: SupabaseClient, taskId: string) {
  const { data: task, error } = await supabase.from('tasks').select(TASK_QA_SELECT).eq('id', taskId).maybeSingle();
  if (error) throw new Error(`load task: ${error.message}`);
  if (!task) return null;
  const { data: client } = await supabase.from('clients').select(CLIENT_QA_SELECT).eq('id', task.client_id).maybeSingle();
  if (!client) return { task, client: null };
  const locations = (await loadLocationsByClient(supabase, [client.id])).get(client.id) ?? [];
  return { task, client: withNap(client, locations) };
}

/** The task's open run (finished_at IS NULL), newest first, or null. */
export async function loadOpenRun(supabase: SupabaseClient, taskId: string): Promise<RunSummary | null> {
  const { data, error } = await supabase
    .from('task_qa_runs')
    .select(RUN_SUMMARY_SELECT)
    .eq('task_id', taskId)
    .is('finished_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`load open run: ${error.message}`);
  return (data as RunSummary | null) ?? null;
}

/**
 * Resolve a task's qa_credential_ref to its Vault value. Service-role only
 * (the RPC is granted to service_role and refuses non-`qa_cred_` names).
 * Returns null when the task has no ref or the secret does not exist. The
 * caller must never log the result.
 */
export async function resolveCredential(
  supabase: SupabaseClient,
  ref: string | null | undefined,
): Promise<{ ref: string; value: string } | null> {
  if (!ref) return null;
  const { data, error } = await supabase.rpc('task_qa_resolve_credential', { p_ref: ref });
  if (error) {
    console.error(`resolve credential ${ref}: ${error.message}`);
    return null;
  }
  if (typeof data !== 'string' || !data) return null;
  return { ref, value: data };
}

export const json = (status: number, body: unknown, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', ...extraHeaders },
  });
