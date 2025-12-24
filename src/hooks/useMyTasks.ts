import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isToday, isTomorrow, isThisWeek, isAfter, isBefore, startOfToday, addWeeks } from "date-fns";

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
  subtask_count?: number;
  completed_subtasks?: number;
  tags?: Array<{ id: string; name: string; color: string }>;
  assignees?: Array<{ id: string; name: string; avatar_url?: string }>;
}

export type GroupBy = "client" | "due_date" | "priority";

interface GroupedTasks {
  [key: string]: {
    label: string;
    tasks: MyTask[];
    color?: string;
  };
}

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

      // Enrich tasks with additional data
      const enrichedTasks: MyTask[] = await Promise.all(
        (tasksData || []).map(async (task: any) => {
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
              .single();
            linkedChannelName = channel?.name;
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

  const groupByClient = useMemo((): GroupedTasks => {
    const grouped: GroupedTasks = {};
    
    tasks.forEach(task => {
      const key = task.client_id;
      if (!grouped[key]) {
        grouped[key] = {
          label: task.client_name,
          tasks: [],
        };
      }
      grouped[key].tasks.push(task);
    });

    // Sort tasks within each group by due date
    Object.values(grouped).forEach(group => {
      group.tasks.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });
    });

    return grouped;
  }, [tasks]);

  const groupByDueDate = useMemo((): GroupedTasks => {
    const today = startOfToday();
    const nextWeekEnd = addWeeks(today, 1);

    const grouped: GroupedTasks = {
      overdue: { label: "Overdue", tasks: [], color: "hsl(var(--destructive))" },
      today: { label: "Today", tasks: [], color: "hsl(var(--primary))" },
      tomorrow: { label: "Tomorrow", tasks: [], color: "hsl(var(--warning))" },
      this_week: { label: "This Week", tasks: [], color: "hsl(var(--muted-foreground))" },
      next_week: { label: "Next Week", tasks: [], color: "hsl(var(--muted-foreground))" },
      later: { label: "Later", tasks: [], color: "hsl(var(--muted-foreground))" },
      no_date: { label: "No Due Date", tasks: [], color: "hsl(var(--muted-foreground))" },
    };

    tasks.forEach(task => {
      if (!task.due_date) {
        grouped.no_date.tasks.push(task);
        return;
      }

      const dueDate = new Date(task.due_date);

      if (isBefore(dueDate, today)) {
        grouped.overdue.tasks.push(task);
      } else if (isToday(dueDate)) {
        grouped.today.tasks.push(task);
      } else if (isTomorrow(dueDate)) {
        grouped.tomorrow.tasks.push(task);
      } else if (isThisWeek(dueDate, { weekStartsOn: 1 })) {
        grouped.this_week.tasks.push(task);
      } else if (isBefore(dueDate, nextWeekEnd)) {
        grouped.next_week.tasks.push(task);
      } else {
        grouped.later.tasks.push(task);
      }
    });

    return grouped;
  }, [tasks]);

  const groupByPriority = useMemo((): GroupedTasks => {
    const grouped: GroupedTasks = {
      urgent: { label: "Urgent", tasks: [], color: "#EF4444" },
      high: { label: "High", tasks: [], color: "#F59E0B" },
      normal: { label: "Normal", tasks: [], color: "#10B981" },
      low: { label: "Low", tasks: [], color: "#6B7280" },
    };

    tasks.forEach(task => {
      const priority = task.priority || "normal";
      if (grouped[priority]) {
        grouped[priority].tasks.push(task);
      }
    });

    // Sort tasks within each group by due date
    Object.values(grouped).forEach(group => {
      group.tasks.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });
    });

    return grouped;
  }, [tasks]);

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
