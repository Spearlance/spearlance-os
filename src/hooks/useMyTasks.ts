import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  GroupedTasks,
  groupTasksByClient,
  groupTasksByDueDate,
  groupTasksByPriority,
} from "@/lib/myTasksGrouping";

export interface MyTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  color?: string;
  is_recurring?: boolean;
  is_recurring_instance?: boolean;
  client_id: string;
  client_name: string;
  client_logo_url?: string;
  linked_channel_id: string | null;
  linked_channel_name?: string;
  linked_page_name?: string;
  subtask_count?: number;
  completed_subtasks?: number;
  tags?: Array<{ id: string; name: string; color: string }>;
  assignees?: Array<{ id: string; name: string; avatar_url?: string }>;
}

export type GroupBy = "client" | "due_date" | "priority";

export function useMyTasks() {
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      // Get all task IDs assigned to the current user
      const { data: assignedTasks, error: assignedError } = await supabase
        .from("task_assignees")
        .select("task_id")
        .eq("user_id", user.id);

      if (assignedError) throw assignedError;

      if (!assignedTasks || assignedTasks.length === 0) {
        setTasks([]);
        setLoading(false);
        return;
      }

      const taskIds = assignedTasks.map(a => a.task_id);

      // Fetch tasks with client info
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          status,
          priority,
          due_date,
          color,
          is_recurring,
          is_recurring_instance,
          client_id,
          linked_channel_id,
          clients (
            id,
            name,
            logo_url
          )
        `)
        .in("id", taskIds)
        .is("parent_task_id", null)
        .neq("status", "done");

      if (tasksError) throw tasksError;

      type RawTask = {
        id: string;
        title: string;
        description: string | null;
        status: string | null;
        priority: string | null;
        due_date: string | null;
        color: string | null;
        is_recurring: boolean | null;
        is_recurring_instance: boolean | null;
        client_id: string;
        linked_channel_id: string | null;
        clients: { id: string; name: string; logo_url: string | null } | null;
      };

      // Enrich tasks with additional data
      const enrichedTasks: MyTask[] = await Promise.all(
        (tasksData || []).map(async (task: RawTask) => {
          // Load subtasks
          const { data: subtasks } = await supabase
            .from("tasks")
            .select("id, status")
            .eq("parent_task_id", task.id);

          // Load tags
          const { data: tagLinks } = await supabase
            .from("task_tag_links")
            .select(`
              task_tags (id, name, color)
            `)
            .eq("task_id", task.id);

          // Load channel name if linked
          let linkedChannelName: string | undefined;
          if (task.linked_channel_id) {
            const { data: channel } = await supabase
              .from("marketing_flow_channels")
              .select("name")
              .eq("id", task.linked_channel_id)
              .maybeSingle();
            linkedChannelName = channel?.name;
          }

          // Load linked page name if any
          let linkedPageName: string | undefined;
          const { data: pageLink } = await supabase
            .from("website_build_tasks")
            .select("page_id, website_build_pages!inner(name)")
            .eq("task_id", task.id)
            .not("page_id", "is", null)
            .limit(1)
            .maybeSingle();
          
          if (pageLink && pageLink.website_build_pages) {
            const buildPage = pageLink.website_build_pages as { name: string };
            linkedPageName = buildPage.name;
          }

          return {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            due_date: task.due_date,
            color: task.color,
            is_recurring: task.is_recurring,
            is_recurring_instance: task.is_recurring_instance,
            client_id: task.client_id,
            client_name: task.clients?.name || "Unknown Client",
            client_logo_url: task.clients?.logo_url,
            linked_channel_id: task.linked_channel_id,
            linked_channel_name: linkedChannelName,
            linked_page_name: linkedPageName,
            subtask_count: subtasks?.length || 0,
            completed_subtasks: subtasks?.filter(st => st.status === "done").length || 0,
            tags: tagLinks?.map(tl => tl.task_tags).filter(Boolean) || [],
          };
        })
      );

      setTasks(enrichedTasks);
    } catch (err) {
      console.error("Error fetching my tasks:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const groupByClient = useMemo((): GroupedTasks => groupTasksByClient(tasks), [tasks]);

  const groupByDueDate = useMemo((): GroupedTasks => groupTasksByDueDate(tasks), [tasks]);

  const groupByPriority = useMemo((): GroupedTasks => groupTasksByPriority(tasks), [tasks]);

  const getGrouped = useCallback((groupBy: GroupBy): GroupedTasks => {
    switch (groupBy) {
      case "client":
        return groupByClient;
      case "due_date":
        return groupByDueDate;
      case "priority":
        return groupByPriority;
      default:
        return groupByClient;
    }
  }, [groupByClient, groupByDueDate, groupByPriority]);

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    groupByClient,
    groupByDueDate,
    groupByPriority,
    getGrouped,
    totalCount: tasks.length,
  };
}
