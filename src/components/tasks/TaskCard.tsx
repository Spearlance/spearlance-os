import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Paperclip, MessageSquare, CheckCircle2 } from "lucide-react";
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
    assignees?: Array<{ id: string; name: string; avatar_url?: string }>;
    tags?: Array<{ id: string; name: string; color: string }>;
    subtask_count?: number;
    completed_subtasks?: number;
    comment_count?: number;
    attachment_count?: number;
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
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4"
      style={{ borderLeftColor: borderColor, opacity: isDragging ? 0.5 : 1 }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1">
          <div 
            className="h-3 w-3 rounded-full shrink-0" 
            style={{ backgroundColor: borderColor }}
          />
          <h4 className="font-medium text-sm">{task.title}</h4>
        </div>
        {task.priority === 'urgent' && (
          <Badge variant="destructive" className="text-xs shrink-0">
            !
          </Badge>
        )}
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
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
  );
};
