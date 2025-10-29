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
import { AssigneeSelector } from "../tasks/AssigneeSelector";

interface CreateChannelTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  clientId: string;
  onSuccess?: () => void;
}

interface User {
  id: string;
  name: string;
  avatar_url?: string;
}

export default function CreateChannelTaskDialog({
  open,
  onOpenChange,
  channelId,
  clientId,
  onSuccess,
}: CreateChannelTaskDialogProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState("#6B7280");
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "to_do" as const,
    priority: "normal" as const,
    dueDate: "",
  });

  useEffect(() => {
    if (open && clientId) {
      loadUsers();
    }
  }, [open, clientId]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .contains("associated_client_ids", [clientId]);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load team members",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create the task
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: formData.title,
          description: formData.description || null,
          status: formData.status,
          priority: formData.priority,
          due_date: formData.dueDate || null,
          color: selectedColor,
          client_id: clientId,
          creator_user_id: user.id,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Add assignees
      if (selectedAssignees.length > 0 && task) {
        const assigneeInserts = selectedAssignees.map(userId => ({
          task_id: task.id,
          user_id: userId,
        }));
        
        const { error: assigneeError } = await supabase
          .from("task_assignees")
          .insert(assigneeInserts);
        
        if (assigneeError) throw assigneeError;
      }

      // Link the task to the channel
      const { error: linkError } = await supabase
        .from("marketing_flow_task_links")
        .insert({
          task_id: task.id,
          channel_id: channelId,
          created_by: user.id,
        });

      if (linkError) throw linkError;

      toast({
        title: "Success",
        description: "Task created and linked to channel",
      });
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        status: "to_do",
        priority: "normal",
        dueDate: "",
      });
      setSelectedAssignees([]);
      setSelectedColor("#6B7280");

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating task:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create task",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
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

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
              >
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

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          </div>

            <div className="grid grid-cols-[1fr,auto] gap-4 items-start">
              <div className="space-y-2">
                <Label htmlFor="assignees">Assignees</Label>
                <AssigneeSelector
                  users={users}
                  selectedUserIds={selectedAssignees}
                  onSelectionChange={setSelectedAssignees}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
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
                  <PopoverContent className="w-auto p-3">
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
            </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
