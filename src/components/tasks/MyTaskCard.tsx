import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Calendar, CheckCircle2, Repeat, Link, Building2, ExternalLink, Globe } from "lucide-react";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { MyTask } from "@/hooks/useMyTasks";

interface MyTaskCardProps {
  task: MyTask;
  onClick?: () => void;
  showClient?: boolean;
  onViewInBoard?: () => void;
  onToggleComplete?: (task: MyTask, complete: boolean) => void;
}

const priorityColors = {
  urgent: "#EF4444",
  high: "#F59E0B",
  normal: "#10B981",
  low: "#6B7280",
};

const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getDueDateLabel = (dueDate: string) => {
  const date = new Date(dueDate);
  if (isPast(date) && !isToday(date)) {
    return { label: format(date, "MMM d"), className: "text-destructive" };
  }
  if (isToday(date)) {
    return { label: "Today", className: "text-primary font-medium" };
  }
  if (isTomorrow(date)) {
    return { label: "Tomorrow", className: "text-warning" };
  }
  return { label: format(date, "MMM d"), className: "text-muted-foreground" };
};

export const MyTaskCard = ({ task, onClick, showClient = true, onViewInBoard, onToggleComplete }: MyTaskCardProps) => {
  const navigate = useNavigate();
  const borderColor = task.color || priorityColors[task.priority as keyof typeof priorityColors] || "#6B7280";

  const handleViewInBoard = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewInBoard?.();
  };

  return (
    <TooltipProvider>
      <Card
        className="p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4 group"
        style={{ borderLeftColor: borderColor }}
        onClick={onClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <Checkbox
            checked={task.status === "done"}
            onClick={(e) => e.stopPropagation()}
            onCheckedChange={(v) => onToggleComplete?.(task, v === true)}
            aria-label="Mark task complete"
            className="mt-0.5 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <h3 className="font-semibold text-sm truncate">{task.title}</h3>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{task.title}</p>
              </TooltipContent>
            </Tooltip>
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {task.description}
              </p>
            )}
          </div>
          
          {/* Priority & Recurring indicators */}
          <div className="flex-shrink-0 flex items-center gap-1">
            {task.priority === 'urgent' && (
              <Badge variant="destructive" className="text-xs">!</Badge>
            )}
            {task.is_recurring && (
              <Repeat className="h-4 w-4 text-primary" />
            )}
            {task.is_recurring_instance && (
              <div className="relative">
                <Repeat className="h-4 w-4 text-muted-foreground" />
                <Link className="h-2 w-2 text-muted-foreground absolute -bottom-0.5 -right-0.5" />
              </div>
            )}
          </div>
        </div>

        {/* Client Badge */}
        {showClient && (
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5 bg-muted/50 rounded-md px-2 py-1 text-xs">
              {task.client_logo_url ? (
                <Avatar className="h-4 w-4">
                  <AvatarImage src={task.client_logo_url} />
                  <AvatarFallback className="text-[8px]">
                    {getInitials(task.client_name)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Building2 className="h-3 w-3 text-muted-foreground" />
              )}
              <span className="text-muted-foreground truncate max-w-[150px]">
                {task.client_name}
              </span>
            </div>
            
            {/* View in board button - shown on hover */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleViewInBoard}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View in client board</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-3">
            {task.tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-xs"
                style={{ backgroundColor: tag.color + "20", color: tag.color }}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 mt-3">
          {/* Channel & Page Links */}
          <div className="flex items-center gap-2 flex-wrap">
            {task.linked_page_name && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Globe className="h-3 w-3" />
                <span className="truncate max-w-[80px]">{task.linked_page_name}</span>
              </span>
            )}
            {task.linked_channel_name && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Link className="h-3 w-3" />
                <span className="truncate max-w-[80px]">{task.linked_channel_name}</span>
              </span>
            )}
          </div>
          
          <div className="flex-1" />

          {/* Metadata */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {task.subtask_count !== undefined && task.subtask_count > 0 && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                <span>
                  {task.completed_subtasks || 0}/{task.subtask_count}
                </span>
              </div>
            )}
            {task.due_date && (
              <div className={`flex items-center gap-1 ${getDueDateLabel(task.due_date).className}`}>
                <Calendar className="h-3 w-3" />
                <span>{getDueDateLabel(task.due_date).label}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </TooltipProvider>
  );
};
