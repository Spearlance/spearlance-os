import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

interface TaskColumn {
  id: string;
  name: string;
  key: string;
  color: string;
  mapped_status: 'to_do' | 'in_progress' | 'done';
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
  const [taskColumns, setTaskColumns] = useState<TaskColumn[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState("#6B7280");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    column_id: "",
    status: "to_do" as 'to_do' | 'in_progress' | 'done',
    priority: "normal" as const,
    dueDate: "",
  });

  useEffect(() => {
    if (open && clientId) {
      loadUsers();
      loadTaskColumns();
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
      toast.error("Error", { description: "Failed to load team members" });
    }
  };

  const loadTaskColumns = async () => {
    try {
      const { data, error } = await supabase
        .from("task_columns")
        .select("id, name, key, color, mapped_status")
        .eq("client_id", clientId)
        .order("display_order");

      if (error) throw error;
      
      if (data && data.length > 0) {
        setTaskColumns(data as TaskColumn[]);
        // Set default to first column (usually "To Do")
        const firstColumn = data[0] as TaskColumn;
        setFormData(prev => ({
          ...prev,
          column_id: firstColumn.id,
          status: firstColumn.mapped_status
        }));
      }
    } catch (error) {
      console.error("Error loading task columns:", error);
    }
  };

  const handleColumnChange = (columnId: string) => {
    const selectedColumn = taskColumns.find(c => c.id === columnId);
    if (selectedColumn) {
      setFormData(prev => ({
        ...prev,
        column_id: columnId,
        status: selectedColumn.mapped_status
      }));
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
          column_id: formData.column_id || null,
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

      toast.success("Success", { description: "Task created and linked to channel" });

      // Reset form
      setFormData({
        title: "",
        description: "",
        column_id: "",
        status: "to_do",
        priority: "normal",
        dueDate: "",
      });
      setSelectedAssignees([]);
      setSelectedColor("#6B7280");

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error("Error", { description: "Failed to create task" });
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
                value={formData.column_id}
                onValueChange={handleColumnChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status">
                    {formData.column_id && taskColumns.find(c => c.id === formData.column_id) && (
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: taskColumns.find(c => c.id === formData.column_id)?.color }} 
                        />
                        {taskColumns.find(c => c.id === formData.column_id)?.name}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {taskColumns.length > 0 ? (
                    taskColumns.map((column) => (
                      <SelectItem key={column.id} value={column.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: column.color }} 
                          />
                          {column.name}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="to_do">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </>
                  )}
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