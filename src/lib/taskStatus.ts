import type { Database } from "@/integrations/supabase/types";

/**
 * Single source of truth for task status semantics on the frontend.
 * Mirrors supabase/functions/_shared/taskStatus.ts for the edge functions.
 *
 * "Terminal" statuses are the ones that mean "nobody should be nagged about
 * this any more": completed OR deliberately not doing it. Every "open task"
 * query must exclude them. `blocked` is open (still on the books, just waiting).
 *
 * NOTE: in this app `status` is derived from the kanban column a task sits in
 * (task_columns.mapped_status), so a status only "exists" for a client once a
 * column maps to it. The AI-QA pipeline lives in tasks.qa_state, not here.
 */
export type TaskStatus = Database["public"]["Enums"]["task_status"];

export const TASK_STATUSES: readonly TaskStatus[] = [
  "to_do",
  "in_progress",
  "blocked",
  "done",
  "cancelled",
];

export const TERMINAL_TASK_STATUSES: readonly TaskStatus[] = ["done", "cancelled"];

/** Value for PostgREST `.not("status", "in", CLOSED_STATUS_IN)` filters. */
export const CLOSED_STATUS_IN = "(done,cancelled)";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  to_do: "To Do",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
};

export function isTerminalStatus(status: string | null | undefined): boolean {
  return !!status && (TERMINAL_TASK_STATUSES as readonly string[]).includes(status);
}

export function isOpenStatus(status: string | null | undefined): boolean {
  return !isTerminalStatus(status);
}

/** Human label for any status, including ones this build doesn't know yet. */
export function taskStatusLabel(status: string | null | undefined): string {
  if (!status) return "";
  const known = TASK_STATUS_LABELS[status as TaskStatus];
  if (known) return known;
  return status.replace(/_/g, " ");
}
