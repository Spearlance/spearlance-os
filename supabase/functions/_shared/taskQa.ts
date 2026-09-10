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

export const CLIENT_QA_SELECT = 'id, name, brand_name, website_url, site_id, industry';

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

/** The context bundle the agent gets for a task: the task, its client, and the Duda site handle. */
export async function loadTaskContext(supabase: SupabaseClient, taskId: string) {
  const { data: task, error } = await supabase.from('tasks').select(TASK_QA_SELECT).eq('id', taskId).maybeSingle();
  if (error) throw new Error(`load task: ${error.message}`);
  if (!task) return null;
  const { data: client } = await supabase.from('clients').select(CLIENT_QA_SELECT).eq('id', task.client_id).maybeSingle();
  return { task, client };
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
