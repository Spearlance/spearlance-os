import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useClient } from "@/contexts/ClientContext";
import { AssigneeSelector } from "./AssigneeSelector";
import { WatcherSelector } from "./WatcherSelector";
import { Repeat } from "lucide-react";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Receives the new task's id so callers can link it back to a source object. */
  onSuccess?: (taskId?: string) => void;
  /** Optional pre-fill values (e.g. when creating a task from a site comment). */
  initialTitle?: string;
  initialDescription?: string;
  initialDueDate?: string;
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

export function CreateTaskDialog({ open, onOpenChange, onSuccess, initialTitle, initialDescription, initialDueDate }: CreateTaskDialogProps) {
  const { selectedClient } = useClient();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [taskColumns, setTaskColumns] = useState<TaskColumn[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedWatchers, setSelectedWatchers] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState("#6B7280");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('weekly');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [endCondition, setEndCondition] = useState<'never' | 'on_date' | 'after_occurrences'>('never');
  const [endDate, setEndDate] = useState('');
  const [maxOccurrences, setMaxOccurrences] = useState(10);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    column_id: "",
    status: "to_do" as 'to_do' | 'in_progress' | 'done',
    priority: "normal",
    due_date: "",
  });

  useEffect(() => {
    if (open && selectedClient) {
      loadUsers();
      loadTaskColumns();
    }
  }, [open, selectedClient]);

  // Seed the form from caller-provided values when the dialog opens. Falls back
  // to existing state so the normal (blank) create flow is unaffected.
  useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        title: initialTitle ?? prev.title,
        description: initialDescription ?? prev.description,
        due_date: initialDueDate ?? prev.due_date,
      }));
    }
  }, [open, initialTitle, initialDescription, initialDueDate]);

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

  const loadTaskColumns = async () => {
    if (!selectedClient) return;

    const { data } = await supabase
      .from("task_columns")
      .select("id, name, key, color, mapped_status")
      .eq("client_id", selectedClient.id)
      .order("display_order");

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
    
    if (!selectedClient) {
      toast.error("Error", { description: "Please select a client first" });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Prepare recurrence pattern
      let recurrencePattern = null;
      let nextOccurrence = null;
      
      if (isRecurring && formData.due_date) {
        recurrencePattern = {
          frequency: recurrenceFrequency,
          interval: recurrenceInterval,
          ...(recurrenceFrequency === 'weekly' && selectedDaysOfWeek.length > 0 && { days_of_week: selectedDaysOfWeek }),
          ...(recurrenceFrequency === 'monthly' && { day_of_month: dayOfMonth }),
          ...(endCondition === 'on_date' && endDate && { end_date: endDate }),
          ...(endCondition === 'after_occurrences' && { max_occurrences: maxOccurrences }),
        };
        
        // Set next occurrence to the due date
        nextOccurrence = formData.due_date;
      }

      // Create the task
      const { data: newTask, error } = await supabase
        .from("tasks")
        .insert([{
          client_id: selectedClient.id,
          title: formData.title,
          description: formData.description,
          status: formData.status,
          column_id: formData.column_id || null,
          priority: formData.priority as "low" | "normal" | "high" | "urgent",
          due_date: formData.due_date || null,
          color: selectedColor,
          creator_user_id: user.id,
          is_recurring: isRecurring,
          recurrence_pattern: recurrencePattern,
          next_occurrence_date: nextOccurrence,
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

      // Add watchers
      if (selectedWatchers.length > 0 && newTask) {
        const watcherInserts = selectedWatchers.map(userId => ({
          task_id: newTask.id,
          user_id: userId,
          notify_on_complete: true,
          created_by: user.id,
        }));
        
        const { error: watcherError } = await supabase
          .from("task_watchers")
          .insert(watcherInserts);
        
        if (watcherError) throw watcherError;
      }

      toast.success("Task created successfully");

      onOpenChange(false);
      setFormData({ title: "", description: "", column_id: "", status: "to_do", priority: "normal", due_date: "" });
      setSelectedAssignees([]);
      setSelectedWatchers([]);
      setSelectedColor("#6B7280");
      setIsRecurring(false);
      setSelectedDaysOfWeek([]);
      setEndDate('');
      onSuccess?.(newTask?.id);
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
            <Label htmlFor="watchers">Notify on completion</Label>
            <WatcherSelector
              users={users}
              selectedUserIds={selectedWatchers}
              onSelectionChange={setSelectedWatchers}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              These users will be notified when this task is completed
            </p>
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

          {/* Recurring Task Section */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
              />
              <Label htmlFor="recurring" className="flex items-center gap-2 cursor-pointer">
                <Repeat className="h-4 w-4" />
                Make this a recurring task
              </Label>
            </div>

            {isRecurring && (
              <div className="space-y-3 pl-6 border-l-2 border-muted">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select value={recurrenceFrequency} onValueChange={(value: any) => setRecurrenceFrequency(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="interval">Every</Label>
                    <Input
                      id="interval"
                      type="number"
                      min="1"
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>

                {recurrenceFrequency === 'weekly' && (
                  <div>
                    <Label>Days of Week</Label>
                    <div className="flex gap-2 flex-wrap mt-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                        <Button
                          key={day}
                          type="button"
                          variant={selectedDaysOfWeek.includes(index) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setSelectedDaysOfWeek(prev =>
                              prev.includes(index)
                                ? prev.filter(d => d !== index)
                                : [...prev, index]
                            );
                          }}
                        >
                          {day}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {recurrenceFrequency === 'monthly' && (
                  <div>
                    <Label htmlFor="dayOfMonth">Day of Month</Label>
                    <Input
                      id="dayOfMonth"
                      type="number"
                      min="1"
                      max="31"
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
                    />
                  </div>
                )}

                <div>
                  <Label>End Condition</Label>
                  <RadioGroup value={endCondition} onValueChange={(value: any) => setEndCondition(value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="never" id="never" />
                      <Label htmlFor="never" className="cursor-pointer">Never</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="on_date" id="on_date" />
                      <Label htmlFor="on_date" className="cursor-pointer">On date</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="after_occurrences" id="after_occurrences" />
                      <Label htmlFor="after_occurrences" className="cursor-pointer">After occurrences</Label>
                    </div>
                  </RadioGroup>
                </div>

                {endCondition === 'on_date' && (
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                )}

                {endCondition === 'after_occurrences' && (
                  <div>
                    <Label htmlFor="maxOccurrences">Number of Occurrences</Label>
                    <Input
                      id="maxOccurrences"
                      type="number"
                      min="1"
                      value={maxOccurrences}
                      onChange={(e) => setMaxOccurrences(parseInt(e.target.value) || 10)}
                    />
                  </div>
                )}
              </div>
            )}
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