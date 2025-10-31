import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Circle, ListTodo, Calendar, MessageSquare, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { useClient } from "@/contexts/ClientContext";

interface NotificationItemProps {
  notification: Notification;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "task_assigned":
      return <ListTodo className="h-5 w-5 text-blue-500" />;
    case "task_completed":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "meeting_scheduled":
      return <Calendar className="h-5 w-5 text-purple-500" />;
    case "comment_added":
      return <MessageSquare className="h-5 w-5 text-orange-500" />;
    case "channel_status_changed":
      return <TrendingUp className="h-5 w-5 text-indigo-500" />;
    default:
      return <Circle className="h-5 w-5 text-muted-foreground" />;
  }
};

export const NotificationItem = ({ notification }: NotificationItemProps) => {
  const { markAsRead } = useNotifications();
  const navigate = useNavigate();
  const { selectedClient, setSelectedClient, clients } = useClient();

  const handleClick = async () => {
    // Mark as read
    if (!notification.read_flag) {
      markAsRead(notification.id);
    }

    // If notification has a client_id and it's different from current selection
    if (notification.client_id && notification.client_id !== selectedClient?.id) {
      // Find the client from the available clients list
      const targetClient = clients.find(c => c.id === notification.client_id);
      
      if (targetClient) {
        // Switch to the correct client context
        setSelectedClient(targetClient);
        
        // Small delay to ensure context updates before navigation
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Navigate to the action URL
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex items-start gap-3 p-4 cursor-pointer transition-colors hover:bg-accent/50",
        !notification.read_flag && "bg-accent/20"
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getNotificationIcon(notification.type)}
      </div>
      
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-sm",
            !notification.read_flag && "font-semibold"
          )}>
            {notification.title}
          </p>
          {!notification.read_flag && (
            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
          )}
        </div>
        
        {notification.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {notification.description}
          </p>
        )}
        
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
};
