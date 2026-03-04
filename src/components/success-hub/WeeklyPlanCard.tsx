import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { SuccessHubTask } from "@/hooks/useSuccessHub";

interface WeeklyPlanCardProps {
  tasks: SuccessHubTask[];
  onTaskClick?: (taskId: string) => void;
}

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const statusConfig = {
  to_do: { icon: Circle, label: 'To Do', className: 'text-muted-foreground' },
  in_progress: { icon: Clock, label: 'In Progress', className: 'text-blue-500' },
  done: { icon: CheckCircle2, label: 'Done', className: 'text-emerald-500' },
};

export function WeeklyPlanCard({ tasks, onTaskClick }: WeeklyPlanCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">This Week's Plan</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No tasks scheduled for this week</p>
        ) : (
          <div className="space-y-3">
            {tasks.slice(0, 7).map((task) => {
              const StatusIcon = statusConfig[task.status as keyof typeof statusConfig]?.icon || Circle;
              const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
              
              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick?.(task.id)}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <StatusIcon className={cn(
                      "h-5 w-5 flex-shrink-0",
                      statusConfig[task.status as keyof typeof statusConfig]?.className
                    )} />
                    <span className="font-medium truncate">{task.title}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {task.assignee && (
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={task.assignee.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {getInitials(task.assignee.name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    {task.due_date && (
                      <Badge 
                        variant={isOverdue ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {format(new Date(task.due_date), 'MMM d')}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
            
            {tasks.length > 7 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{tasks.length - 7} more tasks
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
