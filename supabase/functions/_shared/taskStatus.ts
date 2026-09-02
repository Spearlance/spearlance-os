/**
 * Task status semantics for edge functions. Mirrors src/lib/taskStatus.ts.
 *
 * Terminal = completed OR deliberately not doing it. Anything that lists
 * "open", "overdue" or "active" tasks must exclude these, otherwise cancelled
 * tasks keep showing up in digests and action plans.
 */
export const TERMINAL_TASK_STATUSES = ['done', 'cancelled'] as const;

/**
 * Do NOT filter on 'cancelled' inside a Supabase query. A database whose enum
 * doesn't have the value yet (prod before its migration) rejects the literal
 * and the whole query fails. Query with `.neq('status','done')` at most, then
 * apply `isOpenStatus` in JS.
 */

export function isTerminalStatus(status: string | null | undefined): boolean {
  return !!status && (TERMINAL_TASK_STATUSES as readonly string[]).includes(status);
}

export function isOpenStatus(status: string | null | undefined): boolean {
  return !isTerminalStatus(status);
}
