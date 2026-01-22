import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ArrowLeft, 
  Users, 
  CheckSquare, 
  AlertTriangle, 
  Globe, 
  Loader2, 
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { format, isPast, isToday, addDays, isBefore } from "date-fns";

interface DesignerStats {
  id: string;
  name: string;
  avatar_url: string | null;
  tasks: TaskInfo[];
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
  dueThisWeek: number;
}

interface TaskInfo {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  client_name: string;
  client_id: string;
}

interface BuildProgress {
  id: string;
  name: string;
  status: string;
  target_launch_date: string | null;
  client_name: string;
  client_id: string;
  pages_done: number;
  pages_total: number;
  tasks_done: number;
  tasks_total: number;
}

export default function DesignerWorkload() {
  const navigate = useNavigate();
  const { clients, setSelectedClient } = useClient();
  const [loading, setLoading] = useState(true);
  const [designers, setDesigners] = useState<DesignerStats[]>([]);
  const [builds, setBuilds] = useState<BuildProgress[]>([]);
  const [expandedDesigners, setExpandedDesigners] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      navigate("/");
      return;
    }

    loadData();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch web designers
      const { data: designerProfiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .eq("role", "web_designer")
        .order("name");

      if (!designerProfiles) {
        setDesigners([]);
        setBuilds([]);
        setLoading(false);
        return;
      }

      // Fetch all task assignments for designers
      const designerIds = designerProfiles.map(d => d.id);
      
      const { data: taskAssignments } = await supabase
        .from("task_assignees")
        .select(`
          user_id,
          tasks (
            id,
            title,
            status,
            priority,
            due_date,
            client_id,
            clients (name)
          )
        `)
        .in("user_id", designerIds);

      // Process designer stats
      const designerStats: DesignerStats[] = designerProfiles.map(designer => {
        const assignedTasks = taskAssignments
          ?.filter(ta => ta.user_id === designer.id && ta.tasks)
          .map(ta => ({
            id: ta.tasks!.id,
            title: ta.tasks!.title,
            status: ta.tasks!.status || 'to_do',
            priority: ta.tasks!.priority || 'normal',
            due_date: ta.tasks!.due_date,
            client_name: (ta.tasks as any)?.clients?.name || 'Unknown',
            client_id: ta.tasks!.client_id
          })) || [];

        const now = new Date();
        const weekFromNow = addDays(now, 7);

        return {
          id: designer.id,
          name: designer.name || 'Unknown',
          avatar_url: designer.avatar_url,
          tasks: assignedTasks,
          todo: assignedTasks.filter(t => t.status === 'to_do').length,
          inProgress: assignedTasks.filter(t => t.status === 'in_progress').length,
          done: assignedTasks.filter(t => t.status === 'done').length,
          overdue: assignedTasks.filter(t => 
            t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && t.status !== 'done'
          ).length,
          dueThisWeek: assignedTasks.filter(t =>
            t.due_date && isBefore(new Date(t.due_date), weekFromNow) && !isPast(new Date(t.due_date)) && t.status !== 'done'
          ).length
        };
      });

      setDesigners(designerStats);

      // Fetch website builds
      const { data: buildsData } = await supabase
        .from("website_builds")
        .select(`
          id,
          name,
          status,
          target_launch_date,
          client_id,
          clients (name),
          website_build_pages (id, status),
          website_build_tasks (
            id,
            tasks (status)
          )
        `)
        .neq("status", "completed")
        .order("created_at", { ascending: false });

      const buildProgress: BuildProgress[] = (buildsData || []).map(build => {
        const pages = build.website_build_pages || [];
        const buildTasks = build.website_build_tasks || [];
        
        return {
          id: build.id,
          name: build.name,
          status: build.status || 'planning',
          target_launch_date: build.target_launch_date,
          client_name: (build.clients as any)?.name || 'Unknown',
          client_id: build.client_id,
          pages_done: pages.filter((p: any) => p.status === 'complete').length,
          pages_total: pages.length,
          tasks_done: buildTasks.filter((t: any) => t.tasks?.status === 'done').length,
          tasks_total: buildTasks.length
        };
      });

      setBuilds(buildProgress);
    } catch (error) {
      console.error("Error loading designer workload:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateBandwidth = (stats: DesignerStats) => {
    const score = stats.todo + (stats.inProgress * 1.5) + (stats.overdue * 3);
    if (score > 15) return { level: "High", color: "destructive" as const };
    if (score > 8) return { level: "Medium", color: "secondary" as const };
    return { level: "Low", color: "default" as const };
  };

  const toggleDesigner = (designerId: string) => {
    setExpandedDesigners(prev => {
      const next = new Set(prev);
      if (next.has(designerId)) {
        next.delete(designerId);
      } else {
        next.add(designerId);
      }
      return next;
    });
  };

  const totals = useMemo(() => ({
    designers: designers.length,
    totalTasks: designers.reduce((sum, d) => sum + d.todo + d.inProgress, 0),
    overdueTasks: designers.reduce((sum, d) => sum + d.overdue, 0),
    activeBuilds: builds.length
  }), [designers, builds]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Designer Workload</h1>
            <p className="text-muted-foreground">Monitor web designer capacity and assignments</p>
          </div>
        </div>
        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Designers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.designers}</div>
            <p className="text-xs text-muted-foreground">Active web designers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalTasks}</div>
            <p className="text-xs text-muted-foreground">To Do + In Progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{totals.overdueTasks}</div>
            <p className="text-xs text-muted-foreground">Tasks past due date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Builds</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.activeBuilds}</div>
            <p className="text-xs text-muted-foreground">Website builds in progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Designer Workload Table */}
      <Card>
        <CardHeader>
          <CardTitle>Designer Workload</CardTitle>
        </CardHeader>
        <CardContent>
          {designers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No web designers found. Assign users the "Web Designer" role in Admin.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Designer</TableHead>
                  <TableHead className="text-center">To Do</TableHead>
                  <TableHead className="text-center">In Progress</TableHead>
                  <TableHead className="text-center">Done</TableHead>
                  <TableHead className="text-center">Overdue</TableHead>
                  <TableHead className="text-center">Bandwidth</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {designers.map((designer) => {
                  const bandwidth = calculateBandwidth(designer);
                  const isExpanded = expandedDesigners.has(designer.id);
                  const activeTasks = designer.tasks.filter(t => t.status !== 'done');

                  return (
                    <Collapsible key={designer.id} asChild open={isExpanded}>
                      <>
                        <CollapsibleTrigger asChild>
                          <TableRow 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => toggleDesigner(designer.id)}
                          >
                            <TableCell>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={designer.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {designer.name?.charAt(0) || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{designer.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{designer.todo}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{designer.inProgress}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="default">{designer.done}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {designer.overdue > 0 ? (
                                <Badge variant="destructive">{designer.overdue}</Badge>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={bandwidth.color}>
                                {bandwidth.level === "High" && "🔴 "}
                                {bandwidth.level === "Medium" && "🟠 "}
                                {bandwidth.level === "Low" && "🟢 "}
                                {bandwidth.level}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        </CollapsibleTrigger>
                        <CollapsibleContent asChild>
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={7} className="p-0">
                              <div className="p-4 space-y-2">
                                {activeTasks.length === 0 ? (
                                  <p className="text-sm text-muted-foreground text-center py-2">
                                    No active tasks assigned
                                  </p>
                                ) : (
                                  activeTasks.slice(0, 10).map((task) => (
                                    <div 
                                      key={task.id}
                                      className="flex items-center justify-between p-2 bg-background rounded-lg border cursor-pointer hover:border-primary/50 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Pass both client and task ID in URL - let Tasks page handle the context switch
                                navigate(`/tasks?client=${task.client_id}&selected=${task.id}`);
                              }}
                                    >
                                      <div className="flex items-center gap-3">
                                        <Badge variant={task.status === 'in_progress' ? 'secondary' : 'outline'} className="text-xs">
                                          {task.status === 'in_progress' ? 'In Progress' : 'To Do'}
                                        </Badge>
                                        <span className="text-sm font-medium">{task.title}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {task.client_name}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {task.priority !== 'normal' && (
                                          <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                                            {task.priority}
                                          </Badge>
                                        )}
                                        {task.due_date && (
                                          <span className={`text-xs ${
                                            isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))
                                              ? 'text-destructive font-medium'
                                              : 'text-muted-foreground'
                                          }`}>
                                            {isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))
                                              ? 'Overdue'
                                              : format(new Date(task.due_date), 'MMM d')
                                            }
                                          </span>
                                        )}
                                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                      </div>
                                    </div>
                                  ))
                                )}
                                {activeTasks.length > 10 && (
                                  <p className="text-xs text-muted-foreground text-center">
                                    +{activeTasks.length - 10} more tasks
                                  </p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Website Builds Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Website Builds in Progress</CardTitle>
        </CardHeader>
        <CardContent>
          {builds.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No active website builds
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Build Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Pages</TableHead>
                  <TableHead className="text-center">Tasks</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {builds.map((build) => {
                  const pageProgress = build.pages_total > 0 
                    ? Math.round((build.pages_done / build.pages_total) * 100) 
                    : 0;
                  const taskProgress = build.tasks_total > 0 
                    ? Math.round((build.tasks_done / build.tasks_total) * 100) 
                    : 0;
                  const overallProgress = Math.round((pageProgress + taskProgress) / 2);

                  return (
                    <TableRow key={build.id}>
                      <TableCell className="font-medium">{build.client_name}</TableCell>
                      <TableCell>{build.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{build.status}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {build.pages_done}/{build.pages_total}
                      </TableCell>
                      <TableCell className="text-center">
                        {build.tasks_done}/{build.tasks_total}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={overallProgress} className="w-24" />
                          <span className="text-sm text-muted-foreground w-10">
                            {overallProgress}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/website/builds/${build.id}?client=${build.client_id}`)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
