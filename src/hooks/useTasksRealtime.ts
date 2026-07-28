import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseTasksRealtimeOptions {
  /** Restrict task events to a single client's board. Omit for all accessible clients. */
  clientId?: string;
  enabled?: boolean;
}

/**
 * Subscribes to Postgres change events on `tasks` and `task_assignees` so
 * staff (My Tasks) and client boards stay in sync without manual refreshes.
 * Events are debounced into a single onChange call since one user action
 * (e.g. completing a task with subtasks) can emit several changes at once.
 * RLS applies to the realtime stream, so users only receive events for rows
 * they can already read.
 */
export function useTasksRealtime(onChange: () => void, options: UseTasksRealtimeOptions = {}) {
  const { clientId, enabled = true } = options;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;

    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const notify = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => onChangeRef.current(), 500);
    };

    const channel = supabase
      .channel(`tasks-sync-${clientId ?? "all"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          ...(clientId ? { filter: `client_id=eq.${clientId}` } : {}),
        },
        notify
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_assignees" },
        notify
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [clientId, enabled]);
}
