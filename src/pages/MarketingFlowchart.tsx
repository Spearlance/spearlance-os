import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Plus, CheckSquare, ExternalLink, ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import { ChannelDrawer } from "@/components/marketing/ChannelDrawer";
import { AddChannelDialog } from "@/components/marketing/AddChannelDialog";
import { ApplyTemplateDialog } from "@/components/marketing/ApplyTemplateDialog";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Channel = Database["public"]["Tables"]["marketing_flow_channels"]["Row"] & {
  taskCount?: number;
  assignedUserName?: string;
};
type Stage = Database["public"]["Tables"]["marketing_flow_stages"]["Row"] & {
  description?: string;
};
type Task = Database["public"]["Tables"]["tasks"]["Row"];

const MarketingFlowchart = () => {
  const { selectedClient } = useClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [flowId, setFlowId] = useState<string | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [channelTasks, setChannelTasks] = useState<Record<string, Task[]>>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);

  const isAdminOrFMM = userRole === "admin" || userRole === "fmm";

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        setUserRole(profile?.role || "");
        
        // Restrict access for web_designer
        if ((profile?.role as string) === 'web_designer') {
          toast({ title: "Access Denied", description: "Web designers don't have access to Marketing Flow", variant: "destructive" });
          navigate('/');
        }
      }
    };
    fetchUserRole();
  }, [navigate, toast]);

  useEffect(() => {
    if (selectedClient?.id) {
      loadFlowData();
    }
  }, [selectedClient]);

  const loadFlowData = async () => {
    if (!selectedClient?.id) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Initialize or get existing flow
      const { data: flowIdData, error: flowError } = await supabase
        .rpc("initialize_marketing_flow", {
          p_client_id: selectedClient.id,
          p_user_id: user.id,
        });

      if (flowError) throw flowError;

      setFlowId(flowIdData);

      // Load stages
      const { data: stagesData, error: stagesError } = await supabase
        .from("marketing_flow_stages")
        .select(`
          *,
          standard_marketing_stages!inner(description)
        `)
        .eq("flow_id", flowIdData)
        .order("order_index");

      if (stagesError) throw stagesError;

      // Flatten the standard_marketing_stages data into the stage object
      const flattenedStages = (stagesData || []).map(stage => ({
        ...stage,
        description: (stage.standard_marketing_stages as any)?.description
      }));

      setStages(flattenedStages);
      
      // Auto-select first stage
      if (stagesData && stagesData.length > 0 && !selectedStage) {
        setSelectedStage(stagesData[0]);
      }

      // Load channels with task counts and assigned user names
      const { data: channelsData, error: channelsError } = await supabase
        .from("marketing_flow_channels")
        .select("*")
        .in("stage_id", (stagesData || []).map((s) => s.id));

      if (channelsError) throw channelsError;

      // Get task counts, done counts, and user names for each channel
      const channelsWithCounts = await Promise.all(
        (channelsData || []).map(async (channel) => {
          // Get all linked task IDs for this channel
          const { data: links } = await supabase
            .from("marketing_flow_task_links")
            .select("task_id")
            .eq("channel_id", channel.id);
          
          const taskIds = links?.map(l => l.task_id) || [];
          const taskCount = taskIds.length;
          let doneCount = 0;
          
          if (taskIds.length > 0) {
            // Count done tasks
            const { count } = await supabase
              .from("tasks")
              .select("*", { count: "exact", head: true })
              .in("id", taskIds)
              .eq("status", "done");
            doneCount = count || 0;
          }
          
          // Calculate progress percentage from done/total tasks
          const calculatedProgress = taskCount > 0 
            ? Math.round((doneCount / taskCount) * 100) 
            : 0;
          
          let assignedUserName = undefined;
          if (channel.assigned_to) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("name")
              .eq("id", channel.assigned_to)
              .maybeSingle();
            assignedUserName = profile?.name;
          }
          
          return { 
            ...channel, 
            taskCount, 
            progress: calculatedProgress,
            assignedUserName 
          };
        })
      );

      setChannels(channelsWithCounts);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load marketing flow",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getChannelsForStage = (stageId: string) => {
    return channels.filter((c) => c.stage_id === stageId);
  };

  const getChannelCount = (stageId: string) => {
    return channels.filter((c) => c.stage_id === stageId).length;
  };

  const handleChannelClick = (channel: Channel) => {
    setSelectedChannel(channel);
    setDrawerOpen(true);
  };

  const handleChannelUpdate = () => {
    loadFlowData();
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setTaskDrawerOpen(true);
  };

  const handleTaskUpdate = () => {
    // Reload tasks to reflect changes
    if (selectedStage) {
      const channelIds = getChannelsForStage(selectedStage.id).map(c => c.id);
      loadTasksForChannels(channelIds);
    }
    // Also reload channels to update progress/counts
    loadFlowData();
  };

  const loadTasksForChannels = async (channelIds: string[]) => {
    if (channelIds.length === 0) {
      setChannelTasks({});
      return;
    }

    const { data: links } = await supabase
      .from("marketing_flow_task_links")
      .select("task_id, channel_id")
      .in("channel_id", channelIds);

    if (!links || links.length === 0) {
      setChannelTasks({});
      return;
    }

    const taskIds = [...new Set(links.map((l) => l.task_id))];

    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .in("id", taskIds);

    const grouped: Record<string, Task[]> = {};
    links.forEach((link) => {
      const task = tasks?.find((t) => t.id === link.task_id);
      if (task) {
        if (!grouped[link.channel_id]) {
          grouped[link.channel_id] = [];
        }
        grouped[link.channel_id].push(task);
      }
    });

    setChannelTasks(grouped);
  };

  useEffect(() => {
    if (selectedStage) {
      const channelIds = getChannelsForStage(selectedStage.id).map((c) => c.id);
      loadTasksForChannels(channelIds);
    }
  }, [selectedStage, channels]);

  const filteredStages = stages.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAssignmentInfo = async (assignedTo: string | null) => {
    if (!assignedTo) return { label: "Unassigned", color: "hsl(var(--muted-foreground))" };
    
    const { data } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", assignedTo)
      .maybeSingle();
    
    return {
      label: data?.name || "Unknown",
      color: "hsl(var(--primary))",
    };
  };

  const statusLabels: Record<string, string> = {
    not_used: "Not Used",
    in_progress: "In Progress",
    active: "Active",
    paused: "Paused",
  };

  const statusClasses: Record<string, string> = {
    not_used: "bg-muted text-muted-foreground",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
    active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
    paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200",
  };

  const getTaskStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      to_do: "bg-muted text-muted-foreground",
      in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
      done: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
      blocked: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
    };
    return classes[status] || "bg-muted text-muted-foreground";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!selectedClient) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Please select a client</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="bg-card border-b px-6 py-4">
        <div>
          <h1 className="text-2xl font-semibold">Marketing Flow</h1>
          <p className="text-sm text-muted-foreground mt-1">
            A visual roadmap of your marketing system and progress
          </p>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Rail */}
        <div className="w-80 border-r bg-muted/10 p-4 overflow-auto">
          <h2 className="text-lg font-semibold mb-4">Marketing Stages</h2>

          <Input
            placeholder="Search stages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4"
          />

          <div className="space-y-0">
            {filteredStages.map((stage, index) => (
              <div key={stage.id}>
                <button
                  onClick={() => setSelectedStage(stage)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-colors",
                    "flex items-center justify-between",
                    selectedStage?.id === stage.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <span className="font-medium">{stage.name}</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      selectedStage?.id === stage.id &&
                        "bg-primary-foreground/20 text-primary-foreground"
                    )}
                  >
                    {getChannelCount(stage.id)}
                  </Badge>
                </button>
                
                {/* Flow arrow - don't show after last stage */}
                {index < filteredStages.length - 1 && (
                  <div className="flex justify-center py-2">
                    <ChevronDown 
                      className="h-5 w-5 text-muted-foreground/50" 
                      strokeWidth={2}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Workspace */}
        <div className="flex-1 p-6 overflow-auto">
          {selectedStage ? (
            <>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-2xl font-bold">{selectedStage.name}</h1>
                  <div className="flex gap-2">
                    <Button onClick={() => setAddDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Channel
                    </Button>
                    {isAdminOrFMM && (
                      <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
                        Apply Template
                      </Button>
                    )}
                  </div>
                </div>

                {selectedStage.description && (
                  <p className="text-muted-foreground text-sm max-w-3xl">
                    {selectedStage.description}
                  </p>
                )}
              </div>

              {getChannelsForStage(selectedStage.id).length === 0 ? (
                <div className="text-center py-12 border rounded-lg bg-muted/5">
                  <p className="text-muted-foreground mb-4">
                    No channels in {selectedStage.name} stage yet
                  </p>
                  <Button onClick={() => setAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Channel
                  </Button>
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {getChannelsForStage(selectedStage.id).map((channel) => {
                    const tasks = channelTasks[channel.id] || [];
                    return (
                      <AccordionItem
                        key={channel.id}
                        value={channel.id}
                        className="border rounded-lg px-4"
                      >
                        <AccordionTrigger className="hover:no-underline py-4">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-base">
                                {channel.name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {channel.assignedUserName || "Unassigned"}
                              </Badge>
                              <Badge className={statusClasses[channel.status || "not_used"]}>
                                {statusLabels[channel.status || "not_used"]}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <CheckSquare className="h-4 w-4" />
                                <span>{channel.taskCount || 0} Tasks</span>
                              </div>
                              <div className="font-medium">
                                {Math.round(Number(channel.progress) || 0)}%
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4 space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">
                                {Math.round(Number(channel.progress) || 0)}%
                              </span>
                            </div>
                            <Progress value={Number(channel.progress) || 0} className="h-2" />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-sm">Tasks</h4>
                              <Badge variant="secondary">{tasks.length}</Badge>
                            </div>

                    {(() => {
                      const activeTasks = tasks.filter(t => t.status !== "done");
                      const completedTasks = tasks.filter(t => t.status === "done");
                      
                      if (tasks.length === 0) {
                        return <p className="text-sm text-muted-foreground">No tasks yet</p>;
                      }
                      
                      return (
                        <div className="space-y-3">
                          {/* Active Tasks */}
                          {activeTasks.length > 0 && (
                            <div className="space-y-2">
                              {activeTasks.map((task) => (
                                <button
                                  key={task.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTaskClick(task);
                                  }}
                                  className="w-full flex items-center justify-between p-2 bg-muted/50 rounded text-sm hover:bg-muted hover:shadow-sm transition-all cursor-pointer group"
                                >
                                  <span className="truncate text-left group-hover:text-primary transition-colors">{task.title}</span>
                                  <Badge className={getTaskStatusClass(task.status || "to_do")}>
                                    {task.status?.replace("_", " ")}
                                  </Badge>
                                </button>
                              ))}
                            </div>
                          )}
                          
                          {/* Completed Tasks - Collapsible */}
                          {completedTasks.length > 0 && (
                            <Collapsible>
                              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-1 group">
                                <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span>Completed ({completedTasks.length})</span>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="pt-2 space-y-2">
                                {completedTasks.map((task) => (
                                  <button
                                    key={task.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTaskClick(task);
                                    }}
                                    className="w-full flex items-center justify-between p-2 bg-muted/30 rounded text-sm hover:bg-muted hover:shadow-sm transition-all cursor-pointer group opacity-75"
                                  >
                                    <span className="truncate text-left group-hover:text-primary transition-colors">{task.title}</span>
                                    <Badge className={getTaskStatusClass(task.status || "to_do")}>
                                      done
                                    </Badge>
                                  </button>
                                ))}
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                          
                          {/* Show message when all tasks are complete */}
                          {activeTasks.length === 0 && completedTasks.length > 0 && (
                            <p className="text-xs text-green-600 dark:text-green-400">All tasks completed!</p>
                          )}
                        </div>
                      );
                    })()}
                          </div>

                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleChannelClick(channel)}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Full Details
                          </Button>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Select a stage to view channels</p>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {selectedChannel && (
        <ChannelDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          channel={selectedChannel}
          onUpdate={handleChannelUpdate}
          isAdminOrFMM={isAdminOrFMM}
          clientName={selectedClient.name}
          clientId={selectedClient.id}
        />
      )}

      <AddChannelDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        stages={stages}
        selectedStageId={selectedStage?.id}
        onSuccess={handleChannelUpdate}
        selectedClient={selectedClient}
      />

      {isAdminOrFMM && (
        <ApplyTemplateDialog
          open={templateDialogOpen}
          onOpenChange={setTemplateDialogOpen}
          stages={stages}
          selectedStageId={selectedStage?.id}
          clientId={selectedClient.id}
          onSuccess={handleChannelUpdate}
        />
      )}

      {/* Task Drawer */}
      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          open={taskDrawerOpen}
          onOpenChange={setTaskDrawerOpen}
          onUpdate={handleTaskUpdate}
        />
      )}
    </div>
  );
};

export default MarketingFlowchart;
