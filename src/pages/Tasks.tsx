import { useEffect, useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Filter, X, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { TemplateStageManager } from "@/components/tasks/TemplateStageManager";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskViewSelector } from "@/components/tasks/TaskViewSelector";
import { TaskListView } from "@/components/tasks/TaskListView";
import { TaskTableView } from "@/components/tasks/TaskTableView";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  assignees?: Array<{ id: string; name: string; avatar_url?: string }>;
  tags?: Array<{ id: string; name: string; color: string }>;
  subtask_count?: number;
  completed_subtasks?: number;
  profiles?: {
    name: string;
  };
}

export default function Tasks() {
  const { selectedClient } = useClient();
  const [tasks, setTasks] = useState<Record<string, Task[]>>({
    to_do: [],
    in_progress: [],
    done: [],
  });
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'mine'>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [marketingChannels, setMarketingChannels] = useState<Array<{id: string, name: string}>>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentView, setCurrentView] = useState<"kanban" | "list" | "table">("kanban");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  const isAdminOrFMM = userRole === 'admin' || userRole === 'fmm';

  useEffect(() => {
    loadUserRole();
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      loadTasks();
      loadMarketingChannels();
    }
  }, [selectedClient]);

  useEffect(() => {
    if (selectedClient && currentUserId) {
      console.log('Filters changed:', { assignmentFilter, channelFilter });
      loadTasks();
    }
  }, [assignmentFilter, channelFilter]);

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
      console.log('Loaded channels:', data);
    }
  };

  const loadTasks = async () => {
    if (!selectedClient) return;

    let query = supabase
      .from("tasks")
      .select(`
        *,
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
        // No tasks assigned to this user
        setTasks({ to_do: [], in_progress: [], done: [] });
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
        // Load assignees
        const { data: assignees } = await supabase
          .from("task_assignees")
          .select(`
            user_id,
            profiles:user_id (id, name, avatar_url)
          `)
          .eq("task_id", task.id);

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

        return {
          ...task,
          assignees: assignees?.map(a => a.profiles).filter(Boolean) || [],
          subtask_count: subtasks?.length || 0,
          completed_subtasks: subtasks?.filter(st => st.status === "done").length || 0,
          tags: tagLinks?.map(tl => tl.task_tags).filter(Boolean) || [],
        };
      })
    );

    const grouped: Record<string, Task[]> = {
      to_do: [],
      in_progress: [],
      done: [],
    };

    enrichedTasks.forEach((task: any) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    setTasks(grouped);
    setAllTasks(enrichedTasks);
  };

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceColumn = [...tasks[source.droppableId]];
    const destColumn = source.droppableId === destination.droppableId 
      ? sourceColumn 
      : [...tasks[destination.droppableId]];

    const [movedTask] = sourceColumn.splice(source.index, 1);
    movedTask.status = destination.droppableId as string;
    destColumn.splice(destination.index, 0, movedTask);

    setTasks({
      ...tasks,
      [source.droppableId]: sourceColumn,
      [destination.droppableId]: destColumn,
    });

    const { error } = await supabase
      .from("tasks")
      .update({ status: destination.droppableId as any })
      .eq("id", draggableId);

    if (error) {
      toast({ title: "Error updating task", variant: "destructive" });
      loadTasks();
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      <Tabs defaultValue="board" className="space-y-6">
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          {isAdminOrFMM && <TabsTrigger value="templates">Templates</TabsTrigger>}
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
              <div className="grid grid-cols-3 gap-6">
                {["to_do", "in_progress", "done"].map((columnId) => (
                  <div key={columnId} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-lg capitalize">
                        {columnId.replace("_", " ")}
                      </h2>
                      <Badge variant="secondary">{tasks[columnId].length}</Badge>
                    </div>

                    <Droppable droppableId={columnId}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`space-y-3 min-h-[200px] rounded-lg p-4 transition-colors ${
                            snapshot.isDraggingOver ? "bg-accent/50" : "bg-muted/20"
                          }`}
                        >
                          {tasks[columnId].map((task, index) => (
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
            </DragDropContext>
          )}

          {currentView === "list" && (
            <TaskListView
              tasks={allTasks}
              onTaskClick={handleTaskClick}
              onCreateTask={() => setShowCreateDialog(true)}
              groupBy="status"
            />
          )}

          {currentView === "table" && (
            <TaskTableView
              tasks={allTasks}
              onTaskClick={handleTaskClick}
              onCreateTask={() => setShowCreateDialog(true)}
            />
          )}
        </TabsContent>

        {isAdminOrFMM && (
          <TabsContent value="templates" className="space-y-0">
            <TemplateStageManager />
          </TabsContent>
        )}
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
    </div>
  );
}
