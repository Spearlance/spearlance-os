import { useEffect, useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, CheckSquare, FolderOpen, Users, ExternalLink, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DashboardStats {
  nextMeeting?: any;
  taskCounts: {
    to_do: number;
    in_progress: number;
    done: number;
  };
  recentMeetings: any[];
  recentAssets: any[];
  avatar?: any;
}

const Dashboard = () => {
  const { selectedClient } = useClient();
  const [stats, setStats] = useState<DashboardStats>({
    taskCounts: { to_do: 0, in_progress: 0, done: 0 },
    recentMeetings: [],
    recentAssets: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedClient) {
      loadDashboardData();
    }
  }, [selectedClient]);

  const loadDashboardData = async () => {
    if (!selectedClient) return;

    try {
      setLoading(true);

      // Load task counts
      const { data: tasks } = await supabase
        .from('tasks')
        .select('status')
        .eq('client_id', selectedClient.id);

      const taskCounts = {
        to_do: tasks?.filter(t => t.status === 'to_do').length || 0,
        in_progress: tasks?.filter(t => t.status === 'in_progress').length || 0,
        done: tasks?.filter(t => t.status === 'done').length || 0,
      };

      // Load recent meetings
      const { data: meetings } = await supabase
        .from('meetings')
        .select('*')
        .eq('client_id', selectedClient.id)
        .order('date_time', { ascending: false })
        .limit(3);

      // Load next meeting
      const { data: nextMeeting } = await supabase
        .from('meetings')
        .select('*')
        .eq('client_id', selectedClient.id)
        .gte('date_time', new Date().toISOString())
        .order('date_time', { ascending: true })
        .limit(1)
        .single();

      // Load recent assets
      const { data: assets } = await supabase
        .from('assets')
        .select('*')
        .eq('client_id', selectedClient.id)
        .order('created_at', { ascending: false })
        .limit(3);

      // Load avatar
      const { data: avatar } = await supabase
        .from('avatars')
        .select('*')
        .eq('client_id', selectedClient.id)
        .single();

      setStats({
        nextMeeting: nextMeeting || undefined,
        taskCounts,
        recentMeetings: meetings || [],
        recentAssets: assets || [],
        avatar: avatar || undefined,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedClient) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-6 text-center">
          <CardTitle className="mb-2">No Client Selected</CardTitle>
          <CardDescription>Please select a client to view the dashboard</CardDescription>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Welcome to {selectedClient.name}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-elegant hover:shadow-glow transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">To Do</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.taskCounts.to_do}</div>
            <p className="text-xs text-muted-foreground">Tasks pending</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant hover:shadow-glow transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <CheckSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.taskCounts.in_progress}</div>
            <p className="text-xs text-muted-foreground">Active tasks</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant hover:shadow-glow transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Done</CardTitle>
            <CheckSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.taskCounts.done}</div>
            <p className="text-xs text-muted-foreground">Completed tasks</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant hover:shadow-glow transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Meeting</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {stats.nextMeeting
                ? new Date(stats.nextMeeting.date_time).toLocaleDateString()
                : "No upcoming"}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.nextMeeting ? "Scheduled" : "meetings"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Recent Meetings</CardTitle>
            <CardDescription>Latest meeting summaries</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.recentMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No meetings yet</p>
            ) : (
              stats.recentMeetings.map((meeting) => (
                <div key={meeting.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {new Date(meeting.date_time).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {meeting.summary}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Recent Assets</CardTitle>
            <CardDescription>Latest uploaded files</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.recentAssets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assets yet</p>
            ) : (
              stats.recentAssets.map((asset) => (
                <div key={asset.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <FolderOpen className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{asset.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{asset.type}</Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {stats.avatar && (
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Customer Avatar
            </CardTitle>
            <CardDescription>{stats.avatar.avatar_name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.avatar.pains && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Top Pains:</h4>
                  <p className="text-sm text-muted-foreground">{stats.avatar.pains}</p>
                </div>
              )}
              {stats.avatar.ad_hooks && stats.avatar.ad_hooks.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Ad Hooks:</h4>
                  <div className="flex flex-wrap gap-2">
                    {stats.avatar.ad_hooks.slice(0, 3).map((hook: string, i: number) => (
                      <Badge key={i} variant="secondary">{hook}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedClient.website_url && (
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Access important resources</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {selectedClient.website_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={selectedClient.website_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Website
                </a>
              </Button>
            )}
            {selectedClient.oviond_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={selectedClient.oviond_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Oviond
                </a>
              </Button>
            )}
            {selectedClient.drive_folder_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={selectedClient.drive_folder_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Drive
                </a>
              </Button>
            )}
            {selectedClient.canva_folder_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={selectedClient.canva_folder_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Canva
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
