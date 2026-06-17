import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";
import { markTaskComplete } from "@/lib/taskCompletion";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assignee_user_id: string | null;
  client_id: string;
  related_asset_ids: string[];
  related_meeting_ids: string[];
  color: string;
  is_recurring_instance: boolean;
  linked_channel_id: string | null;
  parent_task_id?: string | null;
}

interface WeeklyPlanViewProps {
  onTaskClick: (task: Task) => void;
  onCreateTask: (date: string) => void;
}

export function WeeklyPlanView({ onTaskClick, onCreateTask }: WeeklyPlanViewProps) {
  const { selectedClient } = useClient();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [tasksByDay, setTasksByDay] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId && selectedClient) {
      loadWeeklyTasks();
    }
  }, [currentWeekStart, selectedClient, currentUserId]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadWeeklyTasks = async () => {
    if (!selectedClient || !currentUserId) return;

    setLoading(true);
    try {
      const weekEnd = addDays(currentWeekStart, 6);
      
      const { data: tasks, error } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          status,
          priority,
          due_date,
          color,
          is_recurring_instance,
          assignee_user_id,
          client_id,
          related_asset_ids,
          related_meeting_ids,
          linked_channel_id,
          parent_task_id,
          task_assignees!inner(user_id)
        `)
        .eq("client_id", selectedClient.id)
        .eq("task_assignees.user_id", currentUserId)
        .gte("due_date", format(currentWeekStart, "yyyy-MM-dd"))
        .lte("due_date", format(weekEnd, "yyyy-MM-dd"))
        .order("due_date", { ascending: true });

      if (error) throw error;

      // Group tasks by day
      const grouped: Record<string, Task[]> = {};
      for (let i = 0; i < 7; i++) {
        const day = addDays(currentWeekStart, i);
        const dayKey = format(day, "yyyy-MM-dd");
        grouped[dayKey] = [];
      }

      tasks?.forEach((task: any) => {
        if (task.due_date) {
          grouped[task.due_date] = grouped[task.due_date] || [];
          grouped[task.due_date].push({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            due_date: task.due_date,
            assignee_user_id: task.assignee_user_id,
            client_id: task.client_id,
            related_asset_ids: task.related_asset_ids || [],
            related_meeting_ids: task.related_meeting_ids || [],
            linked_channel_id: task.linked_channel_id,
            color: task.color,
            is_recurring_instance: task.is_recurring_instance,
            parent_task_id: task.parent_task_id,
          });
        }
      });

      setTasksByDay(grouped);
    } catch (error) {
      console.error("Error loading weekly tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickComplete = async (taskId: string, currentStatus: string, clientId: string) => {
    const complete = currentStatus !== "done";
    const error = await markTaskComplete(taskId, clientId, complete);
    if (error) {
      toast.error("Couldn't update task");
      return;
    }
    loadWeeklyTasks();
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart((prev) => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart((prev) => addDays(prev, 7));
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "warning";
      case "normal": return "secondary";
      default: return "outline";
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold ml-4">
            {format(currentWeekStart, "MMM d")} - {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}
          </h3>
        </div>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-3">
        {[0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
          const day = addDays(currentWeekStart, dayOffset);
          const dayKey = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDay[dayKey] || [];
          const isCurrentDay = isToday(day);

          return (
            <Card
              key={dayKey}
              className={cn(
                "min-h-[300px]",
                isCurrentDay && "border-primary border-2"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium">
                      {format(day, "EEE")}
                    </CardTitle>
                    <div className={cn(
                      "text-2xl font-bold",
                      isCurrentDay && "text-primary"
                    )}>
                      {format(day, "d")}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {dayTasks.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {dayTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {isCurrentDay ? "No tasks today! 🎉" : "No tasks"}
                  </div>
                ) : (
                  dayTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-2 rounded-lg border cursor-pointer hover:bg-accent transition-colors"
                      style={{ borderLeftWidth: "3px", borderLeftColor: task.color }}
                      onClick={() => onTaskClick(task)}
                    >
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={task.status === "done"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickComplete(task.id, task.status, task.client_id);
                          }}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn(
                                "text-sm font-medium truncate",
                                task.status === "done" && "line-through text-muted-foreground"
                              )}>
                                {task.title}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{task.title}</p>
                            </TooltipContent>
                          </Tooltip>
                          <div className="flex items-center gap-1 mt-1">
                        {task.priority === 'urgent' && (
                          <Badge variant="destructive" className="text-xs h-5">
                            !
                          </Badge>
                        )}
                        {task.is_recurring_instance && (
                          <Badge variant="outline" className="text-xs h-5">
                            ↻
                          </Badge>
                        )}
                      </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => onCreateTask(dayKey)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add task
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      </div>
    </TooltipProvider>
  );
}
