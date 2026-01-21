import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistanceToNow } from "date-fns";
import { LogIn, Eye, CheckCircle, Upload, Calendar, FileText, Share2, Activity } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface UserActivityTabProps {
  userId: string;
  lastLoginAt?: string | null;
}

interface ActivityLog {
  id: string;
  action_type: string;
  action_details: Json;
  created_at: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  login: <LogIn className="h-3 w-3" />,
  page_view: <Eye className="h-3 w-3" />,
  task_created: <FileText className="h-3 w-3" />,
  task_completed: <CheckCircle className="h-3 w-3" />,
  asset_uploaded: <Upload className="h-3 w-3" />,
  meeting_logged: <Calendar className="h-3 w-3" />,
  blog_published: <FileText className="h-3 w-3" />,
  social_post_scheduled: <Share2 className="h-3 w-3" />,
};

const ACTION_LABELS: Record<string, string> = {
  login: "Login",
  page_view: "Page View",
  task_created: "Task Created",
  task_completed: "Task Completed",
  asset_uploaded: "Asset Uploaded",
  meeting_logged: "Meeting Logged",
  blog_published: "Blog Published",
  social_post_scheduled: "Social Post",
};

export function UserActivityTab({ userId, lastLoginAt }: UserActivityTabProps) {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loginHistory, setLoginHistory] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState({ totalActions: 0, pageViews: 0, tasksCompleted: 0 });

  useEffect(() => {
    loadUserActivity();
  }, [userId]);

  const loadUserActivity = async () => {
    setLoading(true);

    // Load recent activities (last 50)
    const { data: recentActivity } = await supabase
      .from('user_activity_logs')
      .select('id, action_type, action_details, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Load login history (last 10 logins)
    const { data: logins } = await supabase
      .from('user_activity_logs')
      .select('id, action_type, action_details, created_at')
      .eq('user_id', userId)
      .eq('action_type', 'login')
      .order('created_at', { ascending: false })
      .limit(10);

    // Calculate stats from recent activity
    if (recentActivity) {
      const pageViews = recentActivity.filter(a => a.action_type === 'page_view').length;
      const tasksCompleted = recentActivity.filter(a => a.action_type === 'task_completed').length;
      
      setStats({
        totalActions: recentActivity.length,
        pageViews,
        tasksCompleted,
      });
      setActivities(recentActivity);
    }

    if (logins) {
      setLoginHistory(logins);
    }

    setLoading(false);
  };

  const getActionDetails = (activity: ActivityLog): string => {
    if (!activity.action_details || typeof activity.action_details !== 'object') return '-';
    const details = activity.action_details as Record<string, any>;
    
    switch (activity.action_type) {
      case 'login':
        return 'Logged in';
      case 'page_view':
        return details?.path || 'Viewed page';
      case 'task_created':
        return details?.title || 'Created task';
      case 'task_completed':
        return details?.title || 'Completed task';
      case 'asset_uploaded':
        return details?.filename || 'Uploaded file';
      default:
        return '-';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {/* Last Login */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Last Login</h4>
        <div className="p-3 bg-muted rounded-lg">
          {lastLoginAt ? (
            <div>
              <div className="font-medium">
                {formatDistanceToNow(new Date(lastLoginAt), { addSuffix: true })}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(lastLoginAt), 'MMMM d, yyyy \'at\' h:mm a')}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">Never logged in</div>
          )}
        </div>
      </div>

      {/* Activity Stats */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Recent Activity Summary</h4>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-muted rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.totalActions}</div>
            <div className="text-xs text-muted-foreground">Total Actions</div>
          </div>
          <div className="p-3 bg-muted rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.pageViews}</div>
            <div className="text-xs text-muted-foreground">Page Views</div>
          </div>
          <div className="p-3 bg-muted rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.tasksCompleted}</div>
            <div className="text-xs text-muted-foreground">Tasks Done</div>
          </div>
        </div>
      </div>

      {/* Login History */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Login History</h4>
        <div className="border rounded-lg divide-y">
          {loginHistory.length === 0 ? (
            <div className="p-3 text-center text-muted-foreground text-sm">
              No login history
            </div>
          ) : (
            loginHistory.slice(0, 5).map((login) => (
              <div key={login.id} className="p-2 flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <LogIn className="h-3 w-3 text-emerald-500" />
                  <span>Login</span>
                </div>
                <span className="text-muted-foreground">
                  {format(new Date(login.created_at), 'MMM d, h:mm a')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Actions */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Recent Actions</h4>
        <ScrollArea className="h-[200px] border rounded-lg">
          <div className="divide-y">
            {activities.filter(a => a.action_type !== 'login').length === 0 ? (
              <div className="p-3 text-center text-muted-foreground text-sm">
                No recent activity
              </div>
            ) : (
              activities
                .filter(a => a.action_type !== 'login')
                .slice(0, 20)
                .map((activity) => (
                  <div key={activity.id} className="p-2 flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="gap-1 shrink-0">
                      {ACTION_ICONS[activity.action_type] || <Activity className="h-3 w-3" />}
                      {ACTION_LABELS[activity.action_type] || activity.action_type}
                    </Badge>
                    <span className="text-muted-foreground truncate flex-1">
                      {getActionDetails(activity)}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>
                ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
