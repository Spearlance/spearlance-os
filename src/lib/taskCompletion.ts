import { supabase } from "@/integrations/supabase/client";

export type TaskStatus = "to_do" | "in_progress" | "done";

export interface CompletionColumn {
  id: string;
  mapped_status: TaskStatus;
  display_order: number;
}

export interface CompletionUpdate {
  status: TaskStatus;
  column_id: string | null;
}

/**
 * Pure: given a client's columns, resolve the status + column_id to write when
 * toggling completion. column_id is null when no column maps to the target
 * status (caller then writes status only). This guarantees `status` is always
 * set to the correct enum regardless of how columns are configured.
 */
export function resolveCompletionUpdate(
  columns: CompletionColumn[],
  complete: boolean,
): CompletionUpdate {
  const target: TaskStatus = complete ? "done" : "to_do";
  const match = columns
    .filter((c) => c.mapped_status === target)
    .sort((a, b) => a.display_order - b.display_order)[0];
  return { status: target, column_id: match ? match.id : null };
}

/**
 * Thin DB wrapper: loads the client's columns, resolves the update, and writes
 * BOTH status and column_id so no surface desyncs. Returns the Supabase error
 * (or null on success).
 */
export async function markTaskComplete(
  taskId: string,
  clientId: string,
  complete: boolean,
) {
  const { data: columns } = await supabase
    .from("task_columns")
    .select("id, mapped_status, display_order")
    .eq("client_id", clientId);

  const update = resolveCompletionUpdate((columns as CompletionColumn[]) ?? [], complete);

  const patch: Record<string, unknown> = { status: update.status };
  if (update.column_id) patch.column_id = update.column_id;

  const { error } = await supabase.from("tasks").update(patch).eq("id", taskId);
  return error;
}
