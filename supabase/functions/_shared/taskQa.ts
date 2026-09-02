/**
 * QA pipeline helpers shared by task-qa-dispatch and task-qa-agent.
 * Vocabulary mirrors src/lib/taskQa.ts and the CHECK constraints in
 * migrations 20260902100002 (task_qa_runs) and 20260902120001 (tasks.qa_state).
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

export type QaVerdict = 'approved' | 'approved_with_notes' | 'revisions_required' | 'error';
export const QA_VERDICTS: readonly QaVerdict[] = ['approved', 'approved_with_notes', 'revisions_required', 'error'];

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

export const TASK_QA_SELECT =
  'id, client_id, title, description, status, priority, due_date, acceptance_criteria, ' +
  'qa_target_url, qa_target_state, qa_state, qa_state_changed_at, external_source, external_ref, ' +
  'viktor_thread_path, created_at, updated_at';

export const CLIENT_QA_SELECT = 'id, name, brand_name, website_url, site_id, industry';

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

export const json = (status: number, body: unknown, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', ...extraHeaders },
  });
