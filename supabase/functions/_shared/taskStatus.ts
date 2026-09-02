/**
 * Task status semantics for edge functions. Mirrors src/lib/taskStatus.ts.
 *
 * Terminal = completed OR deliberately not doing it. Anything that lists
 * "open", "overdue" or "active" tasks must exclude these, otherwise cancelled
 * tasks keep showing up in digests and action plans.
 */
export const TERMINAL_TASK_STATUSES = ['done', 'cancelled'] as const;

/** Value for PostgREST `.not('status', 'in', CLOSED_STATUS_IN)` filters. */
export const CLOSED_STATUS_IN = '(done,cancelled)';

export function isTerminalStatus(status: string | null | undefined): boolean {
  return !!status && (TERMINAL_TASK_STATUSES as readonly string[]).includes(status);
}

export function isOpenStatus(status: string | null | undefined): boolean {
  return !isTerminalStatus(status);
}
