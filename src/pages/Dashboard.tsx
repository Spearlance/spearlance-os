import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, CheckSquare, Target, Zap, AlertCircle, BookOpen, RefreshCw, Rocket, Sparkles, Loader2, FileText, ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLaunchPadStatus } from "@/hooks/useLaunchPadStatus";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { WebsiteUpsellBanner } from "@/components/billing/WebsiteUpsellBanner";
import { PricingModal } from "@/components/billing/PricingModal";

interface DashboardStats {
  nextMeeting?: any;
  taskCounts: {
    to_do: number;
    in_progress: number;
  };
  formSubmissions: {
    last30Days: number;
    last7Days: number;
    previous30Days: number;
    previous7Days: number;
    trend30Days: 'up' | 'down' | 'neutral';
    trend7Days: 'up' | 'down' | 'neutral';
    percentChange30Days: number;
    percentChange7Days: number;
  };
  recentMeetings: any[];
  marketingTools: any[];
}

interface PriorityAction {
  title: string;
  description: string;
  reason: string;
  link: string;
  priority: 'urgent' | 'important' | 'momentum';
}

interface DailyActionPlan {
  id: string;
  context_summary: string;
  priority_actions: PriorityAction[];
  avatar_story: string;
  generated_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedClient, loading: clientLoading } = useClient();
  const { isComplete, loading: launchPadLoading } = useLaunchPadStatus();
  const [stats, setStats] = useState<DashboardStats>({
    taskCounts: { to_do: 0, in_progress: 0 },
    formSubmissions: {
      last30Days: 0,
      last7Days: 0,
      previous30Days: 0,
      previous7Days: 0,
      trend30Days: 'neutral',
      trend7Days: 'neutral',
      percentChange30Days: 0,
      percentChange7Days: 0,
    },
    recentMeetings: [],
    marketingTools: [],
  });
  const [actionPlan, setActionPlan] = useState<DailyActionPlan | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generatingStory, setGeneratingStory] = useState(false);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);

  useEffect(() => {
    if (selectedClient) {
      loadDashboardData();
      loadDailyActionPlan();
    }
  }, [selectedClient]);

  const loadDailyActionPlan = async (force = false) => {
    if (!selectedClient) return;

    try {
      setGeneratingPlan(true);

      // Check if plan exists for today
      if (!force) {
        const today = new Date().toISOString().split('T')[0];
        const { data: existingPlan } = await supabase
          .from('daily_action_plans')
          .select('*')
          .eq('client_id', selectedClient.id)
          .eq('plan_date', today)
          .maybeSingle();

        if (existingPlan) {
          setActionPlan({
            ...existingPlan,
            priority_actions: existingPlan.priority_actions as unknown as PriorityAction[]
          });
          setGeneratingPlan(false);
          return;
        }
      }

      // Generate new plan
      const { data, error } = await supabase.functions.invoke('generate-daily-action-plan', {
        body: { client_id: selectedClient.id, force }
      });

      if (error) {
        toast({
          title: "Failed to generate action plan",
          description: error.message || "Please try again later",
          variant: "destructive"
        });
      } else if (data) {
        setActionPlan({
          ...data,
          priority_actions: data.priority_actions as unknown as PriorityAction[]
        });
        if (force) {
          toast({
            title: "Action plan refreshed",
            description: "Your daily plan has been updated"
          });
        }
      }
    } catch (error) {
      console.error('Error loading action plan:', error);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const generateAvatarStory = async () => {
    if (!selectedClient) return;
    
    setGeneratingStory(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-avatar-story', {
        body: { client_id: selectedClient.id }
      });
      
      if (error) throw error;
      
      if (data?.avatar_story) {
        setActionPlan(prev => prev ? { ...prev, avatar_story: data.avatar_story } : null);
        toast({
          title: "Story Generated!",
          description: "Your customer's story is ready to read.",
        });
      }
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Could not generate the avatar story. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingStory(false);
    }
  };

  const loadDashboardData = async () => {
    if (!selectedClient) return;

    try {
      setDataLoading(true);

      // Load task counts
      const { data: tasks } = await supabase
        .from('tasks')
        .select('status')
        .eq('client_id', selectedClient.id);

      const taskCounts = {
        to_do: tasks?.filter(t => t.status === 'to_do').length || 0,
        in_progress: tasks?.filter(t => t.status === 'in_progress').length || 0,
      };

      // Calculate date ranges for form submissions
      const now = new Date();
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const previous7DaysStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const previous30DaysStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Query form submissions for past 30 days
      const { data: submissions30Days } = await supabase
        .from('website_form_submissions')
        .select('submitted_at')
        .eq('client_id', selectedClient.id)
        .gte('submitted_at', last30Days.toISOString());

      // Query form submissions for past 7 days
      const { data: submissions7Days } = await supabase
        .from('website_form_submissions')
        .select('submitted_at')
        .eq('client_id', selectedClient.id)
        .gte('submitted_at', last7Days.toISOString());

      // Query previous 30 days (for comparison)
      const { data: submissionsPrevious30Days } = await supabase
        .from('website_form_submissions')
        .select('submitted_at')
        .eq('client_id', selectedClient.id)
        .gte('submitted_at', previous30DaysStart.toISOString())
        .lt('submitted_at', last30Days.toISOString());

      // Query previous 7 days (for comparison)
      const { data: submissionsPrevious7Days } = await supabase
        .from('website_form_submissions')
        .select('submitted_at')
        .eq('client_id', selectedClient.id)
        .gte('submitted_at', previous7DaysStart.toISOString())
        .lt('submitted_at', last7Days.toISOString());

      // Calculate counts
      const count30Days = submissions30Days?.length || 0;
      const count7Days = submissions7Days?.length || 0;
      const countPrevious30Days = submissionsPrevious30Days?.length || 0;
      const countPrevious7Days = submissionsPrevious7Days?.length || 0;

      // Calculate trends and percent changes
      const calculateTrend = (current: number, previous: number) => {
        if (previous === 0 && current === 0) return { trend: 'neutral' as const, percentChange: 0 };
        if (previous === 0) return { trend: 'up' as const, percentChange: 100 };
        const change = ((current - previous) / previous) * 100;
        return {
          trend: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'neutral' as const,
          percentChange: Math.round(Math.abs(change))
        };
      };

      const trend30 = calculateTrend(count30Days, countPrevious30Days);
      const trend7 = calculateTrend(count7Days, countPrevious7Days);

      const formSubmissions = {
        last30Days: count30Days,
        last7Days: count7Days,
        previous30Days: countPrevious30Days,
        previous7Days: countPrevious7Days,
        trend30Days: trend30.trend,
        trend7Days: trend7.trend,
        percentChange30Days: trend30.percentChange,
        percentChange7Days: trend7.percentChange,
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
        .maybeSingle();

      // Load marketing tools
      const { data: tools } = await supabase
        .from('marketing_tools')
        .select('id, name, url, logo_url, category')
        .eq('client_id', selectedClient.id)
        .order('name')
        .limit(8);

      setStats({
        nextMeeting: nextMeeting || undefined,
        taskCounts: { to_do: taskCounts.to_do, in_progress: taskCounts.in_progress },
        formSubmissions,
        recentMeetings: meetings || [],
        marketingTools: tools || [],
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'important':
        return <Target className="h-5 w-5 text-primary" />;
      case 'momentum':
        return <Zap className="h-5 w-5 text-accent" />;
      default:
        return <Target className="h-5 w-5" />;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Urgent';
      case 'important':
        return 'Important';
      case 'momentum':
        return 'Quick Win';
      default:
        return priority;
    }
  };

  if (clientLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Welcome to {selectedClient.name}</p>
        </div>
      </div>

      <WebsiteUpsellBanner onUpgradeClick={() => setPricingModalOpen(true)} />

      {!launchPadLoading && !isComplete && (
        <Alert 
          className="bg-destructive/10 border-destructive cursor-pointer hover:bg-destructive/15 transition-colors"
          onClick={() => navigate("/launchpad")}
        >
          <Rocket className="h-5 w-5 text-destructive" />
          <AlertTitle className="text-destructive font-semibold">
            Launchpad Setup Incomplete
          </AlertTitle>
          <AlertDescription className="text-destructive/90">
            Complete your Launchpad setup to unlock personalized daily action plans and the full potential of your marketing operations.
          </AlertDescription>
        </Alert>
      )}

      {/* Daily Action Plan Hero Section */}
      {isComplete && (
        <Card className="shadow-elegant border-primary/20">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Your Action Plan for Today</CardTitle>
                  <CardDescription className="text-base mt-1">
                    {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadDailyActionPlan(true)}
                disabled={generatingPlan}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${generatingPlan ? 'animate-spin' : ''}`} />
                Refresh Plan
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {generatingPlan && !actionPlan ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-3/4" />
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </div>
            ) : actionPlan ? (
              <>
                {actionPlan.context_summary && (
                  <p className="text-muted-foreground">{actionPlan.context_summary}</p>
                )}
                
                <div className="space-y-3">
                  {actionPlan.priority_actions.map((action, index) => (
                    <Card 
                      key={index}
                      className="border-l-4 hover:shadow-md transition-shadow cursor-pointer"
                      style={{
                        borderLeftColor: action.priority === 'urgent' ? 'hsl(var(--destructive))' : 
                                        action.priority === 'important' ? 'hsl(var(--primary))' : 
                                        'hsl(var(--accent))'
                      }}
                      onClick={() => navigate(action.link)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {getPriorityIcon(action.priority)}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{action.title}</h4>
                              <Badge variant="outline" className="text-xs">
                                {getPriorityLabel(action.priority)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{action.description}</p>
                          </div>
                          <Button size="sm" variant="ghost">
                            Take Action →
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No action plan available yet</p>
                <Button 
                  onClick={() => loadDailyActionPlan(true)} 
                  className="mt-4"
                  disabled={generatingPlan}
                >
                  Generate Today's Plan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Task Stats */}
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
            <CardTitle className="text-sm font-medium">Form Submissions</CardTitle>
            <div className="flex items-center gap-1">
              {stats.formSubmissions.trend30Days === 'up' && (
                <ArrowUp className="h-4 w-4 text-green-500" />
              )}
              {stats.formSubmissions.trend30Days === 'down' && (
                <ArrowDown className="h-4 w-4 text-red-500" />
              )}
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <div className="text-2xl font-bold">{stats.formSubmissions.last30Days}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>Past 30 days</span>
                  {stats.formSubmissions.trend30Days !== 'neutral' && (
                    <span className={stats.formSubmissions.trend30Days === 'up' ? 'text-green-500' : 'text-red-500'}>
                      {stats.formSubmissions.trend30Days === 'up' ? '↑' : '↓'} {stats.formSubmissions.percentChange30Days}%
                    </span>
                  )}
                </div>
              </div>
              <div className="pt-1 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{stats.formSubmissions.last7Days}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Past 7 days</span>
                    {stats.formSubmissions.trend7Days !== 'neutral' && (
                      <span className={`text-xs font-medium ${stats.formSubmissions.trend7Days === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                        {stats.formSubmissions.trend7Days === 'up' ? '↑' : '↓'} {stats.formSubmissions.percentChange7Days}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
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

      {/* Avatar Story Card - Generate on Demand */}
      {actionPlan && (
        <Card className="shadow-elegant border-accent/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-accent" />
              <div className="flex-1">
                <CardTitle>A Day in the Life of Your Customer</CardTitle>
                <CardDescription>
                  {actionPlan.avatar_story 
                    ? "Understanding who you serve" 
                    : "Click to generate a personalized story"}
                </CardDescription>
              </div>
              {!actionPlan.avatar_story && (
                <Button 
                  onClick={generateAvatarStory}
                  disabled={generatingStory}
                  variant="default"
                  size="sm"
                >
                  {generatingStory ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Story
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          {actionPlan.avatar_story && (
            <CardContent>
              <Accordion type="single" collapsible defaultValue="">
                <AccordionItem value="story" className="border-0">
                  <AccordionTrigger className="text-sm font-medium hover:no-underline">
                    Read Story
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {actionPlan.avatar_story}
                    </p>
                    <Button 
                      variant="link" 
                      className="mt-4 px-0"
                      onClick={() => navigate('/avatar')}
                    >
                      Learn more about your avatar →
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          )}
        </Card>
      )}

      {/* Recent Meetings and Marketing Tools */}
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
                <div 
                  key={meeting.id} 
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => navigate(`/meetings/${meeting.id}`)}
                >
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {meeting.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(meeting.date_time).toLocaleDateString()}
                    </p>
                    {meeting.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {meeting.summary}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

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
              <div className="grid grid-cols-2 gap-3">
                {stats.marketingTools.slice(0, 4).map((tool) => (
                  <Button
                    key={tool.id}
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-auto flex-col gap-2 p-4 hover:shadow-md transition-shadow"
                  >
                    <a href={tool.url} target="_blank" rel="noopener noreferrer">
                      {tool.logo_url ? (
                        <img 
                          src={tool.logo_url} 
                          alt={tool.name}
                          className="h-8 w-8 object-contain"
                        />
                      ) : (
                        <Target className="h-6 w-6" />
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

      <PricingModal 
        open={pricingModalOpen}
        onOpenChange={setPricingModalOpen}
        highlightWebsite={true}
      />
    </div>
  );
};

export default Dashboard;
