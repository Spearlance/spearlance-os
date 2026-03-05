import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";

interface PageTasksTabProps {
  pageId: string;
  buildId: string;
  clientId: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  color?: string;
  is_recurring?: boolean;
  is_recurring_instance?: boolean;
  assignees?: Array<{ id: string; name: string; avatar_url?: string }>;
  tags?: Array<{ id: string; name: string; color: string }>;
  subtask_count?: number;
  completed_subtasks?: number;
  client_id: string;
}

export default function PageTasksTab({ pageId, buildId, clientId }: PageTasksTabProps) {
  const queryClient = useQueryClient();
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Fetch tasks linked to this page with full details
  const { data: pageTasks = [], isLoading, refetch } = useQuery({
    queryKey: ["page-tasks", pageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_build_tasks")
        .select("id, task_id")
        .eq("page_id", pageId);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const taskIds = data.map(t => t.task_id);

      // Fetch full task details
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .in("id", taskIds);

      if (tasksError) throw tasksError;

      // Enrich tasks with assignees, subtasks, and tags
      const enrichedTasks = await Promise.all(
        (tasks || []).map(async (task) => {
          // Load assignees
          const { data: taskAssignees } = await supabase
            .from("task_assignees")
            .select("user_id")
            .eq("task_id", task.id);

          let assigneeProfiles: any[] = [];
          if (taskAssignees && taskAssignees.length > 0) {
            const userIds = taskAssignees.map(ta => ta.user_id);
            const { data: profilesData } = await supabase
              .from("profiles")
              .select("id, name, avatar_url")
              .in("id", userIds);
            assigneeProfiles = profilesData || [];
          }

          // Load subtasks
          const { data: subtasks } = await supabase
            .from("tasks")
            .select("id, status")
            .eq("parent_task_id", task.id);

          // Load tags
          const { data: tagLinks } = await supabase
            .from("task_tag_links")
            .select("task_tags (id, name, color)")
            .eq("task_id", task.id);

          return {
            ...task,
            assignees: assigneeProfiles.map((profile) => ({
              id: profile.id,
              name: profile.name || "Unknown User",
              avatar_url: profile.avatar_url || null,
            })),
            subtask_count: subtasks?.length || 0,
            completed_subtasks: subtasks?.filter(st => st.status === "done").length || 0,
            tags: tagLinks?.map(tl => tl.task_tags).filter(Boolean) || [],
          };
        })
      );

      return enrichedTasks as Task[];
    },
  });

  // Fetch available tasks for linking (not already linked to this page)
  const { data: availableTasks = [] } = useQuery({
    queryKey: ["available-tasks-for-page", buildId, pageId],
    queryFn: async () => {
      // Get tasks for this client that aren't linked to this page
      const { data: linkedTaskIds } = await supabase
        .from("website_build_tasks")
        .select("task_id")
        .eq("page_id", pageId);

      const linkedIds = linkedTaskIds?.map((t) => t.task_id) || [];

      const query = supabase
        .from("tasks")
        .select("id, title, status, priority")
        .eq("client_id", clientId);

      // Only add the NOT IN filter if there are linked IDs
      if (linkedIds.length > 0) {
        const { data, error } = await query.not("id", "in", `(${linkedIds.join(",")})`);
        if (error) throw error;
        return data || [];
      } else {
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      }
    },
    enabled: isLinkOpen,
  });

  // Link existing task to page
  const linkTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("website_build_tasks")
        .insert({
          build_id: buildId,
          task_id: taskId,
          page_id: pageId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-tasks", pageId] });
      queryClient.invalidateQueries({ queryKey: ["available-tasks-for-page", buildId, pageId] });
      setIsLinkOpen(false);
      toast.success("Task linked to page");
    },
    onError: () => {
      toast.error("Failed to link task");
    },
  });

  // Handle new task creation - link it to this page
  const handleTaskCreated = async () => {
    // Get the most recently created task for this client
    const { data: latestTask } = await supabase
      .from("tasks")
      .select("id")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestTask) {
      // Link the task to this page
      await supabase
        .from("website_build_tasks")
        .insert({
          build_id: buildId,
          task_id: latestTask.id,
          page_id: pageId,
        });
    }

    refetch();
    setShowCreateDialog(false);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleTaskUpdate = () => {
    refetch();
    setSelectedTask(null);
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading tasks...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" className="gap-2" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4" />
          New Task
        </Button>

        <Dialog open={isLinkOpen} onOpenChange={setIsLinkOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-2">
              <Link2 className="h-4 w-4" />
              Link Existing
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link Existing Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {availableTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No available tasks to link
                </p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {availableTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => linkTask.mutate(task.id)}
                    >
                      <div>
                        <p className="font-medium text-sm">{task.title}</p>
                        <span className="text-xs text-muted-foreground">
                          {task.status.replace("_", " ")}
                        </span>
                      </div>
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {pageTasks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No tasks for this page yet</p>
          <p className="text-xs mt-1">Create a task or link an existing one</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {pageTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => handleTaskClick(task)}
            />
          ))}
        </div>
      )}

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleTaskCreated}
      />

      {/* Task Drawer */}
      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
          isAdminOrFMM={true}
        />
      )}
    </div>
  );
}
