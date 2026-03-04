import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search } from "lucide-react";

interface LinkTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildId: string;
  clientId: string;
  existingTaskIds: string[];
  onSuccess: () => void;
}

export function LinkTaskDialog({
  open,
  onOpenChange,
  buildId,
  clientId,
  existingTaskIds,
  onSuccess,
}: LinkTaskDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["unlinked-tasks", clientId, existingTaskIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, priority")
        .eq("client_id", clientId)
        .not("id", "in", `(${existingTaskIds.length > 0 ? existingTaskIds.join(",") : "00000000-0000-0000-0000-000000000000"})`)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const linkTasks = useMutation({
    mutationFn: async () => {
      const inserts = selectedTaskIds.map((taskId) => ({
        build_id: buildId,
        task_id: taskId,
      }));

      const { error } = await supabase
        .from("website_build_tasks")
        .insert(inserts);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${selectedTaskIds.length} task(s) linked`);
      setSelectedTaskIds([]);
      onSuccess();
    },
    onError: (error) => {
      toast.error("Error linking tasks", { description: error.message });
    },
  });

  const filteredTasks = tasks?.filter((task) =>
    task.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggleTask = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Link Existing Tasks</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-72">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Loading tasks...</p>
            ) : filteredTasks?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No tasks available to link</p>
            ) : (
              <div className="space-y-2 pr-4">
                {filteredTasks?.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                    onClick={() => toggleTask(task.id)}
                  >
                    <Checkbox
                      checked={selectedTaskIds.includes(task.id)}
                      onCheckedChange={() => toggleTask(task.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.title}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {task.status?.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => linkTasks.mutate()}
            disabled={selectedTaskIds.length === 0 || linkTasks.isPending}
          >
            {linkTasks.isPending
              ? "Linking..."
              : `Link ${selectedTaskIds.length} Task${selectedTaskIds.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
