import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Link2, Unlink, CheckSquare, ExternalLink } from "lucide-react";
import { LinkTaskDialog } from "./LinkTaskDialog";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface BuildLinkedTasksTabProps {
  buildId: string;
  clientId: string;
}

const statusColors: Record<string, string> = {
  to_do: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  done: "bg-green-500/10 text-green-500 border-green-500/20",
};

export function BuildLinkedTasksTab({ buildId, clientId }: BuildLinkedTasksTabProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: linkedTasks, isLoading } = useQuery({
    queryKey: ["website-build-tasks", buildId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_build_tasks")
        .select(`
          id,
          task_id,
          task:tasks (
            id,
            title,
            status,
            priority,
            due_date
          )
        `)
        .eq("build_id", buildId);

      if (error) throw error;
      return data;
    },
  });

  const unlinkTask = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from("website_build_tasks")
        .delete()
        .eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-build-tasks", buildId] });
      toast({ title: "Task unlinked" });
    },
    onError: (error) => {
      toast({
        title: "Error unlinking task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTaskCreated = async (taskId: string) => {
    // Link the newly created task to this build
    const { error } = await supabase
      .from("website_build_tasks")
      .insert({ build_id: buildId, task_id: taskId });

    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["website-build-tasks", buildId] });
    }
    setCreateDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const completedTasks = linkedTasks?.filter(lt => lt.task?.status === "done").length || 0;
  const totalTasks = linkedTasks?.length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">
            Linked Tasks ({totalTasks})
          </h3>
          <p className="text-sm text-muted-foreground">
            {completedTasks} of {totalTasks} completed
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLinkDialogOpen(true)}>
            <Link2 className="h-4 w-4 mr-2" />
            Link Existing
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        </div>
      </div>

      {linkedTasks?.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-4">No tasks linked to this build yet</p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => setLinkDialogOpen(true)}>
              <Link2 className="h-4 w-4 mr-2" />
              Link Existing Task
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Task
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {linkedTasks?.map((link) => (
            <Card key={link.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{link.task?.title}</p>
                    {link.task?.due_date && (
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(link.task.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={statusColors[link.task?.status || "to_do"]}
                  >
                    {link.task?.status?.replace("_", " ")}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/tasks?selected=${link.task?.id}`)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => unlinkTask.mutate(link.id)}
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <LinkTaskDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        buildId={buildId}
        clientId={clientId}
        existingTaskIds={linkedTasks?.map(lt => lt.task_id) || []}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["website-build-tasks", buildId] });
          setLinkDialogOpen(false);
        }}
      />

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
