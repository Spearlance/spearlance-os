import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Filter, X, Plus, ChevronLeft, Sparkles, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { TemplateStageManager } from "@/components/tasks/TemplateStageManager";
import { TaskStageManager } from "@/components/tasks/TaskStageManager";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskViewSelector } from "@/components/tasks/TaskViewSelector";
import { TaskListView } from "@/components/tasks/TaskListView";
import { TaskTableView } from "@/components/tasks/TaskTableView";
import { WeeklyPlanView } from "@/components/tasks/WeeklyPlanView";
import { RecommendedTasksDialog } from "@/components/tasks/RecommendedTasksDialog";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assignee_user_id: string | null;
  client_id: string;
  related_asset_ids: string[];
  related_meeting_ids: string[];
  linked_channel_id: string | null;
  color?: string;
  parent_task_id?: string | null;
  column_id?: string;
  assignees?: Array<{ id: string; name: string; avatar_url?: string }>;
  tags?: Array<{ id: string; name: string; color: string }>;
  subtask_count?: number;
  completed_subtasks?: number;
  linked_page_name?: string;
  profiles?: {
    name: string;
  };
}

export default function Tasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedClient, setSelectedClient, clients } = useClient();
  const [taskColumns, setTaskColumns] = useState<Array<{ id: string; name: string; key: string; color: string; mapped_status: 'to_do' | 'in_progress' | 'done' }>>([]);
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'mine'>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [marketingChannels, setMarketingChannels] = useState<Array<{id: string, name: string}>>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentView, setCurrentView] = useState<"kanban" | "list" | "table" | "weekly">("kanban");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("board");
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [doneColumnExpanded, setDoneColumnExpanded] = useState(() => {
    const saved = localStorage.getItem(`kanban-done-expanded-${selectedClient?.id}`);
    return saved === 'true';
  });
  const { toast } = useToast();

  const isAdminOrFMM = userRole === 'admin' || userRole === 'fmm';

  useEffect(() => {
    loadUserRole();
    loadCurrentUser();
  }, []);

  // Handle URL params for deep-linking to specific tasks (from Designer Workload, etc.)
  useEffect(() => {
    const clientId = searchParams.get('client');
    const taskId = searchParams.get('selected');
    
    // If a client ID is specified and it's different from current, switch to it
    if (clientId && selectedClient?.id !== clientId) {
      const targetClient = clients.find(c => c.id === clientId);
      if (targetClient) {
        setSelectedClient(targetClient);
      }
      return; // Wait for selectedClient to update before proceeding
    }
    
    // If we have a task ID and tasks are loaded, open the drawer
    if (taskId && allTasks.length > 0) {
      const task = allTasks.find(t => t.id === taskId);
      if (task) {
        setSelectedTask(task);
        // Clear the URL params to avoid re-triggering
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, selectedClient, clients, allTasks, setSelectedClient, setSearchParams]);

  useEffect(() => {
    if (selectedClient) {
      const initialize = async () => {
        await loadTaskColumns();  // Wait for columns to load first
        loadTasks();               // Then load tasks
        loadMarketingChannels();
      };
      initialize();
      // Load saved done column state for this client
      const saved = localStorage.getItem(`kanban-done-expanded-${selectedClient.id}`);
      setDoneColumnExpanded(saved === 'true');
    }
  }, [selectedClient]);

  // Persist done column expanded state
  useEffect(() => {
    if (selectedClient) {
      localStorage.setItem(`kanban-done-expanded-${selectedClient.id}`, String(doneColumnExpanded));
    }
  }, [doneColumnExpanded, selectedClient]);

  useEffect(() => {
    if (selectedClient && currentUserId) {
      loadTasks();
    }
  }, [assignmentFilter, channelFilter, priorityFilter]);

  // Listen for column updates from Settings tab
  useEffect(() => {
    const handleColumnsUpdate = async () => {
      if (selectedClient) {
        const columns = await loadTaskColumns();
        // Small delay to ensure state has updated before loading tasks
        setTimeout(() => {
          loadTasks();
        }, 100);
      }
    };

    window.addEventListener('taskColumnsUpdated', handleColumnsUpdate);
    return () => window.removeEventListener('taskColumnsUpdated', handleColumnsUpdate);
  }, [selectedClient]);

  // Re-group tasks whenever taskColumns or allTasks changes
  useEffect(() => {
    if (taskColumns.length === 0 || allTasks.length === 0) return;
    const grouped: Record<string, Task[]> = {};
    taskColumns.forEach(col => {
      grouped[col.key] = [];
    });

    allTasks.forEach((task: any) => {
      if (task.column_id) {
        // Group by column_id (primary method)
        const targetColumn = taskColumns.find(col => col.id === task.column_id);
        if (targetColumn) {
          grouped[targetColumn.key].push(task);
        } else {
          console.warn(`Task "${task.title}" has column_id "${task.column_id}" which doesn't match any column`);
        }
      } else {
        // Fallback: group by mapped_status for tasks without column_id
        const matchingColumns = taskColumns.filter(col => col.mapped_status === task.status);
        if (matchingColumns.length > 0) {
          const targetColumn = matchingColumns[0];
          grouped[targetColumn.key].push(task);
        } else {
          console.warn(`Task "${task.title}" has status "${task.status}" which doesn't match any column's mapped_status`);
        }
      }
    });

    setTasks(grouped);
  }, [taskColumns, allTasks]);

  const loadUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (data) setUserRole(data.role);
  };

  const loadTaskColumns = async () => {
    if (!selectedClient) return [];

    const { data, error } = await supabase
      .from("task_columns")
      .select("id, name, key, color, mapped_status")
      .eq("client_id", selectedClient.id)
      .order("display_order");

    if (error) {
      console.error("Error loading task columns:", error);
      return [];
    }

    setTaskColumns(data || []);
    
    // Initialize tasks state with empty arrays for each column
    const initialTasks: Record<string, Task[]> = {};
    (data || []).forEach(col => {
      initialTasks[col.key] = [];
    });
    setTasks(initialTasks);
    
    return data || [];
  };

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadMarketingChannels = async () => {
    if (!selectedClient) return;

    // First get the flow IDs for this client
    const { data: flows } = await supabase
      .from('marketing_flows')
      .select('id')
      .eq('client_id', selectedClient.id);

    if (!flows || flows.length === 0) {
      setMarketingChannels([]);
      return;
    }

    const flowIds = flows.map(f => f.id);

    // Then get stages for those flows
    const { data: stages } = await supabase
      .from('marketing_flow_stages')
      .select('id')
      .in('flow_id', flowIds);

    if (!stages || stages.length === 0) {
      setMarketingChannels([]);
      return;
    }

    const stageIds = stages.map(s => s.id);

    // Finally get channels for those stages
    const { data, error } = await supabase
      .from('marketing_flow_channels')
      .select('id, name')
      .in('stage_id', stageIds)
      .order('name');

    if (error) {
      console.error('Error loading marketing channels:', error);
      return;
    }

    if (data) {
      setMarketingChannels(data);
    }
  };

  const loadRecommendations = async () => {
    if (!selectedClient) return;
    
    setLoadingRecommendations(true);
    try {
      const { data, error } = await supabase.functions.invoke('recommend-tasks', {
        body: { client_id: selectedClient.id }
      });
      
      if (error) throw error;
      
      setRecommendations(data.recommendations || []);
      setShowRecommendations(true);
      
      if (data.recommendations?.length === 0) {
        toast({
          title: "No recommendations",
          description: "No task recommendations found. Great job staying on top of everything!",
        });
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
      toast({
        title: "Failed to load recommendations",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const loadTasks = async () => {
    if (!selectedClient) return;

    let query = supabase
      .from("tasks")
      .select(`
        *,
        column_id,
        profiles:assignee_user_id (name)
      `)
      .eq("client_id", selectedClient.id)
      .is("parent_task_id", null);

    // Apply assignment filter
    if (assignmentFilter === 'mine' && currentUserId) {
      // Load tasks where user is in task_assignees
      const { data: assignedTaskIds } = await supabase
        .from("task_assignees")
        .select("task_id")
        .eq("user_id", currentUserId);
      
      if (assignedTaskIds && assignedTaskIds.length > 0) {
        query = query.in("id", assignedTaskIds.map(a => a.task_id));
      } else {
        // No tasks assigned to this user - use current columns
        const emptyTasks: Record<string, Task[]> = {};
        taskColumns.forEach(col => {
          emptyTasks[col.key] = [];
        });
        setTasks(emptyTasks);
        setAllTasks([]);
        return;
      }
    }

    // Apply channel filter
    if (channelFilter !== 'all') {
      query = query.eq('linked_channel_id', channelFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      query = query.eq('priority', priorityFilter as 'low' | 'normal' | 'high' | 'urgent');
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading tasks", variant: "destructive" });
      return;
    }

    // Load assignees, subtasks, and tags for each task
    const enrichedTasks = await Promise.all(
      (data || []).map(async (task: any) => {
        // Load assignees - fetch user_ids first, then profiles separately
        const { data: taskAssignees } = await supabase
          .from("task_assignees")
          .select("user_id")
          .eq("task_id", task.id);

        // Fetch profiles for assignees
        let assigneeProfiles = [];
        if (taskAssignees && taskAssignees.length > 0) {
          const userIds = taskAssignees.map(ta => ta.user_id);
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, name, avatar_url")
            .in("id", userIds);
          
          assigneeProfiles = profilesData || [];
        }

        // Load subtasks
        const { data: subtasks } = await supabase
          .from("tasks")
          .select("id, status")
          .eq("parent_task_id", task.id);

        // Load tags
        const { data: tagLinks } = await supabase
          .from("task_tag_links")
          .select(`
            task_tags (id, name, color)
          `)
          .eq("task_id", task.id);

        // Load linked page name
        let linkedPageName: string | undefined;
        const { data: pageLink } = await supabase
          .from("website_build_tasks")
          .select("page_id, website_build_pages!inner(name)")
          .eq("task_id", task.id)
          .not("page_id", "is", null)
          .limit(1)
          .maybeSingle();
        
        if (pageLink && pageLink.website_build_pages) {
          linkedPageName = (pageLink.website_build_pages as any).name;
        }

        return {
          ...task,
        assignees: assigneeProfiles.map((profile: any) => {
          return {
            id: profile.id,
            name: profile.name || 'Unknown User',
            avatar_url: profile.avatar_url || null
          };
        }) || [],
          subtask_count: subtasks?.length || 0,
          completed_subtasks: subtasks?.filter(st => st.status === "done").length || 0,
          tags: tagLinks?.map(tl => tl.task_tags).filter(Boolean) || [],
          linked_page_name: linkedPageName,
        };
      })
    );

    // Store enriched tasks - the useEffect will handle grouping
    setAllTasks(enrichedTasks);
    
    // Initialize grouped tasks structure with current columns
    const grouped: Record<string, Task[]> = {};
    taskColumns.forEach(col => {
      grouped[col.key] = [];
    });

    // Group tasks by column_id
    enrichedTasks.forEach((task: any) => {
      if (task.column_id) {
        // Find the column by ID
        const targetColumn = taskColumns.find(col => col.id === task.column_id);
        if (targetColumn) {
          grouped[targetColumn.key].push(task);
        } else {
          console.warn(`Task "${task.title}" has column_id "${task.column_id}" which doesn't match any column`);
        }
      } else {
        // Fallback: match by status for tasks without column_id
        const matchingColumns = taskColumns.filter(col => col.mapped_status === task.status);
        if (matchingColumns.length > 0) {
          const targetColumn = matchingColumns[0];
          grouped[targetColumn.key].push(task);
        } else {
          console.warn(`Task "${task.title}" has status "${task.status}" which doesn't match any column's mapped_status`);
        }
      }
    });

    setTasks(grouped);
  };

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Find the destination column to get its mapped_status
    const destTaskColumn = taskColumns.find(col => col.key === destination.droppableId);
    if (!destTaskColumn) {
      toast({ title: "Error: Invalid column", variant: "destructive" });
      return;
    }

    const sourceColumn = [...tasks[source.droppableId]];
    const destColumn = source.droppableId === destination.droppableId 
      ? sourceColumn 
      : [...tasks[destination.droppableId]];

    const [movedTask] = sourceColumn.splice(source.index, 1);
    movedTask.status = destTaskColumn.mapped_status;
    movedTask.column_id = destTaskColumn.id;
    destColumn.splice(destination.index, 0, movedTask);

    setTasks({
      ...tasks,
      [source.droppableId]: sourceColumn,
      [destination.droppableId]: destColumn,
    });

    // Update task with both status and column_id
    const { error } = await supabase
      .from("tasks")
      .update({ 
        status: destTaskColumn.mapped_status,
        column_id: destTaskColumn.id
      })
      .eq("id", draggableId);

    if (error) {
      toast({ title: "Error updating task", variant: "destructive" });
      loadTasks();
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleTabChange = async (value: string) => {
    setActiveTab(value);
    if (value === "board" && selectedClient) {
      // Reload columns first, then tasks
      const columns = await loadTaskColumns();
      setTimeout(() => {
        loadTasks();
      }, 100);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={loadRecommendations}
            disabled={loadingRecommendations}
          >
            {loadingRecommendations ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finding Tasks...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Find Recommended Tasks
              </>
            )}
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      <Tabs defaultValue="board" value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          {isAdminOrFMM && <TabsTrigger value="templates">Templates</TabsTrigger>}
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="space-y-4">
          {/* View Selector and Filters */}
          <div className="flex items-center justify-between gap-4">
            <TaskViewSelector value={currentView} onChange={setCurrentView} />
            
            <div className="flex items-center gap-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
              
              {/* Assignment Filter */}
              <ToggleGroup 
                type="single" 
                value={assignmentFilter} 
                onValueChange={(value) => value && setAssignmentFilter(value as 'all' | 'mine')}
                className="border rounded-md"
              >
                <ToggleGroupItem value="all" className="text-sm">
                  All Tasks
                </ToggleGroupItem>
                <ToggleGroupItem value="mine" className="text-sm">
                  My Tasks
                </ToggleGroupItem>
              </ToggleGroup>

              {/* Priority Filter */}
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              {/* Channel Filter */}
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  {marketingChannels.map(channel => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Filters Button */}
              {(assignmentFilter !== 'all' || channelFilter !== 'all' || priorityFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAssignmentFilter('all');
                    setChannelFilter('all');
                    setPriorityFilter('all');
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* View-specific rendering */}
          {currentView === "kanban" && (
            <DragDropContext onDragEnd={onDragEnd}>
              {(() => {
                // Separate done column from regular columns
                const doneColumn = taskColumns.find(col => col.key === 'done');
                const regularColumns = taskColumns.filter(col => col.key !== 'done');
                const doneColumnTasks = doneColumn ? tasks[doneColumn.key] || [] : [];

                return (
                  <div className="flex gap-6">
                    {/* Regular columns grid */}
                    <div 
                      className="grid gap-6 flex-1" 
                      style={{ gridTemplateColumns: `repeat(${regularColumns.length}, minmax(300px, 1fr))` }}
                    >
                      {regularColumns.map((column) => (
                        <div key={column.key} className="space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: column.color }} />
                            <h2 className="font-semibold text-lg flex-1">
                              {column.name}
                            </h2>
                            <Badge variant="secondary">{tasks[column.key]?.length || 0}</Badge>
                          </div>

                          <Droppable droppableId={column.key}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`space-y-3 min-h-[200px] rounded-lg p-4 transition-colors ${
                                  snapshot.isDraggingOver ? "bg-accent/50" : "bg-muted/20"
                                }`}
                              >
                                {(tasks[column.key] || []).map((task, index) => (
                                  <Draggable key={task.id} draggableId={task.id} index={index}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                      >
                                        <TaskCard
                                          task={task}
                                          onClick={() => handleTaskClick(task)}
                                          isDragging={snapshot.isDragging}
                                        />
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      ))}
                    </div>

                    {/* Collapsible Done Column */}
                    {doneColumn && (
                      <div 
                        className={`transition-all duration-300 ease-in-out shrink-0 ${
                          doneColumnExpanded ? "w-[320px]" : "w-[60px]"
                        }`}
                      >
                        {!doneColumnExpanded ? (
                          // COLLAPSED STATE - Now droppable!
                          <Droppable droppableId={doneColumn.key}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="h-full"
                              >
                                <button
                                  onClick={() => setDoneColumnExpanded(true)}
                                  className={cn(
                                    "h-full w-full rounded-lg border-2 relative overflow-hidden hover:shadow-md transition-all",
                                    snapshot.isDraggingOver && "ring-2 ring-offset-2"
                                  )}
                                  style={{ 
                                    backgroundColor: `${doneColumn.color}15`, 
                                    borderColor: snapshot.isDraggingOver 
                                      ? doneColumn.color 
                                      : `${doneColumn.color}40`,
                                    ...(snapshot.isDraggingOver && {
                                      '--tw-ring-color': doneColumn.color
                                    } as React.CSSProperties)
                                  }}
                                >
                                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                    <div 
                                      className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                                      style={{ backgroundColor: doneColumn.color }}
                                    >
                                      {doneColumnTasks.length}
                                    </div>
                                    <div 
                                      className="text-sm font-semibold tracking-wider" 
                                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                                    >
                                      {doneColumn.name.toUpperCase()}
                                    </div>
                                  </div>
                                </button>
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        ) : (
                          // EXPANDED STATE
                          <div className="space-y-4 h-full">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded" style={{ backgroundColor: doneColumn.color }} />
                              <h2 className="font-semibold text-lg flex-1">
                                {doneColumn.name}
                              </h2>
                              <Badge variant="secondary">{doneColumnTasks.length}</Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDoneColumnExpanded(false)}
                                className="h-8 w-8"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                            </div>

                            <Droppable droppableId={doneColumn.key}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={`space-y-3 min-h-[200px] rounded-lg p-4 transition-colors ${
                                    snapshot.isDraggingOver ? "bg-accent/50" : "bg-muted/20"
                                  }`}
                                  style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}
                                >
                                  {doneColumnTasks.map((task, index) => (
                                    <Draggable key={task.id} draggableId={task.id} index={index}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                        >
                                          <TaskCard
                                            task={task}
                                            onClick={() => handleTaskClick(task)}
                                            isDragging={snapshot.isDragging}
                                          />
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </DragDropContext>
          )}

          {currentView === "list" && (
            <TaskListView
              tasks={allTasks}
              taskColumns={taskColumns}
              onTaskClick={handleTaskClick}
              onCreateTask={() => setShowCreateDialog(true)}
              groupBy="status"
            />
          )}

          {currentView === "table" && (
            <TaskTableView
              tasks={allTasks}
              taskColumns={taskColumns}
              onTaskClick={handleTaskClick}
              onCreateTask={() => setShowCreateDialog(true)}
            />
          )}

          {currentView === "weekly" && (
            <WeeklyPlanView
              onTaskClick={handleTaskClick}
              onCreateTask={(date) => setShowCreateDialog(true)}
            />
          )}
        </TabsContent>

        {isAdminOrFMM && (
          <TabsContent value="templates" className="space-y-0">
            <TemplateStageManager />
          </TabsContent>
        )}

        <TabsContent value="settings" className="space-y-0">
          <TaskStageManager />
        </TabsContent>
      </Tabs>

      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          onUpdate={loadTasks}
          isAdminOrFMM={isAdminOrFMM}
        />
      )}

      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={loadTasks}
      />

      <RecommendedTasksDialog
        open={showRecommendations}
        onOpenChange={setShowRecommendations}
        recommendations={recommendations}
        clientId={selectedClient?.id || ''}
        onTaskAdded={loadTasks}
        onRefresh={loadRecommendations}
        isRefreshing={loadingRecommendations}
      />
    </div>
  );
}
