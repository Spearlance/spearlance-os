import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow, subDays } from "date-fns";
import { Activity, LogIn, Eye, CheckCircle, Upload, Calendar, FileText, Share2, Users, Clock } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface ActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  action_details: Json;
  client_id: string | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

interface ActivityStats {
  activeToday: number;
  loginsWeek: number;
  totalActions: number;
  uniqueUsers: number;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  login: <LogIn className="h-4 w-4" />,
  page_view: <Eye className="h-4 w-4" />,
  task_created: <FileText className="h-4 w-4" />,
  task_completed: <CheckCircle className="h-4 w-4" />,
  asset_uploaded: <Upload className="h-4 w-4" />,
  meeting_logged: <Calendar className="h-4 w-4" />,
  blog_published: <FileText className="h-4 w-4" />,
  social_post_scheduled: <Share2 className="h-4 w-4" />,
};

const ACTION_LABELS: Record<string, string> = {
  login: "Login",
  page_view: "Page View",
  task_created: "Task Created",
  task_completed: "Task Completed",
  asset_uploaded: "Asset Uploaded",
  meeting_logged: "Meeting Logged",
  blog_published: "Blog Published",
  social_post_scheduled: "Social Post Scheduled",
};

export default function UserActivity() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityStats>({ activeToday: 0, loginsWeek: 0, totalActions: 0, uniqueUsers: 0 });
  const [userFilter, setUserFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadActivities();
    }
  }, [userFilter, actionFilter]);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: hasAdminRole } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!hasAdminRole) {
      navigate('/');
      return;
    }

    await Promise.all([loadActivities(), loadUsers(), loadStats()]);
    setLoading(false);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email')
      .order('name');
    
    if (data) {
      setUsers(data);
    }
  };

  const loadStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = subDays(new Date(), 7);

    // Get today's active users
    const { data: todayData } = await supabase
      .from('user_activity_logs')
      .select('user_id')
      .gte('created_at', today.toISOString());

    // Get week's logins
    const { data: loginData } = await supabase
      .from('user_activity_logs')
      .select('id')
      .eq('action_type', 'login')
      .gte('created_at', weekAgo.toISOString());

    // Get total actions this week
    const { data: actionsData } = await supabase
      .from('user_activity_logs')
      .select('id, user_id')
      .gte('created_at', weekAgo.toISOString());

    const uniqueTodayUsers = new Set(todayData?.map(d => d.user_id) || []).size;
    const uniqueWeekUsers = new Set(actionsData?.map(d => d.user_id) || []).size;

    setStats({
      activeToday: uniqueTodayUsers,
      loginsWeek: loginData?.length || 0,
      totalActions: actionsData?.length || 0,
      uniqueUsers: uniqueWeekUsers,
    });
  };

  const loadActivities = async () => {
    let query = supabase
      .from('user_activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (userFilter !== 'all') {
      query = query.eq('user_id', userFilter);
    }

    if (actionFilter !== 'all') {
      query = query.eq('action_type', actionFilter);
    }

    const { data } = await query;

    if (data) {
      // Fetch user names for each activity
      const userIds = [...new Set(data.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const enrichedData = data.map(activity => ({
        ...activity,
        user_name: profileMap.get(activity.user_id)?.name || 'Unknown',
        user_email: profileMap.get(activity.user_id)?.email || '',
      }));

      setActivities(enrichedData);
    }
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
        return JSON.stringify(details).slice(0, 50) || '-';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="h-6 w-6" />
        <h1 className="text-2xl font-bold">User Activity</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.activeToday}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Logins (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <LogIn className="h-5 w-5 text-emerald-500" />
              <span className="text-2xl font-bold">{stats.loginsWeek}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Actions (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.totalActions}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique Users (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.uniqueUsers}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {users.map(user => (
              <SelectItem key={user.id} value={user.id}>
                {user.name || user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No activity found
                  </TableCell>
                </TableRow>
              ) : (
                activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {activity.user_name?.charAt(0)?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{activity.user_name}</div>
                          <div className="text-xs text-muted-foreground">{activity.user_email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {ACTION_ICONS[activity.action_type] || <Activity className="h-4 w-4" />}
                        {ACTION_LABELS[activity.action_type] || activity.action_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-muted-foreground">
                      {getActionDetails(activity)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(activity.created_at), 'MMM d, h:mm a')}</div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
