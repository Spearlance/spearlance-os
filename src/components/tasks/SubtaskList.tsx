import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useSaveStatus } from "@/hooks/useSaveStatus";

interface Subtask {
  id: string;
  title: string;
  status: string;
  subtask_order: number;
}

interface SubtaskListProps {
  parentTaskId: string;
  subtasks: Subtask[];
  onUpdate: () => void;
}

export const SubtaskList = ({ parentTaskId, subtasks, onUpdate }: SubtaskListProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const { setSaveStatus } = useSaveStatus();

  const completedCount = subtasks.filter((st) => st.status === "done").length;
  const totalCount = subtasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleToggleSubtask = async (subtaskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "done" ? "to_do" : "done";
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", subtaskId);

    if (error) {
      toast.error("Failed to update subtask");
      return;
    }

    onUpdate();
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;

    const { error } = await supabase.from("tasks").insert({
      title: newSubtaskTitle,
      parent_task_id: parentTaskId,
      status: "to_do",
      priority: "normal",
      subtask_order: subtasks.length,
      client_id: (await supabase.from("tasks").select("client_id").eq("id", parentTaskId).single()).data?.client_id,
    });

    if (error) {
      toast.error("Failed to create subtask");
      return;
    }

    setNewSubtaskTitle("");
    setIsAdding(false);
    onUpdate();
    setSaveStatus('saved');
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", subtaskId);

    if (error) {
      toast.error("Failed to delete subtask");
      return;
    }

    onUpdate();
    setSaveStatus('saved');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="gap-2"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <span className="font-medium">
            Subtasks ({completedCount}/{totalCount})
          </span>
        </Button>
        <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Progress */}
      {totalCount > 0 && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">{Math.round(progress)}% complete</p>
        </div>
      )}

      {/* Subtask List */}
      {!isCollapsed && (
        <div className="space-y-2 pl-4 border-l-2 border-border">
          {subtasks
            .sort((a, b) => a.subtask_order - b.subtask_order)
            .map((subtask) => (
              <div key={subtask.id} className="flex items-center gap-2 group">
                <Checkbox
                  checked={subtask.status === "done"}
                  onCheckedChange={() => handleToggleSubtask(subtask.id, subtask.status)}
                />
                <span
                  className={`flex-1 text-sm ${
                    subtask.status === "done" ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {subtask.title}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                  onClick={() => handleDeleteSubtask(subtask.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}

          {/* Add New Subtask */}
          {isAdding && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Subtask title..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddSubtask();
                  if (e.key === "Escape") {
                    setIsAdding(false);
                    setNewSubtaskTitle("");
                  }
                }}
                autoFocus
                className="text-sm"
              />
              <Button size="sm" onClick={handleAddSubtask}>
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAdding(false);
                  setNewSubtaskTitle("");
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
