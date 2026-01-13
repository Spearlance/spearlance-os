import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Link2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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
  priority: string | null;
}

export default function PageTasksTab({ pageId, buildId, clientId }: PageTasksTabProps) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "" });

  // Fetch tasks linked to this page
  const { data: pageTasks = [], isLoading } = useQuery({
    queryKey: ["page-tasks", pageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_build_tasks")
        .select("id, task_id, tasks:task_id(id, title, description, status, priority)")
        .eq("page_id", pageId);

      if (error) throw error;
      return data?.map((t) => t.tasks).filter(Boolean) as Task[];
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

      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, priority")
        .eq("client_id", clientId)
        .not("id", "in", linkedIds.length > 0 ? `(${linkedIds.join(",")})` : "(00000000-0000-0000-0000-000000000000)");

      if (error) throw error;
      return data || [];
    },
    enabled: isLinkOpen,
  });

  // Create new task and link to page
  const createTask = useMutation({
    mutationFn: async (taskData: { title: string; description: string }) => {
      // First create the task
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: taskData.title,
          description: taskData.description,
          client_id: clientId,
          status: "to_do",
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Then link it to the page
      const { error: linkError } = await supabase
        .from("website_build_tasks")
        .insert({
          build_id: buildId,
          task_id: task.id,
          page_id: pageId,
        });

      if (linkError) throw linkError;
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-tasks", pageId] });
      setNewTask({ title: "", description: "" });
      setIsCreateOpen(false);
      toast.success("Task created and linked");
    },
    onError: () => {
      toast.error("Failed to create task");
    },
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

  // Toggle task status
  const toggleStatus = useMutation({
    mutationFn: async ({ taskId, currentStatus }: { taskId: string; currentStatus: string }) => {
      const newStatus = currentStatus === "done" ? "to_do" : "done";
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-tasks", pageId] });
    },
  });

  const priorityColors: Record<string, string> = {
    low: "bg-slate-100 text-slate-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800",
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading tasks...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Page Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="Task title..."
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Task description..."
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => createTask.mutate(newTask)}
                disabled={!newTask.title.trim() || createTask.isPending}
              >
                {createTask.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
                        <Badge variant="outline" className="text-xs mt-1">
                          {task.status}
                        </Badge>
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
        <div className="space-y-2">
          {pageTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50"
            >
              <Checkbox
                checked={task.status === "done"}
                onCheckedChange={() => toggleStatus.mutate({ taskId: task.id, currentStatus: task.status })}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {task.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {task.status.replace("_", " ")}
                  </Badge>
                  {task.priority && (
                    <Badge className={`text-xs ${priorityColors[task.priority] || ""}`}>
                      {task.priority}
                    </Badge>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <a href={`/tasks?selected=${task.id}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
