import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, CheckSquare, FolderOpen, Users, ExternalLink, Plus, Rocket, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLaunchPadStatus } from "@/hooks/useLaunchPadStatus";

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
  marketingTools: any[];
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { selectedClient } = useClient();
  const { isComplete, loading: launchPadLoading } = useLaunchPadStatus();
  const [stats, setStats] = useState<DashboardStats>({
    taskCounts: { to_do: 0, in_progress: 0, done: 0 },
    recentMeetings: [],
    recentAssets: [],
    marketingTools: [],
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

      // Load marketing tools
      const { data: tools } = await supabase
        .from('marketing_tools')
        .select('id, name, url, logo_url, category')
        .eq('client_id', selectedClient.id)
        .order('name')
        .limit(8);

      setStats({
        nextMeeting: nextMeeting || undefined,
        taskCounts,
        recentMeetings: meetings || [],
        recentAssets: assets || [],
        avatar: avatar || undefined,
        marketingTools: tools || [],
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

      {!launchPadLoading && !isComplete && (
        <Alert 
          className="bg-destructive/10 border-destructive cursor-pointer hover:bg-destructive/15 transition-colors"
          onClick={() => navigate("/launchpad")}
        >
          <Rocket className="h-5 w-5 text-destructive" />
          <AlertTitle className="text-destructive font-semibold">
            Launch Pad Setup Incomplete
          </AlertTitle>
          <AlertDescription className="text-destructive/90">
            Complete your Launch Pad setup to unlock the full potential of your marketing operations. 
            Click here to continue where you left off.
          </AlertDescription>
        </Alert>
      )}

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

      {stats.marketingTools.length > 0 && (
        <Card className="shadow-elegant">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Marketing Tools</CardTitle>
                <CardDescription>Quick access to your platforms</CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate("/marketing/tools")}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {stats.marketingTools.map((tool) => (
                <Button
                  key={tool.id}
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-auto flex-col gap-2 p-4"
                >
                  <a href={tool.url} target="_blank" rel="noopener noreferrer">
                    {tool.logo_url ? (
                      <img 
                        src={tool.logo_url} 
                        alt={tool.name}
                        className="h-8 w-8 object-contain"
                      />
                    ) : (
                      <Wrench className="h-6 w-6" />
                    )}
                    <span className="text-xs font-medium text-center line-clamp-2">
                      {tool.name}
                    </span>
                  </a>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
