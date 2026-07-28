import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, Building2, Calendar } from "lucide-react";
import { format, isToday, isTomorrow, differenceInCalendarDays, startOfToday } from "date-fns";
import { MyTask } from "@/hooks/useMyTasks";
import { ClientTaskSummary, isOverdue } from "@/lib/myTasksGrouping";
import { cn } from "@/lib/utils";

interface ClientTasksCardProps {
  summary: ClientTaskSummary;
  onTaskClick: (task: MyTask) => void;
  onToggleComplete: (task: MyTask, complete: boolean) => void;
  onSeeAll: () => void;
}

const MAX_VISIBLE_TASKS = 5;

const priorityColors: Record<string, string> = {
  urgent: "#EF4444",
  high: "#F59E0B",
  normal: "#10B981",
  low: "#6B7280",
};

const getInitials = (name: string) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getDueLabel = (task: MyTask) => {
  if (!task.due_date) return { label: "No date", className: "text-muted-foreground" };
  const date = new Date(task.due_date);
  if (isOverdue(task)) {
    const daysLate = differenceInCalendarDays(startOfToday(), date);
    return {
      label: `${format(date, "MMM d")} · ${daysLate}d late`,
      className: "text-destructive font-medium",
    };
  }
  if (isToday(date)) return { label: "Today", className: "text-primary font-medium" };
  if (isTomorrow(date)) return { label: "Tomorrow", className: "text-warning" };
  return { label: format(date, "MMM d"), className: "text-muted-foreground" };
};

const TaskRow = ({
  task,
  onClick,
  onToggleComplete,
}: {
  task: MyTask;
  onClick: () => void;
  onToggleComplete: (task: MyTask, complete: boolean) => void;
}) => {
  const due = getDueLabel(task);
  const dotColor = task.color || priorityColors[task.priority] || priorityColors.normal;

  return (
    <div
      className="flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 cursor-pointer hover:bg-muted/60 transition-colors"
      onClick={onClick}
    >
      <Checkbox
        checked={task.status === "done"}
        onClick={(e) => e.stopPropagation()}
        onCheckedChange={(v) => onToggleComplete(task, v === true)}
        aria-label="Mark task complete"
        className="shrink-0"
      />
      <span
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: dotColor }}
        aria-hidden
      />
      <span className="flex-1 min-w-0 text-sm truncate">{task.title}</span>
      <span className={cn("flex items-center gap-1 text-xs shrink-0", due.className)}>
        <Calendar className="h-3 w-3" />
        {due.label}
      </span>
    </div>
  );
};

/**
 * Per-client card for My Tasks: logo + name up top, then the most overdue
 * tasks first and the nearest upcoming ones after, capped at MAX_VISIBLE_TASKS,
 * with a "See All" button that jumps to that client's task board.
 */
export const ClientTasksCard = ({ summary, onTaskClick, onToggleComplete, onSeeAll }: ClientTasksCardProps) => {
  const overdueShown = summary.overdue.slice(0, MAX_VISIBLE_TASKS);
  const remainingSlots = MAX_VISIBLE_TASKS - overdueShown.length;
  const upcomingShown = summary.upcoming.slice(0, Math.max(0, remainingSlots));
  const noDateSlots = MAX_VISIBLE_TASKS - overdueShown.length - upcomingShown.length;
  const noDateShown = summary.noDate.slice(0, Math.max(0, noDateSlots));
  const hiddenCount = summary.total - overdueShown.length - upcomingShown.length - noDateShown.length;

  return (
    <Card className="p-4 flex flex-col gap-3">
      {/* Client header */}
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          {summary.clientLogoUrl && <AvatarImage src={summary.clientLogoUrl} alt={summary.clientName} />}
          <AvatarFallback className="bg-primary/10">
            {summary.clientLogoUrl ? (
              getInitials(summary.clientName)
            ) : (
              <Building2 className="h-4 w-4 text-muted-foreground" />
            )}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{summary.clientName}</h3>
          <p className="text-xs text-muted-foreground">
            {summary.total} open task{summary.total !== 1 ? "s" : ""}
          </p>
        </div>
        {summary.overdue.length > 0 && (
          <Badge variant="destructive" className="shrink-0">
            {summary.overdue.length} overdue
          </Badge>
        )}
      </div>

      {/* Task lists */}
      <div className="flex-1 space-y-2">
        {overdueShown.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-destructive mb-1">
              Overdue
            </p>
            <div className="space-y-0.5">
              {overdueShown.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                  onToggleComplete={onToggleComplete}
                />
              ))}
            </div>
          </div>
        )}

        {upcomingShown.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Due
            </p>
            <div className="space-y-0.5">
              {upcomingShown.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                  onToggleComplete={onToggleComplete}
                />
              ))}
            </div>
          </div>
        )}

        {noDateShown.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              No Due Date
            </p>
            <div className="space-y-0.5">
              {noDateShown.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                  onToggleComplete={onToggleComplete}
                />
              ))}
            </div>
          </div>
        )}

        {hiddenCount > 0 && (
          <p className="text-xs text-muted-foreground pl-2">
            +{hiddenCount} more task{hiddenCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <Button variant="outline" size="sm" className="w-full" onClick={onSeeAll}>
        See All
        <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
    </Card>
  );
};
