import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Calendar, Paperclip, MessageSquare, CheckCircle2, Repeat, Link, Globe } from "lucide-react";
import { format } from "date-fns";

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description?: string;
    priority: string;
    status: string;
    due_date?: string;
    color?: string;
    is_recurring?: boolean;
    is_recurring_instance?: boolean;
    assignees?: Array<{ id: string; name: string; avatar_url?: string }>;
    tags?: Array<{ id: string; name: string; color: string }>;
    subtask_count?: number;
    completed_subtasks?: number;
    comment_count?: number;
    attachment_count?: number;
    linked_page_name?: string;
    linked_channel_name?: string;
  };
  onClick?: () => void;
  isDragging?: boolean;
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

export const TaskCard = ({ task, onClick, isDragging }: TaskCardProps) => {
  const borderColor = task.color || priorityColors[task.priority as keyof typeof priorityColors] || "#6B7280";

  return (
    <TooltipProvider>
      <Card
        className="p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4"
        style={{ borderLeftColor: borderColor, opacity: isDragging ? 0.5 : 1 }}
        onClick={onClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
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
        {/* Recurring indicator in top-right */}
        <div className="flex-shrink-0 flex items-center gap-1">
          {task.priority === 'urgent' && (
            <Badge variant="destructive" className="text-xs">
              !
            </Badge>
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

      {/* Linked Items Row */}
      {(task.linked_page_name || task.linked_channel_name) && (
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {task.linked_page_name && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
              <Globe className="h-3 w-3" />
              {task.linked_page_name}
            </span>
          )}
          {task.linked_channel_name && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
              <Link className="h-3 w-3" />
              {task.linked_channel_name}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 mt-3">
        {/* Assignees */}
        {task.assignees && task.assignees.length > 0 ? (
          <div className="flex -space-x-2">
            {task.assignees.slice(0, 3).map((assignee) => (
              <Avatar key={assignee.id} className="h-6 w-6 border-2 border-background">
                <AvatarImage src={assignee.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(assignee.name || '')}
                </AvatarFallback>
              </Avatar>
            ))}
            {task.assignees.length > 3 && (
              <Avatar className="h-6 w-6 border-2 border-background">
                <AvatarFallback className="text-xs">+{task.assignees.length - 3}</AvatarFallback>
              </Avatar>
            )}
          </div>
        ) : (
          <div className="flex -space-x-2"></div>
        )}

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
          {task.comment_count !== undefined && task.comment_count > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span>{task.comment_count}</span>
            </div>
          )}
          {task.attachment_count !== undefined && task.attachment_count > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              <span>{task.attachment_count}</span>
            </div>
          )}
          {task.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(task.due_date), "MMM d")}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
    </TooltipProvider>
  );
};
