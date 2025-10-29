import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useClient } from "@/contexts/ClientContext";
import { AssigneeSelector } from "./AssigneeSelector";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface User {
  id: string;
  name: string;
  avatar_url?: string;
}

export function CreateTaskDialog({ open, onOpenChange, onSuccess }: CreateTaskDialogProps) {
  const { toast } = useToast();
  const { selectedClient } = useClient();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState("#6B7280");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "to_do",
    priority: "normal",
    due_date: "",
  });

  useEffect(() => {
    if (open && selectedClient) {
      loadUsers();
    }
  }, [open, selectedClient]);

  const loadUsers = async () => {
    if (!selectedClient) return;

    const { data } = await supabase
      .from("profiles")
      .select("id, name, avatar_url")
      .contains("associated_client_ids", [selectedClient.id]);

    if (data) {
      setUsers(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClient) {
      toast({
        title: "Error",
        description: "Please select a client first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Create the task
      const { data: newTask, error } = await supabase
        .from("tasks")
        .insert([{
          client_id: selectedClient.id,
          title: formData.title,
          description: formData.description,
          status: formData.status as "to_do" | "in_progress" | "done",
          priority: formData.priority as "low" | "normal" | "high" | "urgent",
          due_date: formData.due_date || null,
          color: selectedColor,
          creator_user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      // Add assignees
      if (selectedAssignees.length > 0 && newTask) {
        const assigneeInserts = selectedAssignees.map(userId => ({
          task_id: newTask.id,
          user_id: userId,
        }));
        
        const { error: assigneeError } = await supabase
          .from("task_assignees")
          .insert(assigneeInserts);
        
        if (assigneeError) throw assigneeError;
      }

      toast({
        title: "Success",
        description: "Task created successfully",
      });

      onOpenChange(false);
      setFormData({ title: "", description: "", status: "to_do", priority: "normal", due_date: "" });
      setSelectedAssignees([]);
      setSelectedColor("#6B7280");
      onSuccess?.();
    } catch (error) {
      console.error("Error creating task:", error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Task title"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Task description..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="to_do">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="assignees">Assignees</Label>
            <AssigneeSelector
              users={users}
              selectedUserIds={selectedAssignees}
              onSelectionChange={setSelectedAssignees}
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="color">Color</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 justify-start"
                >
                  <div
                    className="w-6 h-6 rounded border mr-2"
                    style={{ backgroundColor: selectedColor }}
                  />
                  <span className="text-sm">Select color</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start">
                <div className="flex gap-2 flex-wrap max-w-[200px]">
                  {["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280"].map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`h-8 w-8 rounded-md border-2 transition-all ${
                        selectedColor === color ? "border-primary scale-110" : "border-gray-200"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedClient}>
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
